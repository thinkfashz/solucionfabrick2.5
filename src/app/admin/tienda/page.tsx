import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default function TiendaAdminPage() { redirect('/admin/editor?tab=tienda'); }
