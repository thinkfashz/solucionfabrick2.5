import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, FileText, Mail, MapPin, Phone, ShieldCheck, Sparkles, User, type LucideIcon } from 'lucide-react';
import { getQuoteById } from '@/lib/budget';
import { buildProposal, formatCLP } from '@/lib/budgetMath';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Resumen del Proyecto | Fabrick`,
    description: `Cotización Fabrick #${id.slice(0, 8)}.`,
    robots: { index: false, follow: false },
  };
}

export default async function QuoteSummaryPage({ params }: PageProps) {
  const { id } = await params;
  const quote = await getQuoteById(id);
  if (!quote) notFound();

  const proposal = buildProposal({
    id: quote.id,
    lines: quote.lines,
    totals: quote.totals,
    customer: {
      name: quote.customer_name ?? undefined,
      email: quote.customer_email ?? undefined,
      phone: quote.customer_phone ?? undefined,
      region: quote.region ?? undefined,
      notes: quote.notes ?? undefined,
    },
    issuedAt: quote.created_at ? new Date(quote.created_at) : undefined,
  });

  const issued = quote.created_at ? new Date(quote.created_at) : new Date();

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-black text-zinc-100">
      {/* Glow background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(250,204,21,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,21,0.4) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[60rem] max-w-full -translate-x-1/2 rounded-full bg-yellow-400/[0.07] blur-3xl"
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 print:py-6">
        {/* Toolbar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href="/presupuesto"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-yellow-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al cotizador
          </Link>
          <PrintButton />
        </div>

        {/* Header card */}
        <header className="mb-8 overflow-hidden rounded-2xl border border-yellow-400/20 bg-zinc-950/60 p-6 shadow-[0_8px_40px_-12px_rgba(250,204,21,0.25)] backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-yellow-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> Propuesta Técnica
              </span>
              <h1 className="font-playfair mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
                Resumen del Proyecto
              </h1>
              <p className="mt-2 max-w-xl text-sm text-zinc-400">{proposal.summary}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500">Documento</p>
              <p className="font-mono text-sm font-semibold text-yellow-300">
                {proposal.docNumber}
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-400">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                {issued.toLocaleDateString('es-CL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Customer block */}
          <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-black/40 p-4 sm:grid-cols-2 sm:gap-4">
            <InfoRow icon={User} label="Cliente" value={quote.customer_name || '—'} />
            <InfoRow icon={Mail} label="Email" value={quote.customer_email || '—'} />
            <InfoRow icon={Phone} label="Teléfono" value={quote.customer_phone || '—'} />
            <InfoRow icon={MapPin} label="Región" value={quote.region || '—'} />
          </div>
        </header>

        {/* Sections */}
        <div className="space-y-6">
          {proposal.sections.map((section) => (
            <section
              key={section.category}
              className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  {section.label}
                </h2>
                <span className="text-xs text-zinc-400">
                  Subtotal:{' '}
                  <span className="font-semibold text-yellow-300">
                    {formatCLP(section.subtotal)}
                  </span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5 text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th scope="col" className="px-5 py-2 font-semibold">Ítem</th>
                      <th scope="col" className="px-5 py-2 font-semibold">Unidad</th>
                      <th scope="col" className="px-5 py-2 font-semibold text-right">Cantidad</th>
                      <th scope="col" className="px-5 py-2 font-semibold text-right">Precio</th>
                      <th scope="col" className="px-5 py-2 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {section.lines.map((l) => (
                      <tr key={l.materialId}>
                        <td className="px-5 py-3 font-medium text-white">{l.name}</td>
                        <td className="px-5 py-3 text-zinc-400">{l.unit ?? '—'}</td>
                        <td className="px-5 py-3 text-right text-zinc-200">{l.quantity}</td>
                        <td className="px-5 py-3 text-right text-zinc-200">
                          {formatCLP(l.unitPrice)}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-yellow-300">
                          {formatCLP(l.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        {/* Totals */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-yellow-400/25 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-6 shadow-[0_8px_40px_-12px_rgba(250,204,21,0.25)] sm:p-8">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-12">
            <TotalRow label="Subtotal materiales/servicios" value={formatCLP(proposal.totals.itemsSubtotal)} />
            {proposal.totals.shippingCost > 0 && (
              <TotalRow label="Despacho estimado" value={formatCLP(proposal.totals.shippingCost)} />
            )}
            {proposal.totals.installationCost > 0 && (
              <TotalRow
                label="Instalación"
                value={formatCLP(proposal.totals.installationCost)}
              />
            )}
            <TotalRow label="Subtotal afecto" value={formatCLP(proposal.totals.subtotal)} />
            <TotalRow
              label={`IVA (${Math.round(proposal.totals.ivaRate * 100)}%)`}
              value={formatCLP(proposal.totals.iva)}
              muted
            />
          </div>
          <div className="my-5 h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="text-[11px] uppercase tracking-[0.25em] text-zinc-400">
              Total estimado (IVA incluido)
            </span>
            <span className="font-playfair text-4xl font-bold text-yellow-300 sm:text-5xl">
              {formatCLP(proposal.totals.total)}
            </span>
          </div>
        </section>

        {/* Notes + footer */}
        {quote.notes && (
          <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-950/60 p-5 text-sm text-zinc-300 backdrop-blur-sm">
            <h3 className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <FileText className="h-3.5 w-3.5" aria-hidden /> Notas del cliente
            </h3>
            <p className="whitespace-pre-wrap">{quote.notes}</p>
          </section>
        )}

        <footer className="mt-8 rounded-2xl border border-white/5 bg-black/50 p-5 text-xs leading-relaxed text-zinc-500 sm:p-6">
          <div className="mb-2 inline-flex items-center gap-1.5 text-yellow-400/90">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            <span className="font-semibold uppercase tracking-wider">Validez</span>
          </div>
          <p>
            Esta propuesta es válida por <strong>{proposal.validityDays} días</strong> desde la
            fecha de emisión. Los precios son referenciales y la evaluación técnica final puede
            ajustarlos según terreno, ubicación y especificaciones definitivas.
          </p>
          <p className="mt-2">
            Soluciones Fabrick · Construcción y especialidades · Documento{' '}
            <span className="font-mono text-zinc-300">{proposal.docNumber}</span>
          </p>
        </footer>
      </div>
    </main>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-yellow-400/80" aria-hidden />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
        <p className="truncate text-sm text-white">{value}</p>
      </div>
    </div>
  );
}

function TotalRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between border-b border-white/5 py-1.5 last:border-b-0">
      <span className={muted ? 'text-zinc-500' : 'text-zinc-300'}>{label}</span>
      <span className={muted ? 'text-zinc-400' : 'font-semibold text-white'}>{value}</span>
    </div>
  );
}
