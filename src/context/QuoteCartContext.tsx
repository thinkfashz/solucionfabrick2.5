'use client';

/**
 * QuoteCartContext — Carrito de servicios / cotización, separado del carrito
 * de productos de tienda (`CartContext`).
 *
 * Items posibles:
 *   - 'service'  → calculadoras y tarjetas de servicios
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
  id: string;
  kind: QuoteItemKind;
  title: string;
  description?: string;
  quantity: number;
  unit?: string;
  refPrice?: number;
  notes?: string;
  image?: string;
  meta?: Record<string, unknown>;
}

const STORAGE_KEY = 'fabrick.quote-cart.v1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

function serviceKey(item: Omit<QuoteItem, 'id'> & { id?: string }) {
  const metaId = typeof item.meta?.serviceId === 'string' ? item.meta.serviceId : '';
  return metaId || item.id || item.title;
}

function finiteMetaNumber(meta: Record<string, unknown> | undefined, key: string) {
  const value = meta?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function QuoteCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<QuoteItem[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { ts: number; data: QuoteItem[] };
        if (parsed?.data && Array.isArray(parsed.data) && Date.now() - parsed.ts < TTL_MS) {
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now(), data: items }));
    } catch {
      /* ignore */
    }
  }, [items]);

  const addItem = useCallback<QuoteCartContextValue['addItem']>((item) => {
    setItems((previous) => {
      if (item.kind === 'service') {
        const nextKey = serviceKey(item);
        const index = previous.findIndex((candidate) => {
          if (candidate.kind !== 'service') return false;
          const candidateMetaId = typeof candidate.meta?.serviceId === 'string' ? candidate.meta.serviceId : '';
          const candidateKey = candidateMetaId || candidate.id || candidate.title;
          return candidateKey === nextKey || candidate.title === item.title;
        });

        if (index !== -1) {
          const updated = [...previous];
          updated[index] = {
            ...updated[index],
            ...item,
            id: item.id ?? updated[index].id,
            quantity: Math.max(0.01, Number(item.quantity) || 0.01),
          };
          return updated;
        }
      }

      return [...previous, { ...item, id: item.id ?? makeId(item.kind) }];
    });
  }, []);

  const addPanels = useCallback<QuoteCartContextValue['addPanels']>((panels) => {
    setItems((previous) => {
      const withoutPanels = previous.filter((item) => item.kind !== 'panel');
      const added = panels.map((panel) => ({ ...panel, kind: 'panel' as const, id: makeId('panel') }));
      return [...withoutPanels, ...added];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    setItems((previous) => previous.map((item) => {
      if (item.id !== id) return item;
      const minimum = item.kind === 'service' ? 0.01 : 1;
      const nextQuantity = Math.max(minimum, quantity);
      const marketMinUnit = finiteMetaNumber(item.meta, 'marketMinUnit');
      const marketMaxUnit = finiteMetaNumber(item.meta, 'marketMaxUnit');
      return {
        ...item,
        quantity: nextQuantity,
        meta: {
          ...item.meta,
          ...(marketMinUnit ? { marketLow: marketMinUnit * nextQuantity } : {}),
          ...(marketMaxUnit ? { marketHigh: marketMaxUnit * nextQuantity } : {}),
        },
      };
    }));
  }, []);

  const updateNotes = useCallback((id: string, notes: string) => {
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, notes } : item)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + (Number.isFinite(item.quantity) ? item.quantity : 0), 0),
    [items],
  );

  const refTotal = useMemo(
    () => items.reduce((sum, item) => sum + (typeof item.refPrice === 'number' ? item.refPrice * item.quantity : 0), 0),
    [items],
  );

  const value = useMemo<QuoteCartContextValue>(
    () => ({ items, totalItems, refTotal, addItem, addPanels, removeItem, updateQuantity, updateNotes, clear }),
    [items, totalItems, refTotal, addItem, addPanels, removeItem, updateQuantity, updateNotes, clear],
  );

  return <QuoteCartContext.Provider value={value}>{children}</QuoteCartContext.Provider>;
}

export function useQuoteCart(): QuoteCartContextValue {
  const context = useContext(QuoteCartContext);
  if (!context) throw new Error('useQuoteCart must be used within QuoteCartProvider');
  return context;
}

export function useQuoteCartSafe(): QuoteCartContextValue | null {
  return useContext(QuoteCartContext);
}
