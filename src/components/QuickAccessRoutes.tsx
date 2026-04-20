import Link from 'next/link';
import { Store, Wrench, User, Briefcase, CreditCard, ArrowRight } from 'lucide-react';

const ROUTES = [
  {
    title: 'Tienda',
    description: 'Materiales y productos seleccionados, listos para tu proyecto.',
    href: '/tienda',
    Icon: Store,
  },
  {
    title: 'Soluciones',
    description: 'Paquetes llave en mano: piso, estructura metalcon, revestimientos.',
    href: '/soluciones',
    Icon: Wrench,
  },
  {
    title: 'Proyectos',
    description: 'Obras terminadas con detalles técnicos y materiales usados.',
    href: '/proyectos',
    Icon: Briefcase,
  },
  {
    title: 'Mi cuenta',
    description: 'Accede o crea tu cuenta para seguir tus pedidos.',
    href: '/auth',
    Icon: User,
  },
  {
    title: 'Checkout',
    description: 'Compra segura, paga con transferencia o tarjeta sin salir del sitio.',
    href: '/checkout',
    Icon: CreditCard,
  },
];

export default function QuickAccessRoutes() {
  return (
    <section className="px-4 md:px-12 pt-16 md:pt-20 pb-8 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 md:mb-10 text-center">
          <p className="text-yellow-400/70 text-[10px] tracking-[0.35em] uppercase">Accesos Directos</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {ROUTES.map(({ title, description, href, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-3xl border border-white/10 bg-zinc-950/70 hover:border-yellow-400/40 transition-all duration-300 p-5 flex flex-col gap-4"
            >
              <div className="w-10 h-10 rounded-full border border-white/15 group-hover:border-yellow-400/50 flex items-center justify-center">
                <Icon className="w-4 h-4 text-zinc-400 group-hover:text-yellow-400 transition-colors" />
              </div>
              <div>
                <h3 className="text-white text-sm font-semibold tracking-wide uppercase">{title}</h3>
                <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{description}</p>
              </div>
              <span className="inline-flex items-center gap-2 text-yellow-400/80 text-[11px] tracking-wide mt-auto">
                Entrar
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
