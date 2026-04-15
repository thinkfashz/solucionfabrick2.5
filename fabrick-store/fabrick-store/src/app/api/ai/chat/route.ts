import { NextResponse } from 'next/server';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `Eres el asistente virtual de Fabrick, empresa chilena de ingeniería residencial de precisión especializada en construcción industrializada, revestimientos de lujo y soluciones integrales de remodelación.

Ayudas a los clientes con:
- Información sobre servicios: Fabrick 70 (construcción modular), remodelaciones, tienda de materiales premium
- Materiales: Metalcom, Wall Panels, PVC Mármol, revestimientos de lujo
- Presupuestos y cotizaciones (los derivas al formulario de contacto)
- Preguntas técnicas sobre construcción y remodelación
- Garantías y plazos de entrega

Sé conciso, profesional y cercano. Responde siempre en español. Si no conoces un detalle específico, indica que un especialista Fabrick se contactará a la brevedad.`;

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.3-70b-instruct:free';

  if (!apiKey || apiKey === 'sk-or-v1-your-key-here') {
    return NextResponse.json(
      { error: 'Servicio de IA no configurado. Contacta a soporte.' },
      { status: 503 },
    );
  }

  try {
    const { messages }: { messages: Message[] } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Mensajes requeridos.' }, { status: 400 });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://fabrick.cl',
        'X-Title': 'Fabrick Asistente',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter error:', errText);
      return NextResponse.json({ error: 'Error al contactar el servicio de IA.' }, { status: 502 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? 'Sin respuesta.';
    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
