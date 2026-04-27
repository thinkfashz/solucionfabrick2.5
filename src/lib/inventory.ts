import 'server-only';

/**
 * Inventory helpers (epic 3).
 *
 * Stock model:
 *  - `qty_on_hand`   : units physically present in the warehouse.
 *  - `qty_reserved`  : units committed to in-flight orders (paid or pending).
 *  - `qty_available` : `qty_on_hand - qty_reserved` (can never be negative).
 *  - `qty_safety`    : floor below which the product becomes "low stock" in
 *                      the admin dashboard.
 *
 * Lifecycle:
 *   1. Customer reaches checkout → `reserveStock()` decrements available.
 *   2. MP webhook `approved`     → `commitReservation()` (qty_on_hand--).
 *   3. MP webhook `rejected`     → `releaseReservation()` (qty_reserved--).
 *
 * The functions here are best-effort: in InsForge there is no transactional
 * `RETURNING ... FOR UPDATE`, so callers MUST treat reservations as advisory
 * and re-check `qty_on_hand >= 0` at commit time.
 */

import { insforge } from '@/lib/insforge';

export interface InventoryRow {
  id: string;
  variant_id: string;
  warehouse_id: string;
  qty_on_hand: number;
  qty_reserved: number;
  qty_safety: number;
}

export interface ReservationRequest {
  variantId: string;
  warehouseId?: string | null;
  qty: number;
  orderId?: string | null;
  user?: string | null;
}

export interface ReservationResult {
  ok: boolean;
  variantId: string;
  warehouseId: string | null;
  reserved: number;
  available_after: number;
  reason?: string;
}

const DEFAULT_WAREHOUSE_CODE = 'main';

async function findDefaultWarehouseId(): Promise<string | null> {
  const { data } = await insforge.database
    .from('warehouses')
    .select('id')
    .eq('code', DEFAULT_WAREHOUSE_CODE)
    .limit(1);
  const row = (data ?? [])[0] as { id?: string } | undefined;
  return row?.id ?? null;
}

async function loadInventory(variantId: string, warehouseId: string): Promise<InventoryRow | null> {
  const { data } = await insforge.database
    .from('inventory')
    .select('id, variant_id, warehouse_id, qty_on_hand, qty_reserved, qty_safety')
    .eq('variant_id', variantId)
    .eq('warehouse_id', warehouseId)
    .limit(1);
  const row = (data ?? [])[0];
  return (row as unknown as InventoryRow) ?? null;
}

async function logMovement(
  variantId: string,
  warehouseId: string,
  type: string,
  qty: number,
  orderId: string | null,
  user: string | null,
  note?: string,
) {
  try {
    await insforge.database.from('inventory_movements').insert([
      {
        variant_id: variantId,
        warehouse_id: warehouseId,
        type,
        qty,
        ref_order_id: orderId,
        ref_user: user,
        note: note ?? null,
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[inventory] failed to log movement:', err);
  }
}

/**
 * Reserve `qty` units of `variantId` from the requested warehouse (or the
 * default one). Returns `{ok:false}` when there's not enough stock.
 *
 * NOTE: This is a logical reservation — `qty_on_hand` is NOT decremented yet.
 * Use `commitReservation` when payment is confirmed.
 */
export async function reserveStock(req: ReservationRequest): Promise<ReservationResult> {
  const { variantId, qty, orderId = null, user = null } = req;
  if (!variantId || !Number.isFinite(qty) || qty <= 0) {
    return { ok: false, variantId, warehouseId: null, reserved: 0, available_after: 0, reason: 'invalid_request' };
  }

  const warehouseId = req.warehouseId ?? (await findDefaultWarehouseId());
  if (!warehouseId) {
    return { ok: false, variantId, warehouseId: null, reserved: 0, available_after: 0, reason: 'warehouse_not_configured' };
  }

  const inv = await loadInventory(variantId, warehouseId);
  if (!inv) {
    return { ok: false, variantId, warehouseId, reserved: 0, available_after: 0, reason: 'variant_not_in_warehouse' };
  }

  const available = Math.max(0, inv.qty_on_hand - inv.qty_reserved);
  if (available < qty) {
    return { ok: false, variantId, warehouseId, reserved: 0, available_after: available, reason: 'insufficient_stock' };
  }

  const newReserved = inv.qty_reserved + qty;
  const { error } = await insforge.database
    .from('inventory')
    .update({ qty_reserved: newReserved, updated_at: new Date().toISOString() })
    .eq('id', inv.id);

  if (error) {
    return { ok: false, variantId, warehouseId, reserved: 0, available_after: available, reason: error.message };
  }

  await logMovement(variantId, warehouseId, 'reservation', qty, orderId, user);

  return {
    ok: true,
    variantId,
    warehouseId,
    reserved: qty,
    available_after: available - qty,
  };
}

/** Inverse of `reserveStock` — frees a previous reservation without shipping. */
export async function releaseReservation(req: ReservationRequest): Promise<ReservationResult> {
  const { variantId, qty, orderId = null, user = null } = req;
  const warehouseId = req.warehouseId ?? (await findDefaultWarehouseId());
  if (!warehouseId) {
    return { ok: false, variantId, warehouseId: null, reserved: 0, available_after: 0, reason: 'warehouse_not_configured' };
  }
  const inv = await loadInventory(variantId, warehouseId);
  if (!inv) return { ok: false, variantId, warehouseId, reserved: 0, available_after: 0, reason: 'not_found' };

  const newReserved = Math.max(0, inv.qty_reserved - qty);
  const { error } = await insforge.database
    .from('inventory')
    .update({ qty_reserved: newReserved, updated_at: new Date().toISOString() })
    .eq('id', inv.id);
  if (error) return { ok: false, variantId, warehouseId, reserved: 0, available_after: 0, reason: error.message };

  await logMovement(variantId, warehouseId, 'release', qty, orderId, user);
  return {
    ok: true,
    variantId,
    warehouseId,
    reserved: 0,
    available_after: Math.max(0, inv.qty_on_hand - newReserved),
  };
}

/**
 * Convert a reservation into a shipped sale: `qty_on_hand--` and
 * `qty_reserved--`. Used by the MP webhook on `approved`.
 */
export async function commitReservation(req: ReservationRequest): Promise<ReservationResult> {
  const { variantId, qty, orderId = null, user = null } = req;
  const warehouseId = req.warehouseId ?? (await findDefaultWarehouseId());
  if (!warehouseId) {
    return { ok: false, variantId, warehouseId: null, reserved: 0, available_after: 0, reason: 'warehouse_not_configured' };
  }
  const inv = await loadInventory(variantId, warehouseId);
  if (!inv) return { ok: false, variantId, warehouseId, reserved: 0, available_after: 0, reason: 'not_found' };

  const newOnHand = Math.max(0, inv.qty_on_hand - qty);
  const newReserved = Math.max(0, inv.qty_reserved - qty);

  const { error } = await insforge.database
    .from('inventory')
    .update({
      qty_on_hand: newOnHand,
      qty_reserved: newReserved,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inv.id);
  if (error) return { ok: false, variantId, warehouseId, reserved: 0, available_after: 0, reason: error.message };

  await logMovement(variantId, warehouseId, 'out', qty, orderId, user, 'commit reservation');

  return { ok: true, variantId, warehouseId, reserved: 0, available_after: Math.max(0, newOnHand - newReserved) };
}

/**
 * Validate an EAN-13 checksum. Used by the scanner UI to filter out random
 * codes scanned by mistake (e.g. shipping labels).
 */
export function isValidEan13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) return false;
  const digits = barcode.split('').map((d) => Number(d));
  const sum = digits
    .slice(0, 12)
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const checksum = (10 - (sum % 10)) % 10;
  return checksum === digits[12];
}
