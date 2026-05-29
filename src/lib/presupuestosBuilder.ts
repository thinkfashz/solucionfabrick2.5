export type PresupuestoEstado = 'borrador' | 'enviado' | 'aprobado' | 'rechazado' | 'vencido';
export type PresupuestoArchivoTipo = 'modelo_3d' | 'pdf' | 'zip' | 'imagen' | 'otro';

export interface PresupuestoItem { id: string; nombre: string; descripcion: string; categoria: string; cantidad: number; unidad: string; precio_unitario: number; total: number; orden: number; }
export interface PresupuestoImagen { id: string; url: string; titulo: string; descripcion: string; orden: number; }
export interface PresupuestoArchivo { id: string; nombre: string; url: string; descripcion: string; tipo: PresupuestoArchivoTipo; formato: string; mostrar_cliente: boolean; orden: number; }
export interface FormaPagoItem { porcentaje: number; descripcion: string; }
export interface PresupuestoPro { id: string; slug: string; proveedor: string; cliente: string; empresa_cliente: string; email_cliente?: string; titulo: string; descripcion: string; ciudad: string; fecha: string; validez: string; plazo_entrega: string; fecha_vencimiento?: string; fecha_activacion?: string; estado: PresupuestoEstado; valor_neto: number; iva_porcentaje: number; total_iva: number; total_con_iva: number; html_personalizado: string; usar_html_personalizado: boolean; json_presentacion: Record<string, unknown>; imagenes: PresupuestoImagen[]; archivos: PresupuestoArchivo[]; incluye: string[]; no_incluye: string[]; materiales: string[]; forma_pago: FormaPagoItem[]; observacion_tecnica: string; items: PresupuestoItem[]; telefono_whatsapp?: string; video_url?: string; video_titulo?: string; video_descripcion?: string; created_at: string; updated_at: string; }

export const PRESUPUESTOS_PRO_STORAGE_KEY = 'sf_presupuestos_profesionales_v1';
const now = () => new Date().toISOString();
export const createBudgetId = (prefix = 'pre') => `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
export const slugifyBudget = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || `presupuesto-${Date.now()}`;
export const formatBudgetMoney = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);

export function fileTypeFromUrl(url = '', format = ''): PresupuestoArchivoTipo {
  const ext = (format || url.split('?')[0].split('.').pop() || '').toLowerCase();
  if (['glb', 'gltf'].includes(ext)) return 'modelo_3d';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'zip') return 'zip';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'].includes(ext)) return 'imagen';
  return 'otro';
}

export function calculateBudget(input: PresupuestoPro): PresupuestoPro {
  const items = (input.items || []).map((item, index) => {
    const cantidad = Number(item.cantidad) || 0;
    const precio = Number(item.precio_unitario) || 0;
    return { ...item, cantidad, precio_unitario: precio, orden: Number(item.orden) || index + 1, total: Math.round(cantidad * precio) };
  }).sort((a, b) => a.orden - b.orden);
  const totalItems = items.reduce((sum, item) => sum + item.total, 0);
  const valorNeto = totalItems > 0 ? totalItems : Number(input.valor_neto) || 0;
  const ivaPorcentaje = Number(input.iva_porcentaje) || 0;
  const totalIva = Math.round(valorNeto * (ivaPorcentaje / 100));
  return { ...input, items, archivos: input.archivos || [], valor_neto: valorNeto, iva_porcentaje: ivaPorcentaje, total_iva: totalIva, total_con_iva: valorNeto + totalIva, slug: input.slug || slugifyBudget(`${input.cliente}-${input.titulo}`) };
}

export function sanitizeBudgetHtml(html: string) {
  if (!html) return '';
  return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '').replace(/\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/javascript:/gi, '').replace(/data:text\/html/gi, '');
}

export const baseBudgetExample: PresupuestoPro = calculateBudget({
  id: 'presupuesto-trima-container-laboratorio', slug: 'trima-mobiliario-modular-laboratorio-container', proveedor: 'Soluciones Fabrick', cliente: 'TRIMA', empresa_cliente: 'TRIMA', email_cliente: '', titulo: 'Fabricación Mobiliario Modular Laboratorio Container', ciudad: 'Chile', fecha: new Date().toISOString().slice(0, 10), validez: '5 días hábiles', plazo_entrega: '21 días hábiles', estado: 'borrador', valor_neto: 4800000, iva_porcentaje: 19, total_iva: 0, total_con_iva: 0, html_personalizado: '', usar_html_personalizado: false, json_presentacion: {}, imagenes: [], archivos: [], telefono_whatsapp: '', fecha_activacion: '', created_at: now(), updated_at: now(),
  descripcion: 'Fabricación e instalación de mobiliario modular superior e inferior para container laboratorio, diseñado para optimizar funcionalidad, almacenamiento y áreas de trabajo dentro del espacio operativo.',
  incluye: ['Fabricación de mobiliario modular inferior', 'Fabricación de muebles superiores', 'Instalación, nivelación y fijación en terreno', 'Puertas, ajustes y terminaciones del mobiliario', 'Iluminación LED bajo muebles superiores'],
  no_incluye: ['Electricidad', 'Gasfitería', 'Conexiones sanitarias', 'Cafetería', 'Obras civiles', 'Equipamiento de laboratorio', 'Electrodomésticos', 'Pintura', 'Climatización', 'Modificaciones estructurales del container'],
  materiales: ['Melamina blanca alto tráfico 18 mm', 'Puertas en melamina 18 mm', 'Herrajes reforzados', 'Bisagras metálicas', 'Correderas telescópicas', 'Tapacantos PVC', 'Iluminación LED bajo muebles superiores', 'Cubiertas de trabajo reforzadas'],
  forma_pago: [{ porcentaje: 50, descripcion: 'Al iniciar el proyecto' }, { porcentaje: 20, descripcion: 'Al entregar el mobiliario en terreno' }, { porcentaje: 10, descripcion: 'Al tener los muebles superiores e inferiores instalados, nivelados y fijados' }, { porcentaje: 10, descripcion: 'Al momento de instalar puertas, ajustes y terminaciones del mobiliario' }, { porcentaje: 10, descripcion: 'Contra entrega final' }],
  observacion_tecnica: 'Debido a que el proyecto considera sectores con profundidad aproximada de 72 cm, se recomienda evaluar alternativas de cubierta como granito, cuarzo, mármol o cubierta compacta. El postformado estándar suele trabajar principalmente en profundidades de 60 cm.',
  items: [{ id: 'item-mobiliario-container', nombre: 'Mobiliario modular laboratorio container', descripcion: 'Muebles superiores e inferiores fabricados e instalados según requerimiento operativo.', categoria: 'Mobiliario', cantidad: 1, unidad: 'proyecto', precio_unitario: 4800000, total: 4800000, orden: 1 }],
});

export function normalizeBudget(raw: Partial<PresupuestoPro>): PresupuestoPro {
  const created = raw.created_at || now();
  return calculateBudget({ ...baseBudgetExample, ...raw, id: raw.id || createBudgetId(), slug: raw.slug || slugifyBudget(`${raw.cliente || baseBudgetExample.cliente}-${raw.titulo || baseBudgetExample.titulo}`), email_cliente: raw.email_cliente || '', fecha_vencimiento: raw.fecha_vencimiento || '', fecha_activacion: raw.fecha_activacion || '', archivos: (raw.archivos || []).map((file, i) => ({ id: file.id || createBudgetId('file'), nombre: file.nombre || 'Archivo técnico', url: file.url || '', descripcion: file.descripcion || '', tipo: file.tipo || fileTypeFromUrl(file.url, file.formato), formato: file.formato || (file.url?.split('?')[0].split('.').pop() || '').toLowerCase(), mostrar_cliente: file.mostrar_cliente !== false, orden: Number(file.orden) || i + 1 })), imagenes: (raw.imagenes || []).map((img, i) => ({ id: img.id || createBudgetId('img'), url: img.url || '', titulo: img.titulo || '', descripcion: img.descripcion || '', orden: Number(img.orden) || i + 1 })), items: (raw.items || []).map((item, i) => ({ id: item.id || createBudgetId('item'), nombre: item.nombre || '', descripcion: item.descripcion || '', categoria: item.categoria || '', cantidad: Number(item.cantidad) || 0, unidad: item.unidad || 'un', precio_unitario: Number(item.precio_unitario) || 0, total: Number(item.total) || 0, orden: Number(item.orden) || i + 1 })), created_at: created, updated_at: now() });
}

export function loadBudgets(): PresupuestoPro[] {
  if (typeof window === 'undefined') return [baseBudgetExample];
  try { const parsed = JSON.parse(window.localStorage.getItem(PRESUPUESTOS_PRO_STORAGE_KEY) || '[]'); return Array.isArray(parsed) && parsed.length ? parsed.map(normalizeBudget) : [baseBudgetExample]; } catch { return [baseBudgetExample]; }
}
export function saveBudgets(budgets: PresupuestoPro[]) { if (typeof window !== 'undefined') window.localStorage.setItem(PRESUPUESTOS_PRO_STORAGE_KEY, JSON.stringify(budgets.map(calculateBudget))); }
