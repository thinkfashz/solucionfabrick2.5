import { redirect } from 'next/navigation';
import { isAdminSession } from '@/lib/adminAuth';
import UniversalVisualEditorClient from './UniversalVisualEditorClient';
import VisualCmsCloudinaryBridge from './VisualCmsCloudinaryBridge';
import VisualCmsCloudinaryPolish from './VisualCmsCloudinaryPolish';
import VisualCmsHistoryBridge from './VisualCmsHistoryBridge';

export const dynamic = 'force-dynamic';

export default async function AdminEditorPage() {
  if (!(await isAdminSession())) {
    redirect('/admin/login?from=/admin/editor');
  }
  return (
    <>
      <UniversalVisualEditorClient />
      <VisualCmsCloudinaryBridge />
      <VisualCmsCloudinaryPolish />
      <VisualCmsHistoryBridge />
    </>
  );
}
