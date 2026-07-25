import ProductsAdminWorkspace from '@/components/admin/ProductsAdminWorkspace';

export default function ProductsAdminLayout({ children }: { children: React.ReactNode }) {
  return <ProductsAdminWorkspace>{children}</ProductsAdminWorkspace>;
}
