import { redirect } from 'next/navigation';

export default function LegacyIntegrationCenterRedirect() {
  redirect('/admin/integraciones');
}
