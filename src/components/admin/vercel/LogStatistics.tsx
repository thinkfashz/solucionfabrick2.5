'use client';

/**
 * Log Statistics - Visualización de estadísticas de Vercel
 * - Gráficos de errores/warnings
 * - Timeline de deployments
 * - Análisis de patrones
 */

import { useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface LogStats {
  error: number;
  warning: number;
  info: number;
}

interface DeploymentStats {
  date: string;
  errors: number;
  warnings: number;
  status: 'READY' | 'ERROR' | 'BUILDING';
}

interface LogStatisticsProps {
  counts: LogStats | null;
  deployments: Array<{
    id: string;
    createdAt: number;
    state: string;
  }>;
}

export function LogStatistics({ counts, deployments }: LogStatisticsProps) {
  const stats = useMemo(() => {
    if (!counts) return null;
    const total = counts.error + counts.warning + counts.info;
    return {
      total,
      errorPct: total > 0 ? (counts.error / total) * 100 : 0,
      warningPct: total > 0 ? (counts.warning / total) * 100 : 0,
      infoPct: total > 0 ? (counts.info / total) * 100 : 0,
      ...counts,
    };
  }, [counts]);

  const deploymentTimeline = useMemo(() => {
    return deployments
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map((d) => ({
        date: new Date(d.createdAt).toLocaleDateString('es-CL'),
        time: new Date(d.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        state: d.state,
      }));
  }, [deployments]);

  if (!stats) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 text-center text-sm text-zinc-500">
        Cargando estadísticas…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Errores"
          value={stats.error}
          color="red"
          percentage={stats.errorPct}
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Warnings"
          value={stats.warning}
          color="yellow"
          percentage={stats.warningPct}
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Info"
          value={stats.info}
          color="green"
          percentage={stats.infoPct}
        />
      </div>

      {/* Distribution Bar */}
      <div className="rounded-lg border border-white/10 bg-black/40 p-3 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Distribución</p>
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5 bg-black/60">
          {stats.errorPct > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.errorPct}%` }}
              className="bg-red-500/70"
            />
          )}
          {stats.warningPct > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.warningPct}%` }}
              className="bg-yellow-400/70"
            />
          )}
          {stats.infoPct > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.infoPct}%` }}
              className="bg-green-500/70"
            />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-zinc-500">
          <span>{stats.errorPct.toFixed(0)}%</span>
          <span>{stats.warningPct.toFixed(0)}%</span>
          <span>{stats.infoPct.toFixed(0)}%</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-lg border border-white/10 bg-black/40 p-3 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
          <Clock className="w-3 h-3" /> Últimos deployments
        </p>
        <div className="space-y-1">
          {deploymentTimeline.map((d, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between text-[10px] p-2 rounded-md bg-zinc-950/50 hover:bg-zinc-900/50 transition-all"
            >
              <div className="flex-1">
                <span className="font-mono text-zinc-300">{d.time}</span>
                <span className="text-zinc-500 ml-2">{d.date}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  d.state === 'READY'
                    ? 'bg-green-500/20 text-green-300'
                    : d.state === 'ERROR'
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-yellow-400/20 text-yellow-300'
                }`}
              >
                {d.state}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'red' | 'yellow' | 'green';
  percentage: number;
}

function StatCard({ icon, label, value, color, percentage }: StatCardProps) {
  const colorClass = {
    red: 'border-red-500/30 bg-red-500/10 text-red-400',
    yellow: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300',
    green: 'border-green-500/30 bg-green-500/10 text-green-400',
  }[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border ${colorClass} p-3 text-center space-y-1`}
    >
      <div className="flex justify-center">{icon}</div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</div>
      <div className="text-[9px] text-zinc-500">{percentage.toFixed(0)}%</div>
    </motion.div>
  );
}
