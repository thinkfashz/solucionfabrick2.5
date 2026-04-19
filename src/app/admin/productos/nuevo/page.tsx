import type { Metadata } from 'next';
import ProductForm from '../ProductForm';

export const metadata: Metadata = {
  title: 'Nuevo Producto | Admin Fabrick',
};

export default function NuevoProductoPage() {
  return <ProductForm mode="create" />;
}