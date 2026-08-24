import { AdminAccessLoader } from '@/components/admin/AdminAccessLoader';

export default function AdminLoading() {
  return (
    <AdminAccessLoader
      title="Preparando panel"
      description="Cargando la información necesaria para continuar."
    />
  );
}
