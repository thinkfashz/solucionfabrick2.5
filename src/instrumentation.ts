/**
 * Se ejecuta al arrancar el servidor (Node.js). Asegura las tablas que las
 * páginas públicas necesitan, sin romper el arranque si la base no responde.
 *
 * Todo lo que crea es idempotente (`IF NOT EXISTS`): correrlo dos veces o en
 * varios workers no hace daño. Fuera de un entorno con credenciales se omite.
 */
export async function register() {
  console.log('[instrumentation] boot: nodejs =', process.env.NEXT_RUNTIME);
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const { ensureRadierCommentsTable } = await import('@/lib/radierDb');
    const result = await ensureRadierCommentsTable();
    if (result.ok) console.log('[instrumentation] radier_comments verificada.');
    else if (!result.skipped) console.warn(`[instrumentation] radier_comments no verificada (${result.error || 'sin detalle'}). Se reintenta al recibir escritura.`);
  } catch (error) {
    console.warn('[instrumentation] arranque sin verificación de tablas:', error instanceof Error ? error.message : String(error));
  }
}
