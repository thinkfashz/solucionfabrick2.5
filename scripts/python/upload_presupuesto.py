#!/usr/bin/env python3
"""
upload_presupuesto.py
─────────────────────
Sube un presupuesto a la tabla `presupuestos` del backend de Soluciones Fabrick
y devuelve el link público generado para enviar al cliente.

Uso (CLI):

    python scripts/python/upload_presupuesto.py \\
        --customer-name "Juan Pérez" \\
        --customer-email "juan@ejemplo.cl" \\
        --customer-phone "+56912345678" \\
        --total 1250000 \\
        --notas "Incluye traslado y mano de obra"

Variables de entorno reconocidas:

    SUPABASE_URL          (o INSFORGE_URL)        URL base del backend.
    SUPABASE_SERVICE_KEY  (o INSFORGE_API_KEY)    Service-role / API key (server-side).
    SITE_URL              (opcional)              Dominio público del sitio. Si se omite
                                                  se usa "https://solucionesfabrick.cl".
    PRESUPUESTO_TTL_DIAS  (opcional, default 5)

Diseñado para PostgREST puro: funciona contra Supabase y contra el backend
InsForge actual (que expone exactamente el mismo dialecto en
`/database/{tabla}`).
"""

from __future__ import annotations

import argparse
import json
import os
import secrets
import sys
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib import error, request

SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"  # sin caracteres ambiguos


def make_slug(length: int = 10) -> str:
    return "".join(secrets.choice(SLUG_ALPHABET) for _ in range(length))


def env(*names: str) -> str | None:
    for n in names:
        v = os.environ.get(n)
        if v and v.strip():
            return v.strip()
    return None


def post(url: str, headers: dict[str, str], body: dict[str, Any]) -> dict[str, Any]:
    data = json.dumps(body).encode("utf-8")
    req = request.Request(url, data=data, headers=headers, method="POST")
    try:
        with request.urlopen(req, timeout=20) as resp:
            payload = resp.read().decode("utf-8")
    except error.HTTPError as e:
        body_txt = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code} desde {url}: {body_txt}") from e
    if not payload:
        return {}
    try:
        return json.loads(payload)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Respuesta no-JSON: {payload[:200]}…") from exc


def upload_presupuesto(
    *,
    customer_name: str,
    customer_email: str | None = None,
    customer_phone: str | None = None,
    total: float = 0.0,
    items: list[dict[str, Any]] | None = None,
    notas: str | None = None,
) -> dict[str, Any]:
    base_url = env("SUPABASE_URL", "INSFORGE_URL", "NEXT_PUBLIC_INSFORGE_URL")
    api_key = env(
        "SUPABASE_SERVICE_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "INSFORGE_API_KEY",
        "NEXT_PUBLIC_INSFORGE_ANON_KEY",
    )
    if not base_url or not api_key:
        raise SystemExit(
            "Faltan credenciales. Define SUPABASE_URL y SUPABASE_SERVICE_KEY "
            "(o INSFORGE_URL e INSFORGE_API_KEY) en el entorno."
        )

    site_url = env("SITE_URL", "NEXT_PUBLIC_SITE_URL") or "https://solucionesfabrick.cl"
    ttl_dias = int(env("PRESUPUESTO_TTL_DIAS") or "5")

    expira_at = (datetime.now(timezone.utc) + timedelta(days=ttl_dias)).isoformat()
    slug = make_slug()

    row = {
        "slug": slug,
        "customer_name": customer_name.strip(),
        "customer_email": (customer_email or "").strip() or None,
        "customer_phone": (customer_phone or "").strip() or None,
        "items": items or [],
        "total": float(total),
        "notas": (notas or "").strip() or None,
        "status": "borrador",
        "sent_via": [],
        "expira_at": expira_at,
    }

    # PostgREST endpoint: tanto Supabase como InsForge exponen `/database/<tabla>`
    # o `/rest/v1/<tabla>`. Probamos primero el formato InsForge (el repo activo).
    base_url = base_url.rstrip("/")
    candidates = [f"{base_url}/database/presupuestos", f"{base_url}/rest/v1/presupuestos"]
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "apikey": api_key,  # requerido por Supabase
        "Prefer": "return=representation",
    }

    last_err: Exception | None = None
    for endpoint in candidates:
        try:
            resp = post(endpoint, headers, row)
        except (RuntimeError, error.URLError, TimeoutError) as exc:
            last_err = exc
            continue
        inserted = resp[0] if isinstance(resp, list) and resp else resp
        link = f"{site_url.rstrip('/')}/p/{slug}"
        return {
            "ok": True,
            "endpoint": endpoint,
            "presupuesto": inserted,
            "link": link,
        }
    raise RuntimeError(f"No se pudo insertar en ninguno de los endpoints: {last_err}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Sube un presupuesto a Supabase / InsForge.")
    parser.add_argument("--customer-name", required=True)
    parser.add_argument("--customer-email")
    parser.add_argument("--customer-phone")
    parser.add_argument("--total", type=float, default=0.0)
    parser.add_argument("--notas")
    parser.add_argument(
        "--items-json",
        help='JSON array de items, ej: \'[{"descripcion":"Pintura","cantidad":10,"precio_unitario":18000}]\'',
    )
    args = parser.parse_args()

    items: list[dict[str, Any]] = []
    if args.items_json:
        try:
            parsed = json.loads(args.items_json)
            if not isinstance(parsed, list):
                raise ValueError("--items-json debe ser un array JSON")
            items = parsed
        except (json.JSONDecodeError, ValueError) as exc:
            print(f"ERROR: --items-json inválido: {exc}", file=sys.stderr)
            return 2

    result = upload_presupuesto(
        customer_name=args.customer_name,
        customer_email=args.customer_email,
        customer_phone=args.customer_phone,
        total=args.total,
        items=items,
        notas=args.notas,
    )

    print(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"\n✅ Link del presupuesto: {result['link']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
