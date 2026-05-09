'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { insforge } from '@/lib/insforge';

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

export interface ObservatoryData {
  productosActivos: number;
  pedidosHoy: number;
  leadsHoy: number;
  revenueWeek: number;
  errorsHour: number;
  latestOrders: LatestOrder[];
  servicioStatus: Record<ServiceId, { online: boolean; latencyMs: number; history: LatencySample[] }>;
  events: ObservatoryEvent[];
  loading: boolean;
  lastUpdated: Date | null;
  syncing: boolean;
}

const COLORS: Record<EventKind, string> = {
  order: '#22c55e',
  lead: '#ec4899',
  error: '#ef4444',
  sync: '#facc15',
  info: '#94a3b8',
};

const INITIAL_STATUS: ObservatoryData['servicioStatus'] = {
  vercel: { online: true, latencyMs: 12, history: [] },
  insforge: { online: true, latencyMs: 8, history: [] },
  github: { online: true, latencyMs: 34, history: [] },
  mercadopago: { online: true, latencyMs: 22, history: [] },
  cloudflare: { online: true, latencyMs: 5, history: [] },
};

const POLL_INTERVAL_MS = 10_000;
const MAX_HISTORY = 30;
const MAX_EVENTS = 60;

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
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
    const tStart = performance.now();
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const hoyISO = hoy.toISOString();
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const [prod, ped, leads, orders, revenue, errors] = await Promise.allSettled([
        insforge.database.from('products').select('id', { count: 'exact', head: true }).neq('activo', false),
        insforge.database.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', hoyISO),
        insforge.database.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', hoyISO),
        insforge.database.from('orders').select('id,total,status,created_at').order('created_at', { ascending: false }).limit(8),
        insforge.database.from('orders').select('total').gte('created_at', weekAgo).eq('status', 'pagada'),
        insforge.database.from('admin_error_logs').select('id,error_message,endpoint,created_at,status_code').gte('created_at', hourAgo).order('created_at', { ascending: false }).limit(8),
      ]);

      const productosActivos = prod.status === 'fulfilled' ? (prod.value.count ?? 0) : 0;
      const pedidosHoy = ped.status === 'fulfilled' ? (ped.value.count ?? 0) : 0;
      const leadsHoy = leads.status === 'fulfilled' ? (leads.value.count ?? 0) : 0;
      const latestOrders: LatestOrder[] = orders.status === 'fulfilled' ? ((orders.value.data ?? []) as LatestOrder[]) : [];
      const revenueWeek = revenue.status === 'fulfilled'
        ? ((revenue.value.data ?? []) as Array<{ total: number | null }>).reduce((s, r) => s + (r.total ?? 0), 0)
        : 0;
      type ErrorRow = { id: string; error_message?: string | null; endpoint?: string | null; created_at: string; status_code?: number | null };
      const errorRows: ErrorRow[] = errors.status === 'fulfilled' ? ((errors.value.data ?? []) as ErrorRow[]) : [];
      const errorsHour = errorRows.length;

      // ── Detectar deltas → eventos ────────────────────────────────────────
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
              service: 'insforge',
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
      }

      // Actualizar refs de "vistos"
      latestOrders.forEach((o) => seenOrderIds.current.add(o.id));
      errorRows.forEach((e) => seenErrorIds.current.add(e.id));
      lastLeadCount.current = leadsHoy;

      // Latencia real medida del round-trip InsForge.
      const insforgeLatency = Math.max(1, Math.round(performance.now() - tStart));
      // Latencias simuladas — se pueden reemplazar por health-checks reales.
      const latencies: Record<ServiceId, number> = {
        vercel: Math.round(8 + Math.random() * 15),
        insforge: insforgeLatency,
        github: Math.round(20 + Math.random() * 40),
        mercadopago: Math.round(15 + Math.random() * 35),
        cloudflare: Math.round(3 + Math.random() * 10),
      };

      const now = Date.now();

      setData((prev) => {
        const nextStatus: ObservatoryData['servicioStatus'] = { ...prev.servicioStatus };
        (Object.keys(latencies) as ServiceId[]).forEach((id) => {
          const ms = latencies[id];
          const prior = prev.servicioStatus[id]?.history ?? [];
          nextStatus[id] = {
            online: true,
            latencyMs: ms,
            history: [...prior, { ts: now, ms }].slice(-MAX_HISTORY),
          };
        });

        // Sync event en cada poll para que la UI muestre actividad.
        const syncEvent: ObservatoryEvent = {
          id: makeId('evt-sync'),
          kind: 'sync',
          service: 'insforge',
          message: `SYNC OK · ${insforgeLatency}ms · ${latestOrders.length} ord · ${errorsHour} err/h`,
          ts: new Date().toISOString(),
          color: COLORS.sync,
        };

        const events = [...newEvents, syncEvent, ...prev.events].slice(0, MAX_EVENTS);

        return {
          ...prev,
          productosActivos,
          pedidosHoy,
          leadsHoy,
          revenueWeek,
          errorsHour,
          latestOrders,
          servicioStatus: nextStatus,
          events,
          loading: false,
          syncing: false,
          lastUpdated: new Date(),
        };
      });
      initialized.current = true;
    } catch {
      setData((prev) => ({ ...prev, loading: false, syncing: false }));
    }
  }, []);

  useEffect(() => {
    void fetchAll();
    const interval = setInterval(() => void fetchAll(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return data;
}
