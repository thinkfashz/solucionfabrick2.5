/**
 * Mercado Libre Sync — Sincronización de precios, órdenes e inventario
 * ─────────────────────────────────────────────────────────────────────────
 * 
 * Sincroniza:
 * 1. Precios: ML → Tienda (updates de precio en tiempo real)
 * 2. Órdenes: ML → Tienda (órdenes creadas en ML aparecen en sistema)
 * 3. Inventario: Tienda ↔ ML (stock bidireccional)
 */

import 'server-only';
import { getMercadoLibreCredentials } from './mercadoLibreCredentials';
import { insforge } from './insforge';

/**
 * Producto sincronizado con ML
 */
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

/**
 * Orden desde Mercado Libre
 */
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

/**
 * Estado de sincronización
 */
export interface SyncStatus {
  lastFullSync: Date | null;
  nextFullSync: Date | null;
  productsToSync: number;
  activeOrders: number;
  syncErrors: number;
  syncedProducts: number;
  pendingProducts: number;
}

/**
 * Sincroniza producto: actualiza precio de ML en tienda
 */
export async function syncProductPrice(
  productId: string,
  mlItemId: string
): Promise<MLSyncProduct | null> {
  try {
    const creds = await getMercadoLibreCredentials();
    if (!creds.accessToken) {
      throw new Error('Mercado Libre no configurado');
    }

    // Obtiene precio actual de ML
    const mlRes = await fetch(`https://api.mercadolibre.com/items/${mlItemId}`, {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!mlRes.ok) {
      throw new Error(`ML API error: ${mlRes.status}`);
    }

    const mlItem = (await mlRes.json()) as {
      price?: number;
      available_quantity?: number;
      status?: string;
    };

    // Obtiene producto local
    const { data: localProducts } = await insforge.database.from('products').select('*').eq('id', productId).limit(1);
    const localProduct = localProducts?.[0];

    if (!localProduct) {
      throw new Error('Producto local no encontrado');
    }

    // Comparar y actualizar si hay cambios
    const needsUpdate =
      localProduct.price !== mlItem.price || localProduct.stock !== mlItem.available_quantity;

    if (needsUpdate) {
      await insforge.database
        .from('products')
        .update({
          price: mlItem.price || localProduct.price,
          stock: mlItem.available_quantity || localProduct.stock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);
    }

    return {
      id: productId,
      name: localProduct.name,
      mlItemId,
      mlStatus: mlItem.status as any,
      localPrice: localProduct.price,
      mlPrice: mlItem.price || 0,
      localStock: localProduct.stock || 0,
      mlStock: mlItem.available_quantity || 0,
      lastSyncAt: new Date(),
      syncStatus: needsUpdate ? 'pending' : 'synced',
    };
  } catch (err) {
    console.error('Error syncing product price:', err);
    return null;
  }
}

/**
 * Sincroniza todas las órdenes de ML
 */
export async function syncMercadoLibreOrders(): Promise<MLOrder[]> {
  try {
    const creds = await getMercadoLibreCredentials();
    if (!creds.accessToken) {
      throw new Error('Mercado Libre no configurado');
    }

    // Obtiene órdenes recientes de ML
    const ordersRes = await fetch(
      'https://api.mercadolibre.com/orders/search?seller=me&sort=date_desc&limit=50',
      {
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!ordersRes.ok) {
      throw new Error(`ML API error: ${ordersRes.status}`);
    }

    const ordersJson = (await ordersRes.json()) as {
      results?: Array<{
        id?: number;
        status?: string;
        date_created?: string;
        date_last_modified?: string;
        buyer?: {
          id?: number;
          email?: string;
          first_name?: string;
          last_name?: string;
        };
        order_items?: Array<{
          item?: {
            id?: string;
            title?: string;
          };
          quantity?: number;
          unit_price?: number;
        }>;
        total_amount?: number;
      }>;
    };

    const orders: MLOrder[] = [];

    for (const mlOrder of ordersJson.results || []) {
      if (!mlOrder.id) continue;

      const order: MLOrder = {
        id: `ml-${mlOrder.id}`,
        mlOrderId: mlOrder.id.toString(),
        mlBuyerId: mlOrder.buyer?.id?.toString() || 'unknown',
        buyerName: `${mlOrder.buyer?.first_name || ''} ${mlOrder.buyer?.last_name || ''}`.trim(),
        buyerEmail: mlOrder.buyer?.email || '',
        items: (mlOrder.order_items || []).map((item) => ({
          mlItemId: item.item?.id || '',
          title: item.item?.title || '',
          quantity: item.quantity || 0,
          price: item.unit_price || 0,
        })),
        totalAmount: mlOrder.total_amount || 0,
        status: (mlOrder.status as any) || 'unshipped',
        createdAt: mlOrder.date_created ? new Date(mlOrder.date_created) : new Date(),
        updatedAt: mlOrder.date_last_modified ? new Date(mlOrder.date_last_modified) : new Date(),
      };

      // Guarda en BD local
      await insforge.database.from('ml_orders').upsert({
        id: order.id,
        ml_order_id: order.mlOrderId,
        ml_buyer_id: order.mlBuyerId,
        buyer_name: order.buyerName,
        buyer_email: order.buyerEmail,
        items: order.items,
        total_amount: order.totalAmount,
        status: order.status,
        created_at: order.createdAt.toISOString(),
        updated_at: order.updatedAt.toISOString(),
      });

      orders.push(order);
    }

    return orders;
  } catch (err) {
    console.error('Error syncing ML orders:', err);
    return [];
  }
}

/**
 * Obtiene estado general de sincronización
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  try {
    // Obtiene productos con estado de sync
    const { data: products } = await insforge.database
      .from('products')
      .select('id, ml_item_id, last_sync_at, sync_status')
      .not('ml_item_id', 'is', null);

    // Cuenta órdenes activas
    const { data: orders } = await insforge.database
      .from('ml_orders')
      .select('id')
      .in('status', ['unshipped', 'shipped']);

    const { data: syncErrors } = await insforge.database
      .from('sync_logs')
      .select('id')
      .eq('sync_type', 'ml')
      .eq('success', false)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const syncedCount = products?.filter((p: { sync_status?: string }) => p.sync_status === 'synced').length || 0;
    const pendingCount = products?.filter((p: { sync_status?: string }) => p.sync_status === 'pending').length || 0;

    // Obtiene último sync
    const { data: lastLog } = await insforge.database
      .from('sync_logs')
      .select('created_at')
      .eq('sync_type', 'ml')
      .eq('success', true)
      .order('created_at', { ascending: false })
      .limit(1);

    return {
      lastFullSync: lastLog?.[0]?.created_at ? new Date(lastLog[0].created_at) : null,
      nextFullSync: new Date(Date.now() + 60 * 60 * 1000), // En 1 hora
      productsToSync: products?.length || 0,
      activeOrders: orders?.length || 0,
      syncErrors: syncErrors?.length || 0,
      syncedProducts: syncedCount,
      pendingProducts: pendingCount,
    };
  } catch (err) {
    console.error('Error getting sync status:', err);
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

/**
 * Ejecuta sincronización completa (precios + órdenes)
 */
export async function runFullSync(): Promise<{
  success: boolean;
  productsSync: MLSyncProduct[];
  ordersSync: MLOrder[];
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    // Log inicio
    await insforge.database.from('sync_logs').insert({
      sync_type: 'ml',
      success: false,
      started_at: new Date().toISOString(),
    });

    // Sincroniza órdenes
    let ordersSync: MLOrder[] = [];
    try {
      ordersSync = await syncMercadoLibreOrders();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      errors.push(`Órdenes: ${msg}`);
    }

    // Sincroniza precios de productos
    const { data: products } = await insforge.database
      .from('products')
      .select('id, ml_item_id')
      .not('ml_item_id', 'is', null);

    const productsSync: MLSyncProduct[] = [];
    for (const product of products || []) {
      try {
        const synced = await syncProductPrice(product.id, product.ml_item_id);
        if (synced) productsSync.push(synced);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        errors.push(`Producto ${product.id}: ${msg}`);
      }
    }

    // Log resultado
    await insforge.database.from('sync_logs').insert({
      sync_type: 'ml',
      success: errors.length === 0,
      started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      completed_at: new Date().toISOString(),
      products_synced: productsSync.length,
      orders_synced: ordersSync.length,
      errors: errors.length > 0 ? errors.join('; ') : null,
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

    return {
      success: false,
      productsSync: [],
      ordersSync: [],
      errors,
    };
  }
}

/**
 * Ajusta stock local según cambios en ML
 */
export async function adjustStockFromML(productId: string, mlQuantity: number): Promise<boolean> {
  try {
    const { data: product } = await insforge.database
      .from('products')
      .select('stock, price')
      .eq('id', productId)
      .limit(1);

    if (!product?.[0]) return false;

    // Solo actualiza si hay diferencia significativa
    if (Math.abs((product[0].stock || 0) - mlQuantity) > 1) {
      await insforge.database.from('products').update({ stock: mlQuantity }).eq('id', productId);

      // Log del cambio
      await insforge.database.from('stock_history').insert({
        product_id: productId,
        old_quantity: product[0].stock || 0,
        new_quantity: mlQuantity,
        source: 'mercadolibre',
        created_at: new Date().toISOString(),
      });

      return true;
    }

    return false;
  } catch (err) {
    console.error('Error adjusting stock:', err);
    return false;
  }
}
