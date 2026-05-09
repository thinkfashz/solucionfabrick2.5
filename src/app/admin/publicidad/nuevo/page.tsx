'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, CheckCircle, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';

const UBICACIONES = [
  { value: 'santiago', label: 'Santiago (por defecto)' },
  { value: 'valparaiso', label: 'Valparaíso' },
  { value: 'bío_bío', label: 'Biobío' },
  { value: 'maule', label: 'Maule' },
  { value: 'la_araucania', label: 'La Araucanía' },
  { value: 'los_lagos', label: 'Los Lagos' },
  { value: 'metropolitana', label: 'Región Metropolitana (completa)' },
  { value: 'chile', label: 'Todo Chile' },
];

const RANGOS_EDAD = [
  { min: 18, max: 24, label: '18–24' },
  { min: 25, max: 34, label: '25–34' },
  { min: 35, max: 44, label: '35–44' },
  { min: 45, max: 54, label: '45–54' },
  { min: 55, max: 64, label: '55–64' },
  { min: 25, max: 54, label: '25–54' },
  { min: 30, max: 55, label: '30–55' },
  { min: 18, max: 65, label: '18–65 (amplio)' },
];

interface FormState {
  titulo: string;
  texto: string;
  urlDestino: string;
  presupuestoCLP: string;
  fechaInicio: string;
  fechaFin: string;
  ubicacion: string;
  rangoEdad: string;
}

interface AdResult {
  adId: string;
  adLink: string;
  campaignId: string;
  adSetId: string;
}

const today = new Date().toISOString().split('T')[0];
const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

export default function NuevoAnuncioPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [form, setForm] = useState<FormState>({
    titulo: '',
    texto: '',
    urlDestino: 'https://solucionesfabrick.cl',
    presupuestoCLP: '10000',
    fechaInicio: today,
    fechaFin: nextMonth,
    ubicacion: 'santiago',
    rangoEdad: '0',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdResult | null>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen (JPG, PNG, GIF).');
      return;
    }
    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    // Ensure we only set blob: URLs (safe, created from local File objects)
    if (objectUrl.startsWith('blob:')) {
      setImagePreview(objectUrl);
    }
    setError(null);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleField = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!imageFile) {
      setError('Debes subir una imagen para el anuncio.');
      return;
    }

    const rangoEdad = RANGOS_EDAD[parseInt(form.rangoEdad, 10)];
    if (!rangoEdad) {
      setError('Selecciona un rango de edad válido.');
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Upload image
      const imageData = new FormData();
      imageData.append('image', imageFile);

      const uploadRes = await fetch('/api/meta/upload', {
        method: 'POST',
        body: imageData,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error ?? 'Error al subir imagen');

      const imageHash: string = uploadJson.hash;

      // Step 2: Create ad
      const createRes = await fetch('/api/meta/ads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: form.titulo,
          texto: form.texto,
          urlDestino: form.urlDestino,
          presupuestoCLP: parseInt(form.presupuestoCLP, 10),
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
          ubicacion: form.ubicacion,
          edadMin: rangoEdad.min,
          edadMax: rangoEdad.max,
          imageHash,
        }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) throw new Error(createJson.error ?? 'Error al crear anuncio en Meta');

      setResult(createJson.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido al publicar');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] border border-green-500/20 bg-green-500/5 p-10 text-center">
          <CheckCircle size={48} className="mx-auto text-green-400 mb-6" />
          <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-2">
            ¡Anuncio publicado!
          </h2>
          <p className="text-zinc-400 text-sm mb-8">
            Tu anuncio ha sido creado y activado exitosamente en Meta Ads.
          </p>
          <div className="grid gap-3 text-left mb-8">
            {[
              { label: 'ID del Anuncio', value: result.adId },
              { label: 'ID de Campaña', value: result.campaignId },
              { label: 'ID de Ad Set', value: result.adSetId },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  {label}
                </span>
                <span className="font-mono text-sm text-zinc-300">{value}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href={result.adLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-black transition hover:bg-white"
            >
              <ExternalLink size={13} />
              Ver en Meta Ads Manager
            </a>
            <Link
              href="/admin/publicidad"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-zinc-400 transition hover:border-white/30 hover:text-white"
            >
              <ArrowLeft size={13} />
              Volver a publicidad
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/publicidad"
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-yellow-400 transition-colors mb-4"
        >
          <ArrowLeft size={12} />
          Volver a publicidad
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400 mb-2">
          Meta / Facebook Ads
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">Nuevo Anuncio</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Completa el formulario para crear y publicar un anuncio en Meta Ads.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Image upload */}
        <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">
            Imagen del anuncio *
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-colors ${
              dragOver
                ? 'border-yellow-400 bg-yellow-400/5'
                : imagePreview
                ? 'border-green-500/40 bg-green-500/5'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            {imagePreview ? (
              <div className="relative overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-64 object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity">
                  <p className="text-xs font-bold uppercase tracking-widest text-white">
                    Cambiar imagen
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
                <Upload size={28} className="text-zinc-600" />
                <div>
                  <p className="text-sm font-medium text-zinc-400">
                    Arrastra tu imagen aquí o haz clic para seleccionar
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-widest">
                    JPG, PNG · Recomendado: 1200×628 px
                  </p>
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            aria-label="Seleccionar imagen para el anuncio"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        {/* Ad copy */}
        <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 flex flex-col gap-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Contenido del anuncio
          </p>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Título *
            </label>
            <input
              type="text"
              required
              maxLength={40}
              placeholder="Ej: Fabrick 70 — Construcción de precisión"
              value={form.titulo}
              onChange={(e) => handleField('titulo', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-yellow-400/40 focus:outline-none focus:ring-0 transition-colors"
            />
            <p className="text-[10px] text-zinc-600 mt-1">{form.titulo.length}/40 caracteres</p>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Texto del anuncio *
            </label>
            <textarea
              required
              maxLength={125}
              rows={3}
              placeholder="Ej: Descubre soluciones de construcción industrializada para tu hogar."
              value={form.texto}
              onChange={(e) => handleField('texto', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-yellow-400/40 focus:outline-none focus:ring-0 transition-colors resize-none"
            />
            <p className="text-[10px] text-zinc-600 mt-1">{form.texto.length}/125 caracteres</p>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
              URL de destino *
            </label>
            <input
              type="url"
              required
              placeholder="https://solucionesfabrick.cl"
              value={form.urlDestino}
              onChange={(e) => handleField('urlDestino', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-yellow-400/40 focus:outline-none focus:ring-0 transition-colors"
            />
          </div>
        </div>

        {/* Budget & dates */}
        <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 flex flex-col gap-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Presupuesto y fechas
          </p>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Presupuesto diario (CLP) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-bold">
                $
              </span>
              <input
                type="number"
                required
                min={5000}
              aria-label="Presupuesto diario en pesos chilenos"
                step={1000}
                value={form.presupuestoCLP}
                onChange={(e) => handleField('presupuestoCLP', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-8 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-yellow-400/40 focus:outline-none focus:ring-0 transition-colors"
              />
            </div>
            <p className="text-[10px] text-zinc-600 mt-1">Mínimo $5.000 CLP/día</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                Fecha de inicio *
              </label>
              <input
                type="date"
                required
                min={today}
              aria-label="Fecha de inicio del anuncio"
                value={form.fechaInicio}
                onChange={(e) => handleField('fechaInicio', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white focus:border-yellow-400/40 focus:outline-none focus:ring-0 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                Fecha de fin *
              </label>
              <input
                type="date"
                required
                min={form.fechaInicio}
              aria-label="Fecha de fin del anuncio"
                value={form.fechaFin}
                onChange={(e) => handleField('fechaFin', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white focus:border-yellow-400/40 focus:outline-none focus:ring-0 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Targeting */}
        <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 flex flex-col gap-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Segmentación
          </p>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Ubicación *
            </label>
            <select
              required
              aria-label="Ubicación objetivo"
              value={form.ubicacion}
              onChange={(e) => handleField('ubicacion', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white focus:border-yellow-400/40 focus:outline-none focus:ring-0 transition-colors"
            >
              {UBICACIONES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Rango de edad *
            </label>
            <select
              required
              aria-label="Rango de edad"
              value={form.rangoEdad}
              onChange={(e) => handleField('rangoEdad', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white focus:border-yellow-400/40 focus:outline-none focus:ring-0 transition-colors"
            >
              {RANGOS_EDAD.map(({ label }, idx) => (
                <option key={label} value={idx}>
                  {label} años
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
            <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/admin/publicidad"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-zinc-400 transition hover:border-white/30 hover:text-white"
          >
            <ArrowLeft size={13} />
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-8 py-4 text-[11px] font-black uppercase tracking-widest text-black transition hover:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Publicando…
              </>
            ) : (
              'Publicar en Meta'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}