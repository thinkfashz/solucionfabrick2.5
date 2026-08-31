import 'server-only';
import { insforgeAdmin } from './insforge';
import { mlGetItem, mlGetOrders } from './mlApi';
import { applyInventoryMovementAtomic } from './inventory/stockLedger';

export interface MLSyncProduct {
  id: string;
  name: string;
  mlItemId: string;
  mlStatus: 'active' | 'paused' | 'closed' | 'inactive';
  localPrice: number;
  mlPrice: number;
  localStock: number;
  mlStock: number;
  lastSyncAt: Date;
  syncStatus: 'synced' | 'pending' | 'error';
  syncError?: string;
}

export interface MLOrder {
  id: string;
  mlOrderId: string;
  mlBuyerId: string;
  buyerName: string;
  buyerEmail: string;
  items: Array<{
    mlItemId: string;
    title: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  status: 'unshipped' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

export interface SyncStatus {
  lastFullSync: Date | null;
  nextFullSync: Date | null;
  productsToSync: number;
  activeOrders: number;
  syncErrors: number;
  syncedProducts: number;
  pendingProducts: number;
}

export async function syncProductPrice(
  productId: string,
  mlItemId: string,
  tenantId: string,
): Promise<MLSyncProduct | null> {
  try {
    const mlItem = await mlGetItem(mlItemId);

    const { data: localProducts, error } = await insforgeAdmin.database
      .from('products')
      .select('id, name, price, stock')
      .eq('tenant_id', tenantId)
      .eq('id', productId)
      .limit(1);
    if (error) throw new Error(error.message);
    const localProduct = localProducts?.[0] as { id: string; name?: string; price?: number; stock?: number } | undefined;
    if (!localProduct) throw new Error('Producto local no encontrado en este tenant');

    const nextPrice = Number(mlItem.price ?? localProduct.price ?? 0);
    const nextStock = Math.max(0, Math.trunc(Number(mlItem.available_quantity ?? localProduct.stock ?? 0)));
    const localPrice = Number(localProduct.price ?? 0);
    const localStock = Number(localProduct.stock ?? 0);
    const priceChanged = localPrice !== nextPrice;
    const stockChanged = localStock !== nextStock;
    const needsUpdate = priceChanged || stockChanged;

    if (priceChanged) {
      const { error: updateError } = await insforgeAdmin.database
        .from('products')
        .update({
          price: nextPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .eq('id', productId);
      if (updateError) throw new Error(updateError.message);
    }

    if (stockChanged) {
      await applyInventoryMovementAtomic({
        tenantId,
        productId,
        type: 'adjustment',
        quantity: nextStock,
        referenceType: 'mercadolibre_snapshot',
        referenceId: null,
        note: `Stock sincronizado desde Mercado Libre (${mlItemId})`,
        actorId: 'mercadolibre-sync',
      });
    }

    return {
      id: productId,
      name: localProduct.name ?? 'Producto',
      mlItemId,
      mlStatus: mlItem.status as MLSyncProduct['mlStatus'],
      localPrice,
      mlPrice: nextPrice,
      localStock,
      mlStock: nextStock,
      lastSyncAt: new Date(),
      syncStatus: needsUpdate ? 'pending' : 'synced',
    };
  } catch (err) {
    console.error('[ml-sync] product sync failed', { tenantId, productId, mlItemId, err });
    return null;
  }
}

export async function syncMercadoLibreOrders(tenantId: string): Promise<MLOrder[]> {
  try {
    const { results } = await mlGetOrders({ limit: 50, offset: 0 });
    const orders: MLOrder[] = [];

    if (results.length) {
      const rows = results.map((mlOrder) => ({
        id: mlOrder.id,
        tenant_id: tenantId,
        status: mlOrder.status,
        status_detail: mlOrder.status_detail ?? null,
        buyer_id: mlOrder.buyer?.id ?? null,
        buyer_nickname: mlOrder.buyer?.nickname ?? null,
        buyer_email: mlOrder.buyer?.email ?? null,
        total_amount: mlOrder.total_amount,
        currency_id: mlOrder.currency_id,
        items: mlOrder.order_items,
        shipping_id: mlOrder.shipping?.id ?? null,
        shipping_status: mlOrder.shipping?.status ?? null,
        shipping_address: mlOrder.shipping?.receiver_address?.full ?? null,
        payments: mlOrder.payments,
        date_created: mlOrder.date_created,
        date_closed: mlOrder.date_closed,
        last_updated: mlOrder.last_updated,
        synced_at: new Date().toISOString(),
      }));
      const { error } = await insforgeAdmin.database.from('ml_orders').upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(error.message);
    }

    for (const mlOrder of results) {
      orders.push({
        id: `ml-${mlOrder.id}`,
        mlOrderId: String(mlOrder.id),
        mlBuyerId: String(mlOrder.buyer?.id ?? 'unknown'),
        buyerName: mlOrder.buyer?.nickname ?? '',
        buyerEmail: mlOrder.buyer?.email ?? '',
        items: (mlOrder.order_items ?? []).map((item) => ({
          mlItemId: item.item?.id ?? '',
          title: item.item?.title ?? '',
          quantity: item.quantity ?? 0,
          price: item.unit_price ?? 0,
        })),
        totalAmount: Number(mlOrder.total_amount ?? 0),
        status: mlOrder.status as MLOrder['status'],
        createdAt: mlOrder.date_created ? new Date(mlOrder.date_created) : new Date(),
        updatedAt: mlOrder.last_updated ? new Date(mlOrder.last_updated) : new Date(),
      });
    }

    return orders;
  } catch (err) {
    console.error('[ml-sync] order sync failed', { tenantId, err });
    return [];
  }
}

export async function getSyncStatus(tenantId: string): Promise<SyncStatus> {
  try {
    const { data: products } = await insforgeAdmin.database
      .from('products')
      .select('id, ml_item_id, last_sync_at, sync_status')
      .eq('tenant_id', tenantId)
      .not('ml_item_id', 'is', null);

    const { data: orders } = await insforgeAdmin.database
      .from('ml_orders')
      .select('id, status')
      .eq('tenant_id', tenantId);

    const { data: syncErrors } = await insforgeAdmin.database
      .from('sync_logs')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('sync_type', 'ml')
      .eq('success', false)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { data: lastLog } = await insforgeAdmin.database
      .from('sync_logs')
      .select('created_at')
      .eq('tenant_id', tenantId)
      .eq('sync_type', 'ml')
      .eq('success', true)
      .order('created_at', { ascending: false })
      .limit(1);

    const syncedCount = products?.filter((p: { sync_status?: string }) => p.sync_status === 'synced').length || 0;
    const pendingCount = products?.filter((p: { sync_status?: string }) => p.sync_status === 'pending').length || 0;
    const activeOrders = (orders ?? []).filter((o: { status?: string }) => !['cancelled', 'closed'].includes(String(o.status ?? '').toLowerCase())).length;

    return {
      lastFullSync: lastLog?.[0]?.created_at ? new Date(lastLog[0].created_at) : null,
      nextFullSync: new Date(Date.now() + 60 * 60 * 1000),
      productsToSync: products?.length || 0,
      activeOrders,
      syncErrors: syncErrors?.length || 0,
      syncedProducts: syncedCount,
      pendingProducts: pendingCount,
    };
  } catch (err) {
    console.error('[ml-sync] status lookup failed', { tenantId, err });
    return {
      lastFullSync: null,
      nextFullSync: null,
      productsToSync: 0,
      activeOrders: 0,
      syncErrors: 0,
      syncedProducts: 0,
      pendingProducts: 0,
    };
  }
}

export async function runFullSync(tenantId: string): Promise<{
  success: boolean;
  productsSync: MLSyncProduct[];
  ordersSync: MLOrder[];
  errors: string[];
}> {
  const errors: string[] = [];
  const startedAt = new Date();

  try {
    let ordersSync: MLOrder[] = [];
    try {
      ordersSync = await syncMercadoLibreOrders(tenantId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      errors.push(`Órdenes: ${msg}`);
    }

    const { data: products, error: productsError } = await insforgeAdmin.database
      .from('products')
      .select('id, ml_item_id')
      .eq('tenant_id', tenantId)
      .not('ml_item_id', 'is', null);
    if (productsError) throw new Error(productsError.message);

    const productsSync: MLSyncProduct[] = [];
    for (const product of products || []) {
      try {
        const synced = await syncProductPrice(String(product.id), String(product.ml_item_id), tenantId);
        if (synced) productsSync.push(synced);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        errors.push(`Producto ${product.id}: ${msg}`);
      }
    }

    await insforgeAdmin.database.from('sync_logs').insert({
      tenant_id: tenantId,
      sync_type: 'ml',
      success: errors.length === 0,
      started_at: startedAt.toISOString(),
      completed_at: new Date().toISOString(),
      products_synced: productsSync.length,
      orders_synced: ordersSync.length,
      errors: errors.length > 0 ? errors.join('; ') : null,
      created_at: new Date().toISOString(),
    });

    return {
      success: errors.length === 0,
      productsSync,
      ordersSync,
      errors,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    errors.push(`Sincronización general: ${msg}`);
    try {
      await insforgeAdmin.database.from('sync_logs').insert({
        tenant_id: tenantId,
        sync_type: 'ml',
        success: false,
        started_at: startedAt.toISOString(),
        completed_at: new Date().toISOString(),
        products_synced: 0,
        orders_synced: 0,
        errors: errors.join('; '),
        created_at: new Date().toISOString(),
      });
    } catch {
      // Do not mask the sync failure if diagnostics cannot be persisted.
    }
    return { success: false, productsSync: [], ordersSync: [], errors };
  }
}

export async function adjustStockFromML(
  productId: string,
  mlQuantity: number,
  tenantId: string,
): Promise<boolean> {
  try {
    const targetStock = Math.max(0, Math.trunc(Number(mlQuantity) || 0));
    const movement = await applyInventoryMovementAtomic({
      tenantId,
      productId,
      type: 'adjustment',
      quantity: targetStock,
      referenceType: 'mercadolibre_sync',
      referenceId: null,
      note: 'Ajuste automático desde Mercado Libre',
      actorId: 'mercadolibre-sync',
    });
    return movement.quantity !== 0;
  } catch (err) {
    console.error('[ml-sync] stock adjustment failed', { tenantId, productId, err });
    return false;
  }
}
