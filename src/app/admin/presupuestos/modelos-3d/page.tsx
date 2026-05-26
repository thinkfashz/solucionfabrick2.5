'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Box, Check, Copy, ExternalLink, FileArchive, Loader2, UploadCloud } from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';

type UploadedAsset = { url: string; path: string; warning?: string; asset?: { id?: string; url?: string; path?: string; mime_type?: string; size_bytes?: number } | null };

export default function PresupuestoModelos3DPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadedAsset | null>(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  async function upload() {
    if (!file) {
      setMessage('Selecciona primero un archivo .glb, .gltf, .zip, .dae o .pdf.');
      return;
    }
    setUploading(true);
    setMessage('Subiendo archivo técnico a la biblioteca de medios...');
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'modelos-3d');
      form.append('alt', file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
      const res = await fetch('/api/admin/media', { method: 'POST', body: form });
      const json = (await res.json().catch(() => ({}))) as UploadedAsset & { error?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setResult(json);
      setMessage(json.warning ? `Archivo subido, pero no se registró en tabla: ${json.warning}` : 'Archivo subido correctamente. Copia la URL y agrégala al presupuesto.');
    } catch (err) {
      setMessage(`No se pudo subir: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  async function copyUrl() {
    if (!result?.url) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const previewLink = result?.url ? `/presupuestos/trima-mobiliario-modular-laboratorio-container?model=${encodeURIComponent(result.url)}&modelName=${encodeURIComponent(file?.name || 'Modelo 3D')}` : '';

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Presupuestos · archivos técnicos"
        title="Subir modelo 3D para propuesta"
        description="Sube un archivo GLB/GLTF convertido desde Android, Cloudinary o Blender. Luego copia la URL y úsala en la página pública del presupuesto."
        icon={Box}
        actions={<Button asChild variant="outline" className="rounded-full"><Link href="/admin/presupuestos">Volver a presupuestos</Link></Button>}
      />
      <AdminMotion>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <AdminCard glow className="p-5 sm:p-6">
            <div className="rounded-[1.75rem] border border-dashed border-yellow-400/30 bg-yellow-400/5 p-6 text-center">
              <UploadCloud className="mx-auto h-12 w-12 text-yellow-300" />
              <h2 className="mt-4 text-2xl font-black text-white">Selecciona tu archivo</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-400">Formatos permitidos: .glb, .gltf, .dae, .zip, .pdf e imágenes. Recomendado para visor: .glb.</p>
              <input
                type="file"
                accept=".glb,.gltf,.dae,.zip,.pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-6 block w-full rounded-2xl border border-white/10 bg-black/50 p-3 text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-yellow-400 file:px-4 file:py-2 file:text-sm file:font-black file:text-black"
              />
              {file && <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-left text-sm text-zinc-300"><FileArchive className="mr-2 inline h-4 w-4 text-yellow-300" />{file.name}<span className="ml-2 text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span></div>}
              <Button onClick={() => void upload()} disabled={uploading} className="mt-5 rounded-full px-6 font-black">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                {uploading ? 'Subiendo...' : 'Subir archivo'}
              </Button>
              {message && <p className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-zinc-200">{message}</p>}
            </div>
          </AdminCard>

          <AdminCard glow className="p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Resultado</p>
            {!result?.url ? <p className="mt-4 text-sm leading-7 text-zinc-400">Cuando subas el archivo aparecerá aquí la URL pública para previsualizarla en el presupuesto.</p> : (
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-3 text-xs text-zinc-300 break-all">{result.url}</div>
                <Button onClick={() => void copyUrl()} variant="outline" className="rounded-2xl"><Copy className="h-4 w-4" />{copied ? 'Copiado' : 'Copiar URL'}</Button>
                <Button asChild className="rounded-2xl"><Link href={previewLink} target="_blank"><ExternalLink className="h-4 w-4" />Probar en presupuesto TRIMA</Link></Button>
                <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-xs leading-6 text-yellow-100">
                  <Check className="mr-2 inline h-4 w-4" />Para usarlo en el constructor, pega esta URL en el JSON del presupuesto dentro del arreglo <b>archivos</b> o abre el link de prueba con <b>?model=URL</b>.
                </div>
              </div>
            )}
          </AdminCard>
        </div>
      </AdminMotion>
    </AdminPage>
  );
}
