'use client';

import { useState } from 'react';
import BarcodeScanner from '@/components/BarcodeScanner';
import { Camera, ScanLine, PackageSearch, ShieldAlert } from 'lucide-react';
import { AdminBaseButton, AdminBaseCard, AdminBaseGrid, AdminBaseMetric, AdminBasePage } from '@/components/admin/baseui-kit';

interface ScanEntry {
  value: string;
  format: string;
  at: string;
}

export default function AdminInventarioScanPage() {
  const [scans, setScans] = useState<ScanEntry[]>([]);
  const [active, setActive] = useState(false);

  const handleDetect = (value: string, format: string) => {
    setScans((prev) => {
      if (prev[0]?.value === value) return prev;
      return [{ value, format, at: new Date().toISOString() }, ...prev].slice(0, 50);
    });
  };

  return (
    <AdminBasePage
      eyebrow="Inventario"
      title="Escáner de inventario"
      description="Escaneo rápido con cámara para códigos EAN-13 y QR. Actualmente registra lectura local; el movimiento real requiere lookup por SKU/EAN conectado al catálogo."
      actions={<><AdminBaseButton href="/admin/inventario" variant="ghost">Inventario</AdminBaseButton><AdminBaseButton href="/admin/productos">Catálogo</AdminBaseButton></>}
    >
      <AdminBaseGrid cols="3">
        <AdminBaseMetric label="Escaneos" value={scans.length} hint="sesión actual" />
        <AdminBaseMetric label="Estado" value={active ? 'Activo' : 'Pausado'} hint="cámara del dispositivo" />
        <AdminBaseMetric label="Persistencia" value="Pendiente" hint="requiere SKU/EAN real" />
      </AdminBaseGrid>

      <div className="rounded-[2rem] border border-white/10 bg-black/30 p-5 shadow-[0_20px_90px_rgba(0,0,0,0.35)]">
        {active ? (
          <BarcodeScanner onDetect={handleDetect} onClose={() => setActive(false)} />
        ) : (
          <button type="button" onClick={() => setActive(true)} className="inline-flex items-center gap-2 rounded-2xl bg-yellow-300 px-5 py-3 text-sm font-black text-black hover:bg-yellow-200">
            <Camera className="h-4 w-4" /> Iniciar escáner
          </button>
        )}
      </div>

      <AdminBaseGrid cols="2">
        <AdminBaseCard title="Lookup por SKU/EAN" description="Para descontar stock real falta mapear el código escaneado contra productos o variantes." icon={PackageSearch} tone="gold" badge="pendiente" href="/admin/productos" />
        <AdminBaseCard title="No simulado" description="Esta pantalla no modifica inventario hasta conectar inventory_movements de forma segura." icon={ShieldAlert} tone="rose" badge="seguro" />
      </AdminBaseGrid>

      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5">
        <div className="mb-4 flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-yellow-300" />
          <h2 className="text-lg font-black text-white">Últimos escaneos</h2>
        </div>
        <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          {scans.length === 0 ? (
            <li className="px-4 py-4 text-sm text-zinc-500">Aún no hay escaneos.</li>
          ) : scans.map((scan, index) => (
            <li key={`${scan.value}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-mono text-yellow-300">{scan.value}</p>
                <p className="text-xs text-zinc-500">{scan.format}</p>
              </div>
              <span className="text-xs text-zinc-500">{new Date(scan.at).toLocaleTimeString('es-CL')}</span>
            </li>
          ))}
        </ul>
      </section>
    </AdminBasePage>
  );
}
