import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default function HomeAdminPage() { redirect('/admin/editor?tab=home'); }
