'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, Save, XCircle } from 'lucide-react';

type Provider = 'openai' | 'openrouter' | 'claude';

type Status = {
  kind: 'idle' | 'ok' | 'error';
  text?: string;
};

const PROVIDERS: Array<{ id: Provider; label: string; fields: Array<{ name: string; label: string; secret?: boolean }> }> = [
  { id: 'openai', label: 'OpenAI / ChatGPT', fields: [{ name: 'api_key', label: 'Clave privada', secret: true }, { name: 'model', label: 'Modelo' }] },
  { id: 'openrouter', label: 'OpenRouter', fields: [{ name: 'api_key', label: 'Clave privada', secret: true }, { name: 'model', label: 'Modelo' }, { name: 'site_url', label: 'Site URL' }, { name: 'app_name', label: 'App name' }] },
  { id: 'claude', label: 'Claude / Anthropic', fields: [{ name: 'api_key', label: 'Clave privada', secret: true }, { name: 'model', label: 'Modelo' }] },
];

export default function FabrickAICredentialsPanel() {
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState<Provider | null>(null);
  const [status, setStatus] = useState<Record<Provider, Status>>({ openai: { kind: 'idle' }, openrouter: { kind: 'idle' }, claude: { kind: 'idle' } });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/integrations/ai', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        setStatus((prev) => {
          const next = { ...prev };
          for (const provider of PROVIDERS) {
            const credentials = json.providers?.[provider.id]?.credentials ?? {};
            const hasAny = Object.values(credentials).some((item) => Boolean((item as { set?: boolean }).set));
            if (hasAny) next[provider.id] = { kind: 'ok', text: 'Credenciales detectadas' };
          }
          return next;
        });
      } catch {
        // panel can work without preload
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function setField(provider: Provider, field: string, value: string) {
    setValues((prev) => ({ ...prev, [provider]: { ...(prev[provider] ?? {}), [field]: value } }));
  }

  async function save(provider: Provider) {
    setSaving(provider);
    try {
      const res = await fetch('/api/admin/integrations/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, credentials: values[provider] ?? {} }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'No se pudo guardar.');
      setStatus((prev) => ({ ...prev, [provider]: { kind: 'ok', text: json.encrypted ? 'Guardado cifrado' : 'Guardado, revisa cifrado' } }));
      setValues((prev) => ({ ...prev, [provider]: {} }));
    } catch (err) {
      setStatus((prev) => ({ ...prev, [provider]: { kind: 'error', text: err instanceof Error ? err.message : 'Error inesperado.' } }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="mt-6 rounded-[2rem] border border-white/10 bg-black/25 p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-300 text-black"><KeyRound className="h-5 w-5" /></span>
        <div>
          <h2 className="text-lg font-black text-white">Guardar credenciales reales IA</h2>
          <p className="mt-1 text-sm text-zinc-400">Se guardan en la tabla oficial integrations. DB predomina y Vercel queda como respaldo.</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {PROVIDERS.map((provider) => {
          const current = status[provider.id];
          return (
            <div key={provider.id} className="rounded-3xl border border-white/10 bg-zinc-950/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black text-white">{provider.label}</h3>
                {current.kind === 'ok' ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : current.kind === 'error' ? <XCircle className="h-5 w-5 text-red-300" /> : null}
              </div>
              {current.text ? <p className={`mt-2 text-xs ${current.kind === 'error' ? 'text-red-200' : 'text-emerald-200'}`}>{current.text}</p> : null}
              <div className="mt-4 space-y-3">
                {provider.fields.map((field) => (
                  <label key={field.name} className="block">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{field.label}</span>
                    <input
                      type={field.secret ? 'password' : 'text'}
                      value={values[provider.id]?.[field.name] ?? ''}
                      onChange={(event) => setField(provider.id, field.name, event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-yellow-300/40"
                    />
                  </label>
                ))}
              </div>
              <button type="button" onClick={() => save(provider.id)} disabled={saving === provider.id} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-300 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-black disabled:opacity-60">
                {saving === provider.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
