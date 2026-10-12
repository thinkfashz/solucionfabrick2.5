# Soluciones Fabrick 2.5 — Guía de Diseño y Marca

## 1. Identidad de Marca

### Nombre
**Soluciones Fabrick**

### Tagline
> "Construimos casas · Dios construye hogares"

### Propuesta de valor
Plataforma integral de construcción y remodelación para Chile (Región del Maule). Herramientas técnicas gratuitas + 8 especialidades coordinadas en un solo proyecto. Del terreno a la terminación.

### Tono de comunicación
- **Directo y claro** — "Calcula tu proyecto antes de construir"
- **Técnico pero accesible** — Explica sin jerga excesiva
- **Orientado a la acción** — CTAs claros: "Calcular ahora", "Cotizar proyecto"
- **Confianza** — "Calidad garantizada", "Proyectos planificados", "Asesoría especializada"
- **Educativo** — "Calcula, configura y simula antes de pedir un presupuesto"

---

## 2. Paleta de Colores

### Colores principales (tema oscuro premium)

| Token | Valor | Uso |
|-------|-------|-----|
| `--fabrick-ink` | `#08090A` | Fondo principal |
| `--fabrick-surface` | `#111214` | Superficies / tarjetas |
| `--fabrick-surface-raised` | `#1A1B1F` | Elevación |
| `--fabrick-gold` | `#FFB000` | Acento principal (dorado) |
| `--fabrick-gold-light` | `#FFD05A` | Acento claro |
| `--fabrick-orange` | `#F5871F` | Acento secundario |
| `--fabrick-cream` | `#FFF9EE` | Texto principal |
| `--fabrick-muted` | `#BFB8AC` | Texto secundario |

### Colores de landing (HomePremiumV10)
- Fondo: `#08090A`
- Superficie: `#101113`
- Texto: `#F5F2EC`
- Secundario: `#A8A49C`
- Acento: `#FFE600` (amarillo eléctrico)

### Reglas de uso
- **Dorado** → CTAs, elementos de acción, highlights importantes
- **Crema** → Texto principal sobre fondos oscuros
- **Muted** → Texto secundario, descripciones, metadatos
- **Nunca** usar colores fuera de la paleta sin aprobación

---

## 3. Tipografías

### Display (titulares)
- **Sora** — Títulos principales, hero sections
- **Manrope** — Subtítulos, secciones

### Body (cuerpo de texto)
- **Inter** — Texto general, párrafos, UI
- **Manrope** — Alternativa para body

### Serif (opcional, editorial)
- **Playfair Display** — Citas, testimonios premium
- **Cormorant Garamond** — Alternativa serif elegante

### Monospace (técnico)
- **Space Grotesk** — Datos técnicos, especificaciones, código

### Jerarquía tipográfica
| Elemento | Tamaño | Peso | Línea |
|----------|--------|------|-------|
| H1 (Hero) | 48-64px | Bold (700) | 1.1 |
| H2 (Sección) | 32-40px | SemiBold (600) | 1.2 |
| H3 (Subsección) | 24-28px | Medium (500) | 1.3 |
| Body | 16-18px | Regular (400) | 1.5 |
| Caption | 12-14px | Regular (400) | 1.4 |

---

## 4. Estilos Visuales

### Tema
- **Oscuro por defecto** — Premium, elegante, profesional
- Glassmorphism en tarjetas y navbar
- Glow effects dorados sutiles en hover

### Bordes y radios
- Hairlines sutiles: `rgba(255,255,255,.08)`
- Radios: 16px tarjetas, 999px botones pill
- Sombras: Amarillas sutiles en hover

### Animaciones
- Fade-up (entrada de secciones)
- Stagger (elementos secuenciales)
- Shimmer (loading states)
- Float (elementos decorativos)
- Duración: 300-500ms
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`

### Espaciado
- Secciones: 80-120px vertical
- Componentes: 24-48px
- Elementos: 8-16px
- Grid: 12 columnas, gap 24px

---

## 5. Logo

### Versiones disponibles
| Archivo | Uso |
|---------|-----|
| `soluciones-fabrick.svg` | Logo principal con gradiente |
| `soluciones-fabrick-web.svg` | Versión web |
| `soluciones-fabrick-mobile.svg` | Versión móvil |
| `soluciones-fabrick-mark.svg` | Icono "Pico" (marca estilizada) |
| `soluciones-fabrick-mark-on-light.svg` | Icono para fondo claro |
| `soluciones-fabrick-on-light.svg` | Logo para fondo claro |
| `soluciones-fabrick-transparent.png` | PNG transparente |
| `soluciones-fabrick-social.png/svg` | Para redes sociales |
| `soluciones-fabrick-email.png` | Para emails |

### Reglas de uso
- Mínimo tamaño: 120px width (web), 80px (móvil)
- Espacio claro: 1x altura del logo alrededor
- No rotar, no cambiar colores, no añadir efectos
- En fondos oscuros: versión con gradiente dorado
- En fondos claros: versión `on-light`

---

## 6. Servicios

### 8 Especialidades
1. **Albañilería y obra gruesa** — Muros, pisos, reparaciones, cerámicas
2. **Carpintería y mobiliario** — Puertas, clósets, muebles a medida
3. **Gasfitería y redes sanitarias** — Agua, desagües, filtraciones
4. **Electricidad e iluminación** — Circuitos, tableros, puntos
5. **Fundaciones y obra base** — Terreno, zapatas, radieres
6. **Estructuras Metalcon y ampliaciones** — Perfiles galvanizados, steel frame
7. **Techumbre, filtraciones y protección** — Cubiertas, canaletas, sellos
8. **Terminaciones y renovación interior** — Pintura, pisos, revestimientos

### Herramientas técnicas
- Calculadora BTU (aire acondicionado)
- Calculadora de radier (hormigón)
- Configurador Metalcon (paneles, vanos, refuerzos)
- Simulador sísmico 4D (intensidad, daño, reparación)
- Calculadora de construcción m2 (presupuestos)

---

## 7. Mensajes Clave

| Mensaje | Uso |
|---------|-----|
| "Calcula tu proyecto antes de construir" | Hero, CTA principal |
| "Elige un trabajo, anota tus medidas y compara mano de obra con trabajo vendido" | Subhero, landing |
| "Herramientas para decidir" | Sección herramientas |
| "Una solución clara para cada etapa de tu proyecto" | Sección servicios |
| "Arma las partidas que necesitas y ordénalas en una sola cotización" | Cotizaciones |
| "Del terreno a la terminación" | Propuesta integral |
| "Construimos casas · Dios construye hogares" | Tagline, footer |

---

## 8. CTAs (Llamados a la Acción)

| CTA | Uso | Estilo |
|-----|-----|--------|
| "Calcular ahora" | Herramientas | Botón pill dorado |
| "Cotizar proyecto" | Servicios, contacto | Botón pill dorado |
| "Ver herramientas" | Hero secundario | Botón outline |
| "Solicitar cotización" | Navbar | Botón pill dorado |
| "Ver más" | Cards, blog | Link con flecha |

---

## 9. Recursos

### Imágenes
- Cloudinary: `https://res.cloudinary.com/disghf6xc/image/upload`
- 10+ imágenes de alta calidad (metalcon, bedroom, kitchen, bathroom, terrace, planning, living, house, architecture, foundation)
- Formato: WebP para web, JPG para social

### Texturas
- `/public/textures/crate.gif`
- `/public/textures/grass.jpg`
- `/public/textures/industrial-grain.svg`

### Iconos
- Lucide React (biblioteca principal)
- Iconos de app: `app-icon.svg`, `icon-192.png`, `icon-512.png`

---

## 10. Checklist de Coherencia Visual

- [ ] Colores dentro de la paleta definida
- [ ] Tipografías según jerarquía
- [ ] Espaciado consistente (8px base)
- [ ] Bordes hairline sutiles
- [ ] Radios: 16px tarjetas, 999px botones
- [ ] Animaciones 300-500ms con easing suave
- [ ] Logo sin modificaciones
- [ ] CTAs con estilo consistente
- [ ] Imágenes en formato correcto (WebP/JPG)
- [ ] Tono de comunicación: directo, técnico, orientado a la acción
