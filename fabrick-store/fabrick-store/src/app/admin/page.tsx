import { insforge } from '@/lib/insforge';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Producto {
  id: string;
  nombre: string;
  stock: number;
  activo: boolean;
}

interface Pedido {
  id: string;
  estado: string;
  total: number;
  created_at: string;
  cliente_nombre?: string;
}

interface Cliente {
  id: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function estadoColor(estado: string): string {
  const map: Record<string, string> = {
    pendiente: '#f59e0b',
    pagado: '#3b82f6',
    preparando: '#8b5cf6',
    enviado: '#06b6d4',
    entregado: '#22c55e',
    cancelado: '#ef4444',
  };
  return map[estado?.toLowerCase()] ?? '#888888';
}

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
}

function hoursAgo(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / 1000 / 3600;
}

// ── Data fetching ──────────────────────────────────────────────────────────────

async function fetchDashboardData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [productosRes, pedidosRes, clientesRes] = await Promise.all([
    insforge.database.from('productos').select('id,nombre,stock,activo'),
    insforge.database.from('pedidos').select('id,estado,total,created_at,cliente_nombre').order('created_at', { ascending: false }).limit(50),
    insforge.database.from('clientes').select('id'),
  ]);

  const productos: Producto[] = (productosRes.data as Producto[]) ?? [];
  const pedidos: Pedido[] = (pedidosRes.data as Pedido[]) ?? [];
  const clientes: Cliente[] = (clientesRes.data as Cliente[]) ?? [];

  const productosActivos = productos.filter((p) => p.activo).length;
  const sinStock = productos.filter((p) => p.stock === 0);

  const pedidosPendientes = pedidos.filter((p) => p.estado?.toLowerCase() === 'pendiente');

  const ingresosMes = pedidos
    .filter((p) => p.created_at >= startOfMonth && p.estado?.toLowerCase() !== 'cancelado')
    .reduce((sum, p) => sum + (p.total ?? 0), 0);

  const ultimosPedidos = pedidos.slice(0, 5);

  const pedidosDemorados = pedidosPendientes.filter((p) => hoursAgo(p.created_at) > 24);

  return {
    ingresosMes,
    productosActivos,
    pedidosPendientes: pedidosPendientes.length,
    totalClientes: clientes.length,
    ultimosPedidos,
    sinStock,
    pedidosDemorados,
  };
}

// ── Metric card ────────────────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-2"
      style={{ backgroundColor: '#161616', border: '1px solid #222222' }}
    >
      <span className="text-2xl">{icon}</span>
      <p className="text-xs uppercase tracking-widest" style={{ color: '#888888' }}>
        {label}
      </p>
      <p className="text-xl font-bold" style={{ color: '#c9a96e' }}>
        {value}
      </p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const data = await fetchDashboardData();

  return (
    <div className="space-y-8 max-w-5xl">
      <h1 className="text-lg font-semibold" style={{ color: '#c9a96e' }}>
        Dashboard
      </h1>

      {/* Metric cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon="💰" label="Ingresos del mes" value={formatCLP(data.ingresosMes)} />
        <MetricCard icon="📦" label="Productos activos" value={String(data.productosActivos)} />
        <MetricCard icon="🛒" label="Pedidos pendientes" value={String(data.pedidosPendientes)} />
        <MetricCard icon="👥" label="Clientes registrados" value={String(data.totalClientes)} />
      </section>

      {/* Alerts */}
      {(data.sinStock.length > 0 || data.pedidosDemorados.length > 0) && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#888888' }}>
            Alertas
          </h2>
          {data.sinStock.map((p) => (
            <div
              key={p.id}
              className="rounded-lg px-4 py-3 text-sm flex items-center gap-2"
              style={{ backgroundColor: '#1a0a0a', border: '1px solid #3b1a1a', color: '#ef4444' }}
            >
              <span>🔴</span>
              <span>
                <strong>{p.nombre}</strong> — Sin stock
              </span>
            </div>
          ))}
          {data.pedidosDemorados.map((p) => (
            <div
              key={p.id}
              className="rounded-lg px-4 py-3 text-sm flex items-center gap-2"
              style={{ backgroundColor: '#1a1500', border: '1px solid #3b3000', color: '#f59e0b' }}
            >
              <span>⚠️</span>
              <span>
                Pedido <strong>#{p.id.slice(-6).toUpperCase()}</strong> lleva más de 24 h pendiente
              </span>
            </div>
          ))}
        </section>
      )}

      {/* Last 5 orders */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#888888' }}>
          Últimos pedidos
        </h2>
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: '1px solid #222222' }}
        >
          {data.ultimosPedidos.length === 0 ? (
            <p className="px-5 py-4 text-sm" style={{ color: '#888888' }}>
              No hay pedidos aún.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#161616', borderBottom: '1px solid #222222' }}>
                  <th className="px-5 py-3 text-left font-medium" style={{ color: '#888888' }}>
                    Pedido
                  </th>
                  <th className="px-5 py-3 text-left font-medium hidden sm:table-cell" style={{ color: '#888888' }}>
                    Cliente
                  </th>
                  <th className="px-5 py-3 text-left font-medium" style={{ color: '#888888' }}>
                    Total
                  </th>
                  <th className="px-5 py-3 text-left font-medium" style={{ color: '#888888' }}>
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.ultimosPedidos.map((pedido, i) => (
                  <tr
                    key={pedido.id}
                    style={{
                      backgroundColor: i % 2 === 0 ? '#111111' : '#161616',
                      borderBottom: '1px solid #1e1e1e',
                    }}
                  >
                    <td className="px-5 py-3" style={{ color: '#c9a96e' }}>
                      #{pedido.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell" style={{ color: '#888888' }}>
                      {pedido.cliente_nombre ?? '—'}
                    </td>
                    <td className="px-5 py-3" style={{ color: '#888888' }}>
                      {formatCLP(pedido.total ?? 0)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium capitalize"
                        style={{
                          color: estadoColor(pedido.estado),
                          backgroundColor: estadoColor(pedido.estado) + '22',
                          border: `1px solid ${estadoColor(pedido.estado)}44`,
                        }}
                      >
                        {pedido.estado ?? 'desconocido'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
