# Manual de instalación SaaS

Este manual define cómo instalar y vender Soluciones Fabrick como plataforma SaaS multiempresa.

## 1. Idea principal

No se debe duplicar el repositorio por cliente. La app debe funcionar como una sola plataforma con múltiples empresas.

```txt
Una app
Una base de datos
Una empresa = un tenant
Cada registro importante usa tenant_id
Cada empresa configura su logo, colores, pagos, correo e imágenes
```

## 2. Requisitos

```txt
Node.js 22+
pnpm 10+
Vercel
Base de datos InsForge
Dominio propio
Proveedor de correo
Proveedor de pagos
Proveedor de imágenes
```

## 3. Instalación local

```bash
pnpm install
pnpm dev
```

Validación:

```bash
pnpm typecheck
pnpm test
pnpm build
```

## 4. Variables de entorno

Crear las variables necesarias en local y en Vercel. No escribir valores reales dentro del repositorio.

Categorías necesarias:

```txt
App y dominio
Sesión admin
Base de datos
Cifrado de integraciones
Pagos
Correos
Imágenes
Cron jobs
```

## 5. Base de datos

Ejecutar primero:

```txt
scripts/add-multitenancy.sql
```

Luego ejecutar:

```txt
scripts/saas-tenant-hardening.sql
```

El primer archivo crea la estructura SaaS base. El segundo agrega constraints e índices para evitar colisiones entre empresas y permitir operaciones seguras por tenant.

Validar que existan:

```txt
platform_plans
tenants
platform_subscriptions
platform_payment_log
```

Validar que las tablas operativas tengan:

```txt
tenant_id
```

Validar constraints clave:

```txt
integrations: provider + tenant_id
admin_users: email + tenant_id
presupuestos: id + tenant_id
presupuestos: slug + tenant_id
orders: id + tenant_id indexado
```

## 6. Dominio

Configurar:

```txt
Dominio principal
www
Wildcard para subdominios de clientes
```

Ejemplo:

```txt
cliente1.tudominio.com
cliente2.tudominio.com
```

## 7. Registro SaaS

Ruta esperada:

```txt
/registro
```

Flujo esperado:

```txt
Elegir plan
Crear empresa
Elegir slug
Crear tenant
Pagar suscripción
Activar tenant por webhook
Enviar correo de bienvenida
Entrar al panel
```

## 8. Seguridad mínima

Antes de vender:

```txt
[ ] Todas las APIs admin filtran por tenant_id.
[ ] Las integraciones se guardan por tenant.
[ ] Los usuarios admin pertenecen a un tenant.
[ ] Los productos pertenecen a un tenant.
[ ] Los presupuestos pertenecen a un tenant.
[ ] Las órdenes pertenecen a un tenant.
[ ] Los pagos pertenecen a un tenant.
[ ] Los logs pertenecen a un tenant.
[ ] El superadmin usa 2FA.
[ ] Las claves privadas nunca llegan al frontend.
```

## 9. Prueba final

```txt
Crear tenant A
Crear tenant B
Crear producto en A
Crear producto en B
Verificar que A no ve B
Verificar que B no ve A
Crear presupuesto
Enviar correo
Generar pago
Recibir webhook
```

## 10. Comando de auditoría

```bash
pnpm audit:tenant
```
