import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type ClientErrorPayload = {
  message?: unknown;
  userAgent?: unknown;
};

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.slice(0, maxLength) : 'desconocido';
}

export async function POST(request: Request) {
  let payload: ClientErrorPayload = {};

  try {
    payload = (await request.json()) as ClientErrorPayload;
  } catch {
    payload = {};
  }

  console.error('[simulador-sismico:cliente]', {
    message: clean(payload.message, 500),
    userAgent: clean(payload.userAgent, 500),
  });

  return NextResponse.json({ received: true });
}
