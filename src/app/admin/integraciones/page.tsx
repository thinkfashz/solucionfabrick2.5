'use client';

import AdminIntegrationsWorkspace from '@/components/admin/integrations/AdminIntegrationsWorkspace';
import SiiIntegrationShortcut from '@/components/admin/integrations/SiiIntegrationShortcut';

export default function AdminIntegracionesPage() {
  return <>
    <SiiIntegrationShortcut />
    <AdminIntegrationsWorkspace />
  </>;
}
