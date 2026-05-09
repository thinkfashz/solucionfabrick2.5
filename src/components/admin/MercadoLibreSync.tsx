'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Package,
  ShoppingCart,
  TrendingUp,
  Clock,
} from 'lucide-react';

interface SyncStatus {
  lastFullSync: Date | null;
  nextFullSync: Date | null;
  productsToSync: number;
  activeOrders: number;
  syncErrors: number;
  syncedProducts: number;
  pendingProducts: number;
}

interface SyncResult {
  success: boolean;
  productsSync: number;
  ordersSync: number;
  errors: string[];
}

export default function MercadoLibreSyncPanel() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  // Carga estado inicial
  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000); // Actualiza cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  // Auto-sync cada hora
  useEffect(() => {
    if (!autoSync) return;

    const interval = setInterval(() => {
      handleFullSync();
    }, 3600000); // Cada hora

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSync]);

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/admin/ml-sync/status');
      if (res.ok) {
        const data = (await res.json()) as SyncStatus;
        setStatus(data);
      }
    } catch (err) {
      console.error('Error loading sync status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFullSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/ml-sync/run', { method: 'POST' });
      if (res.ok) {
        const result = (await res.json()) as SyncResult;
        setLastResult(result);
        await loadStatus();
      }
    } catch (err) {
      console.error('Error running sync:', err);
      setLastResult({
        success: false,
        productsSync: 0,
        ordersSync: 0,
        errors: ['Error de red'],
      });
    } finally {
      setSyncing(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-zinc-950/60 p-6 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Sincronización Mercado Libre</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Sincroniza automáticamente precios, órdenes e inventario con tu cuenta de ML
          </p>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoSync}
            onChange={(e) => setAutoSync(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/5 text-yellow-400"
          />
          <span className="text-sm text-zinc-300">Auto-sync cada hora</span>
        </label>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={Package}
          label="Productos"
          value={status?.productsToSync ?? 0}
          subtitle={`${status?.syncedProducts ?? 0} sincronizados`}
        />
        <StatCard
          icon={ShoppingCart}
          label="Órdenes activas"
          value={status?.activeOrders ?? 0}
          subtitle="sin entregar"
        />
        <StatCard
          icon={TrendingUp}
          label="Pendientes"
          value={status?.pendingProducts ?? 0}
          subtitle="por sincronizar"
          highlight={Number(status?.pendingProducts) > 0}
        />
        <StatCard
          icon={AlertCircle}
          label="Errores"
          value={status?.syncErrors ?? 0}
          subtitle="últimas 24h"
          highlight={Number(status?.syncErrors) > 0}
        />
      </div>

      {/* Últimas sincronizaciones */}
      <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-semibold text-white">Última sincronización</span>
        </div>
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-zinc-400">
            {status?.lastFullSync
              ? new Date(status.lastFullSync).toLocaleString('es-CL', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Nunca'}
          </p>
          <p className="text-xs text-zinc-500">
            Próxima: ~
            {status?.nextFullSync
              ? new Date(status.nextFullSync).toLocaleTimeString('es-CL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </p>
        </div>
      </div>

      {/* Resultado de último sync */}
      {lastResult && (
        <div
          className={`flex gap-3 rounded-lg border p-4 ${
            lastResult.success
              ? 'border-green-400/30 bg-green-400/5'
              : 'border-red-400/30 bg-red-400/5'
          }`}
        >
          {lastResult.success ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-400" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
          )}
          <div className="flex-1">
            <p className={`text-sm font-semibold ${lastResult.success ? 'text-green-200' : 'text-red-200'}`}>
              {lastResult.success ? 'Sincronización exitosa' : 'Error en la sincronización'}
            </p>
            <p className={`mt-1 text-sm ${lastResult.success ? 'text-green-100/70' : 'text-red-100/70'}`}>
              {lastResult.productsSync} productos y {lastResult.ordersSync} órdenes procesadas
            </p>
            {lastResult.errors.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-red-100">
                {lastResult.errors.slice(0, 3).map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
                {lastResult.errors.length > 3 && <li>• ... y {lastResult.errors.length - 3} más</li>}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Botón Sincronizar */}
      <button
        onClick={() => void handleFullSync()}
        disabled={syncing}
        className="inline-flex items-center gap-2 rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-6 py-3 font-semibold text-yellow-200 hover:bg-yellow-400/15 disabled:opacity-50"
      >
        {syncing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sincronizando...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Sincronizar ahora
          </>
        )}
      </button>

      {/* Info */}
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-400">
        <p className="font-semibold text-white">¿Qué se sincroniza?</p>
        <ul className="mt-2 space-y-1">
          <li>✓ Precios: ML → Tienda (actualiza precios locales)</li>
          <li>✓ Órdenes: ML → Tienda (nuevas órdenes aparecen aquí)</li>
          <li>✓ Inventario: Sincroniza stock bidireccional</li>
          <li>✓ Estado: Verifica estado de productos publicados</li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  highlight = false,
}: {
  icon: any;
  label: string;
  value: number;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight
          ? 'border-red-400/40 bg-red-400/10'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <Icon className={`h-4 w-4 ${highlight ? 'text-red-400' : 'text-zinc-400'}`} />
      <p className={`mt-2 text-[11px] uppercase tracking-wider ${highlight ? 'text-red-300' : 'text-zinc-400'}`}>
        {label}
      </p>
      <p className={`mt-1 text-2xl font-black ${highlight ? 'text-red-300' : 'text-white'}`}>{value}</p>
      <p className="mt-1 text-[10px] text-zinc-500">{subtitle}</p>
    </div>
  );
}
