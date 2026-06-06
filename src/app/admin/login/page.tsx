'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { insforge } from '@/lib/insforge';
import { FabrickPeakIcon } from '@/components/FabrickBrandIcon';
import {
  Activity, BadgePercent, Bot, Calculator, CheckCircle2, Database,
  Fingerprint, Kanban, Loader2, Lock, Palette, ShieldCheck,
  Sparkles, TrendingUp, Zap,
} from 'lucide-react';

/* ── Types ───────────────────────────────────────────────────────── */
type Screen = 'login' | 'setup-send' | 'setup-password' | 'init-account';

/* ── Boot process list (shown while checking session) ─────────────── */
const BOOT_PROCESSES = [
  { icon: Lock,         label: 'Boot ROM',      detail: 'Verificando firma criptográfica' },
  { icon: ShieldCheck,  label: 'TLS 1.3',        detail: 'Canal cifrado establecido' },
  { icon: Database,     label: 'InsForge DB',    detail: 'Conectando base de datos' },
  { icon: Activity,     label: 'Auth',           detail: 'Validando sesión administrativa' },
  { icon: Kanban,       label: 'CRM',            detail: 'Cargando pipeline de ventas' },
  { icon: TrendingUp,   label: 'Analytics',      detail: 'Sincronizando métricas' },
  { icon: Calculator,   label: 'F29 · SII',      detail: 'Declaraciones tributarias listas' },
  { icon: Bot,          label: 'IA Engine',      detail: 'Agentes inteligentes activos' },
  { icon: Palette,      label: 'Editor',         detail: 'Módulos de contenido cargados' },
  { icon: Zap,          label: 'Panel root',     detail: 'Sistema listo' },
];

/* ═══════════════════════════════════════════════════════════════════
 * BootSecurityScreen — shown while /api/admin/me is in-flight
 * ═══════════════════════════════════════════════════════════════════ */
function BootSecurityScreen() {
  const [progress, setProgress] = useState(0);
  const [activeLine, setActiveLine] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [clock, setClock] = useState('');

  /* live clock */
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('es-CL', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* smooth progress bar + staggered process activations */
  useEffect(() => {
    const total = BOOT_PROCESSES.length;
    const durationMs = 2800;
    const startedAt = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const p = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(p);

      const idx = Math.min(total - 1, Math.floor((p / 100) * total));
      setActiveLine(idx);

      // mark everything before active as done
      setDone(new Set(Array.from({ length: idx }, (_, i) => i)));

      if (p < 100) raf = requestAnimationFrame(tick);
      else setDone(new Set(Array.from({ length: total }, (_, i) => i)));
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const machineId = typeof window !== 'undefined'
    ? `SF-${(window.location.hostname.split('.')[0] ?? 'local').toUpperCase().slice(0, 8)}`
    : 'SF-ADMIN';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030303] text-white">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[480px] w-[640px] -translate-x-1/2 rounded-full bg-amber-500/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-sky-500/5 blur-[100px]" />
      </div>

      {/* Scanlines */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.6) 2px,rgba(255,255,255,0.6) 3px)', backgroundSize: '100% 3px' }} />

      {/* Top status bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/[0.04] px-5 py-3 font-mono text-[9px] uppercase tracking-[0.3em] text-white/30">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          Secure boot · v4.0.0
        </span>
        <span className="hidden sm:block">{machineId}</span>
        <span className="tabular-nums">{clock || '--:--:--'}</span>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex min-h-[calc(100vh-3rem)] flex-col items-center justify-center gap-10 px-6 py-10">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.6rem] border border-amber-400/40 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 shadow-[0_0_60px_rgba(251,191,36,0.4)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.45),transparent_55%)]" />
            {/* sweep shine */}
            <motion.div
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '300%'] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5, ease: 'linear' }}
            />
            <span className="relative z-10 drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
              <FabrickPeakIcon size={40} />
            </span>
          </div>
          <div className="text-center">
            <p className="font-mono text-[13px] font-black uppercase tracking-[0.4em] text-amber-400" style={{ textShadow: '0 0 20px rgba(251,191,36,0.5)' }}>
              SOLUCIONES FABRICK
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.36em] text-white/30">
              Panel Root · Sistema administrativo
            </p>
          </div>
        </motion.div>

        {/* Progress bar */}
        <div className="w-full max-w-sm">
          <div className="mb-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.28em] text-white/30">
            <span>Iniciando módulos</span>
            <span className="tabular-nums">{Math.round(progress)}%</span>
          </div>
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #f59e0b, #fde68a, #fffbeb)',
                boxShadow: '0 0 12px rgba(251,191,36,0.7)',
              }}
              transition={{ ease: 'linear' }}
            />
          </div>
        </div>

        {/* Process list */}
        <div className="w-full max-w-sm space-y-1.5">
          {BOOT_PROCESSES.map((proc, i) => {
            const isDone = done.has(i);
            const isActive = activeLine === i && !isDone;
            const isPending = i > activeLine;

            return (
              <motion.div
                key={proc.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: isPending ? 0.2 : 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className={[
                  'flex items-center gap-3 rounded-xl px-3 py-2 font-mono text-[11px] transition-all duration-300',
                  isDone  ? 'bg-emerald-500/[0.06] border border-emerald-500/10' :
                  isActive ? 'bg-amber-500/[0.08] border border-amber-400/20' :
                             'border border-transparent',
                ].join(' ')}
              >
                {/* Status icon */}
                <span className={[
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md',
                  isDone  ? 'bg-emerald-500/20' :
                  isActive ? 'bg-amber-400/20' :
                             'bg-white/[0.04]',
                ].join(' ')}>
                  {isDone ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  ) : isActive ? (
                    <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                  ) : (
                    <proc.icon className="h-3 w-3 text-white/20" />
                  )}
                </span>

                {/* Label */}
                <span className={[
                  'w-20 shrink-0 uppercase tracking-[0.18em]',
                  isDone  ? 'text-emerald-400/80' :
                  isActive ? 'text-amber-300' :
                             'text-white/20',
                ].join(' ')}>
                  {proc.label}
                </span>

                {/* Detail */}
                <span className={[
                  'flex-1 truncate tracking-wide',
                  isDone  ? 'text-white/30' :
                  isActive ? 'text-white/60' :
                             'text-white/10',
                ].join(' ')}>
                  {proc.detail}
                </span>

                {/* Timing badge */}
                {isDone && (
                  <span className="shrink-0 text-[9px] text-emerald-500/50 tabular-nums">
                    {Math.round(80 + Math.random() * 200)}ms
                  </span>
                )}
                {isActive && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="h-3 w-1.5 shrink-0 rounded-sm bg-amber-400"
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Active status line */}
        <p className="font-mono text-[10px] tracking-[0.2em] text-white/40">
          <span className="text-amber-400">{'>'}</span>{' '}
          {BOOT_PROCESSES[activeLine]?.detail ?? 'Iniciando…'}
        </p>
      </div>

      <p className="relative z-10 pb-4 text-center font-mono text-[9px] uppercase tracking-[0.4em] text-white/15">
        © Soluciones Fabrick · Encrypted control room
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Left panel — brand showcase shown on desktop next to the form
 * ═══════════════════════════════════════════════════════════════════ */
const PLATFORM_MODULES = [
  { icon: Kanban,     label: 'CRM & Pipeline',    color: 'text-sky-400',    bg: 'bg-sky-500/15' },
  { icon: TrendingUp, label: 'Analytics',          color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  { icon: Calculator, label: 'Contabilidad F29',   color: 'text-amber-400',   bg: 'bg-amber-500/15' },
  { icon: BadgePercent, label: 'Beneficios',       color: 'text-violet-400',  bg: 'bg-violet-500/15' },
  { icon: Bot,        label: 'Agente IA',          color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/15' },
  { icon: Sparkles,   label: 'AI Developer',       color: 'text-indigo-400',  bg: 'bg-indigo-500/15' },
];

function BrandPanel() {
  const [activeModule, setActiveModule] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveModule((m) => (m + 1) % PLATFORM_MODULES.length), 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-[#030303] p-10">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-1/4 h-[500px] w-[500px] rounded-full bg-amber-500/8 blur-[130px]" />
        <div className="absolute -right-20 bottom-1/4 h-[300px] w-[300px] rounded-full bg-sky-500/6 blur-[100px]" />
      </div>
      {/* Grid texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Top: brand */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 shadow-[0_8px_32px_rgba(251,191,36,0.35)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.4),transparent_55%)]" />
            <FabrickPeakIcon size={22} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-400">Soluciones Fabrick</p>
            <p className="text-[9px] uppercase tracking-[0.28em] text-white/30">Panel administrativo</p>
          </div>
        </div>
      </motion.div>

      {/* Middle: hero text + modules */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 space-y-8"
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400/70">Sistema de gestión</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.08] tracking-tight text-white xl:text-5xl">
            Controla tu<br />
            <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-white bg-clip-text text-transparent">
              negocio completo
            </span><br />
            desde aquí.
          </h1>
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-white/40">
            CRM, contabilidad, IA, e-commerce y marketing unificados en un solo panel.
          </p>
        </div>

        {/* Animated module grid */}
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
          {PLATFORM_MODULES.map((mod, i) => {
            const isActive = activeModule === i;
            return (
              <motion.div
                key={mod.label}
                animate={{ scale: isActive ? 1.03 : 1 }}
                transition={{ duration: 0.3 }}
                className={[
                  'flex items-center gap-2 rounded-xl border p-2.5 transition-all duration-500',
                  isActive
                    ? 'border-white/15 bg-white/[0.06]'
                    : 'border-white/[0.04] bg-white/[0.02]',
                ].join(' ')}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${mod.bg}`}>
                  <mod.icon className={`h-3.5 w-3.5 ${mod.color}`} />
                </span>
                <span className="text-[10px] font-semibold leading-tight text-white/60">{mod.label}</span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Bottom: stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="relative z-10 flex items-center gap-6 border-t border-white/[0.06] pt-6"
      >
        {[
          { value: '24+', label: 'Módulos' },
          { value: 'IA', label: 'Activa' },
          { value: '6', label: 'Proveedores IA' },
        ].map((stat) => (
          <div key={stat.label}>
            <p className="text-xl font-black text-amber-300">{stat.value}</p>
            <p className="text-[9px] uppercase tracking-[0.24em] text-white/30">{stat.label}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Main Login Page
 * ═══════════════════════════════════════════════════════════════════ */
export default function AdminLoginPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [initSecret, setInitSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [success, setSuccess] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  /* Skip login if already authenticated */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/me', { cache: 'no-store' });
        if (!cancelled && res.ok) {
          const json = (await res.json()) as { authenticated?: boolean };
          if (json.authenticated) { router.replace('/admin'); return; }
        }
      } catch { /* fall through */ }
      if (!cancelled) setCheckingSession(false);
    })();
    return () => { cancelled = true; };
  }, [router]);

  /* Idle-logout message */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('idle') === '1')
      setSuccess('Tu sesión se cerró automáticamente tras 10 minutos de inactividad.');
  }, []);

  function resetMessages() { setError(''); setSuccess(''); setIsBlocked(false); }

  /* ── Passkey login ── */
  async function handlePasskeyLogin() {
    resetMessages();
    if (typeof window === 'undefined') return;
    if (!window.PublicKeyCredential || !navigator.credentials) {
      setError('Tu dispositivo no soporta autenticación biométrica.'); return;
    }
    setLoading(true);
    try {
      const optRes = await fetch('/api/admin/passkeys/auth/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() || undefined }),
      });
      const optData = await optRes.json().catch(() => ({})) as { error?: string };
      if (!optRes.ok) { setError(optData.error ?? 'No se pudo iniciar la autenticación biométrica.'); return; }
      const { startAuthentication } = await import('@simplewebauthn/browser');
      let assertion;
      try {
        assertion = await startAuthentication({ optionsJSON: optData as Parameters<typeof startAuthentication>[0]['optionsJSON'] });
      } catch (err) {
        const e = err as Error;
        setError(e.name === 'NotAllowedError' ? 'Operación cancelada.' : 'No se pudo completar la autenticación biométrica.');
        return;
      }
      const verRes = await fetch('/api/admin/passkeys/auth/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assertion),
      });
      const verData = await verRes.json().catch(() => ({})) as { ok?: boolean; error?: string };
      if (!verRes.ok) { setError(verData.error ?? 'Autenticación biométrica fallida.'); if (verRes.status === 429) setIsBlocked(true); return; }
      router.replace('/admin');
    } catch { setError('Error de red. Inténtalo de nuevo.'); } finally { setLoading(false); }
  }

  /* ── Password login ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); resetMessages(); setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      let json: { error?: string } = {};
      try { json = await res.json(); } catch { /* ignore */ }
      if (!res.ok) {
        setError(json.error ?? (res.status >= 500 ? 'Error del servidor.' : 'Error al iniciar sesión.'));
        if (res.status === 429) setIsBlocked(true);
        return;
      }
      router.replace('/admin');
    } catch { setError('Error de red. Inténtalo de nuevo.'); } finally { setLoading(false); }
  }

  /* ── Recovery ── */
  async function handleSetupSend() {
    resetMessages(); setLoading(true);
    try {
      const { error: sendErr } = await insforge.auth.sendResetPasswordEmail({
        email: setupEmail.trim().toLowerCase(),
        redirectTo: `${window.location.origin}/admin/login`,
      });
      if (sendErr) { setError(sendErr.message); return; }
      setSuccess('Código enviado. Revisa tu bandeja de entrada (y carpeta de spam).');
      setOtp(''); setScreen('setup-password');
    } catch (err) {
      setError(`No se pudo enviar el código: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setLoading(false); }
  }

  async function handleSetupPassword() {
    resetMessages(); setLoading(true);
    try {
      const { data, error: exchangeErr } = await insforge.auth.exchangeResetPasswordToken({
        email: setupEmail.trim().toLowerCase(), code: otp,
      });
      if (exchangeErr || !data?.token) { setError(exchangeErr?.message ?? 'Código inválido o expirado.'); return; }
      const finalizeRes = await fetch('/api/admin/recover/finalize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: setupEmail.trim().toLowerCase(), otp_token: data.token, newPassword }),
      });
      if (!finalizeRes.ok) {
        let json: { error?: string } = {};
        try { json = await finalizeRes.json(); } catch { /* ignore */ }
        setError(json.error ?? 'No se pudo completar la recuperación.'); return;
      }
      setSuccess('¡Contraseña configurada! Ya puedes iniciar sesión.');
      setEmail(setupEmail.trim().toLowerCase()); setScreen('login');
    } catch (err) {
      setError(`No se pudo completar la recuperación: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setLoading(false); }
  }

  async function handleInitAccount() {
    resetMessages();
    if (!initSecret.trim()) { setError('Pegá el ADMIN_INIT_SECRET configurado en las variables de entorno.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/init-account', {
        method: 'POST', headers: { 'x-admin-init-secret': initSecret.trim() },
      });
      const json = await res.json() as { error?: string; alreadyExists?: boolean; message?: string };
      if (!res.ok) { setError(json.error ?? 'Error al inicializar la cuenta.'); return; }
      if (json.alreadyExists) { setError(json.message ?? 'La cuenta ya existe. Usa la opción de recuperación.'); return; }
      setSuccess(json.message ?? '¡Cuenta creada! Ya puedes iniciar sesión.');
      setInitSecret(''); setScreen('login');
    } catch { setError('Error de red. Inténtalo de nuevo.'); } finally { setLoading(false); }
  }

  if (checkingSession) return <BootSecurityScreen />;

  /* ── Shared input style ── */
  const input = 'w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-amber-400/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-amber-400/15 disabled:opacity-40';

  return (
    <div className="flex min-h-screen overflow-hidden bg-[#030303]">
      {/* ── Left brand panel (desktop only) ── */}
      <div className="hidden w-[520px] shrink-0 lg:block xl:w-[560px]">
        <BrandPanel />
      </div>

      {/* ── Divider ── */}
      <div className="hidden w-px bg-white/[0.05] lg:block" />

      {/* ── Right form panel ── */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-5 py-12">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-amber-500/6 blur-[120px]" />
          <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-sky-500/5 blur-[100px]" />
        </div>

        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 shadow-[0_10px_40px_rgba(251,191,36,0.4)]">
            <FabrickPeakIcon size={26} />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-400">Soluciones Fabrick</p>
        </div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-[420px]"
        >
          <div className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-zinc-900/60 shadow-[0_32px_100px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            {/* Card header bar */}
            <div className="border-b border-white/[0.06] px-8 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10">
                  <Lock className="h-4 w-4 text-amber-400" />
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-400">
                    {screen === 'login' ? 'Acceso seguro'
                      : screen === 'setup-send' ? 'Recuperar acceso'
                      : screen === 'setup-password' ? 'Nueva contraseña'
                      : 'Primera configuración'}
                  </p>
                  <p className="text-[9px] uppercase tracking-[0.24em] text-white/30">Panel administrador</p>
                </div>
              </div>
            </div>

            {/* Form body */}
            <div className="px-8 py-7">
              <AnimatePresence mode="wait">
                {/* ── LOGIN ── */}
                {screen === 'login' && (
                  <motion.form
                    key="login"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-4"
                  >
                    {success && (
                      <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-[12px] text-emerald-300">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {success}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">Email</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@tudominio.com" required disabled={loading} className={input} />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">Contraseña</label>
                        <button type="button" onClick={() => setShowPassword((v) => !v)}
                          className="text-[9px] text-white/25 hover:text-white/50 transition-colors">
                          {showPassword ? 'Ocultar' : 'Mostrar'}
                        </button>
                      </div>
                      <input type={showPassword ? 'text' : 'password'} value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••" required disabled={loading} className={input} />
                    </div>

                    {error && (
                      <div className="rounded-2xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-[12px] text-red-300">
                        {error}
                        {isBlocked && (
                          <p className="mt-2 text-[11px] text-red-300/70 leading-relaxed">
                            Espera o usa la opción de recuperación por email — el reset libera el bloqueo automáticamente.
                          </p>
                        )}
                      </div>
                    )}

                    <button type="submit" disabled={loading}
                      className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 py-3.5 text-[11px] font-black uppercase tracking-[0.24em] text-black shadow-[0_8px_28px_rgba(251,191,36,0.35)] transition hover:brightness-105 disabled:opacity-60">
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verificando…</> : 'Acceder al panel'}
                    </button>

                    <button type="button" onClick={() => void handlePasskeyLogin()} disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.03] py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50 transition hover:bg-white/[0.06] hover:text-white/80 disabled:opacity-40">
                      <Fingerprint className="h-4 w-4" />
                      Huella / Face ID
                    </button>

                    <div className="flex flex-col gap-2 pt-2">
                      <button type="button" onClick={() => { resetMessages(); setScreen('setup-send'); }}
                        className="w-full text-center text-[11px] text-amber-400/50 transition hover:text-amber-400">
                        ¿Contraseña olvidada? Recuperar →
                      </button>
                      <button type="button" onClick={() => { resetMessages(); setScreen('init-account'); }}
                        className="w-full text-center text-[11px] text-white/20 transition hover:text-white/50">
                        Primera vez · Crear cuenta →
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* ── INIT ACCOUNT ── */}
                {screen === 'init-account' && (
                  <motion.div key="init" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }} className="flex flex-col gap-4">
                    <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] px-4 py-3 text-[12px] leading-relaxed text-amber-200/60">
                      Crea la cuenta de administrador en InsForge con <code className="text-amber-300">ADMIN_INITIAL_PASSWORD</code>. Solo funciona si la cuenta aún no existe.
                    </div>
                    <input type="password" value={initSecret} onChange={(e) => setInitSecret(e.target.value)}
                      placeholder="ADMIN_INIT_SECRET" autoComplete="off" spellCheck={false} disabled={loading} className={input} />
                    {error && <div className="rounded-2xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-[12px] text-red-300">{error}</div>}
                    {success && <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-[12px] text-emerald-300">{success}</div>}
                    <button onClick={() => void handleInitAccount()} disabled={loading || !initSecret.trim()}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-200 py-3.5 text-[11px] font-black uppercase tracking-[0.24em] text-black shadow-[0_8px_28px_rgba(251,191,36,0.35)] transition hover:brightness-105 disabled:opacity-60">
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creando…</> : 'Inicializar cuenta'}
                    </button>
                    <button onClick={() => { resetMessages(); setScreen('login'); }} className="text-center text-[11px] text-white/25 transition hover:text-white/60">← Volver</button>
                  </motion.div>
                )}

                {/* ── SETUP SEND ── */}
                {screen === 'setup-send' && (
                  <motion.div key="send" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }} className="flex flex-col gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">Email del administrador</label>
                      <input type="email" value={setupEmail} onChange={(e) => setSetupEmail(e.target.value)}
                        disabled={loading} className={input} placeholder="admin@ejemplo.com" />
                    </div>
                    <p className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-[12px] leading-relaxed text-white/35">
                      Se enviará un código de 6 dígitos a tu correo para establecer una nueva contraseña.
                    </p>
                    {error && <div className="rounded-2xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-[12px] text-red-300">{error}</div>}
                    {success && <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-[12px] text-emerald-300">{success}</div>}
                    <button onClick={() => void handleSetupSend()} disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-200 py-3.5 text-[11px] font-black uppercase tracking-[0.24em] text-black transition hover:brightness-105 disabled:opacity-60">
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</> : 'Enviar código'}
                    </button>
                    <button onClick={() => { resetMessages(); setScreen('login'); }} className="text-center text-[11px] text-white/25 transition hover:text-white/60">← Volver</button>
                  </motion.div>
                )}

                {/* ── SETUP PASSWORD ── */}
                {screen === 'setup-password' && (
                  <motion.div key="pass" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }} className="flex flex-col gap-4">
                    <p className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-[12px] leading-relaxed text-white/35">
                      Código enviado a <span className="text-amber-400/80">{setupEmail}</span>. Ingrésalo junto a tu nueva contraseña.
                    </p>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">Código de 6 dígitos</label>
                      <input type="text" inputMode="numeric" maxLength={6} value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000" disabled={loading}
                        className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5 text-center text-2xl font-bold tracking-[0.5em] text-white placeholder-white/15 outline-none transition focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/15 disabled:opacity-40" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">Nueva contraseña</label>
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres" disabled={loading} className={input} />
                    </div>
                    {error && <div className="rounded-2xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-[12px] text-red-300">{error}</div>}
                    <button onClick={() => void handleSetupPassword()} disabled={loading || otp.length !== 6 || newPassword.length < 6}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-200 py-3.5 text-[11px] font-black uppercase tracking-[0.24em] text-black transition hover:brightness-105 disabled:opacity-60">
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : 'Establecer contraseña'}
                    </button>
                    <button onClick={() => { resetMessages(); setScreen('setup-send'); }} className="text-center text-[11px] text-white/25 transition hover:text-white/60">← Solicitar otro código</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom label */}
          <p className="mt-6 text-center text-[9px] uppercase tracking-[0.36em] text-white/15">
            Acceso exclusivo · Soluciones Fabrick
          </p>
        </motion.div>
      </div>
    </div>
  );
}
