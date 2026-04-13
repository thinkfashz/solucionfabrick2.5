'use client';

import { useState, useEffect } from 'react';
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';

/* ── Tipos ── */
interface AgentResult {
  agent: string;
  status: string;
  durationMs: number;
  data?: {
    synced?: number;
    failed?: number;
    total?: number;
    updatesApplied?: number;
    results?: Array<{ name: string; image_url: string; status: string }>;
    comparisons?: Array<{
      name: string;
      priceBase: number;
      market: Array<{ supplier: string; price: number; inStock: boolean }>;
      cheapest: { supplier: string; price: number };
      savings: number;
    }>;
  };
  error?: string;
}

interface SyncReport {
  orchestrator: string;
  status: string;
  totalDurationMs: number;
  parallelAgents: AgentResult[];
  summary: {
    imagesSynced: number;
    imagesFailed: number;
    pricesCompared: number;
    pricesUpdated: number;
  };
  completedAt: string;
}

interface TestResult { test: string; status: 'pass' | 'fail'; detail: string; ms: number }
interface TestReport { suite: string; passed: number; failed: number; total: number; health: string; tests: TestResult[] }

const CLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

/* ── STATUS BADGE ── */
function Badge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ok: 'bg-green-500/20 border-green-500/40 text-green-400',
    success: 'bg-green-500/20 border-green-500/40 text-green-400',
    error: 'bg-red-500/20 border-red-500/40 text-red-400',
    partial: 'bg-yellow-400/20 border-yellow-400/40 text-yellow-400',
    pass: 'bg-green-500/20 border-green-500/40 text-green-400',
    fail: 'bg-red-500/20 border-red-500/40 text-red-400',
  };
  return (
    <span className={`px-3 py-0.5 rounded-full border text-xs font-bold tracking-wider uppercase ${map[status] ?? 'bg-white/10 border-white/20 text-white/50'}`}>
      {status}
    </span>
  );
}

/* ════════════════════════════════════════
   PÁGINA PRINCIPAL
════════════════════════════════════════ */
export default function SyncDashboard() {
  const { products, loading, connected, lastEvent, updateCount } = useRealtimeProducts();

  const [syncing, setSyncing]         = useState(false);
  const [testing, setTesting]         = useState(false);
  const [report, setReport]           = useState<SyncReport | null>(null);
  const [testReport, setTestReport]   = useState<TestReport | null>(null);
  const [log, setLog]                 = useState<string[]>([]);
  const [updatePrice, setUpdatePrice] = useState(false);

  const addLog = (msg: string) =>
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);

  /* Registrar eventos real-time en log */
  useEffect(() => {
    if (lastEvent) {
      const p = lastEvent.product;
      addLog(`⚡ RT ${lastEvent.type} — ${p.name ?? p.id} precio=${p.price ? CLP(Number(p.price)) : '—'}`);
    }
  }, [lastEvent]);

  /* ── Ejecutar tests ── */
  async function runTests() {
    setTesting(true);
    addLog('🔬 Ejecutando suite de tests...');
    try {
      const res = await fetch('/api/sync/test');
      const data: TestReport = await res.json();
      setTestReport(data);
      addLog(`✅ Tests: ${data.passed}/${data.total} pasados`);
    } catch (e) {
      addLog(`❌ Error en tests: ${e}`);
    }
    setTesting(false);
  }

  /* ── Ejecutar sync ── */
  async function runSync() {
    setSyncing(true);
    setReport(null);
    addLog('🚀 Iniciando FABRICK SYNC MASTER...');
    addLog('⚡ Agente IMAGE_SYNC + PRICE_SYNC corriendo EN PARALELO...');

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatePrice }),
      });
      const data: SyncReport = await res.json();
      setReport(data);
      addLog(`✅ Sync completado en ${data.totalDurationMs}ms — status: ${data.status}`);
      addLog(`📸 Imágenes: ${data.summary.imagesSynced} sincronizadas, ${data.summary.imagesFailed} fallidas`);
      addLog(`💰 Precios: ${data.summary.pricesCompared} comparados, ${data.summary.pricesUpdated} actualizados`);
    } catch (e) {
      addLog(`❌ Error en sync: ${e}`);
    }
    setSyncing(false);
  }

  return (
    <div className="min-h-screen bg-black bg-grid text-white">
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="font-playfair text-xl font-black tracking-[0.3em] text-yellow-400">FABRICK</a>
            <span className="text-white/20">/</span>
            <span className="text-white/50 text-sm tracking-wider">Sync Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-xs text-white/40">{connected ? 'Real-time Conectado' : 'Desconectado'}</span>
            {updateCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-400/20 border border-yellow-400/30 text-yellow-400 text-xs font-bold">
                {updateCount} updates
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* ── COLUMNA IZQUIERDA: Controles ── */}
        <div className="xl:col-span-1 flex flex-col gap-6">

          {/* Panel de control */}
          <div className="glass-card rounded-4xl p-6 flex flex-col gap-5">
            <div>
              <p className="text-yellow-400/70 text-xs tracking-[0.3em] uppercase font-semibold mb-1">Agentes de Automatización</p>
              <h2 className="font-playfair text-2xl font-bold text-white">Fabrick Search & Sync</h2>
            </div>

            <div className="flex flex-col gap-3 text-sm text-white/50">
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                <span><strong className="text-white">Agente 1:</strong> IMAGE_SYNC — Fetch imágenes reales desde Unsplash</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                <span><strong className="text-white">Agente 2:</strong> PRICE_SYNC — Comparación de 3 proveedores</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                <span><strong className="text-white">WebSocket:</strong> InsForge real-time — UI actualiza al instante</span>
              </div>
            </div>

            {/* Opción actualizar precio */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setUpdatePrice(!updatePrice)}
                className={`w-10 h-5 rounded-full transition-colors duration-300 relative cursor-pointer ${updatePrice ? 'bg-yellow-400' : 'bg-white/15'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${updatePrice ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-white/60 text-sm">Actualizar precio si mercado es más barato</span>
            </label>

            <div className="flex flex-col gap-3">
              <button
                onClick={runSync}
                disabled={syncing}
                className="w-full py-4 rounded-full bg-yellow-400 text-black text-sm font-bold tracking-[0.15em] uppercase hover:bg-yellow-300 disabled:opacity-50 transition-all duration-300 glow-pulse"
              >
                {syncing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Agentes corriendo...
                  </span>
                ) : '⚡ Ejecutar Sync en Paralelo'}
              </button>

              <button
                onClick={runTests}
                disabled={testing}
                className="w-full py-3 rounded-full border border-white/15 text-white/60 text-sm font-medium hover:border-white/30 hover:text-white disabled:opacity-40 transition-all duration-300"
              >
                {testing ? 'Testeando...' : '🔬 Ejecutar Tests'}
              </button>
            </div>
          </div>

          {/* Test results */}
          {testReport && (
            <div className="glass-card rounded-4xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm">Suite de Tests</h3>
                <Badge status={testReport.failed === 0 ? 'pass' : 'fail'} />
              </div>
              <p className="text-white/40 text-xs">{testReport.health}</p>
              <div className="flex flex-col gap-2">
                {testReport.tests.map((t) => (
                  <div key={t.test} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-white/70 text-xs font-medium">{t.test}</p>
                      <p className="text-white/30 text-xs mt-0.5">{t.detail}</p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <Badge status={t.status} />
                      <span className="text-white/25 text-xs">{t.ms}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Log en tiempo real */}
          <div className="glass-card rounded-4xl p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Log en Tiempo Real</h3>
              <button onClick={() => setLog([])} className="text-white/25 text-xs hover:text-white/50">Limpiar</button>
            </div>
            <div className="h-48 overflow-y-auto flex flex-col gap-1.5 pr-1">
              {log.length === 0 ? (
                <p className="text-white/25 text-xs">Esperando eventos...</p>
              ) : (
                log.map((line, i) => (
                  <p key={i} className={`text-xs font-mono ${
                    line.includes('❌') ? 'text-red-400' :
                    line.includes('✅') ? 'text-green-400' :
                    line.includes('⚡') ? 'text-yellow-400' : 'text-white/40'
                  }`}>{line}</p>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── COLUMNA DERECHA: Resultados + Productos ── */}
        <div className="xl:col-span-2 flex flex-col gap-6">

          {/* Reporte de sync */}
          {report && (
            <div className="glass-card rounded-4xl p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="font-playfair text-xl font-bold text-white">Reporte del Sync</h3>
                <div className="flex items-center gap-3">
                  <Badge status={report.status} />
                  <span className="text-white/40 text-xs">{report.totalDurationMs}ms total</span>
                </div>
              </div>

              {/* Resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Imágenes Sync', value: report.summary.imagesSynced, color: 'text-green-400' },
                  { label: 'Img Fallidas',  value: report.summary.imagesFailed,  color: 'text-red-400' },
                  { label: 'Precios',       value: report.summary.pricesCompared, color: 'text-blue-400' },
                  { label: 'Actualizados',  value: report.summary.pricesUpdated, color: 'text-yellow-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white/3 rounded-2xl p-4 text-center">
                    <p className={`font-playfair text-3xl font-bold ${color}`}>{value}</p>
                    <p className="text-white/40 text-xs mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* Agentes paralelos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {report.parallelAgents.map((agent) => (
                  <div key={agent.agent} className="bg-white/3 rounded-3xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-400 text-xs font-bold tracking-wider">{agent.agent}</span>
                      <div className="flex items-center gap-2">
                        <Badge status={agent.status} />
                        <span className="text-white/30 text-xs">{agent.durationMs}ms</span>
                      </div>
                    </div>

                    {/* Imágenes */}
                    {agent.data?.results && (
                      <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                        {agent.data.results.slice(0, 5).map((r) => (
                          <div key={r.name} className="flex items-center gap-2">
                            {r.image_url && (
                              <img src={r.image_url} alt={r.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-white/10" />
                            )}
                            <span className="text-white/50 text-xs truncate">{r.name}</span>
                            <Badge status={r.status} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Precios */}
                    {agent.data?.comparisons && (
                      <div className="flex flex-col gap-2 max-h-36 overflow-y-auto">
                        {agent.data.comparisons.slice(0, 4).map((c) => (
                          <div key={c.name} className="flex flex-col gap-1">
                            <p className="text-white/60 text-xs truncate">{c.name}</p>
                            <div className="flex items-center gap-1.5">
                              {c.market.map((m) => (
                                <span key={m.supplier}
                                  className={`text-xs px-2 py-0.5 rounded-full border ${
                                    m.supplier === c.cheapest.supplier
                                      ? 'bg-green-500/20 border-green-500/40 text-green-400'
                                      : 'bg-white/5 border-white/10 text-white/40'
                                  }`}>
                                  {m.supplier.split('').slice(0,4).join('')} {CLP(m.price)}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid de productos con imágenes en tiempo real */}
          <div className="glass-card rounded-4xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h3 className="font-playfair text-xl font-bold text-white">
                Productos — Tiempo Real
              </h3>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                {loading ? 'Cargando...' : `${products.length} productos`}
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-3xl bg-white/5 h-40 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
                {products.map((prod) => (
                  <div key={prod.id} className="glass-card rounded-3xl overflow-hidden group">
                    <div className="relative h-28 bg-white/5">
                      {prod.image_url ? (
                        <img
                          src={prod.image_url}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="font-playfair text-2xl text-yellow-400/20">FBK</span>
                        </div>
                      )}
                      {prod.featured && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-yellow-400 text-black text-xs font-bold">★</span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-white/80 text-xs font-medium leading-snug line-clamp-2">{prod.name}</p>
                      <p className="text-yellow-400 font-bold text-sm mt-1 font-playfair">{CLP(prod.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
