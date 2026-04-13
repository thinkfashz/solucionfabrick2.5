/**
 * TEST ENDPOINT — valida que los 3 agentes estén operativos
 */
import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

export async function GET() {
  const tests: Array<{ test: string; status: 'pass' | 'fail'; detail: string; ms: number }> = [];

  // Test 1: Conexión a InsForge DB
  const t1 = Date.now();
  try {
    const { data, error } = await insforge.database.from('products').select('id').limit(1);
    tests.push({
      test: 'InsForge DB Connection',
      status: error ? 'fail' : 'pass',
      detail: error ? error.message : `OK — ${data?.length ?? 0} registro(s) leídos`,
      ms: Date.now() - t1,
    });
  } catch (e) {
    tests.push({ test: 'InsForge DB Connection', status: 'fail', detail: String(e), ms: Date.now() - t1 });
  }

  // Test 2: Unsplash Image Fetch
  const t2 = Date.now();
  try {
    const res = await fetch('https://source.unsplash.com/100x100/?marble', {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    tests.push({
      test: 'Unsplash Image API',
      status: res.ok ? 'pass' : 'fail',
      detail: res.ok ? `OK — ${res.url.slice(0, 60)}...` : `HTTP ${res.status}`,
      ms: Date.now() - t2,
    });
  } catch (e) {
    tests.push({ test: 'Unsplash Image API', status: 'fail', detail: String(e), ms: Date.now() - t2 });
  }

  // Test 3: Products count en DB
  const t3 = Date.now();
  try {
    const { data, error } = await insforge.database
      .from('products')
      .select('id, name, price, image_url', { count: 'exact' });
    const withImages = (data ?? []).filter((p: Record<string, unknown>) => p.image_url).length;
    tests.push({
      test: 'Products DB State',
      status: error ? 'fail' : 'pass',
      detail: error ? error.message : `${data?.length ?? 0} productos — ${withImages} con imagen`,
      ms: Date.now() - t3,
    });
  } catch (e) {
    tests.push({ test: 'Products DB State', status: 'fail', detail: String(e), ms: Date.now() - t3 });
  }

  // Test 4: Real-time channel
  const t4 = Date.now();
  try {
    const { data, error } = await insforge.database
      .from('realtime.channels')
      .select('pattern, enabled')
      .eq('pattern', 'products')
      .maybeSingle();
    tests.push({
      test: 'Realtime Channel "products"',
      status: data ? 'pass' : 'fail',
      detail: data ? `OK — canal "${data.pattern}" enabled=${data.enabled}` : (error?.message ?? 'Canal no encontrado'),
      ms: Date.now() - t4,
    });
  } catch (e) {
    tests.push({ test: 'Realtime Channel "products"', status: 'fail', detail: String(e), ms: Date.now() - t4 });
  }

  const passed = tests.filter((t) => t.status === 'pass').length;

  return NextResponse.json({
    suite:    'FABRICK_SYNC_AGENTS',
    passed,
    failed:   tests.length - passed,
    total:    tests.length,
    health:   passed === tests.length ? '✅ ALL PASS' : `⚠️ ${tests.length - passed} FAILING`,
    tests,
    timestamp: new Date().toISOString(),
  });
}
