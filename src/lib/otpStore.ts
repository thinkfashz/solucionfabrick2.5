/**
 * In-memory OTP store for admin password reset verification.
 * Keys are lowercase email addresses; values hold the code and expiry.
 * This store is cleared on server restart, which is acceptable since OTPs are short-lived.
 */

interface OtpEntry {
  code: string;
  expiresAt: number; // Unix ms
}

const otpStore = new Map<string, OtpEntry>();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Generates and stores a 6-digit OTP for the given email. Returns the code. */
export function createOtp(email: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(email.toLowerCase(), { code, expiresAt: Date.now() + OTP_TTL_MS });
  return code;
}

/** Verifies and consumes an OTP. Returns true if valid, false otherwise. */
export function verifyOtp(email: string, code: string): boolean {
  const entry = otpStore.get(email.toLowerCase());
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return false;
  }
  if (entry.code !== code.trim()) return false;
  otpStore.delete(email.toLowerCase()); // consume on success
  return true;
}
