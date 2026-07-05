'use client';

import React, { useState } from 'react';
import { Lock, Mail, Phone, User } from 'lucide-react';

type OrderLike = {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
};

export default function CustomerAccountInvite({ token, order }: { token: string; order: OrderLike }) {
  const [name, setName] = useState(order.customerName || '');
  const [email, setEmail] = useState(order.customerEmail || '');
  const [phone, setPhone] = useState(order.customerPhone || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    setMessage('');
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
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
    {error && <p className="mt-3 rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
    {message && <p className="mt-3 rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</p>}
    <button onClick={submit} disabled={loading} className="mt-4 w-full rounded-2xl bg-yellow-300 px-5 py-4 font-black text-black disabled:opacity-50">{loading ? 'Creando usuario…' : 'Crear usuario y seguir envío'}</button>
  </div>;
}

function Field({ label, value, onChange, placeholder, icon, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; icon?: React.ReactNode; type?: string }) {
  return <label className="block rounded-2xl border border-white/10 bg-black/35 p-3"><span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">{icon}{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-2 w-full bg-transparent text-base font-bold outline-none placeholder:text-white/25" /></label>;
}
