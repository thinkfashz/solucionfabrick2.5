import { redirect } from 'next/navigation';
import { isAdminSession } from '@/lib/adminAuth';
import EditorClient from './EditorClient';

export const dynamic = 'force-dynamic';

export default async function AdminEditorPage() {
  if (!(await isAdminSession())) {
    redirect('/admin/login?from=/admin/editor');
  }
  return <EditorClient />;
}
