import { CheckCircle2, CircleDot, PackageCheck, RotateCcw, Truck } from 'lucide-react';

type Props = { outcome: 'accepted' | 'failed' };

export default function CheckoutStatusTimeline({ outcome }: Props) {
  const accepted = outcome === 'accepted';
  const steps = accepted
    ? [
        { label: 'Pago confirmado', detail: 'La transacción fue aceptada.', icon: CheckCircle2, state: 'done' },
        { label: 'Preparación', detail: 'Fabrick revisará tu pedido.', icon: PackageCheck, state: 'active' },
        { label: 'Despacho', detail: 'Recibirás coordinación y seguimiento.', icon: Truck, state: 'next' },
      ]
    : [
        { label: 'Intento finalizado', detail: 'No se realizó ningún cobro.', icon: CircleDot, state: 'done' },
        { label: 'Datos conservados', detail: 'Puedes corregirlos y continuar.', icon: PackageCheck, state: 'active' },
        { label: 'Reintentar', detail: 'Vuelve al pago o pide asistencia.', icon: RotateCcw, state: 'next' },
      ];

  return (
    <section className="mb-6 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-5" aria-label="Estado del proceso de compra">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[.25em] text-zinc-500">Estado del proceso</p>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] ${accepted ? 'bg-emerald-300/10 text-emerald-200' : 'bg-yellow-300/10 text-yellow-200'}`}>{accepted ? 'Confirmado' : 'Sin cobro'}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {steps.map(({ label, detail, icon: Icon, state }) => (
          <div key={label} className={`rounded-2xl border p-4 ${state === 'active' ? 'border-yellow-300/30 bg-yellow-300/[.07]' : 'border-white/10 bg-black/20'}`}>
            <Icon className={`h-5 w-5 ${state === 'done' ? 'text-emerald-300' : state === 'active' ? 'text-yellow-300' : 'text-zinc-600'}`} />
            <b className="mt-3 block text-sm text-white">{label}</b>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
