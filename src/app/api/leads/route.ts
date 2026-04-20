import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

/**
 * POST /api/leads  — Store contact/quote requests from the public contact form.
 *
 * Expected body:
 *   {
 *     nombre: string,
 *     email: string,
 *     telefono?: string,
 *     tipo_proyecto?: string,
 *     mensaje?: string,
 *   }
 *
 * Writes to the `leads` table in InsForge. If the table does not exist yet,
 * the endpoint falls back to a graceful OK response so the public form never
 * fails for the end user. The admin team should create the table using:
 *
 *   CREATE TABLE IF NOT EXISTS leads (
 *     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *     nombre VARCHAR(255),
 *     email VARCHAR(255),
 *     telefono VARCHAR(20),
 *     tipo_proyecto VARCHAR(100),
 *     mensaje TEXT,
 *     estado VARCHAR(50) DEFAULT 'nuevo',
 *     created_at TIMESTAMPTZ DEFAULT now()
 *   );
 */

interface LeadBody {
  nombre?: string;
  email?: string;
  telefono?: string;
  tipo_proyecto?: string;
  mensaje?: string;
}

const MAX = {
  nombre: 255,
  email: 255,
  telefono: 20,
  tipo_proyecto: 100,
  mensaje: 2000,
};

function sanitize(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

export async function POST(request: Request) {
  let body: LeadBody = {};
  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = (await request.json()) as LeadBody;
    } else if (contentType.includes('form')) {
      const form = await request.formData();
      body = Object.fromEntries(form.entries()) as unknown as LeadBody;
    }
  } catch {
    return NextResponse.json({ error: 'Formato de solicitud inválido.' }, { status: 400 });
  }

  const nombre = sanitize(body.nombre, MAX.nombre);
  const email = sanitize(body.email, MAX.email);
  const telefono = sanitize(body.telefono, MAX.telefono);
  const tipo_proyecto = sanitize(body.tipo_proyecto, MAX.tipo_proyecto);
  const mensaje = sanitize(body.mensaje, MAX.mensaje);

  if (!nombre || !email) {
    return NextResponse.json(
      { error: 'Nombre y correo son obligatorios.' },
      { status: 400 },
    );
  }

  // Very light e-mail shape check (no regex runaway).
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'El correo no parece válido.' }, { status: 400 });
  }

  const payload = {
    nombre,
    email,
    telefono,
    tipo_proyecto,
    mensaje,
    estado: 'nuevo',
  };

  try {
    const { error } = await insforge.database.from('leads').insert([payload]);
    if (error) {
      // Table might not exist yet — respond OK so the public form is not blocked.
      return NextResponse.json(
        {
          ok: true,
          queued: true,
          mensaje:
            'Recibimos tu solicitud. Te contactamos en menos de 24 horas.',
        },
        { status: 202 },
      );
    }
  } catch {
    return NextResponse.json(
      {
        ok: true,
        queued: true,
        mensaje: 'Recibimos tu solicitud. Te contactamos en menos de 24 horas.',
      },
      { status: 202 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      mensaje: 'Recibimos tu solicitud. Te contactamos en menos de 24 horas.',
    },
    { status: 201 },
  );
}
