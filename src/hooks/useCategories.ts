'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { insforge } from '@/lib/insforge';
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
    const { data, error } = await insforge.database
      .from('categories')
      .select('id, name, description, image_url, created_at')
      .order('name', { ascending: true });

    if (!error && Array.isArray(data)) {
      const typed = data as CategoryRecord[];
      setCategories(typed);
      persistCache(typed);
    }

    setLoading(false);
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