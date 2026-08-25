import ProductsAdminWorkspace from '@/components/admin/ProductsAdminWorkspace';
import ProductMarketContext from './ProductMarketContext';

export default function ProductsAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProductsAdminWorkspace>
      {children}
      <ProductMarketContext />
    </ProductsAdminWorkspace>
  );
}
