'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProductShippingMode } from '@/lib/shipping';

const PRODUCTS_CACHE_KEY = 'fabrick.products.cache.v2';
const PRODUCTS_CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8_000;

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

type CacheRecord = { ts: number; data: Product[] };
type ApiPayload = { products?: unknown; error?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function optionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function finiteNumber(value: unknown) {
  const result = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(result) ? result : undefined;
}

function normalizeProduct(value: unknown): Product | null {
  if (!isRecord(value)) return null;

  const id = optionalText(value.id);
  const name = optionalText(value.name);
  const price = finiteNumber(value.price);
  if (!id || !name || price === undefined || price < 0) return null;

  const stock = finiteNumber(value.stock);
  const rating = finiteNumber(value.rating);
  const discount = finiteNumber(value.discount_percentage);
  const shippingMode = optionalText(value.shipping_mode) as ProductShippingMode | undefined;
  const specifications = isRecord(value.specifications) ? value.specifications : undefined;
  const overrides = isRecord(value.shipping_region_overrides)
    ? Object.fromEntries(
        Object.entries(value.shipping_region_overrides)
          .map(([key, amount]) => [key, finiteNumber(amount)])
          .filter((entry): entry is [string, number] => entry[1] !== undefined),
      )
    : undefined;

  return {
    id,
    name,
    price,
    ...(stock !== undefined ? { stock: Math.max(0, Math.floor(stock)) } : {}),
    ...(rating !== undefined ? { rating: Math.max(0, Math.min(5, rating)) } : {}),
    ...(discount !== undefined ? { discount_percentage: Math.max(0, Math.min(100, discount)) } : {}),
    ...(optionalText(value.description) ? { description: optionalText(value.description) } : {}),
    ...(optionalText(value.image_url) ? { image_url: optionalText(value.image_url) } : {}),
    ...(optionalText(value.tagline) ? { tagline: optionalText(value.tagline) } : {}),
    ...(optionalText(value.delivery_days) ? { delivery_days: optionalText(value.delivery_days) } : {}),
    ...(optionalText(value.category_id) ? { category_id: optionalText(value.category_id) } : {}),
    ...(optionalText(value.category_name) ? { category_name: optionalText(value.category_name) } : {}),
    ...(typeof value.featured === 'boolean' ? { featured: value.featured } : {}),
    ...(typeof value.activo === 'boolean' ? { activo: value.activo } : {}),
    ...(specifications ? { specifications } : {}),
    ...(shippingMode ? { shipping_mode: shippingMode } : {}),
    ...(finiteNumber(value.shipping_fee) !== undefined ? { shipping_fee: finiteNumber(value.shipping_fee) } : {}),
    ...(finiteNumber(value.shipping_weight_kg) !== undefined ? { shipping_weight_kg: finiteNumber(value.shipping_weight_kg) } : {}),
    ...(optionalText(value.shipping_dimensions) ? { shipping_dimensions: optionalText(value.shipping_dimensions) } : {}),
    ...(overrides ? { shipping_region_overrides: overrides } : {}),
  };
}

function normalizeProducts(value: unknown): Product[] {
  if (!Array.isArray(value)) return [];
  const known = new Set<string>();
  return value.reduce<Product[]>((products, item) => {
    const product = normalizeProduct(item);
    if (!product || product.activo === false || known.has(product.id)) return products;
    known.add(product.id);
    products.push(product);
    return products;
  }, []);
}

function messageFrom(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'No pudimos actualizar el catálogo. Mostramos una vista de respaldo.';
}

export function useRealtimeProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchComplete, setFetchComplete] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [lastEvent, setLastEvent] = useState<CatalogEvent | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const isMounted = useRef(false);
  const productsRef = useRef<Product[]>([]);
  const requestRef = useRef<AbortController | null>(null);

  const persistCache = useCallback((nextProducts: Product[]) => {
    try {
      localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: nextProducts }));
    } catch {
      // The storefront stays usable when storage is disabled or full.
    }
  }, []);

  const readCache = useCallback((): { products: Product[]; fresh: boolean } | null => {
    try {
      const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<CacheRecord>;
      const cachedProducts = normalizeProducts(parsed.data);
      if (!Array.isArray(parsed.data) || !Number.isFinite(parsed.ts) || !cachedProducts.length) return null;
      return { products: cachedProducts, fresh: Date.now() - Number(parsed.ts) < PRODUCTS_CACHE_TTL_MS };
    } catch {
      return null;
    }
  }, []);

  const loadProducts = useCallback(async (silent = false) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    if (!silent && !productsRef.current.length) setLoading(true);

    try {
      const response = await fetch('/api/tienda/products', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('La respuesta del catálogo no es válida.');
      }

      const payload = (await response.json()) as ApiPayload;
      if (!response.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'No se pudieron cargar productos.');
      }

      const nextProducts = normalizeProducts(payload.products);
      if (!isMounted.current) return;

      setProducts(nextProducts);
      productsRef.current = nextProducts;
      if (nextProducts.length) persistCache(nextProducts);
      setConnected(true);
      setError(null);
      setLastUpdated(Date.now());
      setLastEvent({ type: 'CATALOG_REFRESH', product: {}, timestamp: new Date() });
      setUpdateCount((count) => count + 1);
    } catch (reason) {
      if (!isMounted.current || controller.signal.aborted) return;
      setConnected(false);
      setError(messageFrom(reason));
    } finally {
      window.clearTimeout(timeout);
      if (isMounted.current) {
        setLoading(false);
        setFetchComplete(true);
      }
    }
  }, [persistCache]);

  useEffect(() => {
    isMounted.current = true;
    const cached = readCache();

    if (cached) {
      setProducts(cached.products);
      productsRef.current = cached.products;
      setLastUpdated(Date.now());
      setFetchComplete(true);
      setLoading(false);
      void loadProducts(true);
    } else {
      void loadProducts();
    }

    return () => {
      isMounted.current = false;
      requestRef.current?.abort();
    };
  }, [loadProducts, readCache]);

  return {
    products,
    loading,
    fetchComplete,
    connected,
    error,
    lastUpdated,
    lastEvent,
    updateCount,
    reload: () => loadProducts(false),
  };
}
