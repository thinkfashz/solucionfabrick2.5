import ProductMerchandisingStudio from '@/components/admin/ProductMerchandisingStudio';

export default function ProductsAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ProductMerchandisingStudio />
      {children}
    </>
  );
}
