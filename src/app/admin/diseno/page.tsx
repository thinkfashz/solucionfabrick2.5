import { AdminBasePage } from '@/components/admin/baseui-kit';
import DesignEngineClient from './DesignEngineClient';

export default function DesignEnginePage() {
  return (
    <AdminBasePage
      eyebrow="Personalización"
      title="Motor de Diseño"
      description="Personaliza los colores globales, el logotipo y la apariencia de tu panel de administración (Studio)."
    >
      <DesignEngineClient />
    </AdminBasePage>
  );
}
