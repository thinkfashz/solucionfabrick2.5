import 'server-only';
import { insforgeAdmin } from '@/lib/insforge';
import { DEFAULT_SHIPPING_CONFIG, normalizeShippingConfig, shippingConfigToStorage, type ShippingConfig } from '@/lib/shipping';

export const SHIPPING_CONFIG_KEY = 'shipping_config';

export async function getShippingConfig(): Promise<ShippingConfig> {
  try {
    const { data } = await insforgeAdmin.database
      .from('configuracion')
      .select('valor')
      .eq('clave', SHIPPING_CONFIG_KEY)
      .limit(1);
    const row = Array.isArray(data) ? data[0] as { valor?: string | null } : null;
    if (!row?.valor) return DEFAULT_SHIPPING_CONFIG;
    return normalizeShippingConfig(JSON.parse(row.valor));
  } catch {
    return DEFAULT_SHIPPING_CONFIG;
  }
}

export async function saveShippingConfig(config: ShippingConfig) {
  const normalized = normalizeShippingConfig(config);
  const payload = { clave: SHIPPING_CONFIG_KEY, valor: shippingConfigToStorage(normalized), updated_at: new Date().toISOString() };

  const { error } = await insforgeAdmin.database.from('configuracion').upsert([payload]);
  if (error) throw new Error(error.message || 'No se pudo guardar la configuración de envío.');
  return normalized;
}
