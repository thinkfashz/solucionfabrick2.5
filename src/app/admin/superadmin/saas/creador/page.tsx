import Link from 'next/link';
import { CheckCircle2, ClipboardCheck, FlaskConical, ShieldCheck, UserPlus } from 'lucide-react';

const checklist = [
  'Crear empresa con slug único y plan inicial.',
  'Crear usuario dueño/admin del tenant.',
  'Asignar paleta visual y color de marca.',
  'Configurar módulos activos según plan.',
  'Probar tienda, presupuesto público, checkout y webhook.',
  'Validar que el tenant demo no vea datos del tenant Fabrick.',
];

export default function SaaSCreatorTesterPage() {
  return <main className="min-h-screen bg-[#050505] px-4 py-6 text-white md:px-6">
    <section className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-[2.5rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_80%_0%,rgba(6,182,212,.24),transparent_32rem),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.025))] p-6 md:p-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.28em] text-cyan-100"><FlaskConical className="h-3.5 w-3.5" /> Test · Creador SaaS</p>
        <h1 className="mt-5 text-4xl font-black tracking-[-.06em] md:text-6xl">Tester del creador SaaS</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">Flujo de prueba para validar cómo se crea una empresa cliente y su usuario administrador sin ejecutar la migración final todavía.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5">
          <h2 className="flex items-center gap-2 text-2xl font-black tracking-[-.04em]"><UserPlus className="h-5 w-5 text-cyan-200" /> Usuario admin tester reservado</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-400">Este acceso se usará solo para pruebas de superadmin y no se publicará al cliente final. La contraseña real debe crearse fuera del código, desde el panel seguro de usuarios o el proveedor de autenticación.</p>
          <div className="mt-4 rounded-3xl border border-cyan-300/15 bg-cyan-400/10 p-4 font-mono text-sm text-cyan-50">
            faubricioedms+saas-admin@gmail.com
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Link href="/admin/invitaciones" className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white">Crear invitación segura</Link>
            <Link href="/admin/equipo" className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white">Revisar equipo y roles</Link>
          </div>
        </article>

        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5">
          <h3 className="flex items-center gap-2 text-xl font-black"><ShieldCheck className="h-5 w-5 text-emerald-200" /> Reglas de seguridad</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-400">
            <li>Solo rol <b className="text-white">superadmin</b> ve estas rutas en la barra lateral.</li>
            <li>No se guardan contraseñas en el código.</li>
            <li>El tenant demo debe quedar separado por <b className="text-white">tenant_id</b>.</li>
            <li>RLS queda para el final, después de pruebas completas.</li>
          </ul>
        </aside>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5">
        <h2 className="flex items-center gap-2 text-2xl font-black tracking-[-.04em]"><ClipboardCheck className="h-5 w-5 text-cyan-200" /> Checklist del creador</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {checklist.map((item) => <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-zinc-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> {item}</div>)}
        </div>
      </section>
    </section>
  </main>;
}
