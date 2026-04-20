import { NextResponse } from 'next/server';

interface PresupuestoBody {
  nombre: string;
  email: string;
  telefono?: string;
  tipo: 'modelo-f70' | 'remodelacion' | 'tienda' | 'personalizado';
  descripcion?: string;
}

const PRECIOS_BASE: Record<string, number> = {
  'modelo-f70': 42000000,
  remodelacion: 8000000,
  tienda: 0,
  personalizado: 0,
};

export async function POST(request: Request) {
  try {
    const body: PresupuestoBody = await request.json();
    const { nombre, email, tipo } = body;

    if (!nombre || !email || !tipo) {
      return NextResponse.json({ error: 'Nombre, email y tipo de proyecto son requeridos.' }, { status: 400 });
    }

    const solicitud = {
      id: `PRES-${Date.now()}`,
      ...body,
      precioBaseReferencial: PRECIOS_BASE[tipo] ?? 0,
      estado: 'recibida',
      plazoRespuesta: '24 horas hábiles',
      creadoEn: new Date().toISOString(),
    };

    // TODO: guardar en InsForge DB y enviar notificación al equipo comercial
    return NextResponse.json(
      { data: solicitud, mensaje: 'Solicitud recibida. Un especialista Fabrick se contactará dentro de 24 horas hábiles.' },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Error interno al procesar la solicitud.' }, { status: 500 });
  }
}
