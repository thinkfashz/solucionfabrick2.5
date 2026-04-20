Proyecto: solucionfabrick2.5
Stack: Next.js App Router + Tailwind

PROBLEMA DETECTADO:
El logo y navbar se ven mal. El cambio de 
tema no funciona correctamente.

TAREA 1: Instalar librerías de diseño:
npm install framer-motion next-themes 
lucide-react @radix-ui/react-switch

TAREA 2: Corregir el logo en el navbar.
El logo debe mostrar:
- Símbolo "SF" en dorado #c9a96e
- Texto "SOLUCIONES" normal
- Texto "FABRICK" en dorado bold
- Tamaño correcto en móvil y desktop
- No debe repetirse ni verse distorsionado

TAREA 3: Navbar mejorado con:
- Fondo: negro con blur backdrop 
  bg-black/80 backdrop-blur-md
- Logo a la izquierda corregido
- Links con hover dorado animado
- Botón tema (sol/luna) con animación
- En móvil: hamburger menu con slide 
  desde arriba con framer-motion
- Sticky en scroll con sombra suave

TAREA 4: Sistema de temas con next-themes:
- Tema oscuro: fondo #0a0a0a, texto blanco,
  acento dorado #c9a96e
- Tema claro: fondo #f8f5f0, texto #1a1a1a,
  acento dorado #b8860b
- Al cambiar tema TODAS las letras cambian
  de color correctamente
- Transición suave 300ms en todo el sitio
- Guardar preferencia en localStorage

Actualizar globals.css con variables CSS:
:root {
  --bg: #f8f5f0;
  --text: #1a1a1a;
  --accent: #b8860b;
}
.dark {
  --bg: #0a0a0a;
  --text: #ffffff;
  --accent: #c9a96e;
}

Crea Pull Request:
"fix: Logo + navbar + theme system corrected"
