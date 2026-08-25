import { redirect } from 'next/navigation';

export default function ImportarProductoPage() {
  redirect('/admin/productos?import=url');
}
