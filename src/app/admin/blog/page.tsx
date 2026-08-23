import Link from 'next/link';
import { BookOpen, ExternalLink, FileText, MessageSquare, ShieldCheck } from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

const actionClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3.5 text-xs font-black text-[#5f594f] transition hover:bg-white';

export default function BlogAdminPage() {
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Contenido · Blog"
        title="Administración del blog"
        description="Centro editorial del blog y moderación de comentarios. Se retiró el cargador Markdown legacy porque solo registraba metadatos y no persistía el archivo real, evitando una falsa sensación de publicación."
        icon={BookOpen}
        actions={
          <>
            <Link href="/admin/blog/comments" className={actionClass}><MessageSquare className="h-4 w-4" /> Moderar comentarios</Link>
            <Link href="/blog" target="_blank" className={actionClass}><ExternalLink className="h-4 w-4" /> Ver blog público</Link>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Publicación" value="Controlada" icon={FileText} hint="Sin uploads simulados" />
        <AdminStat label="Comentarios" value="Moderables" icon={MessageSquare} accent="cyan" hint="Aprobar, rechazar o eliminar" />
        <AdminStat label="Setup SQL" value="Sistema" icon={ShieldCheck} accent="emerald" hint="Fuera del workspace editorial" />
        <AdminStat label="Datos demo" value="0" icon={BookOpen} accent="yellow" hint="Solo contenido real" />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Flujo editorial</p>
          <h2 className="text-xl font-black tracking-[-.025em] text-[#171612]">Publicación sin rutas falsas</h2>
          <p className="text-sm leading-6 text-[#716b60]">
            El uploader anterior insertaba una fila en <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs">blog_uploads</code> con una URL local, pero no guardaba el archivo Markdown en storage. Ese flujo fue retirado hasta que exista una publicación persistente y verificable.
          </p>
          <div className="rounded-xl border border-black/8 bg-black/[.025] px-4 py-3 text-xs leading-5 text-[#817a6f]">
            Los artículos existentes siguen disponibles en el sitio público. La próxima implementación editorial debe guardar contenido real, portada, autor, estado y auditoría desde una única fuente de verdad.
          </div>
        </AdminCard>

        <AdminCard className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Moderación</p>
          <h2 className="text-xl font-black tracking-[-.025em] text-[#171612]">Comentarios de lectores</h2>
          <p className="text-sm leading-6 text-[#716b60]">La moderación permanece activa y protegida por permisos de contenido. Las mutaciones ya no quedan expuestas como endpoints administrativos sin autenticación.</p>
          <Link href="/admin/blog/comments" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2b2924]">
            <MessageSquare className="h-4 w-4" /> Abrir moderación
          </Link>
        </AdminCard>
      </div>

      <AdminCard className="space-y-2">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700"><ShieldCheck className="h-4 w-4" /></span>
          <div>
            <h2 className="font-black text-[#171612]">La base de datos se administra desde Sistema</h2>
            <p className="mt-1 text-sm leading-6 text-[#716b60]">Quité de esta página la consola SQL embebida y los comandos copiables. Las reparaciones de esquema quedan centralizadas en Setup/SQL y sujetas a los permisos Root.</p>
          </div>
        </div>
      </AdminCard>
    </AdminPage>
  );
}
