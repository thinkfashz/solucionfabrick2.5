# Registro de lanzamiento SaaS

Este documento funciona como registro operativo para dejar la plataforma lista para vender.

## Estado general

```txt
Producto: Soluciones Fabrick SaaS
Tipo: Plataforma multiempresa para presupuestos, catálogos, tienda, pagos y servicios técnicos
Estado: Pre-lanzamiento seguro
Rama de trabajo: radier-engine-ui
```

## Módulos disponibles

```txt
Admin
Tienda
Productos
Presupuestos públicos
Motores técnicos
Aire acondicionado 3D
Radier 3D
Catálogo Cloudinary
MercadoPago
MercadoPago Lab
Resend
Registro SaaS
Suscripciones
Middleware tenant
Roles admin
Cron de trials
```

## Riesgos críticos antes de vender

| Riesgo | Estado | Acción |
|---|---:|---|
| APIs admin sin tenant_id | Pendiente | Auditar y corregir cada ruta |
| Integraciones globales | Pendiente | Convertir a provider + tenant_id |
| Usuarios admin entre tenants | Pendiente | Filtrar siempre por tenant_id |
| Dominio SaaS final | Pendiente | Definir dominio y wildcard |
| Webhooks productivos | Pendiente | Probar pagos y suscripciones |
| Límites por plan | Pendiente | Enforce en APIs |
| Backups | Pendiente | Definir exportación y respaldo |
| Auditoría de acciones | Pendiente | Registrar cambios sensibles |

## Checklist de salida comercial

```txt
[ ] Migración multi-tenant aplicada en producción.
[ ] Existe tenant principal.
[ ] Registro crea tenant correctamente.
[ ] Suscripción activa tenant.
[ ] Trial vence y suspende si no hay pago.
[ ] Admin solo ve datos de su tenant.
[ ] Productos filtran por tenant.
[ ] Presupuestos filtran por tenant.
[ ] Integraciones filtran por tenant.
[ ] Roles funcionan por tenant.
[ ] Dominio wildcard funcionando.
[ ] Correo de bienvenida funcionando.
[ ] Correo de presupuesto funcionando.
[ ] Pago de cliente final funcionando.
[ ] Webhook de pago funcionando.
[ ] Catálogo Cloudinary funcionando.
[ ] MercadoPago Lab separado del checkout real.
[ ] Pruebas e2e mínimas creadas.
[ ] Manual de instalación revisado.
```

## Plan de venta inicial

Nicho recomendado:

```txt
Instaladores de aire acondicionado
Contratistas de radier
Remodeladores
Maestros de muebles
Negocios técnicos que venden instalación + producto
```

Oferta inicial:

```txt
Presupuestos visuales
Catálogo de proyectos
Pago online
Correo automático
Boleta/resumen
Visor 3D
Landing pública
Subdominio propio
```

## Planes sugeridos

| Plan | Uso | Límite sugerido |
|---|---|---|
| Starter | Independiente pequeño | pocos productos, pocos presupuestos mensuales |
| Pro | Empresa técnica activa | más productos, más presupuestos, pagos y correos |
| Agency | Agencia o multi-sucursal | varios usuarios y configuración avanzada |

## Registro de cambios SaaS

| Fecha | Cambio | Estado |
|---|---|---|
| 2026-06-25 | Manual de instalación SaaS agregado | Hecho |
| 2026-06-25 | Registro de lanzamiento creado | Hecho |
| 2026-06-25 | Auditoría multi-tenant agregada | Hecho |

## Criterio para decir “listo para vender”

La app puede venderse cuando se cumplan estas 5 pruebas:

```txt
1. Dos tenants distintos no pueden ver datos entre sí.
2. Un tenant puede pagar su suscripción y activarse solo.
3. Un tenant puede configurar marca e integraciones.
4. Un cliente final puede recibir presupuesto y pagar.
5. El superadmin puede monitorear uso, pagos, errores y tenants.
```
