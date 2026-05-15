import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminSession, getAdminTenantId } from '@/lib/adminApi';
import { deletePasskey, renamePasskey, getPasskeysForUser } from '@/lib/adminPasskeys';
import { v, parse, validationError } from '@/lib/validate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/passkeys/[id] — rename a passkey. */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const { id } = await ctx.params;

    const raw = await request.json().catch(() => ({}));
    const result = parse({ name: v.string({ required: true, min: 1, max: 100 }) }, raw);
    if (!result.ok) return validationError(result.errors);

    const tenantId = await getAdminTenantId(request);

    // Safety: verify the credential belongs to this admin before renaming.
    const passkeys = await getPasskeysForUser(session.email, tenantId);
    if (!passkeys.find((p) => p.id === id)) {
      return NextResponse.json({ error: 'Passkey no encontrada.' }, { status: 404 });
    }

    const ok = await renamePasskey(id, session.email, tenantId, result.data.name as string);
    if (!ok) return NextResponse.json({ error: 'No se pudo renombrar la passkey.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminError(err, 'PASSKEY_RENAME_FAILED');
  }
}

/** DELETE /api/admin/passkeys/[id] — remove a passkey. */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const { id } = await ctx.params;
    const tenantId = await getAdminTenantId(request);

    // Safety: confirm ownership before deleting.
    const passkeys = await getPasskeysForUser(session.email, tenantId);
    if (!passkeys.find((p) => p.id === id)) {
      return NextResponse.json({ error: 'Passkey no encontrada.' }, { status: 404 });
    }

    // Block deletion of the last passkey to avoid locking the user out (only
    // relevant if password-less login is the sole auth method; with passwords
    // still available it's just a UX guard).
    if (passkeys.length === 1) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu única passkey. Agrega otra primero.' },
        { status: 409 },
      );
    }

    const ok = await deletePasskey(id, session.email, tenantId);
    if (!ok) return NextResponse.json({ error: 'No se pudo eliminar la passkey.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminError(err, 'PASSKEY_DELETE_FAILED');
  }
}
