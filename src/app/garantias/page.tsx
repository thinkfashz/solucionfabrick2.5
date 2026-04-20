import type { Metadata } from 'next';
import {
  FileText,
  Clock,
  ShieldCheck,
  Wrench,
  Star,
  MessageCircle,
  Users,
  BadgeCheck,
} from 'lucide-react';
import SectionPageShell from '@/components/SectionPageShell';

const GUARANTEES = [
  {
    icon: FileText,
    title: 'Garantía escrita en contrato',
    description: 'Cada garantía queda documentada en el contrato de obra. Sin compromisos verbales ni promesas vagas — todo consta por escrito con plazos y condiciones claras.',
    period: '12 meses base',
  },
  {
    icon: ShieldCheck,
    title: 'Seguridad estructural certificada',
    description: 'Todas nuestras estructuras pasan revisión técnica de un profesional competente. Hormigón H-30, Metalcon certificado y procedimientos alineados con la OGUC.',
    period: '10 años estructura',
  },
  {
    icon: Clock,
    title: 'Cumplimiento de plazos',
    description: 'Si superamos la fecha de entrega pactada sin causa mayor documentada, aplicamos descuentos automáticos por día de atraso según contrato.',
    period: 'Plazo fijo en contrato',
  },
  {
    icon: Wrench,
    title: 'Postventa activa',
    description: 'Servicio de ajustes y correcciones post-entrega sin costo adicional dentro del período de garantía. Un equipo dedicado exclusivamente a responder solicitudes de clientes.',
    period: '12 meses postventa',
  },
  {
    icon: Star,
    title: 'Materiales de primera calidad',
    description: 'Solo trabajamos con marcas certificadas y con facturas de respaldo. Si detectas un material fuera de especificación, lo reemplazamos sin costo ni cuestionamiento.',
    period: 'Con respaldo de factura',
  },
  {
    icon: MessageCircle,
    title: 'Comunicación transparente',
    description: 'Reportes semanales de avance, acceso al jefe de obra y respuesta en menos de 4 horas hábiles a cualquier consulta o alerta durante la ejecución.',
    period: 'Durante toda la obra',
  },
  {
    icon: Users,
    title: 'Equipo propio certificado',
    description: 'No subcontratamos operarios desconocidos. Cada profesional que ingresa a tu propiedad pertenece a nuestro equipo, está identificado y tiene antecedentes vigentes.',
    period: 'Siempre equipo Fabrick',
  },
  {
    icon: BadgeCheck,
    title: 'Certificaciones técnicas',
    description: 'Entregamos todos los certificados exigidos por normativa: SEC eléctrico, SEC gasfitería, recepción municipal cuando corresponde y libro de obras completo.',
    period: 'Según normativa vigente',
  },
];

const FAQS = [
  {
    question: '¿Qué cubre exactamente la garantía de 12 meses?',
    answer: 'Cubre defectos de ejecución en cualquier partida realizada por Fabrick: filtraciones, fallas eléctricas, desprendimiento de revestimientos, problemas en instalaciones sanitarias y cualquier anomalía que no sea producto de mal uso o desgaste natural.',
  },
  {
    question: '¿Cómo solicito una reparación bajo garantía?',
    answer: 'Puedes escribirnos al correo garantias@fabrick.cl o contactarnos por WhatsApp. Respondemos en menos de 24 horas hábiles y coordinamos una visita de diagnóstico sin costo dentro de los 5 días siguientes.',
  },
  {
    question: '¿Las garantías aplican si yo suministro los materiales?',
    answer: 'La garantía de mano de obra aplica siempre. Sin embargo, si el cliente suministra materiales fuera de especificación técnica, la garantía sobre esa partida queda limitada a la instalación, no al material en sí.',
  },
  {
    question: '¿Qué pasa si el problema aparece después de los 12 meses?',
    answer: 'Los proyectos con problemas estructurales tienen garantía legal de 5 años según el Código Civil (Art. 2003). Para fallas menores post-garantía, ofrecemos tarifas preferenciales de postventa para clientes anteriores.',
  },
  {
    question: '¿La garantía es transferible si vendo la propiedad?',
    answer: 'Sí. Las garantías están vinculadas a la obra, no al cliente. Si vendes la propiedad dentro del período de garantía, el nuevo propietario puede hacer uso de ella con la misma documentación contractual.',
  },
];

const COMPARISON = [
  { aspect: 'Garantía escrita', withFabrick: true, without: false },
  { aspect: 'Cronograma documentado', withFabrick: true, without: false },
  { aspect: 'Certificaciones técnicas incluidas', withFabrick: true, without: false },
  { aspect: 'Materiales con factura', withFabrick: true, without: false },
  { aspect: 'Equipo identificado y certificado', withFabrick: true, without: false },
  { aspect: 'Postventa activa', withFabrick: true, without: false },
  { aspect: 'Reportes de avance semanales', withFabrick: true, without: false },
  { aspect: 'Presupuesto fijo sin sorpresas', withFabrick: true, without: false },
];

export const metadata: Metadata = {
  title: 'Garantías | Fabrick',
  description: 'Respaldo, postventa y tranquilidad en cada proyecto Fabrick. Garantías escritas, equipo certificado.',
};

export default function GarantiasPage() {
  return (
    <SectionPageShell
      eyebrow="Garantías"
      title="Tu tranquilidad también es parte del servicio"
      description="El valor de Fabrick no termina cuando se entrega una obra: continúa en el respaldo, el seguimiento y la claridad con la que respondemos."
      primaryAction={{ href: '/contacto', label: 'Pedir asesoría' }}
      secondaryAction={{ href: '/proyectos', label: 'Ver resultados' }}
    >
      {/* Guarantee cards */}
      <div className="mb-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {GUARANTEES.map(({ icon: Icon, title, description, period }) => (
          <div key={title} className="group flex flex-col rounded-[2rem] border border-white/5 bg-zinc-950/85 p-7 transition hover:border-yellow-400/30">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-yellow-400/20 bg-black transition group-hover:border-yellow-400/50">
              <Icon className="h-5 w-5 text-yellow-400" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-white">{title}</h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">{description}</p>
            <div className="mt-5 border-t border-white/5 pt-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-400">{period}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="mb-10 rounded-[2rem] border border-white/5 bg-zinc-950/80 p-8 md:p-12">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">Comparación</p>
        <h2 className="mb-8 text-2xl font-black uppercase tracking-tight text-white">Con Fabrick vs Sin Fabrick</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4 text-left text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">Aspecto</th>
                <th className="pb-4 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-400">Con Fabrick</th>
                <th className="pb-4 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">Sin Fabrick</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {COMPARISON.map(({ aspect, withFabrick, without }) => (
                <tr key={aspect}>
                  <td className="py-4 text-zinc-300">{aspect}</td>
                  <td className="py-4 text-center text-lg">{withFabrick ? '✅' : '❌'}</td>
                  <td className="py-4 text-center text-lg">{without ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="rounded-[2rem] border border-white/5 bg-zinc-950/80 p-8 md:p-12">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">Preguntas frecuentes</p>
        <h2 className="mb-8 text-2xl font-black uppercase tracking-tight text-white">Dudas sobre garantías</h2>
        <div className="space-y-6">
          {FAQS.map(({ question, answer }) => (
            <div key={question} className="rounded-2xl border border-white/5 bg-black/40 p-6">
              <h3 className="text-sm font-bold text-white">{question}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{answer}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionPageShell>
  );
}
