import 'server-only';
import { emitBoletaForOrder } from '@/lib/billing/autoEmit';
import { sendOrderBoletaEmail } from '@/lib/email/sendOrderBoletaEmail';
import { sendAdminOrderNotification } from '@/lib/email/sendAdminOrderNotification';

export type PaidConfirmationResult = {
  ok: boolean;
  invoice?: Awaited<ReturnType<typeof emitBoletaForOrder>>;
  email?: Awaited<ReturnType<typeof sendOrderBoletaEmail>>;
  adminEmail?: Awaited<ReturnType<typeof sendAdminOrderNotification>>;
  warnings?: string[];
  error?: string;
};

export async function confirmPaidOrderAndSendReceipt(orderId: string): Promise<PaidConfirmationResult> {
  const warnings: string[] = [];
  let invoice: Awaited<ReturnType<typeof emitBoletaForOrder>>;
  try {
    invoice = await emitBoletaForOrder(orderId);
    if (!invoice.ok) warnings.push(invoice.error || 'No se pudo emitir el documento tributario.');
  } catch (error) {
    invoice = { ok: false, error: error instanceof Error ? error.message : 'Falló la emisión DTE.' };
    warnings.push(invoice.error || 'Falló la emisión DTE.');
  }
  const [email, adminEmail] = await Promise.all([
    sendOrderBoletaEmail(orderId).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Falló el correo al cliente.' })),
    sendAdminOrderNotification(orderId).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Falló el aviso al administrador.' })),
  ]);
  if (!email.ok) warnings.push(email.error || email.reason || 'No se envió confirmación al cliente.');
  if (!adminEmail.ok) warnings.push(adminEmail.error || adminEmail.reason || 'No se envió aviso al administrador.');
  return { ok: true, invoice, email, adminEmail, warnings };
}

export function confirmPaidOrderAndSendReceiptAsync(orderId: string) {
  confirmPaidOrderAndSendReceipt(orderId).then((result) => {
    if (result.warnings?.length) console.warn('[orders] paid confirmation warnings', orderId, result.warnings);
  }).catch((err) => console.warn('[orders] paid confirmation crashed', orderId, err));
}
