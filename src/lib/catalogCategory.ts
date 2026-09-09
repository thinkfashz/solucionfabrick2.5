export function resolveCatalogCategoryName(
  persistedCategoryName: unknown,
  categoryId: unknown,
  categoryMap: Readonly<Record<string, string>>,
): string | undefined {
  const persisted = typeof persistedCategoryName === 'string' ? persistedCategoryName.trim() : '';
  if (persisted) return persisted;

  const id = typeof categoryId === 'string' ? categoryId.trim() : '';
  if (!id) return undefined;

  const mapped = categoryMap[id];
  return typeof mapped === 'string' && mapped.trim() ? mapped.trim() : undefined;
}
