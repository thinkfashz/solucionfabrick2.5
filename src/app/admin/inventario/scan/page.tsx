'use client';

import { useState } from 'react';
import Link from 'next/link';
import BarcodeScanner from '@/components/BarcodeScanner';
import { Camera, ScanLine } from 'lucide-react';

interface ScanEntry {
  value: string;
  format: string;
  at: string;
}

/**
 * Página de escaneo rápido para entradas/salidas (épica 3).
 *
 * Por ahora registra los códigos en memoria; la integración con
 * `inventory_movements` se activa cuando se conoce la `variant_id` (lookup
 * por SKU/EAN — pendiente de catálogo de variantes en producción).
 */
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
    <main className="mx-auto max-w-3xl px-4 py-8 text-zinc-100">
      <Link href="/admin" className="text-xs text-yellow-400 hover:underline">
        ← Admin
      </Link>
      <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold">
        <ScanLine className="text-yellow-400" /> Escáner de inventario
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        Escaneá EAN-13 o QR con la cámara para registrar movimientos rápidos. Funciona en Chrome/Edge,
        Android y iOS 17+.
      </p>

      <div className="mt-6">
        {active ? (
          <BarcodeScanner onDetect={handleDetect} onClose={() => setActive(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setActive(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
          >
            <Camera size={16} /> Iniciar escáner
          </button>
        )}
      </div>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Últimos escaneos
        </h2>
        <ul className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/60">
          {scans.length === 0 ? (
            <li className="px-4 py-3 text-sm text-zinc-500">Aún no hay escaneos.</li>
          ) : (
            scans.map((s, i) => (
              <li key={`${s.value}-${i}`} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-mono text-yellow-300">{s.value}</p>
                  <p className="text-xs text-zinc-500">{s.format}</p>
                </div>
                <span className="text-xs text-zinc-500">
                  {new Date(s.at).toLocaleTimeString('es-CL')}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}
