import ProductPromotionStudio from '@/components/admin/ProductPromotionStudio';

export default function AdCreatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ProductPromotionStudio />
      {children}
    </>
  );
}
