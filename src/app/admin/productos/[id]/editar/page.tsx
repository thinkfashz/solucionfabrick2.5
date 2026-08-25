import { redirect } from 'next/navigation';

export default async function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/productos?studio=${encodeURIComponent(id)}`);
}
