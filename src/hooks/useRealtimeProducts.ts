'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProductShippingMode } from '@/lib/shipping';

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
  category_name?: string;
  shipping_mode?: ProductShippingMode | null;
  shipping_fee?: number | null;
  shipping_weight_kg?: number | null;
  shipping_dimensions?: string | null;
  shipping_region_overrides?: Record<string, number> | null;
}

interface CatalogEvent {
  type: 'CATALOG_REFRESH';
  product: Partial<Product>;
  timestamp: Date;
}

function normalizeProducts(value: unknown): Product[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Product => Boolean(item && typeof item === 'object' && 'id' in item && 'name' in item))
    .filter((product) => product.activo !== false);
}

export function useRealtimeProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchComplete, setFetchComplete] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<CatalogEvent | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const isMounted = useRef(true);

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
      localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: nextProducts }));
    } catch {
      // Ignore storage quota failures.
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading((prev) => (products.length ? prev : true));

    try {
      const res = await fetch('/api/tienda/products', {
        headers: { Accept: 'application/json' },
      });
      const json = (await res.json()) as { products?: Product[]; error?: string };
      if (res.ok) {
        const typed = normalizeProducts(json.products);
        if (isMounted.current) {
          setProducts(typed);
          persistCache(typed);
          setConnected(true);
          setLastEvent({ type: 'CATALOG_REFRESH', product: {}, timestamp: new Date() });
          setUpdateCount((count) => count + 1);
        }
      } else if (isMounted.current) {
        setConnected(false);
      }
    } catch {
      if (isMounted.current) setConnected(false);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setFetchComplete(true);
      }
    }
  }, [persistCache, products.length]);

  useEffect(() => {
    isMounted.current = true;
    const cacheIsFresh = loadFromCache();
    if (!cacheIsFresh) {
      loadProducts();
    } else {
      setFetchComplete(true);
      setLoading(false);
    }

    return () => {
      isMounted.current = false;
    };
  }, [loadFromCache, loadProducts]);

  return { products, loading, fetchComplete, connected, lastEvent, updateCount, reload: loadProducts };
}
