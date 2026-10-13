import Link from 'next/link';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import { FacebookBrandIcon, InstagramBrandIcon, TikTokBrandIcon, WhatsAppBrandIcon } from '@/components/SocialBrandIcons';
import { buildWhatsAppLink, WHATSAPP_DISPLAY } from '@/lib/whatsapp';

export type RadierSocialLinks = { facebook?: string; instagram?: string; tiktok?: string };

/** Pie de la página del radier: marca, accesos, contacto y redes. Los links salen del CMS. */
export default function RadierSocial({ socialLinks, contactEmail }: { socialLinks?: RadierSocialLinks; contactEmail?: string }) {
  const social = [
    socialLinks?.instagram ? { href: socialLinks.instagram, label: 'Instagram', Icon: InstagramBrandIcon } : null,
    socialLinks?.facebook ? { href: socialLinks.facebook, label: 'Facebook', Icon: FacebookBrandIcon } : null,
    socialLinks?.tiktok ? { href: socialLinks.tiktok, label: 'TikTok', Icon: TikTokBrandIcon } : null,
  ].filter((item): item is { href: string; label: string; Icon: typeof InstagramBrandIcon } => item !== null);

  return (
    <footer className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0A0F13]">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
        <div>
          <FabrickFullLogo compact theme="light" />
          <h2 className="mt-4 max-w-[22ch] text-xl font-black tracking-[-.03em] sm:text-2xl">Obra documentada, en tus redes.</h2>
          <p className="mt-2 max-w-xl text-xs leading-5 text-white/50">
            Publicamos avances, errores comunes y medidas reales. Sigue la cuenta y trae tus dudas al WhatsApp con el presupuesto en mano.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {social.map(({ href, label, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Soluciones Fabrick en ${label}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 px-4 text-[11px] font-black text-white/75 transition-colors duration-200 hover:border-[#F6C64A]/50 hover:text-[#F6C64A]">
                <Icon className="h-[16px] w-[16px]" aria-hidden />{label}
              </a>
            ))}
            <a href={buildWhatsAppLink('Hola Soluciones Fabrick, vengo de la guía del radier y quiero conversar mi proyecto.')} target="_blank" rel="noopener noreferrer" aria-label="Escríbenos por WhatsApp" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#F6C64A] px-4 text-[11px] font-black text-black transition-colors duration-200 hover:bg-white">
              <WhatsAppBrandIcon className="h-[16px] w-[16px]" aria-hidden />WhatsApp
            </a>
          </div>
        </div>
        <nav aria-label="Contacto y accesos del radier" className="grid content-start gap-0 border-t border-white/10 pt-2 lg:border-0 lg:pt-0">
          <div className="flex items-baseline justify-between gap-4 border-b border-white/[.07] py-3">
            <span className="text-[11px] text-white/40">WhatsApp directo</span>
            <span className="text-sm font-black text-white/90">{WHATSAPP_DISPLAY}</span>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-b border-white/[.07] py-3">
            <span className="text-[11px] text-white/40">Correo</span>
            <span className="text-sm font-black text-white/90">{contactEmail?.trim() || 'contacto@fabrick.cl'}</span>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-b border-white/[.07] py-3">
            <span className="text-[11px] text-white/40">Zona</span>
            <span className="text-sm font-black text-white/90">Linares, Región del Maule</span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-3">
            {[
              ['Calculadora', '#presupuesto-radier'],
              ['Guía completa', '#guia-completa'],
              ['Visor 4D', '/herramientas/radier/lab'],
              ['Tienda', '/tienda'],
            ].map(([label, href]) => (
              <Link key={label} href={href} className="text-[11px] font-bold text-white/50 transition hover:text-[#F6C64A]">{label}</Link>
            ))}
          </div>
        </nav>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-5 py-3.5 sm:px-7">
        <p className="text-[10px] text-white/30">© {new Date().getFullYear()} Soluciones Fabrick · Guía del radier</p>
        <p className="text-[10px] text-white/30">Referencia comercial, no cotización final</p>
      </div>
    </footer>
  );
}
