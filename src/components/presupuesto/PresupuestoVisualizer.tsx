'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import type { QuoteLine, Totals } from '@/lib/budgetMath';
import {
  analyzeQuote,
  calculateComplexityIndex,
  calculatePotentialSavings,
  breakdownByCategory,
  type QuotesAnalysis,
} from '@/lib/presupuestoEnhancements';
import { formatCLP } from '@/lib/budgetMath';
import styles from './PresupuestoVisualizer.module.css';

interface PresupuestoVisualizerProps {
  lines: QuoteLine[];
  totals: Totals;
  customerName?: string;
  compact?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  'obra-gruesa': '#3b82f6',
  terminaciones: '#10b981',
  especialidades: '#f59e0b',
  servicios: '#8b5cf6',
  electricidad: '#ec4899',
  gasfiteria: '#06b6d4',
  climatizacion: '#6366f1',
  conectividad: '#f97316',
  seguridad: '#ef4444',
};

export default function PresupuestoVisualizer({
  lines,
  totals,
  customerName,
  compact = false,
}: PresupuestoVisualizerProps) {
  const analysis = useMemo(() => analyzeQuote(lines, totals), [lines, totals]);
  const complexity = useMemo(() => calculateComplexityIndex(lines, totals), [lines, totals]);
  const savings = useMemo(() => calculatePotentialSavings(lines, totals), [lines, totals]);

  const pieData = useMemo(
    () =>
      analysis.categories.map((cat) => ({
        name: cat.label,
        value: cat.subtotal,
        color: CATEGORY_COLORS[cat.category] || '#6b7280',
      })),
    [analysis]
  );

  const barData = useMemo(
    () =>
      analysis.categories.map((cat) => ({
        name: cat.label,
        cantidad: cat.itemCount,
        subtotal: Math.round(cat.subtotal / 1000000),
      })),
    [analysis]
  );

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard
            label="Ítems"
            value={analysis.totalItems.toString()}
            icon="📦"
          />
          <MetricCard
            label="Categorías"
            value={analysis.categories.length.toString()}
            icon="🏗️"
          />
          <MetricCard
            label="Complejidad"
            value={`${complexity}%`}
            icon={complexity > 60 ? '⚠️' : '✓'}
          />
          <MetricCard
            label="Ahorro potencial"
            value={`${savings.savingsPercentage.toFixed(1)}%`}
            icon="💰"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-zinc-950/60 p-6 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Análisis de Presupuesto</h3>
          <p className="mt-1 text-sm text-zinc-400">
            {lines.length} ítems en {analysis.categories.length} categorías
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-widest text-zinc-500">Complejidad</p>
          <p className="mt-1 text-2xl font-black text-yellow-400">{complexity}%</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="Costo promedio"
          value={formatCLP(analysis.averageLineValue)}
          subtext={`por ítem`}
        />
        <MetricCard
          label="Mayor categoría"
          value={analysis.highestCategory.label || '—'}
          subtext={`${analysis.highestCategory.percentage.toFixed(1)}% del total`}
        />
        <MetricCard
          label="Varianza de costos"
          value={formatCLP(analysis.costVariance)}
          subtext={`desviación estándar`}
        />
        <MetricCard
          label="Ahorro potencial"
          value={`$${Math.round(savings.savingsAmount).toLocaleString('es-CL')}`}
          subtext={`${savings.savingsPercentage.toFixed(1)}% del total`}
          highlight
        />
      </div>

      {/* Recomendación */}
      <div className="flex gap-3 rounded-xl border border-yellow-400/30 bg-yellow-400/5 p-4">
        <TrendingUp className="h-5 w-5 flex-shrink-0 text-yellow-400" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-yellow-200">Recomendación</p>
          <p className="mt-1 text-sm text-yellow-100/80">{savings.recommendation}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie Chart */}
        <div className="flex flex-col">
          <h4 className="mb-4 text-sm font-semibold text-white">Distribución por Categoría</h4>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${Math.round((value / totals.itemsSubtotal) * 100)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCLP(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="flex flex-col">
          <h4 className="mb-4 text-sm font-semibold text-white">Cantidad vs Subtotal (M CLP)</h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="name"
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                formatter={(value) => `$${value}M`}
              />
              <Bar dataKey="cantidad" fill="#3b82f6" name="Ítems" />
              <Bar dataKey="subtotal" fill="#10b981" name="Subtotal" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detalles por Categoría */}
      <div>
        <h4 className="mb-4 text-sm font-semibold text-white">Detalles por Categoría</h4>
        <div className="space-y-3">
          {analysis.categories.map((cat) => (
            <CategoryRow
              key={cat.category}
              label={cat.label}
              itemCount={cat.itemCount}
              subtotal={cat.subtotal}
              percentage={cat.percentage}
              color={CATEGORY_COLORS[cat.category] || '#6b7280'}
            />
          ))}
        </div>
      </div>

      {/* Resumen Final */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <SummaryRow label="Subtotal" value={formatCLP(totals.subtotal)} />
          <SummaryRow label={`IVA (${Math.round(totals.ivaRate * 100)}%)`} value={formatCLP(totals.iva)} muted />
          <SummaryRow label="Total" value={formatCLP(totals.total)} highlight />
          <SummaryRow label="Margen recomendado" value={`+${savings.savingsPercentage.toFixed(0)}%`} secondary />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight
          ? 'border-yellow-400/40 bg-yellow-400/10'
          : 'border-white/10 bg-white/5'
      }`}
    >
      {icon && <span className="text-xl">{icon}</span>}
      <p className={`mt-2 text-[11px] uppercase tracking-wider ${highlight ? 'text-yellow-300' : 'text-zinc-400'}`}>
        {label}
      </p>
      <p className={`mt-1 text-sm font-black ${highlight ? 'text-yellow-200' : 'text-white'}`}>{value}</p>
      {subtext && <p className="mt-1 text-[10px] text-zinc-500">{subtext}</p>}
    </div>
  );
}

function CategoryRow({
  label,
  itemCount,
  subtotal,
  percentage,
  color,
}: {
  label: string;
  itemCount: number;
  subtotal: number;
  percentage: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-style-component-with-dynamic-styles */}
          <div
            className="h-2 w-2 rounded-full"
            // eslint-disable-next-line @next/next/no-style-component-with-dynamic-styles
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-semibold text-white">{label}</span>
        </div>
        <span className="text-xs text-zinc-400">
          {itemCount} ítem{itemCount !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-2 rounded-full bg-white/10">
            {/* eslint-disable-next-line @next/next/no-style-component-with-dynamic-styles */}
            <div
              className="h-2 rounded-full transition-all"
              // eslint-disable-next-line @next/next/no-style-component-with-dynamic-styles
              style={{
                width: `${percentage}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </div>
        <div className="ml-4 text-right">
          <p className="text-sm font-semibold text-white">{formatCLP(subtotal)}</p>
          <p className="text-[10px] text-zinc-500">{percentage.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  muted = false,
  highlight = false,
  secondary = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  highlight?: boolean;
  secondary?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span
        className={`text-[10px] uppercase tracking-wider ${
          muted
            ? 'text-zinc-500'
            : secondary
              ? 'text-blue-400'
              : highlight
                ? 'text-yellow-400'
                : 'text-zinc-400'
        }`}
      >
        {label}
      </span>
      <span
        className={`mt-1 text-sm font-black ${
          muted
            ? 'text-zinc-400'
            : secondary
              ? 'text-blue-300'
              : highlight
                ? 'text-yellow-300'
                : 'text-white'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
