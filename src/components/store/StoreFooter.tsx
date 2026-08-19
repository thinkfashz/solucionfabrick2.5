'use client';

import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import { FacebookBrandIcon, InstagramBrandIcon, WhatsAppBrandIcon } from '@/components/SocialBrandIcons';

export default function StoreFooter() {
  return (
    <footer className="py-16 border-t border-white/5">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <FabrickFullLogo className="mb-4" priority theme="light" />

        {/* Social */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <a href="https://www.instagram.com/solucionesfabrick/" target="_blank" rel="noopener noreferrer" aria-label="Instagram Soluciones Fabrick" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-xs font-black text-[#FFD05A] transition hover:border-[#FFB000] hover:bg-[#FFB000] hover:text-[#08090A]"><InstagramBrandIcon className="h-4 w-4" /> Instagram</a>
          <a href="https://www.facebook.com/FabrickSoluciones" target="_blank" rel="noopener noreferrer" aria-label="Facebook Fabrick Soluciones" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-xs font-black text-[#8DB9FF] transition hover:border-[#6D9DEA] hover:bg-[#4267B2] hover:text-white"><FacebookBrandIcon className="h-4 w-4" /> Facebook</a>
          <a href="https://wa.me/56930121625" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Soluciones Fabrick" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-xs font-black text-[#76E394] transition hover:border-[#25D366] hover:bg-[#25D366] hover:text-[#08120A]"><WhatsAppBrandIcon className="h-4 w-4" /> WhatsApp</a>
        </div>

        <p className="text-[11px] text-white/20 tracking-widest">
          © {new Date().getFullYear()} Soluciones Fabrick. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
