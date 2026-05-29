'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle, Bot, CheckCircle, Clock, Eye, EyeOff, Save, Zap,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';

const MODELOS = [
  { id: 'claude-opus-4-8', label: 'Opus 4.8', desc: 'Máxima calidad · más lento' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', desc: 'Recomendado · balance calidad/velocidad', recommended: true },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', desc: 'Rápido y económico' },
] as const;

type ModelId = typeof MODELOS[number]['id'];

interface ConfigState {
  key_configured: boolean;
  modelo_ia: ModelId;
  activo: boolean;
}

type TestStatus = 'idle' | 'testing' | 'ok' | 'error';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function IaConfigPage() {
  const [config, setConfig] = useState<ConfigState>({ key_configured: false, modelo_ia: 'claude-haiku-4-5-20251001', activo: true });
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [modelo, setModelo] = useState<ModelId>('claude-haiku-4-5-20251001');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testResult, setTestResult] = useState<{ latency_ms?: number; model?: string; error?: string } | null>(null);
  const [lastTested, setLastTested] = useState<Date | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    void fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ia/config', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json() as ConfigState;
        setConfig(data);
        setModelo(data.modelo_ia);
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveKey() {
    if (!apiKey.trim()) return;
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/admin/ia/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anthropic_api_key: apiKey.trim() }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setSaveStatus('saved');
      setApiKey('');
      setConfig(c => ({ ...c, key_configured: true }));
      flash('API key guardada en base de datos.');
    } catch {
      setSaveStatus('error');
    } finally {
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }

  async function saveModelo() {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/admin/ia/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelo_ia: modelo }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setSaveStatus('saved');
      setConfig(c => ({ ...c, modelo_ia: modelo }));
      flash('Modelo guardado.');
    } catch {
      setSaveStatus('error');
    } finally {
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }

  async function testConnection() {
    setTestStatus('testing');
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/ia/test', { method: 'POST' });
      const data = await res.json() as { ok?: boolean; latency_ms?: number; model?: string; error?: string };
      setTestResult(data);
      setTestStatus(data.ok ? 'ok' : 'error');
      setLastTested(new Date());
    } catch (err) {
      setTestResult({ error: (err as Error).message });
      setTestStatus('error');
    }
  }

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  }

  const statusColor: Record<TestStatus, string> = {
    idle: 'text-zinc-500',
    testing: 'text-blue-400',
    ok: 'text-emerald-400',
    error: 'text-red-400',
  };
  const statusLabel: Record<TestStatus, string> = {
    idle: 'Sin probar',
    testing: 'Probando…',
    ok: `Conectado${testResult?.latency_ms ? ` · ${testResult.latency_ms}ms` : ''}`,
    error: `Error${testResult?.error ? ` · ${testResult.error.slice(0, 60)}` : ''}`,
  };

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Soluciones Fabrick · IA"
        title="Configuración IA"
        description="Gestiona tu conexión con la API de Anthropic (Claude). La clave se almacena en la base de datos InsForge, no en variables de entorno."
        icon={Bot}
      />

      <AdminMotion>
        <div className="grid gap-5 max-w-2xl">

          {/* ── Estado de conexión ───────────────────────────────────────────── */}
          <AdminCard>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.key_configured ? 'bg-emerald-500/15' : 'bg-zinc-800'}`}>
                  <Bot className={`h-5 w-5 ${config.key_configured ? 'text-emerald-400' : 'text-zinc-500'}`} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Estado de conexión</p>
                  {loading ? (
                    <p className="text-sm text-zinc-400">Cargando…</p>
                  ) : (
                    <p className={`font-black ${config.key_configured ? 'text-emerald-400' : 'text-zinc-400'}`}>
                      {config.key_configured ? '✓ Clave configurada' : 'Sin clave API'}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Modelo activo</p>
                <p className="font-black text-white">{MODELOS.find(m => m.id === config.modelo_ia)?.label ?? config.modelo_ia}</p>
              </div>
            </div>
          </AdminCard>

          {/* ── API Key ──────────────────────────────────────────────────────── */}
          <AdminCard>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-400" />
              <h2 className="font-black text-white">API Key de Anthropic</h2>
            </div>

            {config.key_configured && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                <p className="text-sm font-bold text-emerald-300">Clave almacenada en BD. Introduce una nueva para reemplazarla.</p>
              </div>
            )}

            <div className="space-y-3">
              <label className="grid gap-1 text-xs font-bold uppercase tracking-widest text-zinc-400">
                <span>{config.key_configured ? 'Nueva API key (reemplazar)' : 'API key'}</span>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder="sk-ant-..."
                      className="w-full rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 pr-10 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <button
                    onClick={() => void saveKey()}
                    disabled={!apiKey.trim() || saveStatus === 'saving'}
                    className="rounded-2xl bg-yellow-400 px-4 py-2 text-sm font-black text-black disabled:opacity-50"
                  >
                    <Save className="mr-1 inline h-4 w-4" />
                    {saveStatus === 'saving' ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </label>
              <p className="text-xs text-zinc-600">La clave se guarda en la tabla <code className="text-yellow-400">configuracion_ia</code> de InsForge. Nunca se expone al cliente.</p>
            </div>
          </AdminCard>

          {/* ── Modelo ──────────────────────────────────────────────────────── */}
          <AdminCard>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-400" />
              <h2 className="font-black text-white">Modelo de Claude</h2>
            </div>
            <div className="space-y-2 mb-4">
              {MODELOS.map(m => (
                <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${modelo === m.id ? 'border-yellow-400/60 bg-yellow-400/8' : 'border-white/10 bg-black/20 hover:border-white/25'}`}>
                  <input
                    type="radio"
                    name="modelo"
                    value={m.id}
                    checked={modelo === m.id}
                    onChange={() => setModelo(m.id)}
                    className="mt-0.5 accent-yellow-400"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white">{m.label}</span>
                      {'recommended' in m && m.recommended && (
                        <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-[10px] font-black text-yellow-300">Recomendado</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">{m.desc}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">{m.id}</p>
                  </div>
                </label>
              ))}
            </div>
            <button
              onClick={() => void saveModelo()}
              disabled={modelo === config.modelo_ia || saveStatus === 'saving'}
              className="rounded-2xl bg-yellow-400 px-4 py-2 text-sm font-black text-black disabled:opacity-40"
            >
              <Save className="mr-1 inline h-4 w-4" />
              {saveStatus === 'saving' ? 'Guardando…' : 'Guardar modelo'}
            </button>
            {saveStatus === 'saved' && <span className="ml-3 text-sm font-bold text-emerald-400">✓ Guardado</span>}
            {saveStatus === 'error' && <span className="ml-3 text-sm font-bold text-red-400">Error</span>}
          </AdminCard>

          {/* ── Test de conexión ────────────────────────────────────────────── */}
          <AdminCard>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-400" />
              <h2 className="font-black text-white">Probar conexión</h2>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${
                testStatus === 'ok' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                testStatus === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                testStatus === 'testing' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' :
                'border-white/10 bg-white/5 text-zinc-500'
              }`}>
                {testStatus === 'ok' ? <CheckCircle className="h-3.5 w-3.5" /> :
                 testStatus === 'error' ? <AlertTriangle className="h-3.5 w-3.5" /> :
                 testStatus === 'testing' ? <Zap className="h-3.5 w-3.5 animate-pulse" /> :
                 <Clock className="h-3.5 w-3.5" />}
                <span className={statusColor[testStatus]}>{statusLabel[testStatus]}</span>
              </div>
              {lastTested && <span className="text-xs text-zinc-600">Último test: {lastTested.toLocaleTimeString('es-CL')}</span>}
            </div>

            {testStatus === 'ok' && testResult?.model && (
              <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-300">
                ✓ Conectado a <strong>{testResult.model}</strong> en {testResult.latency_ms}ms
              </div>
            )}
            {testStatus === 'error' && testResult?.error && (
              <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
                <AlertTriangle className="mr-2 inline h-4 w-4" />{testResult.error}
              </div>
            )}

            <button
              onClick={() => void testConnection()}
              disabled={testStatus === 'testing' || !config.key_configured}
              className="rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-200 disabled:opacity-50 hover:bg-yellow-400/20"
            >
              <Zap className="mr-1 inline h-4 w-4" />
              {testStatus === 'testing' ? 'Probando…' : 'Probar conexión'}
            </button>
            {!config.key_configured && <p className="mt-2 text-xs text-zinc-600">Guarda una API key para probar la conexión.</p>}
          </AdminCard>

          {msg && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300">
              ✓ {msg}
            </div>
          )}

        </div>
      </AdminMotion>
    </AdminPage>
  );
}
