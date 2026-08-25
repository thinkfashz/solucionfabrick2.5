import FabrickLoadingScreen from '@/components/FabrickLoadingScreen';

export function AdminAccessLoader({
  title = 'Preparando panel',
  description = 'Cargando el centro de control de forma segura.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <FabrickLoadingScreen
      eyebrow="Centro de control"
      title={title}
      description={description}
    />
  );
}

export default AdminAccessLoader;
