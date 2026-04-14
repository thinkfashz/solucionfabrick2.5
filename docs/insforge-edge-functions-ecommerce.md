# Edge Functions de InsForge para un Ecommerce Completo

Este documento propone la lista de Edge Functions para un ecommerce completo sobre InsForge, aterrizada al estado actual del proyecto `fabrick-store`.

Base usada para esta propuesta:
- Ya existe auth con InsForge.
- Ya existe lectura de productos desde InsForge.
- Ya existe realtime para productos.
- Ya existe flujo de checkout, pero hoy no persiste orden ni procesa pago.
- Ya existe flujo de presupuesto, pero hoy no persiste ni notifica.

## Objetivo

Separar la logica sensible y operativa en Edge Functions para que el frontend quede ligero, seguro y facil de mantener.

## Prioridades

- `P0`: indispensable para vender.
- `P1`: indispensable para operar bien.
- `P2`: mejora conversion, automatizacion y control.
- `P3`: expansion, marketing avanzado o B2B profundo.

## 1. Checkout y Ordenes

### `checkout-validate`
- Prioridad: `P0`
- Tipo: HTTP
- Objetivo: validar carrito antes de crear la orden.
- Debe verificar:
  - productos activos
  - stock disponible
  - precios vigentes
  - descuentos vigentes
  - monto minimo si aplica
  - region y reglas de envio
- Entrada:
  - `customer`
  - `items[]`
  - `shippingAddress`
  - `couponCode?`
- Salida:
  - `validatedItems`
  - `subtotal`
  - `discounts`
  - `shipping`
  - `taxes`
  - `total`
  - `warnings[]`

### `checkout-create-order`
- Prioridad: `P0`
- Tipo: HTTP
- Objetivo: crear la orden en estado `pending_payment` o `pending_review`.
- Debe hacer:
  - snapshot de precios
  - snapshot de direccion
  - snapshot de impuestos y envio
  - generar `order_number`
  - guardar `order_items`
  - registrar origen UTM si existe
- Tablas sugeridas:
  - `orders`
  - `order_items`
  - `order_addresses`
  - `order_events`

### `checkout-reserve-stock`
- Prioridad: `P0`
- Tipo: HTTP o interna
- Objetivo: reservar stock por ventana corta para evitar sobreventa.
- Debe hacer:
  - descontar stock reservado
  - crear expiracion de reserva
  - liberar si no se paga
- Requiere:
  - politica transaccional clara
  - cron o funcion de expiracion

### `checkout-confirm-order`
- Prioridad: `P0`
- Tipo: HTTP o llamada interna desde webhook de pago
- Objetivo: mover la orden a `paid` y convertir reserva en venta real.
- Debe hacer:
  - confirmar stock
  - marcar pago validado
  - disparar notificaciones
  - generar flujo de fulfillment

### `checkout-cancel-order`
- Prioridad: `P1`
- Tipo: HTTP
- Objetivo: cancelar orden y revertir reserva o inventario cuando corresponda.

### `orders-get-detail`
- Prioridad: `P1`
- Tipo: HTTP
- Objetivo: devolver detalle consolidado de una orden para cliente o admin.

### `orders-list-customer`
- Prioridad: `P1`
- Tipo: HTTP
- Objetivo: listar historial de compras del cliente autenticado.

## 2. Pagos

### `payments-create-session`
- Prioridad: `P0`
- Tipo: HTTP
- Objetivo: crear sesion de pago con la pasarela elegida.
- Proveedores posibles:
  - Stripe
  - Mercado Pago
  - Flow
  - Khipu
- Debe devolver:
  - `checkoutUrl` o `paymentIntent`
  - `providerPaymentId`

### `payments-webhook`
- Prioridad: `P0`
- Tipo: Webhook
- Objetivo: recibir el evento oficial del proveedor y actualizar estado real.
- Debe validar:
  - firma del webhook
  - idempotencia
  - monto
  - moneda
  - orden asociada

### `payments-reconcile`
- Prioridad: `P1`
- Tipo: Scheduler
- Objetivo: reconciliar pagos inconsistentes o pendientes.
- Casos:
  - pagado en proveedor pero no en DB
  - pago duplicado
  - webhook perdido

### `payments-refund`
- Prioridad: `P1`
- Tipo: HTTP
- Objetivo: ejecutar devoluciones parciales o totales.

### `payments-expire-pending`
- Prioridad: `P1`
- Tipo: Scheduler
- Objetivo: expirar ordenes sin pago y liberar stock.

## 3. Catalogo y Precios

### `catalog-sync-products`
- Prioridad: `P1`
- Tipo: Scheduler o HTTP admin
- Objetivo: sincronizar catalogo desde ERP, CSV, proveedor o panel interno.

### `catalog-sync-prices`
- Prioridad: `P1`
- Tipo: Scheduler
- Objetivo: recalcular o importar precios vigentes.
- Aplica muy bien a tu flujo actual de `sync/prices`.

### `catalog-sync-images`
- Prioridad: `P2`
- Tipo: Scheduler
- Objetivo: enriquecer o reparar imagenes de productos.
- Aplica a tu flujo actual de `sync/images`.

### `catalog-generate-slugs`
- Prioridad: `P2`
- Tipo: HTTP admin o Scheduler
- Objetivo: asegurar slugs limpios, unicos y SEO friendly.

### `catalog-reindex-search`
- Prioridad: `P2`
- Tipo: Scheduler
- Objetivo: reconstruir indices de busqueda y filtros.

### `catalog-publish-product`
- Prioridad: `P1`
- Tipo: HTTP admin
- Objetivo: publicar o despublicar productos con validaciones.

## 4. Inventario

### `inventory-adjust`
- Prioridad: `P1`
- Tipo: HTTP admin
- Objetivo: ajustar stock manualmente con trazabilidad.

### `inventory-sync-external`
- Prioridad: `P1`
- Tipo: Scheduler o Webhook
- Objetivo: sincronizar stock con ERP, bodega o marketplace.

### `inventory-low-stock-alert`
- Prioridad: `P1`
- Tipo: Scheduler
- Objetivo: alertar cuando el stock cae bajo umbral.

### `inventory-release-expired-reservations`
- Prioridad: `P0`
- Tipo: Scheduler
- Objetivo: devolver stock reservado no pagado.

### `inventory-audit-mismatch`
- Prioridad: `P2`
- Tipo: Scheduler
- Objetivo: detectar diferencias entre stock teorico y stock operativo.

## 5. Envio, Logistica y Fulfillment

### `shipping-quote`
- Prioridad: `P0`
- Tipo: HTTP
- Objetivo: calcular envio real por comuna, region, peso, volumen o reglas comerciales.
- Mejora el calculo fijo que hoy existe en checkout.

### `shipping-create-shipment`
- Prioridad: `P1`
- Tipo: HTTP o interna
- Objetivo: crear despacho al confirmar pago.

### `shipping-track-webhook`
- Prioridad: `P1`
- Tipo: Webhook
- Objetivo: recibir eventos del carrier y actualizar tracking.

### `shipping-refresh-status`
- Prioridad: `P1`
- Tipo: Scheduler
- Objetivo: consultar estado de despachos si el operador no envia webhook.

### `shipping-label-generate`
- Prioridad: `P2`
- Tipo: HTTP admin
- Objetivo: generar etiqueta y documentos de envio.

### `fulfillment-pick-pack`
- Prioridad: `P2`
- Tipo: HTTP admin
- Objetivo: mover la orden por estados `picked`, `packed`, `shipped`.

## 6. Clientes y Cuenta

### `customers-upsert-profile`
- Prioridad: `P1`
- Tipo: HTTP
- Objetivo: mantener perfil del cliente separado de auth.

### `customers-save-address`
- Prioridad: `P1`
- Tipo: HTTP
- Objetivo: guardar multiples direcciones.

### `customers-save-company-profile`
- Prioridad: `P2`
- Tipo: HTTP
- Objetivo: soportar clientes empresa con RUT, giro, razon social, aprobaciones.

### `customers-merge-guest-order`
- Prioridad: `P2`
- Tipo: HTTP
- Objetivo: asociar compras guest a usuario cuando crea cuenta.

### `customers-loyalty-balance`
- Prioridad: `P3`
- Tipo: HTTP
- Objetivo: exponer y recalcular puntos, credito o saldo.

## 7. Carrito, Wishlist y Promociones

### `cart-save`
- Prioridad: `P1`
- Tipo: HTTP
- Objetivo: persistir carrito en DB para no depender solo de localStorage.

### `cart-load`
- Prioridad: `P1`
- Tipo: HTTP
- Objetivo: recuperar carrito persistido por usuario o sesion.

### `wishlist-toggle`
- Prioridad: `P2`
- Tipo: HTTP
- Objetivo: guardar favoritos.

### `promotions-validate-coupon`
- Prioridad: `P1`
- Tipo: HTTP
- Objetivo: validar cupon, vigencia, limites y compatibilidad.

### `promotions-apply-rules`
- Prioridad: `P1`
- Tipo: HTTP o interna
- Objetivo: aplicar reglas de pricing, bundles, regalo, escalas y descuentos.

### `promotions-expire-campaigns`
- Prioridad: `P2`
- Tipo: Scheduler
- Objetivo: cerrar campañas vencidas.

## 8. Presupuestos y Ventas Consultivas

### `quotes-create`
- Prioridad: `P0`
- Tipo: HTTP
- Objetivo: reemplazar la logica actual de `/api/presupuesto` para guardar el lead en InsForge.
- Debe guardar:
  - datos del cliente
  - tipo de proyecto
  - rango estimado
  - mensajes o notas
  - canal de origen

### `quotes-notify-sales`
- Prioridad: `P0`
- Tipo: evento o llamada interna
- Objetivo: notificar al equipo comercial por email, webhook o CRM.

### `quotes-assign-owner`
- Prioridad: `P2`
- Tipo: Scheduler o HTTP admin
- Objetivo: asignar ejecutivo por zona, tipo de proyecto o carga.

### `quotes-convert-to-order`
- Prioridad: `P2`
- Tipo: HTTP admin
- Objetivo: convertir un presupuesto aprobado en orden o draft order.

### `quotes-followup-reminder`
- Prioridad: `P2`
- Tipo: Scheduler
- Objetivo: recordar presupuestos sin respuesta.

## 9. Notificaciones

### `notifications-order-confirmation`
- Prioridad: `P0`
- Tipo: evento
- Objetivo: enviar confirmacion al cliente al pagar.

### `notifications-payment-failed`
- Prioridad: `P1`
- Tipo: evento
- Objetivo: avisar intento fallido y reactivar conversion.

### `notifications-shipping-update`
- Prioridad: `P1`
- Tipo: evento
- Objetivo: avisar cambios de estado logístico.

### `notifications-quote-received`
- Prioridad: `P0`
- Tipo: evento
- Objetivo: confirmar al cliente que su presupuesto fue recibido.

### `notifications-admin-alert`
- Prioridad: `P1`
- Tipo: evento o Scheduler
- Objetivo: alertar incidentes operativos, bajo stock, pagos inconsistentes o fallas de sync.

## 10. SEO, Contenido y Growth

### `seo-generate-product-metadata`
- Prioridad: `P2`
- Tipo: Scheduler o HTTP admin
- Objetivo: generar title, meta description, schema y Open Graph por producto.

### `seo-build-sitemap`
- Prioridad: `P2`
- Tipo: Scheduler
- Objetivo: construir sitemap dinamico de productos, categorias y landings.

### `seo-revalidate-pages`
- Prioridad: `P1`
- Tipo: evento
- Objetivo: invalidar cache o regenerar paginas cuando cambian productos o precios.

### `growth-track-server-events`
- Prioridad: `P2`
- Tipo: HTTP
- Objetivo: registrar eventos server-side para analytics y atribucion.

### `growth-abandoned-cart`
- Prioridad: `P2`
- Tipo: Scheduler
- Objetivo: detectar carritos abandonados y disparar recuperación.

## 11. Seguridad, Riesgo y Cumplimiento

### `security-rate-limit-checkout`
- Prioridad: `P1`
- Tipo: HTTP middleware-like
- Objetivo: proteger checkout, login, presupuesto y cupones.

### `security-fraud-score`
- Prioridad: `P2`
- Tipo: HTTP o interna
- Objetivo: puntuar riesgo de la orden.
- Senales utiles:
  - IP
  - region vs direccion
  - multiples intentos
  - monto alto
  - email desechable

### `security-webhook-signature-verify`
- Prioridad: `P0`
- Tipo: utilidad compartida
- Objetivo: validar firmas de pagos, carriers y ERPs.

### `security-audit-log-writer`
- Prioridad: `P1`
- Tipo: utilidad compartida
- Objetivo: registrar acciones sensibles con trazabilidad.

## 12. Admin, Backoffice y Operacion

### `admin-dashboard-summary`
- Prioridad: `P2`
- Tipo: HTTP
- Objetivo: devolver KPIs consolidados para panel interno.

### `admin-export-orders`
- Prioridad: `P2`
- Tipo: HTTP admin
- Objetivo: exportar ventas y ordenes a CSV o Excel.

### `admin-bulk-update-products`
- Prioridad: `P2`
- Tipo: HTTP admin
- Objetivo: cambios masivos de stock, precio, categorias o estado.

### `admin-retry-failed-jobs`
- Prioridad: `P2`
- Tipo: HTTP admin
- Objetivo: reintentar sincronizaciones o webhooks fallidos.

## 13. B2B y Funciones Avanzadas

### `b2b-customer-tier-pricing`
- Prioridad: `P3`
- Tipo: HTTP
- Objetivo: aplicar listas de precio por tipo de cliente.

### `b2b-volume-pricing`
- Prioridad: `P3`
- Tipo: HTTP
- Objetivo: aplicar descuentos escalonados por cantidad.

### `b2b-credit-approval`
- Prioridad: `P3`
- Tipo: HTTP admin
- Objetivo: aprobar compras con credito o pago diferido.

### `b2b-purchase-order-ingest`
- Prioridad: `P3`
- Tipo: HTTP o email parser webhook
- Objetivo: recibir ordenes de compra empresariales.

### `b2b-erp-sync`
- Prioridad: `P3`
- Tipo: Scheduler o Webhook
- Objetivo: integrar ventas, clientes e inventario con ERP.

## 14. Funciones Transversales Recomendadas

Estas no siempre son endpoints expuestos, pero conviene pensarlas como piezas compartidas:

### `shared-idempotency-guard`
- Objetivo: evitar procesamiento duplicado.

### `shared-money-calculator`
- Objetivo: centralizar subtotal, IVA, descuentos y redondeos.

### `shared-order-number-generator`
- Objetivo: generar folios consistentes.

### `shared-region-normalizer`
- Objetivo: normalizar comunas, regiones y codigos postales.

### `shared-storage-signed-upload`
- Objetivo: permitir carga segura de comprobantes, adjuntos o imagenes.

## MVP recomendado para este proyecto

Si quieres salir rapido sin sobreconstruir, el primer bloque deberia ser este:

1. `checkout-validate`
2. `checkout-create-order`
3. `payments-create-session`
4. `payments-webhook`
5. `inventory-release-expired-reservations`
6. `shipping-quote`
7. `quotes-create`
8. `quotes-notify-sales`
9. `notifications-order-confirmation`
10. `seo-revalidate-pages`

## Segundo bloque recomendado

1. `cart-save`
2. `cart-load`
3. `promotions-validate-coupon`
4. `inventory-low-stock-alert`
5. `shipping-track-webhook`
6. `payments-reconcile`
7. `admin-dashboard-summary`

## Tablas sugeridas en InsForge para soportar estas funciones

- `products`
- `product_variants`
- `product_prices`
- `product_images`
- `inventory_movements`
- `customers`
- `customer_addresses`
- `carts`
- `cart_items`
- `orders`
- `order_items`
- `order_addresses`
- `order_payments`
- `order_shipments`
- `order_events`
- `coupons`
- `promotions`
- `quotes`
- `quote_events`
- `notifications`
- `webhook_logs`
- `job_runs`
- `audit_logs`

## Mapeo directo con lo que hoy ya existe

- `/api/checkout` debe migrar hacia:
  - `checkout-validate`
  - `checkout-create-order`
  - `payments-create-session`

- `/api/presupuesto` debe migrar hacia:
  - `quotes-create`
  - `quotes-notify-sales`

- `/api/sync/prices` puede evolucionar a:
  - `catalog-sync-prices`

- `/api/sync/images` puede evolucionar a:
  - `catalog-sync-images`

- `/api/sync` puede convertirse en:
  - `catalog-sync-orchestrator`
  - o mantenerse como orquestador HTTP que invoque funciones internas

## Recomendacion final

Para este proyecto, no arrancaria con 40 funciones en produccion. Arrancaria con un nucleo de 10 a 12 Edge Functions y las agruparia en estos modulos:

- `checkout`
- `payments`
- `inventory`
- `shipping`
- `quotes`
- `notifications`
- `catalog`

Si quieres, el siguiente paso util es que te deje esto en formato de backlog tecnico con:
- nombre final de cada funcion
- endpoint sugerido
- payload de entrada
- respuesta esperada
- tablas InsForge necesarias
- prioridad de implementacion por sprint