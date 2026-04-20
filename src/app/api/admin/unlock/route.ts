import { NextResponse } from 'next/server';
import { clearFailedAttempts, getClientIp } from '@/lib/adminAuth';

/**
 * Clears the rate-limit counter for the caller's IP.
 *
 * Called by the client after a successful password-reset-by-email flow or
 * account initialization, since both of those prove control of the admin
 * email. It grants no session and no privileges — it only removes the IP
 * lockout so the user can attempt a normal password login again.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  clearFailedAttempts(ip);
  return NextResponse.json({ ok: true });
}
