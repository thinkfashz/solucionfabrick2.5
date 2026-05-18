# Migración visual admin · Etapa 3 · Contenido, marketing e IA

## Fecha
2026-05-17

## Rama

```txt
feature/admin-baseui-interface
```

## Objetivo

Continuar la migración BaseUI/dark en módulos de contenido, marketing e IA manteniendo datos reales y evitando pantallas demo.

## Páginas de Etapa 3

```txt
/admin/home
/admin/editor
/admin/tienda
/admin/blog
/admin/medios
/admin/asistente-ia
/admin/publicidad
/admin/publicidad/coach
/admin/publicar
/admin/newsletter
/admin/inteligencia-mercado
/admin/social
```

## Reglas

- No mostrar datos inventados como reales.
- Si un módulo está pendiente, marcarlo como pendiente real.
- No simular publicaciones ni campañas.
- No tocar endpoints funcionales sin necesidad.
- Mantener diseño oscuro minimalista.
- Documentar hallazgos y cambios.

## Estado heredado

Etapa 1 y 2 ya dejaron:

- frame oscuro global;
- BaseUI kit;
- corrección de monitor real;
- configuración sin integraciones duplicadas;
- operación real revisada;
- `/admin/proyectos` restaurado tras error `Unexpected eof`.

## Pendiente de esta etapa

Clasificar cada ruta como:

```txt
real y alineada
requiere UI BaseUI
requiere eliminar demo/seed
requiere conexión real
pendiente explícito
```
