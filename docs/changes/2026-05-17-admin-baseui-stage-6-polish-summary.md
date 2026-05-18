# Etapa 6 · Limpieza final y consistencia

## Rama

`feature/admin-baseui-stage-6-polish`

## PR

`#192 · feat: admin BaseUI stage 6 polish`

## Objetivo

Evitar duplicación futura de módulos del admin, especialmente credenciales e integraciones.

## Cambio aplicado

Se creó:

`docs/admin-navigation-canonical.md`

## Regla canónica

```txt
/admin/integraciones = único centro oficial de credenciales y API keys
/admin/configuracion = datos del negocio + acceso admin
/admin/seguridad = passkeys y WebAuthn
/admin/modulos = mapa modular del admin
/admin/center = redirect legacy hacia /admin/integraciones
```

## Pendiente final

Crear una rama final de integración, unir los PR apilados y abrir un solo PR limpio hacia `main`.

No merge. No deploy. No tocar main.
