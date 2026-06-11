import { WebPageEditorClient } from '@/components/admin/web-pages/WebPageEditorClient';

export default async function EditWebPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WebPageEditorClient id={id} />;
}
