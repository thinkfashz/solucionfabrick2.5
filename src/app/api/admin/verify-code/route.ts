import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otpStore';

export async function POST(request: Request) {
  let email: string;
  let code: string;
  try {
    const body = await request.json();
    email = (body.email ?? '').trim().toLowerCase();
    code = (body.code ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  if (!email || !code) {
    return NextResponse.json({ error: 'Email y código son requeridos.' }, { status: 400 });
  }

  const valid = verifyOtp(email, code);

  if (!valid) {
    return NextResponse.json(
      { error: 'Código incorrecto o expirado. Solicita uno nuevo.' },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
