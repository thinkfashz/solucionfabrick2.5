import FabrickPoemAnimation from '@/components/brand/FabrickPoemAnimation';

export default function AdminLoading() {
  return (
    <main className="fixed inset-0 z-[9999] bg-black">
      <FabrickPoemAnimation compact backgroundImageUrl="/og-image.jpg" accentImageUrl="/icon-512.png" />
    </main>
  );
}
