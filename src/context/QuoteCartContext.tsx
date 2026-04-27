'use client';

/**
 * QuoteCartContext — Carrito de servicios / cotización, separado del carrito
 * de productos de tienda (`CartContext`).
 *
 * Items posibles:
 *   - 'service'  → tarjeta de /servicios  ("Cotizar")
 *   - 'panel'    → panel del diseñador 3D /juego (con altura y m²)
 *   - 'material' → producto del catálogo añadido como insumo de obra
 *
 * Persistencia: localStorage. El envío final a InsForge ocurre desde
 * `/cotizaciones/enviar` reusando la tabla `quotes` que ya existe.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type QuoteItemKind = 'service' | 'panel' | 'material';

export interface QuoteItem {
  /** Identificador único en el carrito (no necesariamente el id del recurso). */
  id: string;
  kind: QuoteItemKind;
  title: string;
  description?: string;
  /** Cantidad (paneles, m², horas, unidades…). */
  quantity: number;
  /** Unidad legible (m², un, ml, h…). */
  unit?: string;
  /** Costo de referencia interno; nunca se renderiza en /servicios. */
  refPrice?: number;
  /** Notas que añade el cliente. */
  notes?: string;
  /** Imagen opcional. */
  image?: string;
  /** Metadata específica (m², altura, color del panel…). */
  meta?: Record<string, unknown>;
}

const STORAGE_KEY = 'fabrick.quote-cart.v1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

interface QuoteCartContextValue {
  items: QuoteItem[];
  totalItems: number;
  refTotal: number;
  addItem: (item: Omit<QuoteItem, 'id'> & { id?: string }) => void;
  addPanels: (panels: Omit<QuoteItem, 'id' | 'kind'>[]) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateNotes: (id: string, notes: string) => void;
  clear: () => void;
}

const QuoteCartContext = createContext<QuoteCartContextValue | null>(null);

function makeId(prefix = 'qi'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function QuoteCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<QuoteItem[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { ts: number; data: QuoteItem[] };
        if (
          parsed?.data &&
          Array.isArray(parsed.data) &&
          Date.now() - parsed.ts < TTL_MS
        ) {
          setItems(parsed.data);
        }
      }
    } catch {
      /* ignore */
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ts: Date.now(), data: items }),
      );
    } catch {
      /* ignore */
    }
  }, [items]);

  const addItem = useCallback<QuoteCartContextValue['addItem']>((item) => {
    setItems((prev) => {
      // Si ya existe un servicio con mismo título, sumamos cantidad
      if (item.kind === 'service') {
        const idx = prev.findIndex(
          (i) => i.kind === 'service' && i.title === item.title,
        );
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            quantity: updated[idx].quantity + (item.quantity ?? 1),
          };
          return updated;
        }
      }
      return [...prev, { ...item, id: item.id ?? makeId(item.kind) }];
    });
  }, []);

  const addPanels = useCallback<QuoteCartContextValue['addPanels']>((panels) => {
    setItems((prev) => {
      // Reemplaza paneles previos del diseñador por los nuevos (snapshot del diseño)
      const withoutPanels = prev.filter((i) => i.kind !== 'panel');
      const added = panels.map((p) => ({
        ...p,
        kind: 'panel' as const,
        id: makeId('panel'),
      }));
      return [...withoutPanels, ...added];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (!Number.isFinite(quantity) || quantity < 1) return;
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity } : i)),
    );
  }, []);

  const updateNotes = useCallback((id: string, notes: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, notes } : i)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const totalItems = useMemo(
    () => items.reduce((s, i) => s + (Number.isFinite(i.quantity) ? i.quantity : 0), 0),
    [items],
  );

  const refTotal = useMemo(
    () =>
      items.reduce(
        (s, i) =>
          s + (typeof i.refPrice === 'number' ? i.refPrice * i.quantity : 0),
        0,
      ),
    [items],
  );

  const value = useMemo<QuoteCartContextValue>(
    () => ({
      items,
      totalItems,
      refTotal,
      addItem,
      addPanels,
      removeItem,
      updateQuantity,
      updateNotes,
      clear,
    }),
    [items, totalItems, refTotal, addItem, addPanels, removeItem, updateQuantity, updateNotes, clear],
  );

  return (
    <QuoteCartContext.Provider value={value}>
      {children}
    </QuoteCartContext.Provider>
  );
}

export function useQuoteCart(): QuoteCartContextValue {
  const ctx = useContext(QuoteCartContext);
  if (!ctx) {
    throw new Error('useQuoteCart must be used within QuoteCartProvider');
  }
  return ctx;
}

/** Hook que devuelve un valor seguro incluso fuera del provider (SSR/edge). */
export function useQuoteCartSafe(): QuoteCartContextValue | null {
  return useContext(QuoteCartContext);
}
