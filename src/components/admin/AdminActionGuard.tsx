'use client';

import type { ReactNode } from 'react';

type ErrorLike = {
  code?: unknown;
  error?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

function errorText(value: unknown) {
  if (!value || typeof value !== 'object') return typeof value === 'string' ? value : '';
  const error = value as ErrorLike;
  return [error.error, error.message, error.details, error.hint]
    .filter((part): part is string => typeof part === 'string')
    .join(' ')
    .toLowerCase();
}

export function isMissingTableError(value: unknown): boolean {
  if (value && typeof value === 'object' && String((value as ErrorLike).code || '').toUpperCase() === '42P01') return true;
  const text = errorText(value);
  return /relation\s+["'`]?.+?["'`]?\s+does not exist/.test(text)
    || /could not find the table\s+["']?.+?["']?\s+in the schema cache/.test(text);
}

export function AdminActionGuard({ error, children, fallback }: { error?: unknown; children: ReactNode; fallback?: ReactNode }) {
  if (!error) return <>{children}</>;
  if (fallback) return <>{fallback}</>;
  return (
    <div role="alert" className="rounded-2xl border border-amber-400/25 bg-amber-400/8 p-4 text-sm text-amber-100">
      <strong className="block font-black">No se pudo completar esta acción</strong>
      <span className="mt-1 block text-xs opacity-75">
        {isMissingTableError(error) ? 'Falta preparar una tabla requerida en la base de datos.' : errorText(error) || 'Intenta nuevamente.'}
      </span>
    </div>
  );
}

export default AdminActionGuard;
