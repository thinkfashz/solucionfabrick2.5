'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { insforge } from '@/lib/insforge';

const NAV_ITEMS = [
  { icon: '🏠', label: 'Dashboard', href: '/admin' },
  { icon: '📦', label: 'Productos', href: '/admin/productos' },
  { icon: '🛒', label: 'Pedidos', href: '/admin/pedidos' },
  { icon: '👥', label: 'Clientes', href: '/admin/clientes' },
  { icon: '🚚', label: 'Entregas', href: '/admin/entregas' },
  { icon: '📊', label: 'Reportes', href: '/admin/reportes' },
  { icon: '⚙️', label: 'Configuración', href: '/admin/configuracion' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await insforge.auth.signOut();
    router.push('/auth');
  }

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0d0d0d', color: '#888888' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-30 flex flex-col transition-transform duration-300
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          width: 240,
          backgroundColor: '#111111',
          borderRight: '1px solid #1e1e1e',
        }}
      >
        {/* Sidebar header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid #1e1e1e' }}
        >
          <span className="font-bold tracking-widest text-sm" style={{ color: '#c9a96e' }}>
            FABRICK ADMIN
          </span>
          <button
            className="lg:hidden text-lg"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-6 py-3 text-sm transition-colors"
                style={{
                  color: active ? '#c9a96e' : '#888888',
                  backgroundColor: active ? '#1a1a1a' : 'transparent',
                  borderRight: active ? '2px solid #c9a96e' : '2px solid transparent',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{
            backgroundColor: '#111111',
            borderBottom: '1px solid #1e1e1e',
          }}
        >
          {/* Left: hamburger + brand */}
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden text-xl"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
              style={{ color: '#888888' }}
            >
              ☰
            </button>
            <span
              className="font-bold tracking-widest text-sm hidden lg:block"
              style={{ color: '#c9a96e' }}
            >
              FABRICK ADMIN
            </span>
          </div>

          {/* Right: admin name + logout */}
          <div className="flex items-center gap-4">
            <span className="text-sm hidden sm:block" style={{ color: '#888888' }}>
              Administrador
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 rounded text-xs font-medium transition-colors"
              style={{
                border: '1px solid #1e1e1e',
                color: '#888888',
                backgroundColor: '#161616',
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
