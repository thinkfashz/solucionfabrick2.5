'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type ServiceId = 'vercel' | 'insforge' | 'github' | 'mercadopago' | 'cloudflare';

export type EventKind = 'order' | 'lead' | 'error' | 'sync' | 'info';

export interface ObservatoryEvent {
  id: string;
  kind: EventKind;
  service: ServiceId;
  message: string;
  ts: string;
  color: string;
  amount?: number | null;
  status?: string | null;
}

export interface LatestOrder {
  id: string;
  total: number | null;
  status: string;
  created_at: string;
}

export interface LatencySample {
  ts: number;
  ms: number;
}

export interface ServiceStatus {
  online: boolean;
  latencyMs: number;
  history: LatencySample[];
  status?: string;
  message?: string;
}

export interface ObservatoryData {
  productosActivos: number;
  pedidosHoy: number;
  leadsHoy: number;
  revenueWeek: number;
  errorsHour: number;
  latestOrders: LatestOrder[];
  servicioStatus: Record<ServiceId, ServiceStatus>;
  events: ObservatoryEvent[];
  loading: boolean;
  lastUpdated: Date | null;
  syncing: boolean;
}

type ApiErrorRow = {
  id: string;
  error_message?: string | null;
  endpoint?: string | null;
  created_at: string;
  status_code?: number | null;
};

type Readiness = {
  level?: 'ready' | 'watch' | 'degraded';
  blockers?: string[];
  warnings?: string[];
};

type ObservabilityApiResponse = {
  ok?: boolean;
  generatedAt?: string;
  metrics?: {
    productosActivos?: number;
    pedidosHoy?: number;
    leadsHoy?: number;
    revenueWeek?: number;
    errorsHour?: number;
    latestOrders?: LatestOrder[];
    errorRows?: ApiErrorRow[];
  };
  servicioStatus?: Record<ServiceId, Omit<ServiceStatus, 'history'>>;
  readiness?: Readiness;
  error?: string;
};

const COLORS: Record<EventKind, string> = {
  order: '#22c55e',
  lead: '#ec4899',
  error: '#ef4444',
  sync: '#facc15',
  info: '#94a3b8',
};

const INITIAL_STATUS: ObservatoryData['servicioStatus'] = {
  vercel: { online: true, latencyMs: 0, history: [] },
  insforge: { online: false, latencyMs: 0, history: [] },
  github: { online: true, latencyMs: 0, history: [] },
  mercadopago: { online: false, latencyMs: 0, history: [] },
  cloudflare: { online: true, latencyMs: 0, history: [] },
};

const POLL_INTERVAL_MS = 30_000;
const MAX_HISTORY = 30;
const MAX_EVENTS = 60;

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function mergeServiceStatus(
  previous: ObservatoryData['servicioStatus'],
  incoming: ObservabilityApiResponse['servicioStatus'],
): ObservatoryData['servicioStatus'] {
  const now = Date.now();
  const next: ObservatoryData['servicioStatus'] = { ...previous };
  (Object.keys(previous) as ServiceId[]).forEach((id) => {
    const source = incoming?.[id];
    const prior = previous[id]?.history ?? [];
    const latencyMs = normalizeNumber(source?.latencyMs ?? previous[id]?.latencyMs);
    next[id] = {
      online: Boolean(source?.online ?? previous[id]?.online),
      latencyMs,
      status: source?.status ?? previous[id]?.status,
      message: source?.message ?? previous[id]?.message,
      history: [...prior, { ts: now, ms: latencyMs }].slice(-MAX_HISTORY),
    };
  });
  return next;
}

function readinessEvent(readiness: Readiness | undefined): ObservatoryEvent | null {
  if (!readiness?.level || readiness.level === 'ready') return null;
  const blockers = readiness.blockers?.length ?? 0;
  const warnings = readiness.warnings?.length ?? 0;
  return {
    id: makeId('evt-ready'),
    kind: readiness.level === 'degraded' ? 'error' : 'info',
    service: readiness.level === 'degraded' ? 'insforge' : 'vercel',
    message: `READINESS ${readiness.level.toUpperCase()} · ${blockers} bloqueos · ${warnings} avisos`,
    ts: new Date().toISOString(),
    color: readiness.level === 'degraded' ? COLORS.error : COLORS.info,
  };
}

export function useObservatoryData(): ObservatoryData {
  const [data, setData] = useState<ObservatoryData>({
    productosActivos: 0,
    pedidosHoy: 0,
    leadsHoy: 0,
    revenueWeek: 0,
    errorsHour: 0,
    latestOrders: [],
    servicioStatus: INITIAL_STATUS,
    events: [],
    loading: true,
    lastUpdated: null,
    syncing: false,
  });

  // Refs para detectar deltas entre polls (evita disparar eventos en el primer fetch).
  const seenOrderIds = useRef<Set<string>>(new Set());
  const seenErrorIds = useRef<Set<string>>(new Set());
  const lastLeadCount = useRef<number | null>(null);
  const initialized = useRef(false);

  const fetchAll = useCallback(async () => {
    setData((prev) => ({ ...prev, syncing: true }));

    try {
      const res = await fetch('/api/admin/observability', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const json = await res.json() as ObservabilityApiResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'No se pudo leer observabilidad.');
      }

      const metrics = json.metrics ?? {};
      const productosActivos = normalizeNumber(metrics.productosActivos);
      const pedidosHoy = normalizeNumber(metrics.pedidosHoy);
      const leadsHoy = normalizeNumber(metrics.leadsHoy);
      const revenueWeek = normalizeNumber(metrics.revenueWeek);
      const latestOrders = Array.isArray(metrics.latestOrders) ? metrics.latestOrders : [];
      const errorRows = Array.isArray(metrics.errorRows) ? metrics.errorRows : [];
      const errorsHour = normalizeNumber(metrics.errorsHour ?? errorRows.length);

      const newEvents: ObservatoryEvent[] = [];
      if (initialized.current) {
        for (const o of latestOrders) {
          if (!seenOrderIds.current.has(o.id)) {
            newEvents.push({
              id: makeId('evt-ord'),
              kind: 'order',
              service: 'mercadopago',
              message: `ORDER ${o.id.slice(0, 8)} · ${o.status} · $${(o.total ?? 0).toLocaleString('es-CL')}`,
              ts: o.created_at,
              color: COLORS.order,
              amount: o.total,
              status: o.status,
            });
          }
        }
        for (const e of errorRows) {
          if (!seenErrorIds.current.has(e.id)) {
            const where = e.endpoint ? ` @ ${e.endpoint}` : '';
            newEvents.push({
              id: makeId('evt-err'),
              kind: 'error',
              service: 'vercel',
              message: `ERROR ${e.status_code ?? '?'}${where}: ${(e.error_message ?? '').slice(0, 80)}`,
              ts: e.created_at,
              color: COLORS.error,
            });
          }
        }
        if (lastLeadCount.current !== null && leadsHoy > lastLeadCount.current) {
          const diff = leadsHoy - lastLeadCount.current;
          newEvents.push({
            id: makeId('evt-lead'),
            kind: 'lead',
            service: 'insforge',
            message: `LEAD +${diff} nuevo${diff > 1 ? 's' : ''} hoy`,
            ts: new Date().toISOString(),
            color: COLORS.lead,
          });
        }
        const readyEvent = readinessEvent(json.readiness);
        if (readyEvent) newEvents.push(readyEvent);
      }

      latestOrders.forEach((o) => seenOrderIds.current.add(o.id));
      errorRows.forEach((e) => seenErrorIds.current.add(e.id));
      lastLeadCount.current = leadsHoy;

      setData((prev) => {
        const nextStatus = mergeServiceStatus(prev.servicioStatus, json.servicioStatus);
        const insforgeLatency = nextStatus.insforge?.latencyMs ?? 0;
        const offline = (Object.keys(nextStatus) as ServiceId[]).filter((id) => !nextStatus[id].online);
        const syncEvent: ObservatoryEvent = {
          id: makeId('evt-sync'),
          kind: offline.length ? 'error' : 'sync',
          service: offline[0] ?? 'insforge',
          message: offline.length
            ? `HEALTH WARN · offline: ${offline.join(', ')}`
            : `SYNC OK · ${insforgeLatency}ms · ${latestOrders.length} ord · ${errorsHour} err/h`,
          ts: json.generatedAt ?? new Date().toISOString(),
          color: offline.length ? COLORS.error : COLORS.sync,
        };

        return {
          ...prev,
          productosActivos,
          pedidosHoy,
          leadsHoy,
          revenueWeek,
          errorsHour,
          latestOrders,
          servicioStatus: nextStatus,
          events: [...newEvents, syncEvent, ...prev.events].slice(0, MAX_EVENTS),
          loading: false,
          syncing: false,
          lastUpdated: new Date(json.generatedAt ?? Date.now()),
        };
      });
      initialized.current = true;
    } catch (error) {
      const now = new Date().toISOString();
      const apiErrorEvent: ObservatoryEvent = {
        id: makeId('evt-api'),
        kind: 'error',
        service: 'vercel',
        message: `OBSERVABILITY API ERROR: ${error instanceof Error ? error.message.slice(0, 90) : 'desconocido'}`,
        ts: now,
        color: COLORS.error,
      };
      setData((prev) => ({
        ...prev,
        loading: false,
        syncing: false,
        events: [apiErrorEvent, ...prev.events].slice(0, MAX_EVENTS),
      }));
    }
  }, []);

  useEffect(() => {
    void fetchAll();
    const interval = setInterval(() => void fetchAll(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return data;
}
