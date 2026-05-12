'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Check, ChevronDown, ChevronUp, Copy, Eye, EyeOff,
  Key, RefreshCw, Shield, ShieldCheck, ShieldX, Wifi, WifiOff, Zap,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type ValueKind = 'hash' | 'jwt' | 'secret' | 'url' | 'token' | 'plain' | 'empty';

type EnvVar = {
  key: string;
  label: string;
  value: string;
  isSet: boolean;
  sensitive: boolean;
  required: boolean;
  kind: ValueKind;
};

type ServiceData = {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'configured' | 'partial' | 'missing';
  vars: EnvVar[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  connected:   { label: 'Conectado',    color: 'emerald', Icon: Wifi },
  configured:  { label: 'Configurado',  color: 'yellow',  Icon: ShieldCheck },
  partial:     { label: 'Incompleto',   color: 'orange',  Icon: Shield },
  missing:     { label: 'Sin configurar', color: 'red',   Icon: WifiOff },
} as const;

const KIND_CONFIG: Record<ValueKind, { label: string; color: string }> = {
  hash:   { label: 'Hash bcrypt',  color: 'purple' },
  jwt:    { label: 'JWT',          color: 'violet' },
  secret: { label: 'Clave aleatoria', color: 'blue' },
  url:    { label: 'URL',          color: 'sky'   },
  token:  { label: 'Token API',    color: 'amber' },
  plain:  { label: 'Texto',        color: 'zinc'  },
  empty:  { label: 'Vacío',        color: 'red'   },
};

function mask(value: string): string {
  if (!value) return '—';
  if (value.length <= 8) return '●'.repeat(value.length);
  return value.slice(0, 4) + '●'.repeat(Math.min(value.length - 8, 20)) + value.slice(-4);
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: ServiceData['status'] }) {
  const colors = {
    connected: 'bg-emerald-400',
    configured: 'bg-yellow-400',
    partial: 'bg-orange-400',
    missing: 'bg-red-500',
  };
  return (
    <span className="relative inline-flex">
      <span className={`h-2.5 w-2.5 rounded-full ${colors[status]}`} />
      {status === 'connected' && (
        <span className={`absolute inset-0 h-2.5 w-2.5 rounded-full ${colors[status]} animate-ping opacity-60`} />
      )}
    </span>
  );
}

function KindBadge({ kind }: { kind: ValueKind }) {
  const cfg = KIND_CONFIG[kind];
  const colorMap: Record<string, string> = {
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    violet: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
    blue:   'bg-blue-500/15 text-blue-300 border-blue-500/25',
    sky:    'bg-sky-500/15 text-sky-300 border-sky-500/25',
    amber:  'bg-amber-500/15 text-amber-300 border-amber-500/25',
    zinc:   'bg-zinc-700/40 text-zinc-400 border-zinc-600/30',
    red:    'bg-red-500/15 text-red-400 border-red-500/25',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.12em] ${colorMap[cfg.color] ?? colorMap.zinc}`}>
      {kind === 'hash' && <Shield className="h-2.5 w-2.5" />}
      {kind === 'jwt' && <Key className="h-2.5 w-2.5" />}
      {cfg.label}
    </span>
  );
}

function VarRow({ v, revealed, onToggle, onCopy, copied }: {
  v: EnvVar;
  revealed: boolean;
  onToggle: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className={`group grid grid-cols-[1fr_auto] gap-2 rounded-xl border px-3 py-2.5 transition-all ${
      !v.isSet
        ? v.required
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-zinc-700/30 bg-zinc-900/30 opacity-60'
        : 'border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05]'
    }`}>
      {/* Left: key + value */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-[10px] font-mono font-semibold text-zinc-300 tracking-wide">
            {v.key}
          </code>
          <KindBadge kind={v.kind} />
          {v.required && !v.isSet && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-red-400">
              <AlertTriangle className="h-2.5 w-2.5" /> Requerida
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[10px] text-zinc-600">{v.label}</p>
        {v.isSet && (
          <div className="mt-1.5 font-mono text-[10.5px] text-zinc-300 break-all">
            {revealed ? v.value : mask(v.value)}
          </div>
        )}
        {!v.isSet && (
          <p className="mt-1 text-[10px] text-zinc-700 italic">No configurada</p>
        )}
      </div>

      {/* Right: actions */}
      {v.isSet && (
        <div className="flex flex-col gap-1 items-end justify-start pt-0.5">
          <button
            onClick={onToggle}
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            title={revealed ? 'Ocultar' : 'Mostrar'}
          >
            {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
          <button
            onClick={onCopy}
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-yellow-300 hover:bg-yellow-300/10 transition-all"
            title="Copiar"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      )}
    </div>
  );
}

function ServiceCard({ service }: { service: ServiceData }) {
  const cfg = STATUS_CONFIG[service.status];
  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    yellow:  'border-yellow-400/25 bg-yellow-400/10 text-yellow-300',
    orange:  'border-orange-400/25 bg-orange-400/10 text-orange-300',
    red:     'border-red-500/25 bg-red-500/10 text-red-400',
  };
  const badgeCls = colorMap[cfg.color] ?? colorMap.yellow;

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
      service.status === 'connected'
        ? 'border-emerald-400/20 bg-emerald-400/5'
        : service.status === 'missing'
        ? 'border-red-500/20 bg-red-500/5'
        : 'border-white/10 bg-white/[0.03]'
    }`}>
      <StatusDot status={service.status} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-zinc-200 leading-tight truncate">{service.name}</p>
        <p className="text-[9px] text-zinc-600 mt-px truncate">{service.description}</p>
      </div>
      <span className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] ${badgeCls}`}>
        <cfg.Icon className="h-2.5 w-2.5" />
        {cfg.label}
      </span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function EnvClient() {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['insforge', 'admin-auth']));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/env-vars', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { services: ServiceData[] };
      setServices(data.services);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggleReveal = (key: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* clipboard denied */ }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalSet = services.reduce((acc, s) => acc + s.vars.filter((v) => v.isSet).length, 0);
  const totalVars = services.reduce((acc, s) => acc + s.vars.length, 0);
  const connected = services.filter((s) => s.status === 'connected').length;
  const missing = services.filter((s) => s.status === 'missing').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-[0_4px_14px_rgba(250,204,21,0.35)]">
              <Key className="h-4.5 w-4.5 text-black" strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-black uppercase tracking-[0.16em] text-white">
              Variables de entorno
            </h1>
          </div>
          <p className="text-[11px] text-zinc-500">
            Credenciales activas, estado de conexión y tipo de encriptación en tiempo real.
          </p>
        </div>
        <button
          onClick={() => { void load(); }}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 hover:border-yellow-400/40 hover:text-yellow-400 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <ShieldX className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-amber-300/90 leading-relaxed">
          Esta pantalla muestra credenciales reales del servidor. Está protegida por sesión de administrador.
          No compartas capturas de pantalla de este módulo. Los valores marcados como sensibles están ocultos por defecto.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-zinc-500">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm">Leyendo variables…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Error al cargar: {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Servicios conectados', value: connected, icon: Wifi, color: 'emerald' },
              { label: 'Sin configurar', value: missing, icon: WifiOff, color: missing > 0 ? 'red' : 'zinc' },
              { label: 'Variables configuradas', value: `${totalSet}/${totalVars}`, icon: ShieldCheck, color: 'yellow' },
              { label: 'Encriptadas detectadas', value: services.reduce((a, s) => a + s.vars.filter((v) => ['hash','jwt','secret'].includes(v.kind)).length, 0), icon: Zap, color: 'purple' },
            ].map((stat) => {
              const colorMap: Record<string, string> = {
                emerald: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
                red:     'text-red-400 bg-red-500/10 border-red-500/20',
                yellow:  'text-yellow-300 bg-yellow-400/10 border-yellow-400/20',
                purple:  'text-purple-300 bg-purple-500/10 border-purple-500/20',
                zinc:    'text-zinc-400 bg-zinc-800/40 border-zinc-700/30',
              };
              return (
                <div key={stat.label} className={`flex flex-col gap-1 rounded-xl border px-3 py-3 ${colorMap[stat.color]}`}>
                  <stat.icon className="h-3.5 w-3.5 opacity-70" />
                  <p className="text-xl font-black tabular-nums">{stat.value}</p>
                  <p className="text-[9px] uppercase tracking-[0.14em] opacity-70">{stat.label}</p>
                </div>
              );
            })}
          </div>

          {/* Service status overview */}
          <section>
            <p className="mb-3 text-[9.5px] font-bold uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-2">
              <span className="h-px flex-1 bg-white/[0.06]" />
              Estado de servicios
              <span className="h-px flex-1 bg-white/[0.06]" />
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {services.map((s) => <ServiceCard key={s.id} service={s} />)}
            </div>
          </section>

          {/* Variable details by service */}
          <section>
            <p className="mb-3 text-[9.5px] font-bold uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-2">
              <span className="h-px flex-1 bg-white/[0.06]" />
              Detalle de credenciales
              <span className="h-px flex-1 bg-white/[0.06]" />
            </p>
            <div className="space-y-3">
              {services.map((service) => {
                const isOpen = expanded.has(service.id);
                const setCount = service.vars.filter((v) => v.isSet).length;
                return (
                  <div key={service.id} className="rounded-2xl border border-white/[0.08] overflow-hidden bg-black/30">
                    {/* Accordion header */}
                    <button
                      onClick={() => toggleExpand(service.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                    >
                      <StatusDot status={service.status} />
                      <div className="flex-1 text-left">
                        <p className="text-[12px] font-bold text-zinc-200">{service.name}</p>
                        <p className="text-[9px] text-zinc-600">{setCount}/{service.vars.length} vars configuradas</p>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                      )}
                    </button>

                    {/* Accordion body */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-white/[0.06] p-3 space-y-2">
                            {service.vars.map((v) => (
                              <VarRow
                                key={v.key}
                                v={v}
                                revealed={revealed.has(v.key)}
                                onToggle={() => toggleReveal(v.key)}
                                onCopy={() => { void handleCopy(v.key, v.value); }}
                                copied={copied === v.key}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
