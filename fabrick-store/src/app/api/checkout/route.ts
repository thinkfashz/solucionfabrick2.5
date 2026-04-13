import { NextResponse } from 'next/server';

interface LineItem {
  productoId: number;
  cantidad: number;
  precioUnitario: number;
}

interface CheckoutBody {
  items: LineItem[];
  region: string;
  cliente: { nombre: string; email: string; telefono?: string };
}

const IVA = 0.19;
const DESPACHO_BASE = 35000;
const DESPACHO_REGIONES_EXTREMAS = ['XV', 'I', 'XI', 'XII'];

export async function POST(request: Request) {
  try {
    const body: CheckoutBody = await request.json();
    const { items, region, cliente } = body;

    if (!items?.length || !region || !cliente?.email) {
      return NextResponse.json({ error: 'Datos incompletos para procesar el checkout.' }, { status: 400 });
    }

    const subtotal = items.reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0);
    const iva = Math.round(subtotal * IVA);
    const despacho = DESPACHO_REGIONES_EXTREMAS.includes(region.toUpperCase())
      ? DESPACHO_BASE * 2
      : DESPACHO_BASE;
    const total = subtotal + iva + despacho;

    const orden = {
      id: `FBK-${Date.now()}`,
      cliente,
      items,
      resumen: {
        subtotal,
        iva,
        despacho,
        total,
        moneda: 'CLP',
      },
      estado: 'pendiente_pago',
      creadoEn: new Date().toISOString(),
    };

    // TODO: persistir orden en InsForge DB y redirigir a pasarela de pago
    return NextResponse.json({ data: orden }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno al procesar el checkout.' }, { status: 500 });
  }
}
