import { redirect } from 'next/navigation';
import { isAdminSession } from '@/lib/adminAuth';
import UnifiedCmsEditorClient from '../UnifiedCmsEditorClient';

export const dynamic = 'force-dynamic';

export default async function HomeStructureEditorPage() {
  if (!(await isAdminSession())) {
    redirect('/admin/login?from=/admin/editor/home-structure');
  }
  return <UnifiedCmsEditorClient />;
}
