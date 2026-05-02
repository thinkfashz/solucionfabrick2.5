'use client';

import { useState, type ChangeEvent } from 'react';
import dynamic from 'next/dynamic';
import {
  type CheckoutContent,
  type CheckoutPolicy,
  type CheckoutStep,
  type CustomInjectionContent,
  type Error404Content,
  type FooterContent,
  type GlobalStylesContent,
  type NavLinkItem,
  type NavMenuContent,
  type ProductContent,
  type ProductTrustBadge,
  type SectionContentMap,
  type SectionKey,
} from '@/lib/siteStructureTypes';

// Monaco is heavy; load it client-side only and lazily.
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-lg border border-yellow-400/20 bg-black/50 text-xs uppercase tracking-widest text-zinc-400">
      Cargando editor…
    </div>
  ),
});

type Props<K extends SectionKey> = {
  sectionKey: K;
  value: SectionContentMap[K];
  onChange: (next: SectionContentMap[K]) => void;
};

const fieldLabel =
  'block text-[10px] uppercase tracking-[0.25em] text-yellow-400/80 font-bold mb-1.5';
const inputCls =
  'w-full rounded-lg border border-yellow-400/15 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/50';
const textareaCls = `${inputCls} font-mono min-h-[80px] resize-y`;
const buttonCls =
  'inline-flex items-center justify-center rounded-full border border-yellow-400/40 px-3 py-1.5 text-[10px] uppercase tracking-widest text-yellow-400 hover:bg-yellow-400/10';
const dangerBtn =
  'inline-flex items-center justify-center rounded-full border border-red-500/40 px-3 py-1.5 text-[10px] uppercase tracking-widest text-red-400 hover:bg-red-500/10';

// ─────────────────────────────────────────────────────────────────────────────

function NavMenuForm({ value, onChange }: Props<'nav-menu'>) {
  const v = value as NavMenuContent;
  const updateLink = (i: number, patch: Partial<NavLinkItem>) => {
    const links = v.links.map((l, idx) => (idx === i ? { ...l, ...patch } : l));
    onChange({ ...v, links });
  };
  const addLink = () =>
    onChange({ ...v, links: [...v.links, { label: 'Nuevo', href: '/' }] });
  const removeLink = (i: number) =>
    onChange({ ...v, links: v.links.filter((_, idx) => idx !== i) });
  return (
    <div className="space-y-4">
      <div>
        <label className={fieldLabel}>Marca</label>
        <input
          className={inputCls}
          value={v.brand?.label ?? ''}
          onChange={e => onChange({ ...v, brand: { ...(v.brand ?? { label: '' }), label: e.target.value } })}
        />
      </div>
      <div>
        <label className={fieldLabel}>Logo URL (opcional)</label>
        <input
          className={inputCls}
          value={v.brand?.logoUrl ?? ''}
          onChange={e => onChange({ ...v, brand: { ...(v.brand ?? { label: '' }), logoUrl: e.target.value } })}
        />
      </div>
      <div className="rounded-2xl border border-yellow-400/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className={fieldLabel}>Enlaces</span>
          <button type="button" onClick={addLink} className={buttonCls}>+ Añadir</button>
        </div>
        {v.links.map((link, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input
              className={`${inputCls} col-span-5`}
              placeholder="Etiqueta"
              value={link.label}
              onChange={e => updateLink(i, { label: e.target.value })}
            />
            <input
              className={`${inputCls} col-span-5`}
              placeholder="/ruta"
              value={link.href}
              onChange={e => updateLink(i, { href: e.target.value })}
            />
            <button type="button" onClick={() => removeLink(i)} className={`${dangerBtn} col-span-2`}>
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-yellow-400/10 p-4 space-y-3">
        <span className={fieldLabel}>CTA principal</span>
        <input
          className={inputCls}
          placeholder="Etiqueta"
          value={v.cta?.label ?? ''}
          onChange={e => onChange({ ...v, cta: { ...(v.cta ?? { label: '', href: '/' }), label: e.target.value } })}
        />
        <input
          className={inputCls}
          placeholder="/ruta"
          value={v.cta?.href ?? ''}
          onChange={e => onChange({ ...v, cta: { ...(v.cta ?? { label: '', href: '/' }), href: e.target.value } })}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function FooterForm({ value, onChange }: Props<'footer'>) {
  const v = value as FooterContent;
  return (
    <div className="space-y-4">
      <div>
        <label className={fieldLabel}>Tagline</label>
        <input className={inputCls} value={v.tagline ?? ''} onChange={e => onChange({ ...v, tagline: e.target.value })} />
      </div>
      <div>
        <label className={fieldLabel}>Texto legal / copyright</label>
        <input className={inputCls} value={v.legal ?? ''} onChange={e => onChange({ ...v, legal: e.target.value })} />
        <p className="mt-1 text-[10px] text-zinc-500">Soporta el placeholder <code>{'{year}'}</code>.</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function GlobalStylesForm({ value, onChange }: Props<'global-styles'>) {
  const v = value as GlobalStylesContent;
  const updateColor = (k: keyof GlobalStylesContent['colors'], val: string) =>
    onChange({ ...v, colors: { ...v.colors, [k]: val } });
  return (
    <div className="space-y-4">
      <div>
        <label className={fieldLabel}>Color de acento</label>
        <input className={inputCls} value={v.colors.accent} onChange={e => updateColor('accent', e.target.value)} />
      </div>
      <div>
        <label className={fieldLabel}>Acento suave</label>
        <input className={inputCls} value={v.colors.accentSoft} onChange={e => updateColor('accentSoft', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabel}>Fondo</label>
          <input className={inputCls} value={v.colors.background} onChange={e => updateColor('background', e.target.value)} />
        </div>
        <div>
          <label className={fieldLabel}>Primer plano</label>
          <input className={inputCls} value={v.colors.foreground} onChange={e => updateColor('foreground', e.target.value)} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function CheckoutForm({ value, onChange }: Props<'checkout'>) {
  const v = value as CheckoutContent;
  const updateStep = (i: number, patch: Partial<CheckoutStep>) =>
    onChange({ ...v, steps: v.steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });
  const updatePolicy = (i: number, patch: Partial<CheckoutPolicy>) =>
    onChange({
      ...v,
      warrantyPolicies: v.warrantyPolicies.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    });
  const addPolicy = () =>
    onChange({
      ...v,
      warrantyPolicies: [...v.warrantyPolicies, { title: 'Nueva política', body: '' }],
    });
  const removePolicy = (i: number) =>
    onChange({ ...v, warrantyPolicies: v.warrantyPolicies.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-yellow-400/10 p-4 space-y-3">
        <span className={fieldLabel}>Pasos</span>
        {v.steps.map((s, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input
              className={`${inputCls} col-span-3`}
              value={s.id}
              onChange={e => updateStep(i, { id: e.target.value })}
            />
            <input
              className={`${inputCls} col-span-4`}
              value={s.title}
              onChange={e => updateStep(i, { title: e.target.value })}
            />
            <input
              className={`${inputCls} col-span-5`}
              value={s.description}
              onChange={e => updateStep(i, { description: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-yellow-400/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className={fieldLabel}>Políticas de garantía</span>
          <button type="button" onClick={addPolicy} className={buttonCls}>+ Añadir</button>
        </div>
        {v.warrantyPolicies.map((p, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-yellow-400/5 p-3">
            <div className="flex gap-2">
              <input
                className={`${inputCls} flex-1`}
                value={p.title}
                onChange={e => updatePolicy(i, { title: e.target.value })}
              />
              <button type="button" onClick={() => removePolicy(i)} className={dangerBtn}>✕</button>
            </div>
            <textarea
              className={textareaCls}
              value={p.body}
              onChange={e => updatePolicy(i, { body: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-yellow-400/10 p-4 space-y-3">
        <span className={fieldLabel}>Mensajes de pago</span>
        <input
          className={inputCls}
          placeholder="Aprobado"
          value={v.successMessages.approved}
          onChange={e => onChange({ ...v, successMessages: { ...v.successMessages, approved: e.target.value } })}
        />
        <input
          className={inputCls}
          placeholder="Pendiente"
          value={v.successMessages.pending}
          onChange={e => onChange({ ...v, successMessages: { ...v.successMessages, pending: e.target.value } })}
        />
        <input
          className={inputCls}
          placeholder="Rechazado"
          value={v.successMessages.rejected}
          onChange={e => onChange({ ...v, successMessages: { ...v.successMessages, rejected: e.target.value } })}
        />
      </div>
      <div>
        <label className={fieldLabel}>Nota legal</label>
        <textarea
          className={textareaCls}
          value={v.legalNote}
          onChange={e => onChange({ ...v, legalNote: e.target.value })}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ProductoForm({ value, onChange }: Props<'producto'>) {
  const v = value as ProductContent;
  const updateBadge = (i: number, patch: Partial<ProductTrustBadge>) =>
    onChange({
      ...v,
      trustBadges: v.trustBadges.map((b, idx) => (idx === i ? { ...b, ...patch } : b)),
    });
  return (
    <div className="space-y-4">
      <div>
        <label className={fieldLabel}>Etiqueta &quot;añadir al carrito&quot;</label>
        <input className={inputCls} value={v.addToCartLabel} onChange={e => onChange({ ...v, addToCartLabel: e.target.value })} />
      </div>
      <div>
        <label className={fieldLabel}>Etiqueta sin stock</label>
        <input className={inputCls} value={v.outOfStockLabel} onChange={e => onChange({ ...v, outOfStockLabel: e.target.value })} />
      </div>
      <div>
        <label className={fieldLabel}>Nota de despacho</label>
        <input className={inputCls} value={v.shippingNote} onChange={e => onChange({ ...v, shippingNote: e.target.value })} />
      </div>
      <div>
        <label className={fieldLabel}>Encabezado &quot;productos relacionados&quot;</label>
        <input className={inputCls} value={v.relatedProductsHeading} onChange={e => onChange({ ...v, relatedProductsHeading: e.target.value })} />
      </div>
      <div className="rounded-2xl border border-yellow-400/10 p-4 space-y-3">
        <span className={fieldLabel}>Insignias de confianza</span>
        {v.trustBadges.map((b, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input
              className={`${inputCls} col-span-4`}
              value={b.label}
              onChange={e => updateBadge(i, { label: e.target.value })}
            />
            <input
              className={`${inputCls} col-span-8`}
              value={b.description}
              onChange={e => updateBadge(i, { description: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Error404Form({ value, onChange }: Props<'error-404'>) {
  const v = value as Error404Content;
  return (
    <div className="space-y-4">
      <div>
        <label className={fieldLabel}>Título</label>
        <input className={inputCls} value={v.title} onChange={e => onChange({ ...v, title: e.target.value })} />
      </div>
      <div>
        <label className={fieldLabel}>Subtítulo</label>
        <textarea className={textareaCls} value={v.subtitle} onChange={e => onChange({ ...v, subtitle: e.target.value })} />
      </div>
      <div>
        <label className={fieldLabel}>URL de imagen</label>
        <input className={inputCls} value={v.imageUrl} onChange={e => onChange({ ...v, imageUrl: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabel}>Etiqueta CTA</label>
          <input className={inputCls} value={v.ctaLabel} onChange={e => onChange({ ...v, ctaLabel: e.target.value })} />
        </div>
        <div>
          <label className={fieldLabel}>Destino CTA</label>
          <input className={inputCls} value={v.ctaHref} onChange={e => onChange({ ...v, ctaHref: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function CustomInjectionForm({ value, onChange }: Props<'custom-injection'>) {
  const v = value as CustomInjectionContent;
  const [tab, setTab] = useState<'css' | 'head' | 'body-html' | 'body-js'>('css');
  const [acknowledged, setAcknowledged] = useState(false);

  const setEnabled = (enabled: boolean) => {
    if (enabled && !acknowledged) return;
    onChange({ ...v, enabled });
  };

  const editor = (() => {
    switch (tab) {
      case 'css':
        return (
          <MonacoEditor
            height="320px"
            theme="vs-dark"
            language="css"
            value={v.css}
            onChange={(val) => onChange({ ...v, css: val ?? '' })}
            options={{ minimap: { enabled: false }, fontSize: 13 }}
          />
        );
      case 'head':
        return (
          <MonacoEditor
            height="320px"
            theme="vs-dark"
            language="html"
            value={v.head?.html ?? ''}
            onChange={(val) => onChange({ ...v, head: { html: val ?? '' } })}
            options={{ minimap: { enabled: false }, fontSize: 13 }}
          />
        );
      case 'body-html':
        return (
          <MonacoEditor
            height="320px"
            theme="vs-dark"
            language="html"
            value={v.bodyEnd?.html ?? ''}
            onChange={(val) => onChange({ ...v, bodyEnd: { ...(v.bodyEnd ?? { html: '', js: '' }), html: val ?? '' } })}
            options={{ minimap: { enabled: false }, fontSize: 13 }}
          />
        );
      case 'body-js':
        return (
          <MonacoEditor
            height="320px"
            theme="vs-dark"
            language="javascript"
            value={v.bodyEnd?.js ?? ''}
            onChange={(val) => onChange({ ...v, bodyEnd: { ...(v.bodyEnd ?? { html: '', js: '' }), js: val ?? '' } })}
            options={{ minimap: { enabled: false }, fontSize: 13 }}
          />
        );
    }
  })();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-4 text-xs text-red-200 leading-relaxed">
        <p className="font-bold uppercase tracking-widest mb-1 text-red-300">⚠ Inyección de código</p>
        <p>
          Este bloque ejecuta HTML/JS/CSS en cada página del sitio. Solo el rol
          administrador puede guardarlo. Asegúrate de probar siempre primero.
        </p>
      </div>

      <label className="flex items-center gap-3 text-xs text-zinc-300">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setAcknowledged(e.target.checked)}
          className="h-4 w-4 accent-yellow-400"
        />
        Entiendo que este código se ejecuta en cada visita.
      </label>

      <label className="flex items-center gap-3 text-xs text-zinc-300">
        <input
          type="checkbox"
          checked={v.enabled}
          disabled={!acknowledged}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEnabled(e.target.checked)}
          className="h-4 w-4 accent-yellow-400"
        />
        Activar inyección en producción.
      </label>

      <div className="flex gap-2 border-b border-yellow-400/10 pb-2">
        {([
          ['css', 'CSS'],
          ['head', '<head> HTML'],
          ['body-html', 'Body HTML'],
          ['body-js', 'Body JS'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-widest ${tab === key ? 'bg-yellow-400 text-black' : 'border border-yellow-400/20 text-yellow-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {editor}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function SectionForm<K extends SectionKey>({
  sectionKey,
  value,
  onChange,
}: Props<K>) {
  switch (sectionKey) {
    case 'nav-menu':
      return <NavMenuForm sectionKey="nav-menu" value={value as NavMenuContent} onChange={onChange as (n: NavMenuContent) => void} />;
    case 'footer':
      return <FooterForm sectionKey="footer" value={value as FooterContent} onChange={onChange as (n: FooterContent) => void} />;
    case 'global-styles':
      return <GlobalStylesForm sectionKey="global-styles" value={value as GlobalStylesContent} onChange={onChange as (n: GlobalStylesContent) => void} />;
    case 'checkout':
      return <CheckoutForm sectionKey="checkout" value={value as CheckoutContent} onChange={onChange as (n: CheckoutContent) => void} />;
    case 'producto':
      return <ProductoForm sectionKey="producto" value={value as ProductContent} onChange={onChange as (n: ProductContent) => void} />;
    case 'error-404':
      return <Error404Form sectionKey="error-404" value={value as Error404Content} onChange={onChange as (n: Error404Content) => void} />;
    case 'custom-injection':
      return <CustomInjectionForm sectionKey="custom-injection" value={value as CustomInjectionContent} onChange={onChange as (n: CustomInjectionContent) => void} />;
    default:
      return null;
  }
}
