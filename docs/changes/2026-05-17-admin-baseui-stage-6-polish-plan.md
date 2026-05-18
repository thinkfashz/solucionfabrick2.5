# Migración visual admin · Etapa 6 · Limpieza final y consistencia

## Fecha
2026-05-17

## Rama

```txt
feature/admin-baseui-stage-6-polish
```

## Tipo de PR

PR apilado sobre:

```txt
feature/admin-baseui-stage-5-navigation
```

## Objetivo

Hacer limpieza final antes de la integración total: rutas legacy, enlaces viejos, nombres incoherentes, páginas con mensajes antiguos y consistencia visual general.

## Reglas

- No merge ni deploy automático.
- No tocar lógica sensible si funciona.
- No cambiar endpoints reales.
- No eliminar redirects legacy que evitan 404.
- Mantener `/admin/integraciones` como único centro oficial de credenciales.
- Mantener `/admin/configuracion` solo como negocio + acceso admin.
- Mantener `/admin/seguridad` para passkeys/WebAuthn.
- Documentar cualquier pendiente real.

## Checklist

```txt
1. Buscar referencias viejas a /admin/configuracion como centro de API keys.
2. Buscar referencias a /admin/center y validar que sea redirect legacy.
3. Buscar rutas potencialmente inexistentes en navegación.
4. Revisar textos que digan demo/simulado cuando no corresponda.
5. Revisar páginas placeholder para que no finjan datos reales.
6. Actualizar documentación de memoria.
7. Preparar la etapa final de integración.
```

## Resultado esperado

- Admin más coherente.
- Menos duplicados visuales.
- Menos rutas confusas.
- Memoria lista para etapa final.
