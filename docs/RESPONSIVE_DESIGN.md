# 📱 GUÍA DE RESPONSIVE DESIGN - SOLUCIONES FABRICK

## Estrategia Mobile-First

**Objetivo**: Cada elemento debe verse perfecto en móviles, tablets y desktop.

---

## 📐 BREAKPOINTS TAILWIND

```
Base (0px - 639px):     Mobile phones
sm (640px - 767px):     Large phones
md (768px - 1023px):    Tablets
lg (1024px - 1279px):   Small laptops
xl (1280px+):           Desktop / Widescreen
```

---

## 🎯 ESPACIADO RESPONSIVO

### Padding (Contenedores)

```tsx
// Mobile-first approach
px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16

// Ejemplos aplicados
py-6 sm:py-8 md:py-12 lg:py-16
px-4 md:px-8 lg:px-12
```

### Gaps (Grid/Flex)

```tsx
// Distancia entre items
gap-3 sm:gap-4 md:gap-6 lg:gap-8

// En grids
gap-3 md:gap-4 lg:gap-6
```

---

## 🏗️ GRID Y LAYOUTS

### Número de Columnas

```tsx
// 1 col en mobile → 2 en tablet → 3 en desktop
grid-cols-1 md:grid-cols-2 lg:grid-cols-3

// 1 col en mobile → 2 en desktop
grid-cols-1 md:grid-cols-2

// Sin grid (full width en mobile)
flex flex-col md:flex-row
```

---

## 📏 TAMAÑOS DE FUENTE Y ALTURA

### Titulares

```tsx
// Títulos grandes
text-2xl sm:text-3xl md:text-4xl lg:text-5xl

// Títulos medianos
text-xl sm:text-2xl md:text-3xl lg:text-4xl

// Subtítulos
text-base sm:text-lg md:text-xl
```

### Line Height

```tsx
// Párrafos
leading-relaxed  // 1.625 (cómodo de leer)

// Títulos
leading-tight    // 1.25 (compacto)

// Lists
leading-relaxed  // 1.625
```

---

## 🎨 COMPONENTES COMUNES

### Hero Section

```tsx
<section className="flex min-h-[100svh] overflow-hidden bg-zinc-950">
  <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col 
                  justify-center px-4 pb-12 pt-16 sm:px-6 sm:pb-16 md:px-8 
                  md:pb-20 md:pt-0 lg:px-12">
    {/* Content */}
  </div>
</section>
```

**Breakpoints:**
- Mobile: px-4 pb-12 pt-16 (pantalla completa)
- Tablet: px-6 pb-16 (centrado)
- Desktop: px-12 pt-0 (centrado + centrado verticalmente)

### Cards Grid

```tsx
<div className="grid gap-3 md:gap-4 lg:gap-6 
                grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {items.map(item => (
    <article className="rounded-lg border">
      {/* Card content */}
    </article>
  ))}
</div>
```

### Navbar

```tsx
<nav className="flex items-center justify-between px-4 py-3 sm:px-6 md:px-8">
  <Logo />
  
  {/* Desktop menu */}
  <menu className="hidden md:flex gap-4 lg:gap-6">
    {/* Items */}
  </menu>
  
  {/* Mobile menu */}
  <MobileMenu className="md:hidden" />
</nav>
```

### Buttons (Full-width en mobile)

```tsx
<button className="w-full rounded-full px-4 py-3 sm:px-6 sm:py-4 md:w-auto">
  Label
</button>

// O en un grupo
<div className="flex flex-col sm:flex-row gap-3">
  <button className="flex-1">Primary</button>
  <button className="flex-1">Secondary</button>
</div>
```

### Forms (Stacked en mobile)

```tsx
<div className="space-y-4 md:space-y-6">
  <input className="w-full" />
  <input className="w-full" />
  
  {/* Grid en desktop */}
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    <input />
    <input />
  </div>
</div>
```

---

## 📱 ADMIN PAGES

### PageEditor Component

```tsx
<div className="space-y-6 md:space-y-8">
  {/* Header */}
  <div className="px-4 sm:px-6 md:px-0">
    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black">
      Título
    </h1>
  </div>
  
  {/* Form fields */}
  <div className="space-y-4 md:space-y-6">
    {/* Fields */}
  </div>
</div>
```

### Admin Modals

```tsx
<div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
  <div className="w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-8 md:p-10">
    {/* Modal content */}
  </div>
</div>
```

---

## 🎯 CHECKLIST RESPONSIVE

Para cada componente preguntate:

```
Mobile (360px):
[ ] ¿El contenido cabe sin scroll horizontal?
[ ] ¿Los botones son tocables (48px min)?
[ ] ¿El padding es suficiente?
[ ] ¿El texto es legible (base o sm)?

Tablet (768px):
[ ] ¿Se ve bien en 2 columnas?
[ ] ¿Hay espacio suficiente?
[ ] ¿El layout es simétrico?

Desktop (1280px+):
[ ] ¿Se ve profesional?
[ ] ¿El max-width está limitado?
[ ] ¿Hay suficiente espacio blanco?
```

---

## 🔧 UTILIDADES TAILWIND MÁS USADAS

```
Responsive Display
- hidden md:block (oculto en mobile, visible en tablet+)
- block md:flex (flex desde tablet)

Responsive Width
- w-full md:w-auto (full width en mobile)
- w-full sm:w-96 md:w-full (fluid)

Responsive Text
- text-sm md:text-base lg:text-lg
- text-center md:text-left

Responsive Grid
- grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- grid-cols-2 md:grid-cols-3 lg:grid-cols-4

Responsive Flex
- flex-col md:flex-row
- justify-center md:justify-between
```

---

## ⚠️ ERRORES COMUNES

```
❌ NO hacer:
- max-w-7xl sin mx-auto (no centra)
- px-0 md:px-8 (sin padding móvil)
- grid-cols-3 (3 cols en mobile, demasiado pequeño)
- text-4xl en mobile (texto demasiado grande)
- gap-8 en mobile (mucho espacio)

✅ SÍ hacer:
- mx-auto max-w-7xl (centra siempre)
- px-4 md:px-8 (padding progresivo)
- grid-cols-1 md:grid-cols-3 (1 col mobile)
- text-lg md:text-3xl (escala proporcionada)
- gap-3 md:gap-6 (espacio progresivo)
```

---

## 🎨 SAFE AREAS (Móviles con notch)

```tsx
// Para evitar notch en iPhone
<div className="safe-area-inset pt-safe pb-safe px-safe">
  {/* Content */}
</div>

// O manual
<div className="pt-[env(safe-area-inset-top)] 
                pb-[env(safe-area-inset-bottom)] 
                px-[env(safe-area-inset-left)]">
  {/* Content */}
</div>
```

---

## 📊 VIEWPORT LAYOUT

```html
<!-- En layout.tsx o HTML head -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

---

## ✨ EJEMPLOS COMPLETOS

### Sección con Cards (Mobile-first)

```tsx
<section className="px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-12 lg:px-12 lg:py-16">
  <div className="mx-auto max-w-6xl">
    {/* Header */}
    <div className="mb-8 md:mb-12">
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white">
        Nuestros Proyectos
      </h2>
      <p className="mt-2 text-sm md:text-base text-zinc-400">
        Proyectos completados...
      </p>
    </div>
    
    {/* Grid */}
    <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {projects.map(project => (
        <article key={project.id} className="rounded-xl border border-white/10 
                                            overflow-hidden transition 
                                            hover:shadow-lg">
          {/* Card */}
        </article>
      ))}
    </div>
  </div>
</section>
```

### Form (Mobile-first)

```tsx
<form className="space-y-4 md:space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
    <input className="w-full px-4 py-3 rounded-lg border" 
           placeholder="Nombre" />
    <input className="w-full px-4 py-3 rounded-lg border" 
           placeholder="Email" />
  </div>
  
  <textarea className="w-full px-4 py-3 rounded-lg border" 
            rows={4}
            placeholder="Mensaje" />
  
  <div className="flex flex-col sm:flex-row gap-3">
    <button className="flex-1 px-6 py-3 bg-yellow-400 text-black font-bold rounded-full">
      Enviar
    </button>
    <button className="flex-1 px-6 py-3 border border-white/20 text-white rounded-full">
      Cancelar
    </button>
  </div>
</form>
```

---

## 📍 APLICAR A PÁGINAS

### Admin Home
- Añadir `px-4 sm:px-6 md:px-8` a contenedor
- Cambiar grid stats a `grid-cols-1 sm:grid-cols-2 md:grid-cols-4`
- Buttons full-width en mobile

### Blog
- Cards: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Padding: `px-4 sm:px-6 md:px-8`
- Texto: `text-lg sm:text-xl md:text-2xl`

### Admin Blog
- Panel upload: `px-4 sm:px-6 md:px-8`
- Buttons: `w-full md:w-auto`
- Gap items: `gap-3 md:gap-4`

---

*Guía actualizada: Mayo 5, 2026*
*Usar como referencia para todas las páginas*
