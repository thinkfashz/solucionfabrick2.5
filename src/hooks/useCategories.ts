'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildCategoryMap, type CategoryRecord } from '@/lib/commerce';

const CATEGORY_CACHE_KEY = 'fabrick.categories.cache.v1';

export function useCategories() {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCache = useCallback(() => {
    try {
      const raw = localStorage.getItem(CATEGORY_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CategoryRecord[];
      if (Array.isArray(parsed)) {
        setCategories(parsed);
        setLoading(false);
      }
    } catch {
      // Ignore cache failures.
    }
  }, []);

  const persistCache = useCallback((nextCategories: CategoryRecord[]) => {
    try {
      localStorage.setItem(CATEGORY_CACHE_KEY, JSON.stringify(nextCategories));
    } catch {
      // Ignore storage quota failures.
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/categories', { cache: 'no-store' });
      const body = await response.json() as { categories?: CategoryRecord[] };
      if (response.ok && Array.isArray(body.categories)) {
        const typed = body.categories;
        setCategories(typed);
        persistCache(typed);
      }
    } catch {
      // Keep the last cached list when the network is unavailable.
    } finally {
      setLoading(false);
    }
  }, [persistCache]);

  useEffect(() => {
    loadCache();
    loadCategories();
  }, [loadCache, loadCategories]);

  const categoryMap = useMemo(() => buildCategoryMap(categories), [categories]);

  return {
    categories,
    categoryMap,
    loading,
    reload: loadCategories,
  };
}
