# Migración visual admin · Etapa 2 · Operación real

## Fecha
2026-05-17

## Rama

```txt
feature/admin-baseui-interface
```

## Objetivo

Continuar la migración BaseUI/shadcn del admin, atacando módulos operativos sin romper datos reales ni endpoints existentes.

## Páginas de Etapa 2

```txt
/admin/pedidos
/admin/clientes
/admin/inventario
/admin/inventario/scan
/admin/cotizaciones
/admin/presupuestos
/admin/pagos
/admin/entregas
/admin/materiales
/admin/proyectos
/admin/cupones
/admin/reviews
```

## Reglas

- No meter datos demo.
- No simular resultados si existe endpoint real.
- No tocar queries que ya funcionan.
- No reescribir páginas grandes completas si ya están alineadas.
- Corregir solo duplicados, simulaciones o UI claramente vieja.
- Mantener dark mode como base.
- Documentar cada hallazgo.

## Estado inicial

Etapa 1 ya dejó:

- frame oscuro global en `/admin/layout`;
- kit UI reusable `baseui-kit.tsx`;
- `/admin/modulos` migrado;
- `/admin/monitor` con datos reales desde `/api/admin/health`;
- `/admin/configuracion` limpia, sin centro duplicado de integraciones;
- fix aplicado a `baseui-kit.tsx` quitando `'use client'` para evitar error `Functions cannot be passed directly`.

## Pendiente de esta etapa

Revisar cada página operativa y clasificarla como:

```txt
ya alineada
requiere wrapper visual
requiere eliminar datos demo
requiere conectar endpoint real
requiere limpieza de navegación
```
