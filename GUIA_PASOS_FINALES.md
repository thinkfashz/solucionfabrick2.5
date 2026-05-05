# 📋 Guía de Pasos Finales - Blog System Completion

Sigue estos pasos en orden para completar la implementación del sistema de blog.

---

## 🟣 PASO 1: Ejecutar Migración de Base de Datos

### Qué hace:
Crea las tablas `blog_comments` y `blog_uploads` en tu BD InsForge.

### Pasos:
1. Abre `scripts/create-blog-tables.sql` en el editor
2. Selecciona y copia TODO el contenido SQL
3. Ve a tu consola InsForge: https://console.insforge.app
4. Navega a: Database → SQL Editor
5. Pega el SQL en el editor
6. Haz clic en "Execute" o "Run"
7. Verifica que no hay errores (debería decir "Query executed successfully")

### Cómo verificar que funcionó:
```sql
-- En la consola SQL de InsForge, corre:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('blog_comments', 'blog_uploads');
```

Deberías ver 2 filas en el resultado.

---

## 🟠 PASO 2: Integrar BlogUploadPanel en Admin

### Qué hace:
Agrega el panel de upload en la página de administración del blog.

### Pasos:

#### 2.1: Crear o Modificar `/app/admin/blog/page.tsx`

Si el archivo NO existe, créalo con este contenido:

```typescript
'use client';

import BlogUploadPanel from '@/components/admin/BlogUploadPanel';

export default function AdminBlogPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase text-white mb-2">
          Administración de Blog
        </h1>
        <p className="text-zinc-400">
          Sube y gestiona tus artículos en formato Markdown
        </p>
      </div>

      <BlogUploadPanel />
    </div>
  );
}
```

Si el archivo SÍ existe, agrega esto dentro:
```typescript
import BlogUploadPanel from '@/components/admin/BlogUploadPanel';

// ... en el JSX retornado:
<BlogUploadPanel />
```

#### 2.2: Verificar que funciona
1. Ve a `http://localhost:3000/admin/blog`
2. Deberías ver el panel con "Subir artículos .md"
3. Intenta arrastrar un archivo .md (prueba: `public/blog-ejemplos/metalcon-vs-hormigon-2026.md`)

---

## 🟡 PASO 3: Probar el Sistema de Comentarios

### Qué hace:
Verifica que los comentarios se creen y se almacenen correctamente.

### Pasos:

1. **Abre un artículo del blog**
   - Ve a `http://localhost:3000/blog`
   - Haz click en cualquier artículo
   - Deberías ver un formulario de comentarios al final

2. **Completa el formulario:**
   - **Nombre**: Tu nombre (ej: "Juan Pérez")
   - **Email**: tu@email.com (ej: "test@example.com")
   - **URL**: opcional (ej: "https://example.com")
   - **Comentario**: Escribe un comentario de prueba

3. **Envía el formulario:**
   - Haz click en "Publicar Comentario"
   - Deberías ver: "¡Gracias! Tu comentario está pendiente de aprobación"

4. **Verifica en la BD:**
   - Ve a tu consola InsForge → SQL Editor
   - Corre esta query:
   ```sql
   SELECT * FROM blog_comments ORDER BY created_at DESC LIMIT 1;
   ```
   - Deberías ver tu comentario con `status = 'pending'`

### Qué significa cada status:
- `pending` = Esperando aprobación del admin
- `approved` = Publicado (visible en el blog)
- `rejected` = Rechazado (no visible)

---

## 🟢 PASO 4: Crear Interfaz de Moderación de Comentarios

### Qué hace:
Página para que el admin vea y apruebe comentarios.

### Crear archivo: `/app/admin/blog/comments/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Comment {
  id: string;
  post_slug: string;
  author_name: string;
  author_email: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, []);

  const loadComments = async () => {
    try {
      const res = await fetch('/api/admin/blog/comments');
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/blog/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadComments();
      }
    } catch (err) {
      console.error('Error updating comment:', err);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase text-white mb-2">
          Moderación de Comentarios
        </h1>
        <p className="text-zinc-400">
          Aprueba o rechaza comentarios de los lectores
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-zinc-500">No hay comentarios pendientes</p>
      ) : (
        <div className="space-y-3">
          {comments.filter(c => c.status === 'pending').map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border border-white/10 bg-zinc-950/50 p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-white">{comment.author_name}</p>
                  <p className="text-sm text-zinc-400">{comment.author_email}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    En: <span className="text-yellow-400">{comment.post_slug}</span>
                  </p>
                </div>
                <span className="text-xs font-bold uppercase bg-yellow-400/15 text-yellow-400 px-2 py-1 rounded">
                  {comment.status}
                </span>
              </div>
              
              <p className="text-white bg-black/30 p-3 rounded">{comment.content}</p>

              <div className="flex gap-2">
                <button
                  onClick={() => updateStatus(comment.id, 'approved')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500/15 text-green-400 hover:bg-green-500/25 rounded font-bold text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aprobar
                </button>
                <button
                  onClick={() => updateStatus(comment.id, 'rejected')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded font-bold text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Crear API: `/app/api/admin/blog/comments/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const { error } = await insforge
      .from('blog_comments')
      .update({ status })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: 'Error updating comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Crear API: `/app/api/admin/blog/comments/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

export async function GET() {
  try {
    const { data, error } = await insforge
      .from('blog_comments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Error fetching comments' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Verificar que funciona:
1. Ve a `http://localhost:3000/admin/blog/comments`
2. Deberías ver los comentarios pendientes
3. Haz click en "Aprobar"
4. Vuelve al artículo del blog → el comentario ahora aparecerá

---

## 🔵 PASO 5: Probar Three.js en Dispositivos Móviles

### Qué probar:
- Interacción táctil fluida
- Renderizado sin lag
- Vistas 2D y 3D adaptadas
- Controles accesibles

### En Chrome DevTools (Emulador):
1. Abre DevTools (F12)
2. Haz click en el icono de móvil (🔧 → 📱)
3. Selecciona "iPhone 12" o "Pixel 5"
4. Ve a `http://localhost:3000/juego`
5. Prueba:
   - Hacer zoom (pellizco)
   - Rotar vista (toque + arrastrar)
   - Cambiar entre vistas 2D/3D
   - Cambiar entre paneles y elementos

### En dispositivo real:
1. En la misma red Wi-Fi
2. Descubre tu IP local: `ipconfig getifaddr en0` (Mac) o similar
3. En el móvil ve a: `http://[TU_IP]:3000/juego`
4. Prueba lo mismo que arriba

### Qué debería notar:
✓ Renderizado suave (sin tartamudeos)
✓ Botones accesibles (no demasiado pequeños)
✓ Rotación y zoom responden bien al toque
✓ Interfaz adaptada al ancho de pantalla

---

## ✅ CHECKLIST FINAL

- [ ] 1. SQL ejecutado → tablas creadas
- [ ] 2. BlogUploadPanel visible en `/admin/blog`
- [ ] 3. Formulario de comentarios funciona
- [ ] 4. Comentarios aparecen en BD con status pending
- [ ] 5. Interfaz de moderación permite aprobar/rechazar
- [ ] 6. Comentarios aprobados aparecen en el blog
- [ ] 7. Three.js funciona bien en móvil
- [ ] 8. Upload de .md funciona (si implementaste almacenamiento)

---

## 🚀 ¡Listo!

Una vez completes todos estos pasos, tu blog tendrá:
- ✅ Sistema de comentarios moderable
- ✅ Upload de artículos .md
- ✅ Interfaz admin para moderación
- ✅ Three.js optimizado para móvil
- ✅ Carrito removido del menú

**Si encuentras problemas, revisa:**
- Las APIs están llamando a `insforge` correctamente
- Las tablas existen en BD (ejecutaste el SQL)
- Los permisos RLS están configurados (incluidos en el SQL)
