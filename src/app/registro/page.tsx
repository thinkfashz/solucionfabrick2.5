'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Zap, Building2, Rocket, ChevronRight, Loader2, AlertCircle, Star } from 'lucide-react';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29990,
    badge: null,
    description: 'Para negocios que recién empiezan a vender online.',
    features: [
      'Tienda online completa',
      'Hasta 100 productos',
      'Hasta 50 pedidos/mes',
      'Pagos con MercadoPago',
      'Cotizaciones de clientes',
      'Panel administrativo',
    ],
    cta: 'Empezar con Starter',
    color: 'from-zinc-700 to-zinc-900',
    accent: 'text-zinc-400',
    border: 'border-zinc-700',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 59990,
    badge: 'Más popular',
    description: 'Todo lo que necesita un negocio en crecimiento.',
    features: [
      'Todo lo del Starter',
      'Productos ilimitados',
      'Pedidos ilimitados',
      'Meta Ads integrado',
      'Facturación DTE (SII)',
      'Envíos Chilexpress / Starken',
      'Programa de fidelidad',
      'Blog y contenido',
    ],
    cta: 'Empezar con Pro',
    color: 'from-emerald-700 to-emerald-900',
    accent: 'text-emerald-400',
    border: 'border-emerald-500',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 149990,
    badge: null,
    description: 'Plataforma completa con soporte prioritario.',
    features: [
      'Todo lo del Pro',
      'Acceso a API',
      'Soporte prioritario',
      'Onboarding dedicado',
      'Dominio personalizado',
      'SLA garantizado',
    ],
    cta: 'Contactar para Enterprise',
    color: 'from-violet-700 to-violet-900',
    accent: 'text-violet-400',
    border: 'border-violet-600',
  },
] as const;

type PlanId = 'starter' | 'pro' | 'enterprise';
type Step = 'plans' | 'form' | 'processing' | 'done';

interface FormData {
  business_name: string;
  owner_email: string;
  owner_name: string;
  phone: string;
  slug: string;
}

function formatClp(n: number) {
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

export default function RegistroPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('plans');
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro');
  const [form, setForm] = useState<FormData>({ business_name: '', owner_email: '', owner_name: '', phone: '', slug: '' });
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleBusinessName(val: string) {
    setForm((f) => ({
      ...f,
      business_name: val,
      slug: slugEdited ? f.slug : slugify(val),
    }));
  }

  function handleSlug(val: string) {
    setSlugEdited(true);
    setForm((f) => ({ ...f, slug: slugify(val) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.business_name || !form.owner_email) {
      setError('Nombre del negocio y correo son requeridos.');
      return;
    }
    setLoading(true);
    setStep('processing');

    try {
      const res = await fetch('/api/platform/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlan,
          business_name: form.business_name,
          owner_email: form.owner_email,
          owner_name: form.owner_name || undefined,
          phone: form.phone || undefined,
          slug: form.slug || undefined,
        }),
      });

      const data = await res.json() as { ok?: boolean; error?: string; init_point?: string; slug?: string };

      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Error al procesar el registro.');
        setStep('form');
        return;
      }

      // Enterprise: no MP checkout → show contact message
      if (selectedPlan === 'enterprise') {
        setStep('done');
        return;
      }

      // Redirect to MercadoPago subscription checkout
      if (data.init_point) {
        window.location.href = data.init_point;
        return;
      }

      setStep('done');
    } catch {
      setError('Error de red. Por favor intenta de nuevo.');
      setStep('form');
    } finally {
      setLoading(false);
    }
  }

  const plan = PLANS.find((p) => p.id === selectedPlan)!;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/')} className="text-lg font-black tracking-tight hover:text-emerald-400 transition-colors">
          FABRICK
        </button>
        <span className="text-white/30">/</span>
        <span className="text-white/60 text-sm">Registro</span>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">

        {/* ── STEP: Plan selection ── */}
        {(step === 'plans' || step === 'form') && (
          <>
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-3">Plataforma SaaS</p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                Tu negocio online,<br />listo en minutos.
              </h1>
              <p className="mt-4 text-white/50 max-w-xl mx-auto">
                Elige el plan que se adapte a tu etapa. Sin contratos anuales. Cambia cuando quieras.
              </p>
            </div>

            {/* Plans grid */}
            <div className="grid md:grid-cols-3 gap-4 mb-10">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`relative text-left rounded-2xl border p-6 transition-all ${
                    selectedPlan === p.id
                      ? `${p.border} bg-gradient-to-br ${p.color} shadow-lg scale-[1.02]`
                      : 'border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20'
                  }`}
                >
                  {p.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-emerald-500 text-black text-[10px] font-bold px-3 py-1 uppercase tracking-wide">
                      <Star size={10} fill="currentColor" /> {p.badge}
                    </span>
                  )}
                  {selectedPlan === p.id && (
                    <span className="absolute top-4 right-4 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                      <Check size={11} className="text-white" />
                    </span>
                  )}
                  <div className="mb-4">
                    {p.id === 'starter' && <Building2 size={20} className={p.accent} />}
                    {p.id === 'pro' && <Zap size={20} className={p.accent} />}
                    {p.id === 'enterprise' && <Rocket size={20} className={p.accent} />}
                  </div>
                  <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${p.accent}`}>{p.name}</div>
                  <div className="text-2xl font-black">{formatClp(p.price)}<span className="text-sm font-normal text-white/40">/mes</span></div>
                  <p className="mt-2 text-xs text-white/50 leading-relaxed">{p.description}</p>
                  <ul className="mt-4 space-y-1.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-white/70">
                        <Check size={11} className={p.accent} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            {/* ── STEP: Registration form ── */}
            {step === 'form' && (
              <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-4">
                <h2 className="text-xl font-bold mb-2">Datos de tu negocio</h2>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs text-white/50 mb-1">Nombre del negocio *</label>
                  <input
                    value={form.business_name}
                    onChange={(e) => handleBusinessName(e.target.value)}
                    placeholder="Ej: Constructora Pérez"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/50 mb-1">Subdominio *</label>
                  <div className="flex items-center rounded-xl border border-white/10 bg-white/5 overflow-hidden focus-within:border-emerald-500 transition-colors">
                    <input
                      value={form.slug}
                      onChange={(e) => handleSlug(e.target.value)}
                      placeholder="tu-negocio"
                      className="flex-1 bg-transparent px-4 py-3 text-sm focus:outline-none"
                    />
                    <span className="pr-4 text-xs text-white/30">.fabrick.cl</span>
                  </div>
                  <p className="mt-1 text-xs text-white/30">Solo letras, números y guiones. Mín. 3 caracteres.</p>
                </div>

                <div>
                  <label className="block text-xs text-white/50 mb-1">Correo de contacto *</label>
                  <input
                    type="email"
                    value={form.owner_email}
                    onChange={(e) => setForm((f) => ({ ...f, owner_email: e.target.value }))}
                    placeholder="tu@negocio.cl"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Nombre (opcional)</label>
                    <input
                      value={form.owner_name}
                      onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))}
                      placeholder="Tu nombre"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Teléfono (opcional)</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+56 9 1234 5678"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Plan summary */}
                <div className={`rounded-xl border ${plan.border} bg-gradient-to-r ${plan.color} p-4 flex items-center justify-between`}>
                  <div>
                    <div className={`text-xs font-bold uppercase tracking-widest ${plan.accent}`}>{plan.name}</div>
                    <div className="text-white font-semibold">{formatClp(plan.price)}<span className="text-white/50 text-xs">/mes</span></div>
                  </div>
                  <button type="button" onClick={() => setStep('plans')} className="text-xs text-white/50 hover:text-white underline">
                    Cambiar
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3.5 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                  {selectedPlan === 'enterprise' ? 'Solicitar acceso Enterprise' : 'Ir al pago →'}
                </button>

                <p className="text-center text-xs text-white/30">
                  Al continuar aceptas los términos de servicio. Puedes cancelar en cualquier momento.
                </p>
              </form>
            )}

            {step === 'plans' && (
              <div className="flex justify-center">
                <button
                  onClick={() => setStep('form')}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-3.5 transition-colors"
                >
                  Registrarse con {plan.name} — {formatClp(plan.price)}/mes
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}

        {/* ── STEP: Processing ── */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
            <Loader2 size={40} className="animate-spin text-emerald-400" />
            <p className="text-white/60">Preparando tu plataforma…</p>
          </div>
        )}

        {/* ── STEP: Done (enterprise / no-redirect) ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Check size={28} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black">¡Solicitud recibida!</h2>
              <p className="mt-2 text-white/50 max-w-sm">
                {selectedPlan === 'enterprise'
                  ? 'Un especialista se contactará contigo en menos de 24 horas para configurar tu plataforma Enterprise.'
                  : 'Tu plataforma estará activa en cuanto confirmemos el pago. Recibirás un correo con tus credenciales.'}
              </p>
            </div>
            <button onClick={() => router.push('/')} className="text-sm text-emerald-400 hover:underline">
              Volver al inicio
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
