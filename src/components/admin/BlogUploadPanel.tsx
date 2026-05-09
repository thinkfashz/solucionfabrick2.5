'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';

interface UploadedFile {
  id: string;
  filename: string;
  file_url: string;
  file_size: number;
  created_at: string;
}

export default function BlogUploadPanel() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Cargar lista de archivos
  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blog/uploads');
      if (res.ok) {
        const data = (await res.json()) as UploadedFile[];
        setFiles(data);
      }
    } catch (err) {
      console.error('Error loading files:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar archivos al montar
  useState(() => {
    loadFiles();
  });

  // Manejar upload
  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.currentTarget.files;
      if (!selectedFiles) return;

      setUploading(true);
      setError(null);
      setSuccess(false);

      for (const file of selectedFiles) {
        if (!file.name.endsWith('.md')) {
          setError('Solo se permiten archivos .md');
          setUploading(false);
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          setError('El archivo no puede superar 5MB');
          setUploading(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
          const res = await fetch('/api/admin/blog/upload', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) throw new Error('Error uploading file');

          setSuccess(true);
          await loadFiles();
          setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error desconocido';
          setError(msg);
        }
      }

      setUploading(false);
    },
    [loadFiles]
  );

  // Eliminar archivo
  const handleDelete = useCallback(
    async (fileId: string) => {
      if (!confirm('¿Eliminar este archivo?')) return;

      try {
        const res = await fetch(`/api/admin/blog/uploads/${fileId}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          await loadFiles();
        }
      } catch (err) {
        console.error('Error deleting file:', err);
        setError('Error eliminando archivo');
      }
    },
    [loadFiles]
  );

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:p-6 md:p-8 backdrop-blur-sm">
      <div className="flex items-center gap-2 sm:gap-3">
        <Upload className="h-5 sm:h-6 w-5 sm:w-6 text-yellow-400 flex-shrink-0" />
        <h2 className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight text-white">Subir artículos</h2>
      </div>

      {/* Upload area */}
      <div className="rounded-xl border-2 border-dashed border-white/20 p-6 sm:p-8 transition hover:border-yellow-400/40 hover:bg-yellow-400/5">
        <input
          type="file"
          multiple
          accept=".md"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
          id="md-upload"
        />
        <label
          htmlFor="md-upload"
          className="cursor-pointer flex flex-col items-center justify-center gap-3 text-center"
        >
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-yellow-400" />
              <p className="text-sm font-semibold text-zinc-300">Subiendo...</p>
            </>
          ) : (
            <>
              <FileText className="h-10 w-10 text-zinc-400" />
              <p className="text-sm font-semibold text-white">
                Arrastra archivos .md aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-zinc-500">Máximo 5MB por archivo</p>
            </>
          )}
        </label>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          ¡Archivo subido correctamente!
        </div>
      )}

      {/* Files list */}
      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-300">
          Archivos subidos ({files.length})
        </h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-sm text-zinc-500">No hay archivos aún</p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4 transition hover:bg-white/10"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{file.filename}</p>
                    <p className="text-xs text-zinc-500">
                      {formatSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold uppercase tracking-wider text-yellow-400 hover:text-yellow-300"
                  >
                    Ver
                  </a>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="p-2 text-zinc-400 hover:text-red-400 transition"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
        <p className="font-semibold mb-2">📋 Instrucciones:</p>
        <ul className="space-y-1 text-xs">
          <li>1. Prepara tu artículo en formato Markdown (.md)</li>
          <li>2. Incluye metadatos al inicio (título, descripción, fecha, etc.)</li>
          <li>3. Sube el archivo aquí</li>
          <li>4. El archivo será procesado y aparecerá en tu blog</li>
        </ul>
      </div>
    </div>
  );
}
