'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes, Import, LayoutGrid, Plus, Sparkles } from 'lucide-react';
import ProductMerchandisingStudio from '@/components/admin/ProductMerchandisingStudio';

function NavLink({ href, active, icon, children }: { href: string; active: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-black transition ${active ? 'bg-[#171820] text-[#F8F0E9] shadow-[0_12px_34px_rgba(23,24,32,.18)]' : 'bg-white/70 text-[#5E5148] hover:bg-white'}`}>
      {icon}{children}
    </Link>
  );
}

export default function ProductsAdminWorkspace({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isIndex = pathname === '/admin/productos';
  const isCreate = pathname === '/admin/productos/nuevo';
  const isEditor = pathname.includes('/editar');

  return (
    <div className="products-admin-workspace -mx-3 min-h-screen bg-[linear-gradient(180deg,#F8F0E9_0%,#EFE3D6_48%,#F8F0E9_100%)] px-3 pb-24 sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
      <header className="sticky top-0 z-40 -mx-3 border-b border-[#171820]/6 bg-[#F8F0E9]/90 px-3 py-3 backdrop-blur-2xl sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-[1680px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#171820] text-[#CCB196]"><Boxes className="h-5 w-5" /></span>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.23em] text-[#895E3D]">Catálogo comercial</p>
              <h1 className="text-lg font-black tracking-[-.035em] text-[#171820]">Productos, precios y vitrina</h1>
            </div>
          </div>
          <nav className="grid grid-cols-2 gap-2 sm:flex">
            <NavLink href="/admin/productos" active={isIndex} icon={<LayoutGrid className="h-4 w-4" />}>Catálogo</NavLink>
            <NavLink href="/admin/productos/nuevo" active={isCreate} icon={<Plus className="h-4 w-4" />}>Nuevo producto</NavLink>
            <a href="/admin/productos#importar" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white/70 px-4 text-xs font-black text-[#5E5148] transition hover:bg-white"><Import className="h-4 w-4" />Importar</a>
            <a href="/admin/productos#editor-comercial" className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-black transition ${isEditor ? 'bg-[#B6906C] text-[#171820]' : 'bg-white/70 text-[#5E5148] hover:bg-white'}`}><Sparkles className="h-4 w-4" />IA y vitrina</a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1680px] pt-5">
        {isIndex ? <div id="editor-comercial"><ProductMerchandisingStudio /></div> : null}
        {children}
      </div>

      <style jsx global>{`
        .products-admin-workspace [data-product-form] {
          margin: 0 !important;
          max-width: none !important;
          min-height: auto !important;
          padding-bottom: 7rem !important;
        }
        .products-admin-workspace [data-product-form] > div:first-child {
          border-radius: 1.75rem !important;
          box-shadow: 0 18px 55px rgba(23,24,32,.08) !important;
        }
        .products-admin-workspace [data-product-form] form > section,
        .products-admin-workspace [data-product-form] aside > div,
        .products-admin-workspace article,
        .products-admin-workspace table,
        .products-admin-workspace [class*="rounded-[2.2rem]"] {
          border-color: rgba(23,24,32,.06) !important;
        }
        .products-admin-workspace input,
        .products-admin-workspace textarea,
        .products-admin-workspace select {
          min-height: 48px;
          font-size: 14px;
        }
        .products-admin-workspace textarea { min-height: 128px; }
        .products-admin-workspace button,
        .products-admin-workspace a { -webkit-tap-highlight-color: transparent; }
        .products-admin-workspace .products-grid,
        .products-admin-workspace [data-products-grid] {
          grid-template-columns: repeat(auto-fit,minmax(260px,1fr)) !important;
        }
        @media (max-width: 640px) {
          .products-admin-workspace [data-product-form] > div:nth-child(2) {
            padding-left: 0 !important;
            padding-right: 0 !important;
            gap: 1rem !important;
          }
          .products-admin-workspace [data-product-form] form > section {
            border-radius: 1.35rem !important;
            padding: 1rem !important;
          }
          .products-admin-workspace article { border-radius: 1.35rem !important; }
        }
      `}</style>
    </div>
  );
}
