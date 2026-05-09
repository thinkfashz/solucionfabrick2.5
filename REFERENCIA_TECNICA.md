# 🔧 Referencia Técnica - Componentes Creados

Documentación técnica detallada de cada componente, API y hook creado en esta sesión.

---

## 1️⃣ BlogComments.tsx

**Ubicación**: `src/components/BlogComments.tsx`  
**Tipo**: Client Component  
**Tamaño**: ~250 líneas

### Funcionalidad:
- Formulario para enviar nuevos comentarios
- Listado de comentarios aprobados
- Validación cliente-lado
- Timestamps relativos en español

### Props:
```typescript
interface BlogCommentsProps {
  postSlug: string;        // Slug del artículo (ej: "guia-metalcon")
  onlyApproved?: boolean;  // Si true, solo muestra aprobados
}
```

### State:
```typescript
comments: Comment[]        // Lista de comentarios
loading: boolean           // Cargando comentarios iniciales
submitting: boolean        // Enviando nuevo comentario
submitted: boolean         // Enviado exitosamente (toast)
error: string | null       // Mensaje de error
formData: {                // Datos del formulario
  name: string;
  email: string;
  url?: string;
  content: string;
}
```

### Validación:
- ✅ Email válido (regex básico)
- ✅ Nombre mínimo 3 caracteres
- ✅ Contenido máximo 5000 caracteres
- ✅ Contenido mínimo 10 caracteres

### API Calls:
```typescript
// GET comentarios aprobados
GET /api/blog/comments/[slug]?approved=true

// POST nuevo comentario
POST /api/blog/comments
Body: {
  post_slug: string,
  author_name: string,
  author_email: string,
  author_url?: string,
  content: string
}
```

### Features Especiales:
- Auto-refresh después de envío
- Timestamps con `date-fns` locale es-CL
- "Hace 2 días", "Hace 1 hora", etc.
- Form reset automático tras envío
- Error toast con tipo de error específico

---

## 2️⃣ BlogUploadPanel.tsx

**Ubicación**: `src/components/admin/BlogUploadPanel.tsx`  
**Tipo**: Client Component  
**Tamaño**: ~250 líneas

### Funcionalidad:
- Drag & drop file upload
- Validación de tipo (.md) y tamaño (5MB max)
- Listado de archivos subidos
- Botón delete con confirmación

### State:
```typescript
files: UploadedFile[]
loading: boolean       // Cargando lista inicial
uploading: boolean     // En proceso de upload
error: string | null
success: boolean       // Toast de éxito
```

### Interface UploadedFile:
```typescript
interface UploadedFile {
  id: string;
  filename: string;
  file_url: string;
  file_size: number;    // bytes
  created_at: string;   // ISO date
}
```

### API Calls:
```typescript
// GET lista de archivos
GET /api/admin/blog/uploads

// POST upload
POST /api/admin/blog/upload
Content-Type: multipart/form-data
FormData: { file: File }

// DELETE archivo
DELETE /api/admin/blog/uploads/[id]
```

### Validación:
- ✅ Solo .md (check en extension)
- ✅ Max 5MB por archivo
- ✅ Múltiples archivos a la vez

### UI Elements:
- Drag & drop zone con hover effect
- Loading spinner durante upload
- File list con metadata (tamaño, fecha)
- Delete button con confirmación
- Instructions box

---

## 3️⃣ CameraController.tsx

**Ubicación**: `src/components/game/CameraController.tsx`  
**Tipo**: React Fiber Component  
**Tamaño**: ~80 líneas

### Funcionalidad:
Controla posición y configuración de cámara Three.js adaptada por dispositivo.

### Props:
```typescript
interface CameraControllerProps {
  topView: boolean;
  deviceType?: 'desktop' | 'tablet' | 'mobile';
}
```

### Presets por dispositivo:

#### Desktop - Vista 3D
- Position: [14, 10, 14]
- FOV: 50°
- Min/Max Distance: 3-32
- Polar Angle: π/6 to π/2.08

#### Desktop - Vista Top
- Position: [0, 20, 0]
- FOV: 45°
- Min/Max Distance: 3-35
- Polar Angle: 0 (locked)

#### Tablet - Vista 3D
- Position: [12, 9, 12]
- FOV: 48°
- Min/Max Distance: 2.5-28
- Polar Angle: π/5 to π/2.1

#### Mobile - Vista 3D
- Position: [10, 8, 10]
- FOV: 55°
- Min/Max Distance: 2-24
- Polar Angle: π/4 to π/2.12

### Comportamiento:
```typescript
useEffect(() => {
  // Cuando cambia topView o deviceType:
  camera.position.set(...config.position);
  camera.fov = config.fov;
  camera.updateProjectionMatrix();
}, [topView, deviceType]);
```

---

## 4️⃣ useDeviceType.ts

**Ubicación**: `src/hooks/useDeviceType.ts`  
**Tipo**: Custom Hook  
**Tamaño**: ~30 líneas

### Returns:
```typescript
type DeviceType = 'mobile' | 'tablet' | 'desktop';
```

### Breakpoints:
```
< 768px  → 'mobile'
768-1024 → 'tablet'
> 1024px → 'desktop'
```

### Comportamiento:
- Detecta en mount
- Listen a resize event
- Update automático al cambiar viewport
- Cleanup al desmontar

### Uso:
```typescript
const deviceType = useDeviceType();

if (deviceType === 'mobile') {
  // render mobile version
}
```

---

## 5️⃣ API Routes

### POST `/api/blog/comments`

**Archivo**: `src/app/api/blog/comments/route.ts`

**Request Body:**
```typescript
{
  post_slug: string;        // "guia-metalcon-2026"
  author_name: string;      // "Juan Pérez"
  author_email: string;     // "juan@example.com"
  author_url?: string;      // "https://blog.example.com"
  content: string;          // "Excelente artículo!"
}
```

**Validación:**
- ✅ post_slug required
- ✅ author_name required (3+ chars)
- ✅ author_email required (email regex)
- ✅ content required (10-5000 chars)
- ✅ author_url optional (URL regex if provided)

**Response Success (201):**
```typescript
{
  id: "uuid",
  post_slug: string,
  author_name: string,
  author_email: string,
  author_url: string | null,
  content: string,
  status: "pending",  // always pending
  created_at: "2026-05-04T10:30:00Z"
}
```

**Response Errors:**
- `400`: Validación fallida (campos faltantes/inválidos)
- `500`: Error de BD

---

### GET `/api/blog/comments/[slug]`

**Archivo**: `src/app/api/blog/comments/[slug]/route.ts`

**Query Params:**
```
?approved=true   // Filtra solo comentarios aprobados
```

**Response (200):**
```typescript
[
  {
    id: string,
    post_slug: string,
    author_name: string,
    author_email: string,
    author_url: string | null,
    content: string,
    status: "approved" | "pending" | "rejected",
    created_at: string
  }
]
```

**Orden:** `created_at DESC` (más reciente primero)

---

### GET `/api/admin/blog/uploads`

**Archivo**: `src/app/api/admin/blog/uploads/[id]/route.ts`

**Response (200):**
```typescript
[
  {
    id: string,
    filename: string,
    file_url: string,
    file_size: number,
    mime_type: string,
    created_at: string
  }
]
```

**Orden:** `created_at DESC`

---

### DELETE `/api/admin/blog/uploads/[id]`

**Response Success (200):**
```typescript
{ success: true }
```

**Response Errors:**
- `404`: Archivo no encontrado
- `500`: Error en BD

---

### POST `/api/admin/blog/upload`

**Archivo**: `src/app/api/admin/blog/upload/route.ts`

**Request:**
```
Content-Type: multipart/form-data
FormData: {
  file: File  // .md file, max 5MB
}
```

**Validación:**
- ✅ File exists
- ✅ Filename ends with .md
- ✅ File size ≤ 5MB (5242880 bytes)

**Response Success (201):**
```typescript
{
  id: string,
  filename: string,
  file_url: string,
  file_size: number,
  mime_type: string,
  uploaded_by: "admin",
  created_at: string
}
```

**Response Errors:**
- `400`: Archivo inválido (tipo o tamaño)
- `500`: Error en BD

---

## 6️⃣ Database Schema

### blog_comments Table

```sql
CREATE TABLE blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_slug TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  author_url TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  FOREIGN KEY (post_slug) 
    REFERENCES blog_posts(slug) ON DELETE CASCADE,
  
  INDEX idx_post_slug (post_slug),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

### RLS Policies (blog_comments)

```sql
-- Anyone can SELECT approved comments
SELECT: status = 'approved'

-- Anyone can INSERT new comments
INSERT: (status = 'pending')

-- Only admin can UPDATE
UPDATE: auth.uid() = admin_uid
```

### blog_uploads Table

```sql
CREATE TABLE blog_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX idx_created_at (created_at)
);
```

---

## 7️⃣ HouseDesigner.tsx Optimizaciones

### Canvas Configuration

**Mobile:**
```javascript
gl={{
  dpr: 1,  // No 2x rendering
  powerPreference: 'high-performance'
}}
shadows={false}  // Sin sombras

// Lights:
shadowMap: 1024x1024  // vs 2048x2048
intensity: 0.3       // vs 0.5
```

**Desktop:**
```javascript
gl={{
  dpr: Math.min(devicePixelRatio, 2)  // Hasta 2x
}}
shadows="soft"

// Lights:
shadowMap: 2048x2048
intensity: 0.5
```

### Fog

```javascript
// Mobile
fog: [color, 20, 48]

// Desktop
fog: [color, 24, 55]
```

---

## 8️⃣ Ejemplos de Blog

### Estructura Meta:
```yaml
---
title: "Título del Artículo"
slug: "slug-url-amigable"
description: "Descripción corta (160 caracteres)"
date: "2026-05-04"
author: "Nombre Autor"
cover: "https://url-imagen.jpg"
tags: ["tag1", "tag2"]
readingMinutes: 8
category: "construcción"
---
```

### Archivo Ejemplo 1:
- **Nombre**: metalcon-vs-hormigon-2026.md
- **Slug**: metalcon-vs-hormigon-2026
- **Largo**: ~1,200 palabras
- **Estructura**: Introducción → Ventajas/Desventajas → Análisis costos → Recomendaciones → Conclusión

### Archivo Ejemplo 2:
- **Nombre**: calcular-presupuesto-remodelacion.md
- **Slug**: calcular-presupuesto-remodelacion
- **Largo**: ~1,500 palabras
- **Estructura**: Step-by-step guide con ejemplos reales

---

## 🔗 Flujos de Datos

### Comentarios Flow:
```
User → BlogComments.tsx → POST /api/blog/comments
                           ↓
                        BD (status: pending)
                           ↓
                        Admin reviews
                           ↓
                        PATCH /api/admin/blog/comments/[id]
                           ↓
                        BD (status: approved/rejected)
                           ↓
                        GET /api/blog/comments/[slug]?approved=true
                           ↓
                        Mostrar en BlogComments.tsx
```

### Upload Flow:
```
Admin → BlogUploadPanel.tsx → POST /api/admin/blog/upload
                                ↓
                            BD (blog_uploads)
                                ↓
                            GET /api/admin/blog/uploads
                                ↓
                            Mostrar lista en Panel
```

### Three.js Mobile Flow:
```
Window Resize → useDeviceType() → returns 'mobile'|'tablet'|'desktop'
                    ↓
            CameraController adapta config
                    ↓
            Canvas adapta DPR y shadows
                    ↓
            OrbitControls adapta dampingFactor
                    ↓
            Render optimizado per device
```

---

## 🎯 Performance Notes

### Three.js Mobile Optimizations Impact:
- **DPR 1 vs 2**: ~75% menos pixels a renderizar
- **1024² vs 2048²**: ~75% menos memoria shadowmap
- **Light Intensity**: Menos cálculos de iluminación
- **Camera FOV 55° vs 45°**: Más field-of-view en mobile (mejor UX con pantalla pequeña)

### Expected Performance:
- Desktop: 60 FPS (locked)
- Tablet: 45-60 FPS
- Mobile: 30-45 FPS (acceptable)

---

## ✅ Type Safety

Todos los componentes y APIs tienen tipos TypeScript completos:
- ✅ Props interfaces definidas
- ✅ Response types documentados
- ✅ Database records tipados
- ✅ No `any` types
- ✅ Strict null checking enabled
