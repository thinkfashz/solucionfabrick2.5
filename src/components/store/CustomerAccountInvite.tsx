'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2, Lock, Mail, Phone, ShieldCheck, User, XCircle } from 'lucide-react';

type OrderLike = {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
};

function passwordScore(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Za-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export default function CustomerAccountInvite({ token, order }: { token: string; order: OrderLike }) {
  const [name, setName] = useState(order.customerName || '');
  const [email, setEmail] = useState(order.customerEmail || '');
  const [phone, setPhone] = useState(order.customerPhone || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const score = useMemo(() => passwordScore(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = !loading && password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password) && passwordsMatch;

  async function submit() {
    setError('');
    setMessage('');
    if (!canSubmit) {
      setError('Verifica que la contraseña tenga mínimo 8 caracteres, letras, números y que ambas contraseñas coincidan.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, email, phone, password, confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo crear usuario.');
      setMessage(json.message || 'Usuario creado correctamente.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear usuario.');
    } finally {
      setLoading(false);
    }
  }

  return <div className="mt-6 rounded-[1.7rem] border border-yellow-300/20 bg-yellow-300/10 p-5">
    <div className="flex items-start gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-yellow-300 text-black"><User className="h-5 w-5" /></div>
      <div>
        <h3 className="text-xl font-black">Crea tu usuario de seguimiento</h3>
        <p className="mt-1 text-sm leading-6 text-yellow-50/70">Guarda tus datos para revisar este pedido y futuras compras.</p>
      </div>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <Field icon={<User className="h-4 w-4" />} label="Nombre" value={name} onChange={setName} placeholder="Nombre completo" />
      <Field icon={<Mail className="h-4 w-4" />} label="Correo" value={email} onChange={setEmail} placeholder="correo@email.com" />
      <Field icon={<Phone className="h-4 w-4" />} label="Celular" value={phone} onChange={setPhone} placeholder="+56 9..." />
      <Field icon={<Lock className="h-4 w-4" />} label="Contraseña" value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" type="password" />
      <div className="sm:col-span-2"><Field icon={<Lock className="h-4 w-4" />} label="Repetir contraseña" value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirma tu contraseña" type="password" /></div>
    </div>

    <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3 text-xs text-white/55">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-yellow-300" />Seguridad de contraseña</span>
        <b className={score >= 3 ? 'text-emerald-300' : 'text-yellow-300'}>{score >= 4 ? 'Alta' : score >= 3 ? 'Correcta' : 'Débil'}</b>
      </div>
      <div className="grid gap-1 sm:grid-cols-2">
        <Rule ok={password.length >= 8} label="Mínimo 8 caracteres" />
        <Rule ok={/[A-Za-z]/.test(password)} label="Incluye letras" />
        <Rule ok={/\d/.test(password)} label="Incluye números" />
        <Rule ok={passwordsMatch} label="Ambas coinciden" />
      </div>
    </div>

    {error && <p className="mt-3 rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
    {message && <p className="mt-3 rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</p>}
    <button onClick={submit} disabled={!canSubmit} className="mt-4 w-full rounded-2xl bg-yellow-300 px-5 py-4 font-black text-black disabled:opacity-50">{loading ? 'Creando usuario…' : 'Crear usuario y seguir envío'}</button>
  </div>;
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`flex items-center gap-1.5 ${ok ? 'text-emerald-300' : 'text-white/35'}`}>{ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}{label}</span>;
}

function Field({ label, value, onChange, placeholder, icon, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; icon?: React.ReactNode; type?: string }) {
  return <label className="block rounded-2xl border border-white/10 bg-black/35 p-3"><span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">{icon}{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-2 w-full bg-transparent text-base font-bold outline-none placeholder:text-white/25" /></label>;
}
