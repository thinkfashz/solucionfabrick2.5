'use client';

import { useState, type ChangeEvent } from 'react';
import dynamic from 'next/dynamic';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
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
    <div className="flex h-64 items-center justify-center rounded-xl border border-yellow-400/20 bg-black/50 text-xs uppercase tracking-widest text-zinc-400">
      Cargando editor…
    </div>
  ),
});

type Props<K extends SectionKey> = {
  sectionKey: K;
  value: SectionContentMap[K];
  onChange: (next: SectionContentMap[K]) => void;
};

// ── Shared style tokens ────────────────────────────────────────────────────
const fieldLabel = 'block text-[10px] uppercase tracking-[0.25em] text-yellow-400/80 font-bold mb-1.5';
const inputCls   = 'w-full rounded-xl border border-yellow-400/15 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/40 transition-colors';
const textareaCls = `${inputCls} font-mono min-h-[80px] resize-y`;

// Primary action button (gold outline, subtle glow on hover)
const buttonCls =
  'inline-flex items-center justify-center gap-1.5 rounded-full border border-yellow-400/40 px-3.5 py-1.5 text-[10px] uppercase tracking-widest text-yellow-400 transition-all hover:bg-yellow-400/10 hover:border-yellow-400/70 hover:shadow-[0_0_12px_rgba(250,204,21,0.2)] active:scale-95 font-bold';

// Danger button (red)
const dangerBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-full border border-red-500/30 px-3 py-1.5 text-[10px] uppercase tracking-widest text-red-400/80 transition-all hover:border-red-500/70 hover:bg-red-500/10 hover:text-red-300 active:scale-95 font-bold';

// Card container
const cardCls = 'rounded-2xl border border-yellow-400/10 bg-black/40 p-4 space-y-3';

// ── Toggle switch component (Uiverse-style) ────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60',
        checked
          ? 'border-yellow-400 bg-yellow-400 shadow-[0_0_14px_rgba(250,204,21,0.4)]'
          : 'border-zinc-700 bg-zinc-800',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-3.5 w-3.5 rounded-full shadow-lg ring-0 transition-transform duration-200 mt-0.5',
          checked ? 'translate-x-4 bg-black' : 'translate-x-0.5 bg-zinc-400',
        ].join(' ')}
      />
    </button>
  );
}

// ── NavMenuForm — with sortable links ──────────────────────────────────────

interface SortableLinkRowProps {
  id: string;
  link: NavLinkItem;
  index: number;
  onUpdate: (i: number, patch: Partial<NavLinkItem>) => void;
  onRemove: (i: number) => void;
}

function SortableLinkRow({ id, link, index, onUpdate, onRemove }: SortableLinkRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing p-1.5 rounded-lg hover:bg-yellow-400/10 text-zinc-600 hover:text-yellow-400/60 transition-colors touch-none"
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <input
        className={`${inputCls} flex-1`}
        placeholder="Etiqueta"
        value={link.label}
        onChange={(e) => onUpdate(index, { label: e.target.value })}
      />
      <input
        className={`${inputCls} flex-1`}
        placeholder="/ruta"
        value={link.href}
        onChange={(e) => onUpdate(index, { href: e.target.value })}
      />
      <button type="button" onClick={() => onRemove(index)} className={dangerBtn}>
        ✕
      </button>
    </div>
  );
}

function NavMenuForm({ value, onChange }: Props<'nav-menu'>) {
  const v = value as NavMenuContent;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Stable IDs for DnD (index-based keying not reliable during drag)
  const [linkIds] = useState(() => v.links.map((_, i) => `link-${i}-${Date.now()}`));
  const [ids, setIds] = useState(linkIds);

  const updateLink = (i: number, patch: Partial<NavLinkItem>) => {
    const links = v.links.map((l, idx) => (idx === i ? { ...l, ...patch } : l));
    onChange({ ...v, links });
  };

  const addLink = () => {
    const newId = `link-new-${Date.now()}`;
    setIds((prev) => [...prev, newId]);
    onChange({ ...v, links: [...v.links, { label: 'Nuevo', href: '/' }] });
  };

  const removeLink = (i: number) => {
    setIds((prev) => prev.filter((_, idx) => idx !== i));
    onChange({ ...v, links: v.links.filter((_, idx) => idx !== i) });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    const newIds = arrayMove(ids, oldIdx, newIdx);
    const newLinks = arrayMove(v.links, oldIdx, newIdx);
    setIds(newIds);
    onChange({ ...v, links: newLinks });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={fieldLabel}>Marca</label>
        <input
          className={inputCls}
          value={v.brand?.label ?? ''}
          onChange={(e) => onChange({ ...v, brand: { ...(v.brand ?? { label: '' }), label: e.target.value } })}
        />
      </div>
      <div>
        <label className={fieldLabel}>Logo URL (opcional)</label>
        <input
          className={inputCls}
          value={v.brand?.logoUrl ?? ''}
          onChange={(e) => onChange({ ...v, brand: { ...(v.brand ?? { label: '' }), logoUrl: e.target.value } })}
        />
      </div>

      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <span className={fieldLabel}>
            <span className="mr-1.5 opacity-60">⠿</span> Enlaces ({v.links.length}) — arrastra para reordenar
          </span>
          <button type="button" onClick={addLink} className={buttonCls}>+ Añadir</button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {v.links.map((link, i) => (
                <SortableLinkRow
                  key={ids[i] ?? i}
                  id={ids[i] ?? String(i)}
                  link={link}
                  index={i}
                  onUpdate={updateLink}
                  onRemove={removeLink}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {v.links.length === 0 && (
          <p className="text-xs text-zinc-600 text-center py-2">Sin enlaces. Añade el primero.</p>
        )}
      </div>

      <div className={cardCls}>
        <span className={fieldLabel}>CTA principal</span>
        <input
          className={inputCls}
          placeholder="Etiqueta"
          value={v.cta?.label ?? ''}
          onChange={(e) => onChange({ ...v, cta: { ...(v.cta ?? { label: '', href: '/' }), label: e.target.value } })}
        />
        <input
          className={inputCls}
          placeholder="/ruta"
          value={v.cta?.href ?? ''}
          onChange={(e) => onChange({ ...v, cta: { ...(v.cta ?? { label: '', href: '/' }), href: e.target.value } })}
        />
      </div>
    </div>
  );
}

// ── FooterForm ─────────────────────────────────────────────────────────────

function FooterForm({ value, onChange }: Props<'footer'>) {
  const v = value as FooterContent;
  return (
    <div className="space-y-4">
      <div>
        <label className={fieldLabel}>Tagline</label>
        <input className={inputCls} value={v.tagline ?? ''} onChange={(e) => onChange({ ...v, tagline: e.target.value })} />
      </div>
      <div>
        <label className={fieldLabel}>Texto legal / copyright</label>
        <input className={inputCls} value={v.legal ?? ''} onChange={(e) => onChange({ ...v, legal: e.target.value })} />
        <p className="mt-1.5 text-[10px] text-zinc-500">Soporta el placeholder <code className="text-yellow-400/60">{'{year}'}</code>.</p>
      </div>
    </div>
  );
}

// ── GlobalStylesForm ───────────────────────────────────────────────────────

function GlobalStylesForm({ value, onChange }: Props<'global-styles'>) {
  const v = value as GlobalStylesContent;
  const updateColor = (k: keyof GlobalStylesContent['colors'], val: string) =>
    onChange({ ...v, colors: { ...v.colors, [k]: val } });

  const colorField = (label: string, key: keyof GlobalStylesContent['colors']) => (
    <div key={key}>
      <label className={fieldLabel}>{label}</label>
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg border border-yellow-400/20 shrink-0 cursor-pointer relative overflow-hidden"
          style={{ background: v.colors[key] }}
        >
          <input
            type="color"
            value={v.colors[key]}
            onChange={(e) => updateColor(key, e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
        <input
          className={inputCls}
          value={v.colors[key]}
          onChange={(e) => updateColor(key, e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {colorField('Color de acento', 'accent')}
      {colorField('Acento suave', 'accentSoft')}
      <div className="grid grid-cols-2 gap-3">
        {colorField('Fondo', 'background')}
        {colorField('Primer plano', 'foreground')}
      </div>
    </div>
  );
}

// ── CheckoutForm ───────────────────────────────────────────────────────────

function CheckoutForm({ value, onChange }: Props<'checkout'>) {
  const v = value as CheckoutContent;
  const updateStep = (i: number, patch: Partial<CheckoutStep>) =>
    onChange({ ...v, steps: v.steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });
  const updatePolicy = (i: number, patch: Partial<CheckoutPolicy>) =>
    onChange({ ...v, warrantyPolicies: v.warrantyPolicies.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
  const addPolicy = () =>
    onChange({ ...v, warrantyPolicies: [...v.warrantyPolicies, { title: 'Nueva política', body: '' }] });
  const removePolicy = (i: number) =>
    onChange({ ...v, warrantyPolicies: v.warrantyPolicies.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      <div className={cardCls}>
        <span className={fieldLabel}>Pasos</span>
        {v.steps.map((s, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input className={`${inputCls} col-span-3 text-xs`} value={s.id}          onChange={(e) => updateStep(i, { id: e.target.value })} placeholder="ID" />
            <input className={`${inputCls} col-span-4 text-xs`} value={s.title}       onChange={(e) => updateStep(i, { title: e.target.value })} placeholder="Título" />
            <input className={`${inputCls} col-span-5 text-xs`} value={s.description} onChange={(e) => updateStep(i, { description: e.target.value })} placeholder="Descripción" />
          </div>
        ))}
      </div>

      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <span className={fieldLabel}>Políticas de garantía</span>
          <button type="button" onClick={addPolicy} className={buttonCls}>+ Añadir</button>
        </div>
        {v.warrantyPolicies.map((p, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-yellow-400/8 bg-black/30 p-3">
            <div className="flex gap-2">
              <input className={`${inputCls} flex-1 text-xs`} value={p.title} onChange={(e) => updatePolicy(i, { title: e.target.value })} />
              <button type="button" onClick={() => removePolicy(i)} className={dangerBtn}>✕</button>
            </div>
            <textarea className={`${textareaCls} text-xs`} value={p.body} onChange={(e) => updatePolicy(i, { body: e.target.value })} />
          </div>
        ))}
      </div>

      <div className={cardCls}>
        <span className={fieldLabel}>Mensajes de pago</span>
        {[
          ['approved', 'Aprobado ✓', v.successMessages.approved],
          ['pending',  'Pendiente ⏳', v.successMessages.pending],
          ['rejected', 'Rechazado ✕',  v.successMessages.rejected],
        ].map(([key, placeholder, val]) => (
          <input
            key={key}
            className={inputCls}
            placeholder={placeholder}
            value={val}
            onChange={(e) => onChange({ ...v, successMessages: { ...v.successMessages, [key]: e.target.value } })}
          />
        ))}
      </div>

      <div>
        <label className={fieldLabel}>Nota legal</label>
        <textarea className={textareaCls} value={v.legalNote} onChange={(e) => onChange({ ...v, legalNote: e.target.value })} />
      </div>
    </div>
  );
}

// ── ProductoForm ───────────────────────────────────────────────────────────

function ProductoForm({ value, onChange }: Props<'producto'>) {
  const v = value as ProductContent;
  const updateBadge = (i: number, patch: Partial<ProductTrustBadge>) =>
    onChange({ ...v, trustBadges: v.trustBadges.map((b, idx) => (idx === i ? { ...b, ...patch } : b)) });

  return (
    <div className="space-y-4">
      {[
        ['addToCartLabel',          'Etiqueta "añadir al carrito"', v.addToCartLabel],
        ['outOfStockLabel',         'Etiqueta sin stock',           v.outOfStockLabel],
        ['shippingNote',            'Nota de despacho',             v.shippingNote],
        ['relatedProductsHeading',  'Encabezado productos relacionados', v.relatedProductsHeading],
      ].map(([key, label, val]) => (
        <div key={key}>
          <label className={fieldLabel}>{label}</label>
          <input className={inputCls} value={val} onChange={(e) => onChange({ ...v, [key]: e.target.value })} />
        </div>
      ))}

      <div className={cardCls}>
        <span className={fieldLabel}>Insignias de confianza</span>
        {v.trustBadges.map((b, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input className={`${inputCls} col-span-4 text-xs`} value={b.label}       onChange={(e) => updateBadge(i, { label: e.target.value })} placeholder="Etiqueta" />
            <input className={`${inputCls} col-span-8 text-xs`} value={b.description} onChange={(e) => updateBadge(i, { description: e.target.value })} placeholder="Descripción" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Error404Form ───────────────────────────────────────────────────────────

function Error404Form({ value, onChange }: Props<'error-404'>) {
  const v = value as Error404Content;
  return (
    <div className="space-y-4">
      <div>
        <label className={fieldLabel}>Título</label>
        <input className={inputCls} value={v.title} onChange={(e) => onChange({ ...v, title: e.target.value })} />
      </div>
      <div>
        <label className={fieldLabel}>Subtítulo</label>
        <textarea className={textareaCls} value={v.subtitle} onChange={(e) => onChange({ ...v, subtitle: e.target.value })} />
      </div>
      <div>
        <label className={fieldLabel}>URL de imagen</label>
        <input className={inputCls} value={v.imageUrl} onChange={(e) => onChange({ ...v, imageUrl: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabel}>Etiqueta CTA</label>
          <input className={inputCls} value={v.ctaLabel} onChange={(e) => onChange({ ...v, ctaLabel: e.target.value })} />
        </div>
        <div>
          <label className={fieldLabel}>Destino CTA</label>
          <input className={inputCls} value={v.ctaHref} onChange={(e) => onChange({ ...v, ctaHref: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

// ── CustomInjectionForm ────────────────────────────────────────────────────

function CustomInjectionForm({ value, onChange }: Props<'custom-injection'>) {
  const v = value as CustomInjectionContent;
  const [tab, setTab] = useState<'css' | 'head' | 'body-html' | 'body-js'>('css');
  const [acknowledged, setAcknowledged] = useState(false);

  const setEnabled = (enabled: boolean) => {
    if (enabled && !acknowledged) return;
    onChange({ ...v, enabled });
  };

  const editor = (() => {
    const opts = { minimap: { enabled: false }, fontSize: 13 };
    switch (tab) {
      case 'css':
        return <MonacoEditor height="320px" theme="vs-dark" language="css"        value={v.css}              onChange={(val) => onChange({ ...v, css: val ?? '' })}                                                     options={opts} />;
      case 'head':
        return <MonacoEditor height="320px" theme="vs-dark" language="html"       value={v.head?.html ?? ''} onChange={(val) => onChange({ ...v, head: { html: val ?? '' } })}                                          options={opts} />;
      case 'body-html':
        return <MonacoEditor height="320px" theme="vs-dark" language="html"       value={v.bodyEnd?.html ?? ''} onChange={(val) => onChange({ ...v, bodyEnd: { ...(v.bodyEnd ?? { html: '', js: '' }), html: val ?? '' } })} options={opts} />;
      case 'body-js':
        return <MonacoEditor height="320px" theme="vs-dark" language="javascript" value={v.bodyEnd?.js ?? ''}   onChange={(val) => onChange({ ...v, bodyEnd: { ...(v.bodyEnd ?? { html: '', js: '' }), js: val ?? '' } })}   options={opts} />;
    }
  })();

  return (
    <div className="space-y-4">
      {/* Warning card */}
      <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.04] p-4 text-xs text-red-200 leading-relaxed">
        <p className="font-bold uppercase tracking-widest mb-1 text-red-300">⚠ Inyección de código</p>
        <p>Este bloque ejecuta HTML/JS/CSS en cada página del sitio. Solo el rol administrador puede guardarlo. Asegúrate de probar siempre primero.</p>
      </div>

      {/* Acknowledgment toggle */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <Toggle checked={acknowledged} onChange={setAcknowledged} />
        <span className="text-xs text-zinc-300 group-hover:text-zinc-200 transition-colors select-none">
          Entiendo que este código se ejecuta en cada visita.
        </span>
      </label>

      {/* Enable toggle */}
      <label className={`flex items-center gap-3 ${!acknowledged ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer group'}`}>
        <Toggle checked={v.enabled} onChange={setEnabled} disabled={!acknowledged} />
        <span className="text-xs text-zinc-300 select-none">Activar inyección en producción.</span>
      </label>

      {/* Code tabs */}
      <div className="flex gap-1.5 border-b border-yellow-400/10 pb-2 flex-wrap">
        {([
          ['css',       'CSS'],
          ['head',      '<head> HTML'],
          ['body-html', 'Body HTML'],
          ['body-js',   'Body JS'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={[
              'rounded-full px-3 py-1 text-[10px] uppercase tracking-widest font-bold transition-all',
              tab === key
                ? 'bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.3)]'
                : 'border border-yellow-400/20 text-yellow-400/70 hover:border-yellow-400/50 hover:text-yellow-400',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {editor}
    </div>
  );
}

// ── SectionForm dispatcher ─────────────────────────────────────────────────

export function SectionForm<K extends SectionKey>({ sectionKey, value, onChange }: Props<K>) {
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
