import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminInsforge } from '@/lib/adminApi';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { mlGetQuestions, mlAnswerQuestion } from '@/lib/mlApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
	try {
		const auth = await requireTenantAdmin(request, { resource: 'orders', action: 'read' });
		if (!auth.ok) return auth.response;

		const { searchParams } = request.nextUrl;
		const itemId = searchParams.get('item_id') ?? undefined;
		const status = searchParams.get('status') ?? 'UNANSWERED';
		const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100);
		const offset = Math.max(Number(searchParams.get('offset') ?? '0'), 0);

		const data = await mlGetQuestions({ itemId, status, limit, offset });

		if (data.questions.length) {
			const client = getAdminInsforge();
			const rows = data.questions.map((q) => ({
				id: q.id,
				tenant_id: auth.ctx.tenantId,
				item_id: q.item_id,
				seller_id: q.seller_id ?? null,
				status: q.status,
				text: q.text,
				answer_text: q.answer?.text ?? null,
				answer_status: q.answer?.status ?? null,
				answer_date: q.answer?.date_created ?? null,
				buyer_id: q.from?.id ?? null,
				date_created: q.date_created,
				synced_at: new Date().toISOString(),
			}));
			try {
				await client.database.from('ml_questions').upsert(rows, { onConflict: 'id' });
			} catch {
				// Optional local cache only.
			}
		}

		return NextResponse.json({ ok: true, ...data, tenantId: auth.ctx.tenantId });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al obtener preguntas ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const auth = await requireTenantAdmin(request, { resource: 'orders', action: 'update' });
		if (!auth.ok) return auth.response;

		const body = (await request.json().catch(() => ({}))) as {
			question_id?: unknown;
			text?: unknown;
		};
		const questionId = Number(body.question_id);
		const text = typeof body.text === 'string' ? body.text.trim() : '';

		if (!questionId || !text) {
			return NextResponse.json({ error: 'Falta question_id o text.' }, { status: 400 });
		}
		if (text.length > 2000) {
			return NextResponse.json({ error: 'La respuesta no puede superar los 2000 caracteres.' }, { status: 400 });
		}

		const result = await mlAnswerQuestion(questionId, text);

		const client = getAdminInsforge();
		try {
			await client.database
				.from('ml_questions')
				.update({
					status: 'ANSWERED',
					answer_text: text,
					answer_date: new Date().toISOString(),
				})
				.eq('tenant_id', auth.ctx.tenantId)
				.eq('id', questionId);
		} catch {
			// Optional local cache only.
		}

		return NextResponse.json({ ok: true, ...result, tenantId: auth.ctx.tenantId });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al responder pregunta ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
