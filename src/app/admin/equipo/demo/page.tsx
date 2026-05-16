import { DemoLinkPanel } from '@/components/admin/DemoLinkPanel';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';

export default function EquipoDemoPage() {
  return (
    <AdminPage>
      <AdminPageHeader
        title="Links demo 24 horas"
        description="Genera accesos temporales de solo lectura para que una persona pruebe el admin sin tocar zonas críticas."
      />
      <DemoLinkPanel />
    </AdminPage>
  );
}
