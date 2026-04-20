'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { insforge } from '@/lib/insforge';

const PRODUCTS_CACHE_KEY = 'fabrick.products.cache.v1';
const PRODUCTS_CACHE_TTL_MS = 5 * 60 * 1000;

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  image_url?: string;
  featured?: boolean;
  activo?: boolean;
  tagline?: string;
  rating?: number;
  delivery_days?: string;
  discount_percentage?: number;
  specifications?: Record<string, unknown>;
  category_id?: string;
}

interface RealtimeEvent {
  type: 'INSERT_product' | 'UPDATE_product';
  product: Partial<Product>;
  timestamp: Date;
}

export function useRealtimeProducts() {
  const [products, setProducts]       = useState<Product[]>([]);
  const [loading, setLoading]         = useState(true);
  const [fetchComplete, setFetchComplete] = useState(false);
  const [connected, setConnected]     = useState(false);
  const [lastEvent, setLastEvent]     = useState<RealtimeEvent | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const isMounted = useRef(true);

  /* ── Carga instantánea desde caché local ── */
  const loadFromCache = useCallback(() => {
    try {
      const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
      if (!raw) return false;

      const parsed = JSON.parse(raw) as { ts: number; data: Product[] };
      if (!parsed?.data || !Array.isArray(parsed.data)) return false;

      const isFresh = Date.now() - parsed.ts < PRODUCTS_CACHE_TTL_MS;
      if (isMounted.current) {
        setProducts(parsed.data);
        setLoading(false);
      }
      return isFresh;
    } catch {
      return false;
    }
  }, []);

  const persistCache = useCallback((nextProducts: Product[]) => {
    try {
      localStorage.setItem(
        PRODUCTS_CACHE_KEY,
        JSON.stringify({ ts: Date.now(), data: nextProducts }),
      );
    } catch {
      // Ignorar errores de quota/storage
    }
  }, []);

  /* ── Carga inicial desde DB ── */
  const loadProducts = useCallback(async () => {
    setLoading((prev) => (products.length ? prev : true));
    const { data, error } = await insforge.database
      .from('products')
      .select('id, name, description, price, stock, image_url, featured, activo, tagline, rating, delivery_days, discount_percentage, specifications, category_id')
      .neq('activo', false)
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data && isMounted.current) {
      const typed = data as Product[];
      setProducts(typed);
      persistCache(typed);
    }
    if (isMounted.current) {
      setLoading(false);
      setFetchComplete(true);
    }
  }, [persistCache, products.length]);

  /* ── Aplicar patch cuando llega evento real-time ── */
  const applyPatch = useCallback((payload: Partial<Product> & { operation?: string }) => {
    if (!payload.id || !isMounted.current) return;

    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === payload.id);

      // If product was set to activo=false, remove it from the tienda list
      if (payload.activo === false) {
        if (idx === -1) return prev;
        const updated = prev.filter((p) => p.id !== payload.id);
        persistCache(updated);
        return updated;
      }

      if (idx === -1) {
        // INSERT — agregar al inicio
        const newProduct = { ...payload } as Product;
        const merged = [newProduct, ...prev];
        persistCache(merged);
        return merged;
      }
      // UPDATE — patch inmutable
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...payload };
      persistCache(updated);
      return updated;
    });

    setLastEvent({
      type: (payload.operation === 'INSERT' ? 'INSERT_product' : 'UPDATE_product') as RealtimeEvent['type'],
      product: payload,
      timestamp: new Date(),
    });
    setUpdateCount((c) => c + 1);
  }, [persistCache]);

  /* ── Conectar real-time InsForge ── */
  useEffect(() => {
    isMounted.current = true;
    loadFromCache();
    loadProducts();

    let cleanup = false;

    (async () => {
      try {
        await insforge.realtime.connect();
        if (cleanup) return;

        const { ok } = await insforge.realtime.subscribe('products');
        if (!ok || cleanup) return;

        if (isMounted.current) setConnected(true);

        insforge.realtime.on('INSERT_product', (payload: Partial<Product> & { operation?: string }) => {
          if (isMounted.current) applyPatch({ ...payload, operation: 'INSERT' });
        });

        insforge.realtime.on('UPDATE_product', (payload: Partial<Product> & { operation?: string }) => {
          if (isMounted.current) applyPatch({ ...payload, operation: 'UPDATE' });
        });

        insforge.realtime.on('connect', () => { if (isMounted.current) setConnected(true); });
        insforge.realtime.on('disconnect', () => { if (isMounted.current) setConnected(false); });
      } catch {
        // Silenciar errores de conexión real-time (no bloquea la UI)
      }
    })();

    return () => {
      cleanup = true;
      isMounted.current = false;
      try {
        insforge.realtime.unsubscribe('products');
        insforge.realtime.disconnect();
      } catch { /* ignorar */ }
    };
  }, [loadFromCache, loadProducts, applyPatch]);

  return { products, loading, fetchComplete, connected, lastEvent, updateCount, reload: loadProducts };
}
