/**
 * Get two-letter display initials from a name or email string.
 * Returns an empty string if input is empty.
 */
export function getInitials(nameOrEmail: string | undefined | null): string {
  const display = (nameOrEmail || '').trim();
  if (!display) return '';
  const parts = display.split(/\s+|@/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  if (first && second) return (first + second).toUpperCase();
  return display.slice(0, 2).toUpperCase();
}
