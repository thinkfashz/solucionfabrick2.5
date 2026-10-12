#!/usr/bin/env python3
"""Laya System-1 decision helper (sin generación de texto, una sola pasada).

Uso:
  python scripts/laya-decide.py "texto a decidir"
  python scripts/laya-decide.py "texto" --questions ruta/esquema.json
  python scripts/laya-decide.py "texto" --preset triage
  python scripts/laya-decide.py "texto" --route-only
  echo "texto" | python scripts/laya-decide.py

Salida: JSON con answers (choice/score/noul), routing y latency_ms.
"""
import argparse
import json
import os
import sys
import time

DEFAULT_QUESTIONS = {
    "action_type": {
        "type": "choice",
        "instructions": "Que tipo de accion es esta?",
        "criteria": {
            "refactor": "Cambios de estilo de codigo, optimizaciones, clean code.",
            "bug_fix": "Reparacion de errores logicos, excepciones, crashes.",
            "security": "Fugas de credenciales, vulnerabilidades, sanitizacion de datos.",
            "sys_admin": "Scripts bash, comandos de terminal, configuraciones de entorno.",
            "feature": "Anadir funcionalidad nueva o cambiar comportamiento.",
            "docs": "Documentacion, comentarios, guias, README.",
            "analysis": "Revision, auditoria, analisis o investigacion de fallos/comportamiento.",
            "other": "Todo lo que no encaja en las anteriores.",
        },
    },
    "risk_level": {
        "type": "score",
        "instructions": "Que tan arriesgada es esta accion?",
        "criteria": ["seguro", "revision requerida", "peligro critico/bloqueante"],
    },
    "execute_locally": {
        "type": "noul",
        "instructions": (
            "Puede resolverse localmente con recursos minimos en la CPU de esta maquina "
            "sin enviar el trabajo a un modelo grande en la nube?"
        ),
    },
}


def main() -> int:
    ap = argparse.ArgumentParser(description="Decision Laya en una sola pasada")
    ap.add_argument("text", nargs="?", help="estado/texto a decidir (o stdin)")
    ap.add_argument("--questions", help="ruta a un JSON con el esquema de preguntas")
    ap.add_argument("--preset", choices=["triage", "email", "guard", "moderation", "router", "model_router"])
    ap.add_argument("--model", default="auto", choices=["auto", "english", "multilingual", "typed-decisions"])
    ap.add_argument("--route-only", action="store_true", help="solo elegir checkpoint, sin forward pass")
    ap.add_argument("--pretty", action="store_true", help="JSON indentado")
    args = ap.parse_args()

    text = args.text if args.text is not None else sys.stdin.read()
    text = text.strip()
    if not text:
        print(json.dumps({"error": "empty state"}))
        return 2

    state = {"body": text}
    started = time.time()

    if args.route_only:
        from laya import Router

        questions = json.load(open(args.questions, encoding="utf-8")) if args.questions else DEFAULT_QUESTIONS
        r = Router()
        route = r.route(state, questions)
        out = {"routing": {"model": route.model, "reason": getattr(route, "reason", None)}, "elapsed_ms": round((time.time() - started) * 1000, 1)}
    else:
        import laya

        if args.questions:
            questions = json.load(open(args.questions, encoding="utf-8"))
        elif args.preset:
            questions = getattr(laya, f"{args.preset}_questions")()
        else:
            questions = DEFAULT_QUESTIONS

        if args.model == "auto":
            from laya import Router

            res = Router().predict(state, questions)
        else:
            agent = laya.load("convaiinnovations/laya", subfolder=args.model)
            res = agent.predict(state, questions)
        out = {"answers": res.get("answers"), "routing": res.get("routing"), "usage": res.get("usage"), "elapsed_ms": round((time.time() - started) * 1000, 1)}

    print(json.dumps(out, ensure_ascii=False, indent=2 if args.pretty else None))
    return 0


if __name__ == "__main__":
    sys.exit(main())
