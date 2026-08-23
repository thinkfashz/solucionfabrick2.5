import { AdminModules } from '@/components/admin/AdminModules';
import { AdminBaseButton, AdminBaseGrid, AdminBaseMetric, AdminBasePage } from '@/components/admin/baseui-kit';

export default function AdminModulosPage() {
  return (
    <AdminBasePage
      eyebrow="Admin OS"
      title="Mapa operativo de módulos"
      description="Vista consolidada de los módulos activos de Soluciones Fabrick. Se eliminaron herramientas experimentales y rutas legacy para reducir ruido, superficie de ataque y mantenimiento."
      actions={
        <>
          <AdminBaseButton href="/admin/intelligence">Fabrick Intelligence</AdminBaseButton>
          <AdminBaseButton href="/admin/integraciones" variant="ghost">Integraciones</AdminBaseButton>
        </>
      }
    >
      <AdminBaseGrid cols="4">
        <AdminBaseMetric label="Arquitectura" value="Unificada" hint="Una navegación canónica" />
        <AdminBaseMetric label="Datos" value="Reales" hint="Sin módulos demo en Root" />
        <AdminBaseMetric label="UI" value="Profesional" hint="Sistema visual común" />
        <AdminBaseMetric label="Seguridad" value="Reducida" hint="Menos rutas y código legacy" />
      </AdminBaseGrid>
      <AdminModules />
    </AdminBasePage>
  );
}
