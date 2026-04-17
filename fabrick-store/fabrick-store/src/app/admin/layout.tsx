import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Admin | Fabrick',
  description: 'Panel de administración Fabrick',
};

const navLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/productos', label: 'Productos' },
  { href: '/admin/pedidos', label: 'Pedidos' },
  { href: '/admin/entregas', label: 'Entregas' },
  { href: '/admin/clientes', label: 'Clientes' },
  { href: '/admin/reportes', label: 'Reportes' },
  { href: '/admin/publicidad', label: 'Publicidad' },
  { href: '/admin/configuracion', label: 'Configuración' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto max-w-7xl flex items-center gap-4 px-6 py-4 overflow-x-auto">
          <Link href="/" className="font-playfair text-xl font-black tracking-[0.3em] text-yellow-400 hover:opacity-80 transition shrink-0">
            FABRICK
          </Link>
          <span className="text-white/20 text-xs uppercase tracking-widest shrink-0">Admin</span>
          <nav className="flex gap-1 ml-auto">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-medium text-zinc-400 hover:text-yellow-400 transition-colors duration-200 px-3 py-2 rounded-xl hover:bg-white/5 whitespace-nowrap"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}