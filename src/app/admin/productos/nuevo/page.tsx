import { redirect } from 'next/navigation';

export default function NuevoProductoPage() {
  redirect('/admin/productos?studio=new');
}
