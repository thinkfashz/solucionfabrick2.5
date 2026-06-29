import 'server-only';
import { emitBoletaForOrder } from '@/lib/billing/autoEmit';
import { sendOrderBoletaEmail } from '@/lib/email/sendOrderBoletaEmail';

export type PaidConfirmationResult = {
  ok: boolean;
  invoice?: Awaited<ReturnType<typeof emitBoletaForOrder>>;
  email?: Awaited<ReturnType<typeof sendOrderBoletaEmail>>;
  error?: string;
};

export async function confirmPaidOrderAndSendReceipt(orderId: string): Promise<PaidConfirmationResult> {
  try {
    const invoice = await emitBoletaForOrder(orderId);
    if (!invoice.ok) {
      return { ok: false, invoice, error: invoice.error || 'No se pudo emitir boleta.' };
    }

    const email = await sendOrderBoletaEmail(orderId);
    return { ok: email.ok, invoice, email, error: email.error || email.reason };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error enviando confirmación pagada.' };
  }
}

export function confirmPaidOrderAndSendReceiptAsync(orderId: string) {
  confirmPaidOrderAndSendReceipt(orderId).then((result) => {
    if (!result.ok) {
      console.warn('[orders] paid confirmation failed', orderId, result.error || result.email?.reason || result.email?.error);
    }
  }).catch((err) => {
    console.warn('[orders] paid confirmation crashed', orderId, err);
  });
}
