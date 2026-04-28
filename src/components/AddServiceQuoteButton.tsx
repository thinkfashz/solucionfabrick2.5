'use client';

/**
 * AddServiceQuoteButton — botón "Agregar a cotización" para tarjetas de
 * servicios. Es un client component aislado para no convertir toda la página
 * /servicios en cliente.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Check } from 'lucide-react';
import { useQuoteCart } from '@/context/QuoteCartContext';

interface Props {
  serviceTitle: string;
  description?: string;
  refPrice?: number;
  unit?: string;
  /** Si true, redirige a /cotizaciones tras añadir. */
  goToCart?: boolean;
}

export default function AddServiceQuoteButton({
  serviceTitle,
  description,
  refPrice,
  unit = 'un',
  goToCart = false,
}: Props) {
  const router = useRouter();
  const { addItem } = useQuoteCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem({
      kind: 'service',
      title: serviceTitle,
      description,
      quantity: 1,
      unit,
      refPrice,
    });
    setAdded(true);
    if (goToCart) {
      router.push('/cotizaciones');
      return;
    }
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={handleAdd}
      aria-label={`Agregar ${serviceTitle} a cotización`}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
        added
          ? 'bg-emerald-400/15 border border-emerald-400/40 text-emerald-300'
          : 'bg-yellow-400 text-black hover:bg-white'
      }`}
    >
      {added ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Agregado
        </>
      ) : (
        <>
          <Plus className="h-3.5 w-3.5" />
          Cotizar
        </>
      )}
    </button>
  );
}
