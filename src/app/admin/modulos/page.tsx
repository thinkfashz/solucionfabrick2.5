import { AdminModules } from '@/components/admin/AdminModules';
import { AdminBaseButton, AdminBaseCard, AdminBaseGrid, AdminBaseMetric, AdminBasePage } from '@/components/admin/baseui-kit';
import { Bot, Cpu, Database, Fingerprint, ShieldCheck, Terminal } from 'lucide-react';

export default function AdminModulosPage() {
  return (
    <AdminBasePage
      eyebrow="Admin OS"
      title="Módulos de seguridad y operación"
      description="Centro modular para continuar la construcción del admin con interfaz oscura, datos reales y rutas reales de la plataforma."
      actions={
        <>
          <AdminBaseButton href="/admin/ai-developer">Fabrick AI</AdminBaseButton>
          <AdminBaseButton href="/admin/scrapegraph">ScrapeGraph IA</AdminBaseButton>
          <AdminBaseButton href="/admin/integraciones" variant="ghost">Integraciones</AdminBaseButton>
        </>
      }
    >
      <AdminBaseGrid cols="4">
        <AdminBaseMetric label="Etapas" value="8" hint="Módulos activos" />
        <AdminBaseMetric label="Base" value="Real" hint="Sin datos demo" />
        <AdminBaseMetric label="UI" value="Dark" hint="Predeterminado" />
        <AdminBaseMetric label="Deploy" value="PR" hint="Sin main directo" />
      </AdminBaseGrid>

      <AdminBaseGrid cols="3">
        <AdminBaseCard title="Seguridad primero" description="Sesión, roles, passkeys, permisos por API y auditoría." icon={ShieldCheck} tone="emerald" badge="core" href="/admin/seguridad" />
        <AdminBaseCard title="Base de datos" description="InsForge, SQL, migraciones y credenciales cifradas." icon={Database} tone="purple" badge="data" href="/admin/sql" />
        <AdminBaseCard title="Fabrick AI Developer" description="Chat real, proveedores IA, tests y herramientas seguras." icon={Bot} tone="gold" badge="módulo 8" href="/admin/ai-developer" />
        <AdminBaseCard title="ScrapeGraph IA" description="Extrae datos estructurados de cualquier web con Playwright + LLM." icon={Cpu} tone="purple" badge="nuevo" href="/admin/scrapegraph" />
      </AdminBaseGrid>

      <div className="rounded-[2rem] border border-white/10 bg-black/30 p-4 shadow-[0_20px_90px_rgba(0,0,0,0.45)]">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
          <Fingerprint className="h-4 w-4 text-yellow-300" /> Mapa completo de módulos
          <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-zinc-400">rutas reales</span>
          <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-zinc-400">sin demo</span>
          <Terminal className="ml-auto h-4 w-4 text-zinc-500" />
        </div>
        <AdminModules />
      </div>
    </AdminBasePage>
  );
}
