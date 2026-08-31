'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import BarcodeScanner from '@/components/BarcodeScanner';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Camera,
  CheckCircle2,
  Cloud,
  ExternalLink,
  Globe2,
  ImagePlus,
  Link2,
  ListPlus,
  Loader2,
  PackageCheck,
  PackagePlus,
  PackageSearch,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

type Product = {
  id: string;
  name: string;
  stock: number | null;
  price?: number | null;
  sku: string | null;
  ean: string | null;
  scan_code?: string | null;
  scan_format?: string | null;
  image_url?: string | null;
  activo?: boolean;
};

type ScanStatus = 'found' | 'missing' | 'error';
type ScanEntry = { value: string; format: string; at: string; product?: Product | null; status: ScanStatus };

type IntelligenceSource = {
  provider: string;
  label: string;
  url?: string;
  detail?: string;
  exact?: boolean;
};

type IntelligenceCandidate = {
  name: string;
  brand: string;
  model: string;
  description: string;
  sku: string;
  ean: string;
  category: string;
  referenceImageUrl: string;
  confidence: number;
  attributes: Record<string, string>;
  fieldSources: Record<string, string[]>;
  sources: IntelligenceSource[];
};

type IntelligenceCapabilities = {
  upcitemdb: boolean;
  mercadolibre: boolean;
  gemini: boolean;
  openrouter: boolean;
  serper: boolean;
  ai: boolean;
  webSearch: boolean;
  cloudinary: boolean;
};

type IntelligenceResponse = {
  ok?: boolean;
  found?: boolean;
  candidate?: IntelligenceCandidate | null;
  warnings?: string[];
  capabilities?: IntelligenceCapabilities;
  cached?: boolean;
  provider?: string | null;
  imageUrl?: string;
  configureUrl?: string;
  code?: string;
  error?: string;
};

type IntakeItem = {
  code: string;
  format: string;
  productId?: string;
  existing: boolean;
  name: string;
  sku: string;
  ean?: string;
  description?: string;
  imageUrl?: string;
  brand?: string;
  model?: string;
  categorySuggestion?: string;
  confidence?: number;
  sources?: IntelligenceSource[];
  fieldSources?: Record<string, string[]>;
  attributes?: Record<string, string>;
  price: number;
  quantity: number;
  activo: boolean;
  addedAt: string;
  error?: string;
};

const STORAGE_KEY = 'fabrick.inventory.intake.v1';
const actionClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3.5 text-xs font-black text-[#5f594f] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45';
const inputClass = 'min-h-11 rounded-xl border border-black/10 bg-white px-3.5 text-sm font-semibold text-[#171612] outline-none transition placeholder:text-[#aaa294] focus:border-[#c77a00]/45 focus:ring-2 focus:ring-[#ffb000]/10';
const defaultCapabilities: IntelligenceCapabilities = {
  upcitemdb: true,
  mercadolibre: false,
  gemini: false,
  openrouter: false,
  serper: false,
  ai: false,
  webSearch: false,
  cloudinary: false,
};

function clampQty(value: unknown) {
  return Math.max(1, Math.min(999999, Math.trunc(Number(value) || 1)));
}

function clampConfidence(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0;
}

function isEan(format: string) {
  return format === 'ean_13' || format === 'ean_8' || format === 'upc_a' || format === 'upc_e';
}

function isUniversalCode(value: string) {
  return /^\d{8,14}$/.test(value.trim().replace(/\s+/g, ''));
}

function formatLabel(format: string) {
  const labels: Record<string, string> = {
    qr_code: 'QR',
    ean_13: 'EAN-13',
    ean_8: 'EAN-8',
    upc_a: 'UPC-A',
    upc_e: 'UPC-E',
    code_128: 'CODE-128',
    code_39: 'CODE-39',
    code_93: 'CODE-93',
    data_matrix: 'Data Matrix',
    manual: 'Manual',
  };
  return labels[format] || format || 'Manual';
}

function providerLabel(provider: string) {
  const labels: Record<string, string> = {
    upcitemdb: 'UPCitemdb',
    mercadolibre: 'Mercado Libre',
    serper: 'Búsqueda web',
    gemini: 'Gemini Vision',
    openrouter: 'OpenRouter Vision',
  };
  return labels[provider] || provider;
}

function sourceUrl(sources: IntelligenceSource[] | undefined) {
  return sources?.find((source) => source.url)?.url || null;
}

async function compressImageForAnalysis(file: File): Promise<File> {
  const passthrough = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif']);
  if (file.size <= 1.8 * 1024 * 1024 && passthrough.has(file.type)) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('No se pudo preparar esta fotografía. Prueba tomando una foto JPG desde la cámara.'));
      element.src = objectUrl;
    });
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('El navegador no pudo preparar la imagen.');
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob) throw new Error('No se pudo comprimir la fotografía.');
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'producto'}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function AdminInventarioScanPage() {
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [scans, setScans] = useState<ScanEntry[]>([]);
  const [queue, setQueue] = useState<IntakeItem[]>([]);
  const [queueLoaded, setQueueLoaded] = useState(false);
  const [active, setActive] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [currentFormat, setCurrentFormat] = useState('manual');
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [quickName, setQuickName] = useState('');
  const [quickSku, setQuickSku] = useState('');
  const [quickEan, setQuickEan] = useState('');
  const [quickDescription, setQuickDescription] = useState('');
  const [quickBrand, setQuickBrand] = useState('');
  const [quickModel, setQuickModel] = useState('');
  const [quickCategory, setQuickCategory] = useState('');
  const [quickImageUrl, setQuickImageUrl] = useState('');
  const [quickReferenceImage, setQuickReferenceImage] = useState('');
  const [quickConfidence, setQuickConfidence] = useState(0);
  const [quickSources, setQuickSources] = useState<IntelligenceSource[]>([]);
  const [quickFieldSources, setQuickFieldSources] = useState<Record<string, string[]>>({});
  const [quickAttributes, setQuickAttributes] = useState<Record<string, string>>({});
  const [quickPrice, setQuickPrice] = useState(0);
  const [quickActive, setQuickActive] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [capabilities, setCapabilities] = useState<IntelligenceCapabilities>(defaultCapabilities);
  const [intelligence, setIntelligence] = useState<IntelligenceCandidate | null>(null);
  const [intelligenceWarnings, setIntelligenceWarnings] = useState<string[]>([]);
  const [intelligenceBusy, setIntelligenceBusy] = useState('');
  const [intelligenceError, setIntelligenceError] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');

  const loadCatalog = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/inventory?catalog=1', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar el catálogo.');
      setCatalog(Array.isArray(json.products) ? json.products : []);
    } catch {
      setCatalog([]);
    }
  }, []);

  const loadCapabilities = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/inventory/intelligence', { cache: 'no-store' });
      const json = await response.json() as IntelligenceResponse;
      if (response.ok && json.capabilities) setCapabilities(json.capabilities);
    } catch {
      setCapabilities(defaultCapabilities);
    }
  }, []);

  useEffect(() => { void loadCatalog(); void loadCapabilities(); }, [loadCatalog, loadCapabilities]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setQueue(parsed.slice(0, 150) as IntakeItem[]);
      }
    } catch {
      setQueue([]);
    } finally {
      setQueueLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!queueLoaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(0, 150)));
  }, [queue, queueLoaded]);

  useEffect(() => () => {
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const lowStock = useMemo(() => catalog.filter((product) => Number(product.stock ?? 0) <= 5).length, [catalog]);
  const linked = useMemo(() => catalog.filter((product) => product.scan_code || product.ean || product.sku).length, [catalog]);
  const queuedUnits = useMemo(() => queue.reduce((sum, item) => sum + clampQty(item.quantity), 0), [queue]);
  const newQueued = useMemo(() => queue.filter((item) => !item.existing).length, [queue]);

  function resetIntelligenceDraft(code = '', format = 'manual') {
    setIntelligence(null);
    setIntelligenceWarnings([]);
    setIntelligenceError('');
    setQuickName('');
    setQuickSku(isUniversalCode(code) || isEan(format) ? '' : code.slice(0, 64));
    setQuickEan(isUniversalCode(code) || isEan(format) ? code.replace(/\s+/g, '') : '');
    setQuickDescription('');
    setQuickBrand('');
    setQuickModel('');
    setQuickCategory('');
    setQuickImageUrl('');
    setQuickReferenceImage('');
    setQuickConfidence(0);
    setQuickSources([]);
    setQuickFieldSources({});
    setQuickAttributes({});
    setQuickPrice(0);
    setPhotoPreview('');
  }

  function applyCandidate(candidate: IntelligenceCandidate) {
    if (candidate.name) setQuickName(candidate.name);
    if (candidate.sku) setQuickSku(candidate.sku);
    if (candidate.ean) setQuickEan(candidate.ean);
    if (candidate.description) setQuickDescription(candidate.description);
    if (candidate.brand) setQuickBrand(candidate.brand);
    if (candidate.model) setQuickModel(candidate.model);
    if (candidate.category) setQuickCategory(candidate.category);
    setQuickReferenceImage(candidate.referenceImageUrl || '');
    setQuickConfidence(clampConfidence(candidate.confidence));
    setQuickSources(candidate.sources ?? []);
    setQuickFieldSources(candidate.fieldSources ?? {});
    setQuickAttributes(candidate.attributes ?? {});
  }

  async function lookupOnline(code: string, format: string) {
    if (!code.trim()) return;
    setIntelligenceBusy('online');
    setIntelligenceError('');
    setIntelligenceWarnings([]);
    try {
      const response = await fetch('/api/admin/inventory/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lookup', code, format }),
      });
      const json = await response.json() as IntelligenceResponse;
      if (!response.ok) throw new Error(json.error || `Búsqueda online HTTP ${response.status}`);
      if (json.capabilities) setCapabilities(json.capabilities);
      setIntelligenceWarnings(json.warnings ?? []);
      const candidate = json.candidate ?? null;
      setIntelligence(candidate);
      if (candidate) {
        if (candidate.confidence >= 0.7) applyCandidate(candidate);
        setMessage(candidate.confidence >= 0.7
          ? `Encontré una coincidencia online y preparé la ficha. Revísala antes de guardarla.`
          : 'Encontré una posible coincidencia online. Revísala o toma una foto para confirmar.');
      } else {
        setMessage('No encontré una coincidencia confiable por código. Puedes tomar una foto para que la IA identifique el producto.');
      }
    } catch (error) {
      setIntelligenceError(error instanceof Error ? error.message : 'No se pudo buscar el producto en línea.');
    } finally {
      setIntelligenceBusy('');
    }
  }

  async function analyzePhoto(file: File) {
    if (!currentCode.trim()) return;
    setIntelligenceBusy('photo');
    setIntelligenceError('');
    setIntelligenceWarnings([]);
    try {
      const prepared = await compressImageForAnalysis(file);
      if (prepared.size > 3 * 1024 * 1024) throw new Error('La fotografía sigue siendo demasiado pesada. Toma otra foto con menor resolución.');
      const previewUrl = URL.createObjectURL(prepared);
      setPhotoPreview(previewUrl);

      const form = new FormData();
      form.append('action', 'photo');
      form.append('code', currentCode);
      form.append('format', currentFormat);
      form.append('persistPhoto', '1');
      form.append('image', prepared, prepared.name);

      const response = await fetch('/api/admin/inventory/intelligence', { method: 'POST', body: form });
      const json = await response.json() as IntelligenceResponse;
      if (json.capabilities) setCapabilities(json.capabilities);
      setIntelligenceWarnings(json.warnings ?? []);
      if (!response.ok) {
        if (json.candidate) {
          setIntelligence(json.candidate);
          applyCandidate(json.candidate);
        }
        throw new Error(json.error || `Análisis IA HTTP ${response.status}`);
      }
      const candidate = json.candidate ?? null;
      setIntelligence(candidate);
      if (candidate) applyCandidate(candidate);
      if (json.imageUrl) setQuickImageUrl(json.imageUrl);
      setMessage(candidate
        ? `La IA analizó la foto${json.provider ? ` con ${providerLabel(json.provider)}` : ''} y preparó una ficha editable. Confirma los datos antes de incorporar.`
        : 'La foto fue analizada, pero no se obtuvo una identificación suficientemente clara.');
    } catch (error) {
      setIntelligenceError(error instanceof Error ? error.message : 'No se pudo analizar la fotografía.');
    } finally {
      setIntelligenceBusy('');
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  async function lookup(value: string, format = 'manual') {
    const code = value.trim();
    if (!code) return;
    setBusy('lookup');
    setMessage('');
    setCurrentCode(code);
    setCurrentFormat(format || 'manual');
    setCurrentProduct(null);
    setSelectedProductId('');
    resetIntelligenceDraft(code, format);
    try {
      const response = await fetch(`/api/admin/inventory?code=${encodeURIComponent(code)}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo consultar el código.');
      const product = json.found ? json.product as Product : null;
      const status: ScanStatus = product ? 'found' : 'missing';
      const entry: ScanEntry = { value: code, format, at: new Date().toISOString(), product, status };
      setCurrentProduct(product);
      setScans((current) => [entry, ...current.filter((item) => item.value !== code)].slice(0, 50));
      if (product) {
        setMessage(`${product.name} identificado en tu inventario. Puedes mover stock ahora o añadir unidades a la recepción.`);
      } else {
        setMessage('Código nuevo. Estoy buscando coincidencias en línea…');
        void lookupOnline(code, format);
      }
    } catch (error) {
      const entry: ScanEntry = { value: code, format, at: new Date().toISOString(), status: 'error' };
      setScans((current) => [entry, ...current].slice(0, 50));
      setMessage(error instanceof Error ? error.message : 'Error consultando el código.');
    } finally {
      setBusy('');
    }
  }

  function handleDetect(value: string, format: string) {
    setActive(false);
    void lookup(value, format);
  }

  function upsertQueue(item: IntakeItem) {
    setQueue((current) => {
      const index = current.findIndex((entry) => entry.code === item.code);
      if (index === -1) return [item, ...current].slice(0, 150);
      const copy = [...current];
      copy[index] = {
        ...copy[index],
        ...item,
        quantity: clampQty(copy[index].quantity) + clampQty(item.quantity),
        error: undefined,
      };
      return copy;
    });
  }

  function addExistingToQueue() {
    if (!currentProduct || !currentCode) return;
    upsertQueue({
      code: currentCode,
      format: currentFormat,
      productId: currentProduct.id,
      existing: true,
      name: currentProduct.name,
      sku: currentProduct.sku || '',
      ean: currentProduct.ean || undefined,
      imageUrl: currentProduct.image_url || undefined,
      price: Number(currentProduct.price ?? 0),
      quantity: clampQty(quantity),
      activo: currentProduct.activo !== false,
      addedAt: new Date().toISOString(),
    });
    setMessage(`${currentProduct.name} añadido a la lista de recepción.`);
    setQuantity(1);
  }

  function addNewToQueue() {
    if (!currentCode) return;
    if (!quickName.trim()) {
      setMessage('Escribe o confirma un nombre antes de guardar este producto en la lista.');
      return;
    }
    upsertQueue({
      code: currentCode,
      format: currentFormat || 'manual',
      existing: false,
      name: quickName.trim().slice(0, 180),
      sku: quickSku.trim().slice(0, 128),
      ean: quickEan.trim().slice(0, 64) || undefined,
      description: quickDescription.trim().slice(0, 5000) || undefined,
      imageUrl: quickImageUrl || undefined,
      brand: quickBrand.trim().slice(0, 160) || undefined,
      model: quickModel.trim().slice(0, 160) || undefined,
      categorySuggestion: quickCategory.trim().slice(0, 180) || undefined,
      confidence: quickConfidence || undefined,
      sources: quickSources,
      fieldSources: quickFieldSources,
      attributes: quickAttributes,
      price: Math.max(0, Number(quickPrice) || 0),
      quantity: clampQty(quantity),
      activo: quickActive,
      addedAt: new Date().toISOString(),
    });
    setMessage(`${quickName.trim()} guardado en la lista. La ficha sigue sin publicarse hasta que decidas incorporarla.`);
    setQuantity(1);
  }

  async function bindCode() {
    if (!selectedProductId || !currentCode) return;
    setBusy('bind');
    setMessage('');
    try {
      const response = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProductId, code: currentCode, format: currentFormat }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo asociar el código.');
      const product = json.product as Product;
      setCurrentProduct(product);
      setCatalog((items) => items.map((item) => item.id === product.id ? { ...item, ...product } : item));
      setScans((items) => items.map((scan) => scan.value === currentCode ? { ...scan, product, status: 'found' as const } : scan));
      setMessage(`Código ${formatLabel(currentFormat)} asociado a ${product.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error asociando código.');
    } finally {
      setBusy('');
    }
  }

  async function move(type: 'in' | 'out' | 'adjustment' | 'return') {
    if (!currentProduct) return;
    setBusy(type);
    setMessage('');
    try {
      const response = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: currentProduct.id, type, quantity: clampQty(quantity), barcode: currentCode }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo registrar el movimiento.');
      const product = json.product as Product;
      setCurrentProduct(product);
      setCatalog((items) => items.map((item) => item.id === product.id ? { ...item, stock: product.stock } : item));
      setMessage(`Movimiento registrado. Stock actual: ${product.stock ?? 0}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error registrando movimiento.');
    } finally {
      setBusy('');
    }
  }

  function patchQueue(code: string, patch: Partial<IntakeItem>) {
    setQueue((current) => current.map((item) => item.code === code ? { ...item, ...patch, error: undefined } : item));
  }

  function removeQueue(code: string) {
    setQueue((current) => current.filter((item) => item.code !== code));
  }

  async function resolveExistingCode(code: string) {
    const response = await fetch(`/api/admin/inventory?code=${encodeURIComponent(code)}`, { cache: 'no-store' });
    const json = await response.json();
    return response.ok && json.found ? json.product as Product : null;
  }

  async function incorporateQueue() {
    if (!queue.length || busy) return;
    setBusy('import');
    setMessage('');
    const remaining: IntakeItem[] = [];
    let completed = 0;

    for (const original of queue) {
      let item = { ...original, quantity: clampQty(original.quantity), error: undefined };
      try {
        let productId = item.productId;
        if (!productId) {
          const sources = item.sources ?? [];
          const createResponse = await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: item.name,
              description: item.description || null,
              image_url: item.imageUrl || null,
              price: Math.max(0, Number(item.price) || 0),
              stock: 0,
              activo: item.activo,
              featured: false,
              sku: item.sku || null,
              ean: item.ean || (isUniversalCode(item.code) ? item.code : null),
              scan_code: item.code,
              scan_format: item.format,
              source: sources.length || item.imageUrl ? 'inventory_intelligence' : 'inventory_scan',
              source_url: sourceUrl(sources),
              source_id: item.code,
              specifications: {
                inventory_intake: {
                  code: item.code,
                  format: item.format,
                  captured_at: item.addedAt,
                },
                ...(sources.length || item.brand || item.model || item.categorySuggestion ? {
                  inventory_intelligence: {
                    brand: item.brand || null,
                    model: item.model || null,
                    category_suggestion: item.categorySuggestion || null,
                    confidence: item.confidence ?? null,
                    attributes: item.attributes ?? {},
                    field_sources: item.fieldSources ?? {},
                    sources: sources.map((source) => ({ provider: source.provider, label: source.label, url: source.url ?? null, exact: Boolean(source.exact) })),
                    reviewed_by_admin: true,
                  },
                } : {}),
              },
            }),
          });
          const createJson = await createResponse.json();
          if (!createResponse.ok) {
            if (createResponse.status === 409) {
              const existing = await resolveExistingCode(item.code);
              if (existing) {
                productId = existing.id;
                item = { ...item, productId, existing: true, name: existing.name };
              } else {
                throw new Error(createJson.error || 'El código ya existe y no se pudo resolver.');
              }
            } else {
              throw new Error(createJson.error || 'No se pudo crear el producto.');
            }
          } else {
            productId = String(createJson.product?.id || '');
            if (!productId) throw new Error('El producto fue creado sin un ID válido.');
          }
        }

        const movementResponse = await fetch('/api/admin/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId,
            type: 'in',
            quantity: item.quantity,
            barcode: item.code,
            note: item.sources?.length ? 'Ingreso desde escáner con identificación inteligente revisada' : 'Ingreso desde lista de escaneo QR/código de barras',
            referenceType: 'scanner_intake',
            referenceId: item.addedAt,
          }),
        });
        const movementJson = await movementResponse.json();
        if (!movementResponse.ok) throw new Error(movementJson.error || 'No se pudo incorporar el stock.');
        completed += 1;
      } catch (error) {
        remaining.push({ ...item, error: error instanceof Error ? error.message : 'No se pudo incorporar.' });
      }
    }

    setQueue(remaining);
    await loadCatalog();
    setBusy('');
    if (remaining.length) setMessage(`${completed} producto(s) incorporado(s). ${remaining.length} quedaron en la lista con errores para revisar.`);
    else setMessage(`${completed} producto(s) incorporado(s) al inventario con movimiento de entrada registrado.`);
  }

  const aiLabel = capabilities.gemini ? 'Gemini' : capabilities.openrouter ? 'OpenRouter' : 'Sin IA';

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Inventario · Captura inteligente"
        title="Escáner, búsqueda online e IA"
        description="Escanea QR/EAN/UPC, consulta el catálogo en línea y, si hace falta, toma una foto para preparar automáticamente una ficha que tú revisas antes de incorporar."
        icon={ScanLine}
        actions={<><Link href="/admin/inventario" className={actionClass}>Inventario</Link><Link href="/admin/inventario/movimientos" className={actionClass}>Movimientos</Link></>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Lista" value={queue.length} icon={ListPlus} hint={`${queuedUnits} unidades preparadas`} />
        <AdminStat label="Nuevos" value={newQueued} icon={PackagePlus} accent="yellow" hint="Aún no existen en catálogo" />
        <AdminStat label="Vinculados" value={linked} icon={Link2} accent="emerald" hint="Código persistente" />
        <AdminStat label="Stock bajo" value={lowStock} icon={PackageSearch} accent="rose" hint="≤ 5 unidades" />
      </section>

      <AdminCard className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={() => setActive(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#171612] px-5 text-sm font-black text-white"><Camera className="h-4 w-4" /> Escanear cámara</button>
          <div className="flex min-w-0 flex-1 gap-2">
            <input value={currentCode} onChange={(event) => { setCurrentCode(event.target.value); setCurrentFormat('manual'); }} onKeyDown={(event) => { if (event.key === 'Enter') void lookup(currentCode, currentFormat); }} placeholder="EAN, SKU, QR o código de barras" className={`${inputClass} min-w-0 flex-1`} />
            <button type="button" onClick={() => void lookup(currentCode, currentFormat)} disabled={busy === 'lookup'} className={actionClass}>{busy === 'lookup' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar</button>
          </div>
        </div>
        {active ? <div className="overflow-hidden rounded-xl border border-black/10"><BarcodeScanner onDetect={handleDetect} onClose={() => setActive(false)} /></div> : null}
        {currentCode ? <p className="text-xs text-[#817a6f]">Código actual: <span className="font-mono font-bold text-[#171612]">{currentCode}</span> · {formatLabel(currentFormat)}</p> : null}
        {message ? <p className="rounded-xl bg-black/[.035] px-4 py-3 text-sm text-[#5f594f]">{message}</p> : null}
      </AdminCard>

      {currentCode && !currentProduct ? (
        <AdminCard className="overflow-hidden border-violet-600/15 bg-[linear-gradient(135deg,rgba(124,58,237,.055),rgba(14,165,233,.045),rgba(255,255,255,.75))]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-violet-800"><Sparkles className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-[.15em]">Identificación inteligente</span></div>
              <h2 className="mt-1 text-xl font-black tracking-[-.03em] text-[#171612]">Buscar por código o reconocer por fotografía</h2>
              <p className="mt-1 text-sm leading-6 text-[#716b60]">Primero consultamos tu inventario. Si el código es nuevo, usamos fuentes externas disponibles. La IA nunca publica sola: prepara un borrador que puedes corregir.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[.1em]">
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-800">UPC libre</span>
              <span className={`rounded-full px-2.5 py-1 ${capabilities.mercadolibre ? 'bg-emerald-500/10 text-emerald-800' : 'bg-black/5 text-[#8f887c]'}`}>Mercado Libre {capabilities.mercadolibre ? 'activo' : 'opcional'}</span>
              <span className={`rounded-full px-2.5 py-1 ${capabilities.ai ? 'bg-violet-500/10 text-violet-800' : 'bg-black/5 text-[#8f887c]'}`}>IA · {aiLabel}</span>
              <span className={`rounded-full px-2.5 py-1 ${capabilities.cloudinary ? 'bg-sky-500/10 text-sky-800' : 'bg-black/5 text-[#8f887c]'}`}>Foto {capabilities.cloudinary ? 'guardable' : 'solo análisis'}</span>
            </div>
          </div>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
            capture="environment"
            className="hidden"
            onChange={(event) => { const file = event.target.files?.[0]; if (file) void analyzePhoto(file); }}
          />

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => void lookupOnline(currentCode, currentFormat)} disabled={Boolean(intelligenceBusy)} className={actionClass}>{intelligenceBusy === 'online' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />} Buscar en línea</button>
            <button type="button" onClick={() => photoInputRef.current?.click()} disabled={Boolean(intelligenceBusy)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-700 px-4 text-xs font-black text-white disabled:opacity-50">{intelligenceBusy === 'photo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} {intelligenceBusy === 'photo' ? 'Analizando foto…' : 'Tomar foto · IA'}</button>
            {!capabilities.ai ? <Link href="/admin/integraciones?category=ai" className={actionClass}><Sparkles className="h-4 w-4" /> Configurar IA</Link> : null}
          </div>

          {intelligenceError ? <p className="mt-4 rounded-xl border border-rose-500/15 bg-rose-500/8 px-4 py-3 text-sm font-semibold text-rose-800">{intelligenceError}</p> : null}
          {intelligenceWarnings.length ? <div className="mt-3 space-y-1">{intelligenceWarnings.map((warning, index) => <p key={`${warning}-${index}`} className="text-xs text-amber-800">• {warning}</p>)}</div> : null}

          {intelligence ? (
            <div className="mt-5 grid gap-4 rounded-2xl border border-black/8 bg-white/78 p-4 sm:p-5 lg:grid-cols-[180px_minmax(0,1fr)_auto]">
              <div className="relative overflow-hidden rounded-xl bg-[#eee9df]">
                {photoPreview || quickImageUrl ? <img src={photoPreview || quickImageUrl} alt="Fotografía del producto" className="aspect-square h-full min-h-40 w-full object-cover" /> : intelligence.referenceImageUrl ? <img src={intelligence.referenceImageUrl} alt="Imagen de referencia encontrada" className="aspect-square h-full min-h-40 w-full object-contain p-3" /> : <div className="grid aspect-square min-h-40 place-items-center text-[#aaa294]"><PackageSearch className="h-10 w-10" /></div>}
                {intelligence.referenceImageUrl && !photoPreview && !quickImageUrl ? <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[9px] font-black uppercase tracking-[.1em] text-white">Referencia web</span> : null}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] text-violet-800">{Math.round(clampConfidence(intelligence.confidence) * 100)}% confianza</span>{quickImageUrl ? <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] text-sky-800"><Cloud className="h-3 w-3" /> Foto en Cloudinary</span> : null}</div>
                <h3 className="mt-2 text-lg font-black text-[#171612]">{intelligence.name || 'Producto por confirmar'}</h3>
                <p className="mt-1 text-sm text-[#716b60]">{[intelligence.brand, intelligence.model, intelligence.category].filter(Boolean).join(' · ') || 'Revisa la ficha sugerida antes de continuar.'}</p>
                {intelligence.description ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#5f594f]">{intelligence.description}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">{intelligence.sources.map((source, index) => source.url ? <a key={`${source.provider}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-black/8 bg-white px-2.5 py-1 text-[10px] font-bold text-[#5f594f]">{providerLabel(source.provider)} <ExternalLink className="h-3 w-3" /></a> : <span key={`${source.provider}-${index}`} className="rounded-full border border-black/8 bg-white px-2.5 py-1 text-[10px] font-bold text-[#5f594f]">{providerLabel(source.provider)}</span>)}</div>
              </div>
              <button type="button" onClick={() => applyCandidate(intelligence)} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl bg-[#171612] px-4 text-xs font-black text-white"><CheckCircle2 className="h-4 w-4" /> Usar ficha</button>
            </div>
          ) : intelligenceBusy ? <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/70 px-4 py-4 text-sm font-semibold text-[#5f594f]"><Loader2 className="h-5 w-5 animate-spin text-violet-700" /> {intelligenceBusy === 'photo' ? 'Analizando envase, marca, modelo y texto visible…' : 'Consultando códigos y catálogos disponibles…'}</div> : null}
        </AdminCard>
      ) : null}

      {currentCode && !currentProduct ? (
        <div className="grid gap-3 xl:grid-cols-2">
          <AdminCard className="border-amber-600/15 bg-amber-500/7">
            <div className="flex items-start gap-3"><PackageSearch className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div className="min-w-0 flex-1"><h2 className="font-black text-[#171612]">Vincular a producto existente</h2><p className="mt-1 text-sm text-[#716b60]">Úsalo si el producto ya existe y solo le falta este QR/código.</p></div></div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row"><select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} className={`${inputClass} flex-1`}><option value="">Selecciona producto…</option>{catalog.map((product) => <option key={product.id} value={product.id}>{product.name} · stock {product.stock ?? 0}</option>)}</select><button type="button" onClick={() => void bindCode()} disabled={!selectedProductId || busy === 'bind'} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ffb000] px-4 text-sm font-black text-[#171612] disabled:opacity-50"><Link2 className="h-4 w-4" /> Vincular</button></div>
          </AdminCard>

          <AdminCard className="border-sky-600/15 bg-sky-500/7">
            <div className="flex items-start gap-3"><PackagePlus className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" /><div><h2 className="font-black text-[#171612]">Preparar producto nuevo</h2><p className="mt-1 text-sm text-[#716b60]">Los datos encontrados son un borrador editable. Por defecto el producto queda oculto de la tienda.</p></div></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <input value={quickName} onChange={(event) => setQuickName(event.target.value)} placeholder="Nombre del producto" className={`${inputClass} sm:col-span-2`} />
              <input value={quickBrand} onChange={(event) => setQuickBrand(event.target.value)} placeholder="Marca" className={inputClass} />
              <input value={quickModel} onChange={(event) => setQuickModel(event.target.value)} placeholder="Modelo" className={inputClass} />
              <input value={quickSku} onChange={(event) => setQuickSku(event.target.value)} placeholder="SKU / part number" className={inputClass} />
              <input value={quickEan} onChange={(event) => setQuickEan(event.target.value)} placeholder="EAN / UPC / GTIN" className={inputClass} />
              <input value={quickCategory} onChange={(event) => setQuickCategory(event.target.value)} placeholder="Categoría sugerida" className={inputClass} />
              <input type="number" min={0} value={quickPrice} onChange={(event) => setQuickPrice(Math.max(0, Number(event.target.value) || 0))} placeholder="Precio CLP" className={inputClass} />
              <textarea value={quickDescription} onChange={(event) => setQuickDescription(event.target.value)} placeholder="Descripción objetiva" rows={3} className={`${inputClass} min-h-24 resize-y py-3 sm:col-span-2`} />
              <input type="number" min={1} value={quantity} onChange={(event) => setQuantity(clampQty(event.target.value))} className={inputClass} />
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 bg-white px-3.5 text-xs font-bold text-[#5f594f]"><input type="checkbox" checked={quickActive} onChange={(event) => setQuickActive(event.target.checked)} /> Publicar en tienda al incorporar</label>
            </div>
            {quickSources.length ? <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-[#716b60]"><span className="font-black uppercase tracking-[.12em]">Datos apoyados por</span>{quickSources.map((source, index) => <span key={`${source.provider}-${index}`} className="rounded-full bg-white/75 px-2 py-1 font-bold">{providerLabel(source.provider)}</span>)}</div> : null}
            <button type="button" onClick={addNewToQueue} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-black text-white"><ListPlus className="h-4 w-4" /> Guardar ficha en lista</button>
          </AdminCard>
        </div>
      ) : null}

      {currentProduct ? (
        <AdminCard className="border-emerald-600/15 bg-emerald-500/7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-4">{currentProduct.image_url ? <img src={currentProduct.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" /> : null}<div><div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-[.14em]">Producto encontrado</span></div><h2 className="mt-1 text-xl font-black text-[#171612]">{currentProduct.name}</h2><p className="text-sm text-[#716b60]">SKU {currentProduct.sku || '—'} · EAN {currentProduct.ean || '—'} · Código {currentProduct.scan_code || currentCode}</p></div></div>
            <div className="text-left sm:text-right"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Stock actual</p><p className="text-4xl font-black tracking-[-.05em] text-[#171612]">{currentProduct.stock ?? 0}</p></div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2"><input type="number" min={1} value={quantity} onChange={(event) => setQuantity(clampQty(event.target.value))} className={`${inputClass} w-24 text-center`} /><button type="button" onClick={addExistingToQueue} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#ffb000] px-4 text-sm font-black text-[#171612] disabled:opacity-50"><ListPlus className="h-4 w-4" /> Añadir a lista</button><button type="button" onClick={() => void move('in')} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50"><ArrowDownToLine className="h-4 w-4" /> Entrada inmediata</button><button type="button" onClick={() => void move('out')} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#171612] px-4 text-sm font-bold text-white disabled:opacity-50"><ArrowUpFromLine className="h-4 w-4" /> Salida</button><button type="button" onClick={() => void move('return')} disabled={Boolean(busy)} className={actionClass}><RotateCcw className="h-4 w-4" /> Devolución</button><button type="button" onClick={() => void move('adjustment')} disabled={Boolean(busy)} className={actionClass}>Fijar stock</button></div>
        </AdminCard>
      ) : null}

      <AdminCard className="p-0 sm:p-0">
        <div className="flex flex-col gap-3 border-b border-black/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-[#a56600]" /><h2 className="font-black text-[#171612]">Lista para incorporar</h2></div><p className="mt-1 text-xs text-[#817a6f]">Se guarda automáticamente en este dispositivo. Las fichas IA conservan sus fuentes y confianza para trazabilidad.</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setQueue([])} disabled={!queue.length || busy === 'import'} className={actionClass}><Trash2 className="h-4 w-4" /> Vaciar</button><button type="button" onClick={() => void incorporateQueue()} disabled={!queue.length || Boolean(busy)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-45"><PackageCheck className="h-4 w-4" /> {busy === 'import' ? 'Incorporando…' : `Incorporar ${queue.length}`}</button></div>
        </div>
        <div className="divide-y divide-black/6">
          {queue.length === 0 ? <div className="px-5 py-9 text-sm text-[#817a6f]">Escanea un producto y pulsa “Añadir a lista”. Puedes preparar varios antes de modificar el stock real.</div> : queue.map((item) => (
            <div key={item.code} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(150px,.7fr)_110px_110px_auto] lg:items-center">
              <div className="flex min-w-0 gap-3">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" /> : null}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] ${item.existing ? 'bg-emerald-500/10 text-emerald-800' : 'bg-sky-500/10 text-sky-800'}`}>{item.existing ? 'Existente' : 'Nuevo'}</span>{item.confidence ? <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] text-violet-800">IA/web {Math.round(item.confidence * 100)}%</span> : null}<span className="text-[10px] font-bold text-[#817a6f]">{formatLabel(item.format)}</span></div>{item.existing ? <p className="mt-1 font-bold text-[#171612]">{item.name}</p> : <input value={item.name} onChange={(event) => patchQueue(item.code, { name: event.target.value })} className={`${inputClass} mt-2 w-full`} />}<p className="mt-1 truncate font-mono text-xs text-[#817a6f]" title={item.code}>{item.code}</p>{item.brand || item.model ? <p className="mt-1 text-xs text-[#716b60]">{[item.brand, item.model].filter(Boolean).join(' · ')}</p> : null}{item.error ? <p className="mt-2 text-xs font-bold text-rose-700">{item.error}</p> : null}</div></div>
              <div>{item.existing ? <p className="text-xs text-[#716b60]">SKU {item.sku || '—'}</p> : <input value={item.sku} onChange={(event) => patchQueue(item.code, { sku: event.target.value })} placeholder="SKU opcional" className={`${inputClass} w-full`} />}</div>
              <div><label className="text-[9px] font-black uppercase tracking-[.12em] text-[#8f887c]">Cantidad</label><input type="number" min={1} value={item.quantity} onChange={(event) => patchQueue(item.code, { quantity: clampQty(event.target.value) })} className={`${inputClass} mt-1 w-full text-center`} /></div>
              <div>{item.existing ? <p className="text-xs text-[#716b60]">Stock actual se sumará al incorporar.</p> : <><label className="text-[9px] font-black uppercase tracking-[.12em] text-[#8f887c]">Precio</label><input type="number" min={0} value={item.price} onChange={(event) => patchQueue(item.code, { price: Math.max(0, Number(event.target.value) || 0) })} className={`${inputClass} mt-1 w-full`} /></>}</div>
              <button type="button" onClick={() => removeQueue(item.code)} className="grid h-10 w-10 place-items-center rounded-xl border border-rose-500/15 text-rose-700 hover:bg-rose-500/8" aria-label={`Quitar ${item.name}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard className="p-0 sm:p-0">
        <div className="flex items-center gap-2 border-b border-black/8 px-5 py-4"><ScanLine className="h-4 w-4 text-[#a56600]" /><h2 className="font-black text-[#171612]">Últimos escaneos</h2></div>
        <ul className="divide-y divide-black/6">{scans.length === 0 ? <li className="px-5 py-8 text-sm text-[#817a6f]">Aún no hay escaneos.</li> : scans.map((scan, index) => <li key={`${scan.value}-${index}`} className="flex items-center justify-between gap-3 px-5 py-3"><div className="min-w-0"><p className="truncate font-mono text-sm font-bold text-[#171612]">{scan.value}</p><p className="text-xs text-[#817a6f]">{scan.product?.name || (scan.status === 'missing' ? 'Código nuevo' : scan.status === 'error' ? 'Error' : formatLabel(scan.format))}</p></div><span className="shrink-0 text-xs text-[#817a6f]">{new Date(scan.at).toLocaleTimeString('es-CL')}</span></li>)}</ul>
      </AdminCard>

      <AdminCard className="border-black/8 bg-[#f8f4eb]">
        <div className="flex items-start gap-3"><RefreshCw className="mt-0.5 h-4 w-4 text-[#a56600]" /><div><p className="text-xs font-black uppercase tracking-[.13em] text-[#6e665b]">Cómo decide el sistema</p><p className="mt-1 text-sm leading-6 text-[#716b60]">Inventario local → UPCitemdb gratuito → Mercado Libre si está conectado → búsqueda web si está configurada → fotografía con Gemini/OpenRouter. Ningún resultado externo modifica stock ni publica productos hasta tu confirmación.</p></div></div>
      </AdminCard>
    </AdminPage>
  );
}
