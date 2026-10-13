import { FacebookBrandIcon, InstagramBrandIcon, TikTokBrandIcon, WhatsAppBrandIcon } from '@/components/SocialBrandIcons';
import { buildWhatsAppLink, WHATSAPP_DISPLAY } from '@/lib/whatsapp';

export type RadierSocialLinks = { facebook?: string; instagram?: string; tiktok?: string };

/** Cierre de la página: redes, contacto directo y WhatsApp. Los links salen del CMS. */
export default function RadierSocial({ socialLinks, contactEmail }: { socialLinks?: RadierSocialLinks; contactEmail?: string }) {
  const social = [
    socialLinks?.instagram ? { href: socialLinks.instagram, label: 'Instagram', Icon: InstagramBrandIcon } : null,
    socialLinks?.facebook ? { href: socialLinks.facebook, label: 'Facebook', Icon: FacebookBrandIcon } : null,
    socialLinks?.tiktok ? { href: socialLinks.tiktok, label: 'TikTok', Icon: TikTokBrandIcon } : null,
  ].filter((item): item is { href: string; label: string; Icon: typeof InstagramBrandIcon } => item !== null);

  return (
    <section aria-labelledby="social-title" className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0A0F13]">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)] lg:items-center">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Seguimos en contacto</p>
          <h2 id="social-title" className="mt-1.5 text-2xl font-black tracking-[-.04em] sm:text-3xl">Obra documentada, en tus redes.</h2>
          <p className="mt-2 max-w-xl text-xs leading-5 text-white/50 sm:text-sm sm:leading-6">
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
        <dl className="grid content-start gap-0 border-t border-white/10 pt-4 lg:border-0 lg:pt-0">
          {[
            ['WhatsApp directo', WHATSAPP_DISPLAY],
            ['Correo', contactEmail?.trim() || 'contacto@fabrick.cl'],
            ['Zona', 'Linares, Región del Maule'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 border-b border-white/[.07] py-3">
              <dt className="text-[11px] text-white/40">{label}</dt>
              <dd className="text-sm font-black text-white/90">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
