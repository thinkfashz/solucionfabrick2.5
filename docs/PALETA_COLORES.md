# 🎨 PALETA DE COLORES - SOLUCIONES FABRICK

## Sistema de Colores Consistente

### Colores Primarios

```
Amarillo (Accent):
- Principal:       #FACC15 (yellow-400)
- Claro:           #FDE047 (yellow-300)
- Oscuro:          #CA8A04 (yellow-700)
- Fondo tint:      rgba(250, 204, 21, 0.08-0.15)

Negro (Fondo):
- Primario:        #000000 (black)
- Secundario:      #18181B (zinc-950)
- Terciario:       #27272A (zinc-900)

Blanco (Texto):
- Primario:        #FFFFFF (white)
- Secundario:      #F4F4F5 (zinc-100)
```

### Paleta Neutral

```
Zinc (Escala neutra):
- 950 (Oscuro):    #18181B  ← Fondos
- 900:             #27272A
- 800:             #3F3F46
- 700:             #52525B  ← Bordes
- 600:             #71717A
- 500:             #A1A1AA  ← Texto deshabilitado
- 400:             #D4D4D8  ← Texto secundario
- 300:             #E4E4E7  ← Bordes claros
- 200:             #F4F4F5
- 100:             #FAFAFA  ← Fondo claro
```

---

## Reglas de Uso

### Para Fondos

```tsx
// Fondos principales
bg-black                    // Fondos más oscuros (hero, secciones)
bg-zinc-950                 // Fondos de tarjetas/modales
bg-zinc-900/50              // Fondos con transparencia
bg-yellow-400/[0.08]        // Fondos tint (hover suave)
```

### Para Bordes

```tsx
// Bordes
border-white/10             // Bordes sutiles en oscuro
border-white/15             // Bordes normales
border-yellow-400/30        // Bordes accent destacados
border-yellow-400/50        // Bordes accent fuertes

// Hover
hover:border-yellow-400/50  // Al hacer hover
```

### Para Texto

```tsx
// Texto principal
text-white                  // Títulos, texto importante
text-zinc-300               // Texto normal
text-zinc-400               // Texto secundario
text-zinc-500               // Texto deshabilitado

// Accent
text-yellow-400             // Destacados, CTAs
text-yellow-300             // Hover states
```

### Para Buttons

```tsx
// Primary CTA (Amarillo)
bg-yellow-400 text-black
hover:bg-yellow-300
shadow-[0_0_36px_rgba(250,204,21,0.45)]

// Secondary (Outline)
border border-white/15 text-zinc-200
hover:border-yellow-400/50 hover:text-yellow-400

// Tertiary (Ghost)
bg-yellow-400/10 border border-yellow-400/30
hover:bg-yellow-400 hover:text-black
```

---

## Sombras Consistentes

```tsx
shadow-[0_2px_8px_rgba(0,0,0,0.35)]      // Sombra suave (cards)
shadow-[0_4px_12px_rgba(250,204,21,0.4)]  // Sombra amarilla (hover)
shadow-[0_10px_30px_rgba(250,204,21,0.3)] // Sombra grande (botones)
shadow-[0_30px_80px_rgba(0,0,0,0.5)]     // Sombra muy profunda (modales)
```

---

## Animaciones y Transiciones

```tsx
// Duración estándar
duration-200 / duration-300 / duration-500 / duration-700

// Ease
ease-out / [0.22, 1, 0.36, 1] (custom cubic-bezier)

// Ejemplos
transition-all duration-300 ease-out
transition-transform duration-300 group-hover:translate-x-1
transition-shadow duration-300 group-hover:shadow-yellow-lg
```

---

## Uso en Componentes

### Hero Section

```tsx
{/* Fondo base */}
className="bg-zinc-950"

{/* Overlay gradiente */}
className="bg-gradient-to-r from-zinc-950 via-zinc-950/92 to-zinc-950/40"

{/* Título destacado */}
className="text-yellow-400"  // Última línea

{/* Accent line */}
className="bg-gradient-to-r from-yellow-400/60 via-yellow-400/20 to-transparent"

{/* Badge */}
className="border border-yellow-400/25 bg-yellow-400/[0.08] text-yellow-400"
```

### Cards

```tsx
{/* Contenedor */}
className="rounded-2xl border border-white/5 bg-zinc-950/80 hover:border-yellow-400/30"

{/* Hover effect */}
className="transition hover:shadow-[0_30px_80px_rgba(0,0,0,0.5)]"

{/* Texto en card */}
className="text-sm text-zinc-300"
```

### Buttons

```tsx
{/* Primary (Amarillo) */}
className="bg-yellow-400 text-black hover:bg-yellow-300"

{/* Secondary (Outline) */}
className="border border-white/15 text-zinc-200 hover:border-yellow-400/50 hover:text-yellow-400"

{/* Icono */}
className="text-yellow-400/80"  // Más tenue
```

---

## Temas Dark/Light

### Dark (Predeterminado)

```
Fondo:    black / zinc-950
Texto:    white / zinc-300
Accent:   yellow-400
Bordes:   white/10 → yellow-400/30
```

### Light (Opcional)

```
Fondo:    white / zinc-100
Texto:    black / zinc-700
Accent:   yellow-500 (más oscuro que en dark)
Bordes:   black/10 → yellow-500/30
```

---

## Consistencia Garantizada

✅ **DO:**
- Usa clases de Tailwind de la paleta definida
- Mantén yellow-400 como único accent principal
- Usa opacity variants (/10, /20, /30, etc.)
- Respeta las duraciones de transición (200-300ms)

❌ **DON'T:**
- No uses colores arbitrarios (no `text-[#FF0000]`)
- No mezcles amarillo con otros accent colors
- No uses text-gray en lugar de text-zinc
- No crees sombras personalizadas sin documentar

---

## Recursos

- **Tailwind Docs**: https://tailwindcss.com/docs/colors
- **Tailwind Config**: `tailwind.config.js`
- **CSS Custom Properties**: `src/app/globals.css`

---

*Última actualización: Mayo 5, 2026*
*Versión: 2.0 - Consistencia completa*
