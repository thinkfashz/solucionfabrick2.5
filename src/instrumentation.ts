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
    const radier = await ensureRadierCommentsTable();
    if (radier.ok) console.log('[instrumentation] radier_comments verificada.');
    else if (!radier.skipped) console.warn(`[instrumentation] radier_comments no verificada (${radier.error || 'sin detalle'}). Se reintenta al recibir escritura.`);
  } catch (error) {
    console.warn('[instrumentation] radier sin verificación de tablas:', error instanceof Error ? error.message : String(error));
  }
  try {
    const { ensureBlogPostsTable } = await import('@/lib/blogDb');
    const blog = await ensureBlogPostsTable();
    if (blog.ok) console.log('[instrumentation] blog_posts verificada.');
    else if (!blog.skipped) console.warn(`[instrumentation] blog_posts no verificada (${blog.error || 'sin detalle'}). El editor lo reintenta al guardar.`);
  } catch (error) {
    console.warn('[instrumentation] blog sin verificación de tablas:', error instanceof Error ? error.message : String(error));
  }
}
