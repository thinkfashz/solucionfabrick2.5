import Link from 'next/link';

const cards = [
  {
    href: '/admin/clientes',
    title: 'Clientes',
    description: 'Gestiona tus clientes, busca por nombre o email y revisa el historial de pedidos.',
    icon: '👥',
  },
  {
    href: '/admin/reportes',
    title: 'Reportes',
    description: 'Visualiza pedidos por semana, productos más vendidos e ingresos mensuales.',
    icon: '📊',
  },
  {
    href: '/admin/configuracion',
    title: 'Configuración',
    description: 'Actualiza los datos del negocio, WhatsApp, email de contacto y contraseña.',
    icon: '⚙️',
  },
];

export default function AdminPage() {
  return (
    <div>
      <h1 className="font-playfair text-4xl font-bold text-white mb-2">Panel de Administración</h1>
      <p className="text-zinc-400 mb-10 text-sm">Bienvenido al centro de control de Fabrick.</p>

      <div className="grid gap-6 md:grid-cols-3">
        {cards.map(({ href, title, description, icon }) => (
          <Link
            key={href}
            href={href}
            className="block rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8 hover:border-yellow-400/40 hover:bg-zinc-900/80 transition-all duration-200 group"
          >
            <span className="text-4xl mb-4 block">{icon}</span>
            <h2 className="text-lg font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">{title}</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
