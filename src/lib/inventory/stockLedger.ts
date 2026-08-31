import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';

export type InventoryMovementType = 'in' | 'out' | 'adjustment' | 'return';

export type ApplyInventoryMovementInput = {
  tenantId: string;
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  barcode?: string | null;
  note?: string | null;
  actorId?: string | null;
};

export type InventoryMovementResult = {
  ok: boolean;
  duplicate: boolean;
  movement_id: string;
  stock_before: number;
  stock_after: number;
  quantity: number;
};

function cleanText(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max) || null;
}

export async function applyInventoryMovementAtomic(input: ApplyInventoryMovementInput): Promise<InventoryMovementResult> {
  const quantity = Math.trunc(Number(input.quantity));
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error('INVALID_QUANTITY');

  const { data, error } = await insforgeAdmin.database.rpc('inventory_apply_movement', {
    p_tenant_id: input.tenantId,
    p_product_id: input.productId,
    p_movement_type: input.type,
    p_quantity: quantity,
    p_reference_type: cleanText(input.referenceType, 120),
    p_reference_id: cleanText(input.referenceId, 240),
    p_barcode: cleanText(input.barcode, 512),
    p_note: cleanText(input.note, 500),
    p_actor_id: cleanText(input.actorId, 240),
  });

  if (error) throw new Error(error.message || 'INVENTORY_RPC_FAILED');
  const result = (Array.isArray(data) ? data[0] : data) as InventoryMovementResult | null;
  if (!result?.ok) throw new Error('INVENTORY_RPC_INVALID_RESPONSE');
  return result;
}

export function inventoryMovementHttpError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (message.includes('INSUFFICIENT_STOCK:')) {
    const available = message.match(/INSUFFICIENT_STOCK:(\d+)/)?.[1];
    return { status: 409, error: available ? `Stock insuficiente. Disponible: ${available}.` : 'Stock insuficiente.' };
  }
  if (message.includes('PRODUCT_NOT_FOUND')) return { status: 404, error: 'Producto no encontrado.' };
  if (message.includes('INVALID_QUANTITY')) return { status: 400, error: 'Cantidad inválida.' };
  if (message.includes('INVALID_MOVEMENT_TYPE')) return { status: 400, error: 'Tipo de movimiento inválido.' };
  return { status: 500, error: 'No se pudo registrar el movimiento de inventario.' };
}
