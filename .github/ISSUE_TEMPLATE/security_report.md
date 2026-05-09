---
name: 🔒 Security report (private)
about: Reporta una vulnerabilidad. NO abras issue público para vulnerabilidades reales.
title: "[SECURITY] <resumen sin detalles sensibles>"
labels: security, triage
assignees: ''
---

> ⚠️ **Si es una vulnerabilidad explotable, NO la describas aquí en público.**
> Usa el GitHub Security Advisory privado del repositorio:
> **Settings → Security → Report a vulnerability**
> o contacta directamente al maintainer principal listado en `.github/CODEOWNERS`.
>
> Este template es para reportes de **prácticas inseguras** o **mejoras de hardening**
> que no representan una vulnerabilidad activa.

## Tipo

- [ ] Mejora de hardening (no explotable hoy)
- [ ] Práctica insegura (sin impacto inmediato)
- [ ] Otra (especificar)

## Resumen

<!-- 1-3 líneas, sin payloads ni PII. -->

## Componente afectado

<!-- Archivo / endpoint / módulo. Ej: src/app/api/admin/login/route.ts -->

## Riesgo si se ignora

<!-- Confidencialidad / integridad / disponibilidad. ¿Qué podría pasar? -->

## Mitigación sugerida

<!-- Cambio mínimo recomendado, sin escribir el exploit. -->

## Referencias

<!-- OWASP, CWE, blog posts, etc. -->
