# 🔧 EJECUCIÓN DE SQL - GUÍA RÁPIDA

## ⚠️ IMPORTANTE: Este es el ÚNICO paso que falta

Sin ejecutar este SQL, los comentarios y uploads **NO funcionarán**.

---

## 🔴 **OPCIÓN 1: InsForge Console (Recomendado)**

### Paso 1: Abrir la Consola
```
1. Ve a: https://console.insforge.app
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto
4. Navega a: Database → SQL Editor
```

### Paso 2: Copiar el SQL
```
1. Abre el archivo: scripts/create-blog-tables.sql
2. Selecciona TODO el contenido (Ctrl+A)
3. Copia (Ctrl+C)
```

### Paso 3: Ejecutar
```
1. En la consola, pega el SQL en el editor (Ctrl+V)
2. Haz clic en: "Execute" o "Run"
3. Espera a que termine
4. Deberías ver: "Query executed successfully"
```

### ✅ Verificar que funcionó
```
En el SQL Editor, corre:

SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('blog_comments', 'blog_uploads');
```

Deberías ver 2 filas:
- blog_comments
- blog_uploads

---

## 🟢 **OPCIÓN 2: psql (Command Line)**

Si usas psql directamente:

```bash
# Conectar a tu BD
psql -h [host] -U [user] -d [database]

# Ejecutar el archivo SQL
\i scripts/create-blog-tables.sql

# O copiar y pegar manualmente desde create-blog-tables.sql
```

---

## 🟡 **OPCIÓN 3: pgAdmin Web Interface**

Si tienes pgAdmin:
```
1. Abre pgAdmin en tu navegador
2. Selecciona la base de datos
3. Abre Query Editor
4. Copia y pega el SQL
5. Ejecuta (F5 o botón Execute)
```

---

## ✅ ¿QUÉ SUCEDE DESPUÉS?

Cuando ejecutes el SQL:

### 1. Se crearán dos tablas:
```sql
blog_comments
├── Almacena comentarios de usuarios
├── Con status: pending/approved/rejected
└── RLS policies incluidas

blog_uploads
├── Almacena metadatos de archivos .md
├── Tracking de uploads
└── Metadata: filename, size, date
```

### 2. Se crearán índices:
```sql
idx_blog_comments_post_slug    (búsqueda rápida)
idx_blog_comments_status       (filtrar aprobados)
idx_blog_comments_created_at   (ordenamiento)
idx_blog_uploads_created_at    (ordenamiento)
```

### 3. Se habilitarán RLS policies:
```sql
- SELECT: solo comentarios aprobados (o admin)
- INSERT: cualquiera puede comentar
- UPDATE: solo admin puede moderar
- DELETE: solo admin puede eliminar
```

---

## 🚨 SI ALGO SALE MAL

### Error: "permission denied for schema public"
```
→ Contacta a tu admin de BD
→ Necesitas permisos CREATE TABLE
```

### Error: "relation 'blog_posts' does not exist"
```
→ La tabla blog_posts no existe
→ Comenta la línea: FOREIGN KEY (post_slug) REFERENCES blog_posts(slug)
→ O crea blog_posts primero
```

### Error: "table already exists"
```
→ Las tablas ya fueron creadas antes
→ Simplemente ignora y continúa
→ O ejecuta: DROP TABLE IF EXISTS blog_comments, blog_uploads; 
  Luego corre el SQL de nuevo
```

---

## ✅ CONFIRMACIÓN FINAL

Una vez ejecutado el SQL:

- [x] `blog_comments` table creada
- [x] `blog_uploads` table creada
- [x] RLS policies habilitadas
- [x] Índices creados
- [x] Sistema 100% funcional

Ahora puedes:
1. ✅ Ir a `/admin/blog` → Upload panel
2. ✅ Ir a `/blog` → Comentar en artículos
3. ✅ Ir a `/admin/blog/comments` → Moderar

---

## 📞 SOPORTE

Si necesitas ayuda:
1. Revisa la documentación: `REFERENCIA_TECNICA.md`
2. Mira los ejemplos: `public/blog-ejemplos/`
3. Lee la guía: `GUIA_PASOS_FINALES.md`

---

## ⏱️ TIEMPO ESTIMADO

- Copiar SQL: 1 min
- Ejecutar en consola: 30 seg
- Verificar funcionamiento: 30 seg

**TOTAL: 2 minutos**

---

*Una vez hecho esto, todo funciona automáticamente* ✅
