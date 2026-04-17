import type { Metadata } from 'next';
import Link from 'next/link';
import AdminLogoutButton from './AdminLogoutButton';

export const metadata: Metadata = {
  title: 'Admin | Fabrick',
  description: 'Panel de administración Fabrick',
};

const navLinks = [
  { href: '/admin/clientes', label: 'Clientes' },
  { href: '/admin/reportes', label: 'Reportes' },
  { href: '/admin/configuracion', label: 'Configuración' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar / Top nav */}
      <header className="border-b border-white/10 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto max-w-7xl flex items-center gap-8 px-6 py-4">
          <Link href="/" className="font-playfair text-xl font-black tracking-[0.3em] text-yellow-400 hover:opacity-80 transition">
            FABRICK
          </Link>
          <span className="text-white/20 text-xs uppercase tracking-widest">Admin</span>
          <nav className="flex gap-4 ml-auto">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-medium text-zinc-400 hover:text-yellow-400 transition-colors duration-200 px-3 py-2 rounded-xl hover:bg-white/5"
              >
                {label}
              </Link>
            ))}
          </nav>
          <AdminLogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
