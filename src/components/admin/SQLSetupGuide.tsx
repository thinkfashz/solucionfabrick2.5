'use client';

import { useState } from 'react';
import { ChevronDown, Copy, CheckCircle, Play, Loader2, AlertTriangle } from 'lucide-react';

export default function SQLSetupGuide() {
  const [expanded, setExpanded] = useState(false);
  const [copiedOption, setCopiedOption] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // SQL **compatible con InsForge** (PostgREST): solo CREATE TABLE + índices.
  //
  // ⚠️ NO usar `auth.jwt()` ni `ENABLE ROW LEVEL SECURITY` aquí: esa sintaxis es
  // específica de Supabase y al ejecutarla contra InsForge devuelve
  // `INTERNAL_ERROR · function auth.jwt() does not exist` (HTTP 500). InsForge
  // ya filtra el acceso a estas tablas a nivel de PostgREST + API key, así que
  // las políticas RLS no son necesarias para que el blog funcione.
  const sqlContent = `-- Tabla de comentarios del blog
CREATE TABLE IF NOT EXISTS blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_slug VARCHAR(255) NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_email VARCHAR(255) NOT NULL,
  author_url VARCHAR(255),
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de uploads del blog (.md y portadas)
CREATE TABLE IF NOT EXISTS blog_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL UNIQUE,
  file_url VARCHAR(500),
  file_size INT,
  mime_type VARCHAR(100),
  uploaded_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_blog_comments_post_slug ON blog_comments(post_slug);
CREATE INDEX IF NOT EXISTS idx_blog_comments_status ON blog_comments(status);
CREATE INDEX IF NOT EXISTS idx_blog_comments_created_at ON blog_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_uploads_created_at ON blog_uploads(created_at DESC);`;

  const copyToClipboard = (text: string, option: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedOption(option);
      setTimeout(() => setCopiedOption(null), 2000);
    });
  };

  // Ejecuta el SQL directamente contra /api/admin/sql (mismo endpoint que
  // /admin/sql) — evita el copy-paste manual a la consola de InsForge.
  const runSqlNow = async () => {
    if (running) return;
    setRunning(true);
    setRunMsg(null);
    try {
      const res = await fetch('/api/admin/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlContent }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok !== false) {
        setRunMsg({ ok: true, text: 'Tablas blog_comments y blog_uploads creadas (o ya existían). Ya puedes subir .md.' });
      } else {
        const err = (json?.error as string) || 'Error desconocido al ejecutar el SQL.';
        setRunMsg({ ok: false, text: err });
      }
    } catch (e) {
      setRunMsg({ ok: false, text: (e as Error).message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 md:px-0">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 md:p-6 rounded-2xl border border-orange-400/30 bg-orange-500/10 hover:bg-orange-500/15 transition-colors"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="text-xl sm:text-2xl flex-shrink-0">⚠️</div>
          <div className="text-left min-w-0">
            <h2 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wide text-orange-300">
              Setup SQL del blog
            </h2>
            <p className="text-xs sm:text-sm text-orange-200/70 truncate">
              {expanded ? 'Ocultar' : 'Crear tablas blog_comments y blog_uploads'}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-orange-300 transition-transform flex-shrink-0 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Content */}
      {expanded && (
        <div className="mt-4 space-y-4 sm:space-y-5 md:space-y-6 p-4 sm:p-5 md:p-6 rounded-2xl border border-white/10 bg-zinc-950/50">
          {/* Important Note */}
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4">
            <p className="text-sm text-red-300">
              <span className="font-bold">🔴 IMPORTANTE:</span> Sin ejecutar este SQL, los comentarios
              y uploads <span className="font-bold underline">NO funcionarán</span>. Este es el único paso
              que falta para tener todo en producción.
            </p>
          </div>

          {/* OPCIÓN 0: ejecutar desde la app (más rápido) */}
          <div className="space-y-3 rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-4">
            <h3 className="text-base font-black uppercase tracking-wider text-emerald-300">
              ⚡ OPCIÓN 0 · Ejecutar desde aquí (más rápido)
            </h3>
            <p className="text-sm text-zinc-300">
              Crea las tablas <span className="font-mono text-emerald-300">blog_comments</span> y
              <span className="font-mono text-emerald-300"> blog_uploads</span> directamente contra InsForge,
              sin abrir la consola externa.
            </p>
            <button
              onClick={runSqlNow}
              disabled={running}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 text-emerald-200 transition-all text-sm font-semibold"
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Ejecutando…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Ejecutar ahora
                </>
              )}
            </button>
            {runMsg && (
              <div
                className={`text-xs rounded-lg p-3 border flex items-start gap-2 ${
                  runMsg.ok
                    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-red-400/30 bg-red-500/10 text-red-200'
                }`}
              >
                {runMsg.ok ? (
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <span className="leading-relaxed break-words">{runMsg.text}</span>
              </div>
            )}
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Compatible con InsForge — solo <span className="font-mono">CREATE TABLE IF NOT EXISTS</span> e
              índices. <span className="font-mono">auth.jwt()</span> y RLS de Supabase no se aplican aquí.
            </p>
          </div>

          {/* OPCIÓN 1: InsForge Console */}
          <div className="space-y-3">
            <h3 className="text-lg font-black uppercase tracking-wider text-yellow-400">
              ✅ OPCIÓN 1: InsForge Console
            </h3>
            <div className="space-y-2 text-sm text-zinc-300">
              <div>
                <p className="font-bold text-white mb-1">Paso 1: Abrir Consola</p>
                <ul className="list-disc list-inside space-y-1 text-zinc-400">
                  <li>Ve a: <span className="text-cyan-400 font-mono">https://console.insforge.app</span></li>
                  <li>Inicia sesión con tu cuenta</li>
                  <li>Selecciona tu proyecto</li>
                  <li>Navega a: Database → SQL Editor</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-white mb-1">Paso 2: Copiar SQL</p>
                <button
                  onClick={() => copyToClipboard(sqlContent, 1)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 transition-colors text-sm font-mono"
                >
                  {copiedOption === 1 ? (
                    <>
                      <CheckCircle className="w-4 h-4" /> Copiado ✓
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copiar SQL completo
                    </>
                  )}
                </button>
              </div>
              <div>
                <p className="font-bold text-white mb-1">Paso 3: Ejecutar</p>
                <ul className="list-disc list-inside space-y-1 text-zinc-400">
                  <li>Pega el SQL en el editor (Ctrl+V)</li>
                  <li>Haz clic en: "Execute" o "Run"</li>
                  <li>Espera a que termine</li>
                  <li>Deberías ver: "Query executed successfully"</li>
                </ul>
              </div>
            </div>
          </div>

          {/* OPCIÓN 2: Verificación */}
          <div className="space-y-3">
            <h3 className="text-lg font-black uppercase tracking-wider text-cyan-400">
              ✔️ Verificar que Funcionó
            </h3>
            <p className="text-sm text-zinc-300">Corre este comando en el SQL Editor para confirmar:</p>
            <div className="bg-black/40 p-4 rounded-lg">
              <pre className="text-sm font-mono text-cyan-300 overflow-x-auto">
{`SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('blog_comments', 'blog_uploads');`}
              </pre>
            </div>
            <p className="text-sm text-zinc-400">
              Deberías ver 2 filas: <span className="text-white font-mono">blog_comments</span> y{' '}
              <span className="text-white font-mono">blog_uploads</span>
            </p>
          </div>

          {/* OPCIÓN 2: psql */}
          <div className="space-y-3">
            <h3 className="text-lg font-black uppercase tracking-wider text-blue-400">
              🟢 OPCIÓN 2: psql (Command Line)
            </h3>
            <p className="text-sm text-zinc-300">Si prefieres usar la línea de comandos:</p>
            <div className="bg-black/40 p-4 rounded-lg">
              <pre className="text-sm font-mono text-blue-300 overflow-x-auto">
{`psql postgresql://user:password@host:5432/database -f scripts/create-blog-tables.sql`}
              </pre>
            </div>
            <button
              onClick={() => copyToClipboard(sqlContent, 2)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition-colors text-sm"
            >
              {copiedOption === 2 ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Copiado ✓
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copiar SQL para CLI
                </>
              )}
            </button>
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            <h3 className="text-lg font-black uppercase tracking-wider text-green-400">
              📋 Checklist Después de Ejecutar SQL
            </h3>
            <div className="space-y-2 text-sm text-zinc-300">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" />
                <span>SQL ejecutado correctamente</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" />
                <span>Tablas creadas (verificado con SELECT)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" />
                <span>Ir a <span className="text-white font-mono">/admin/blog</span> y subir un .md</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" />
                <span>Ir a <span className="text-white font-mono">/blog</span> y escribir un comentario</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" />
                <span>Aprobar comentario en <span className="text-white font-mono">/admin/blog/comments</span></span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" />
                <span>¡TODO FUNCIONA! 🎉</span>
              </label>
            </div>
          </div>

          {/* Final Notes */}
          <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4">
            <p className="text-sm text-green-300">
              <span className="font-bold">✅ Después de ejecutar SQL:</span> Los comentarios y uploads
              estarán completamente funcionales. El sistema está listo para producción.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
