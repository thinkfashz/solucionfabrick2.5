#!/usr/bin/env python3
"""Laya daemon local: mantiene el Router residente para decidir en ~0.5s.

Inicio:
  python scripts/laya-daemon.py            # 127.0.0.1:8765, carga el modelo al arrancar
  python scripts/laya-daemon.py --port 8765 --preload-both

Endpoints (solo localhost):
  GET  /healthz            -> {"ready": true}
  GET  /status             -> versiones, dispositivo, checkpoints cargados
  POST /route              {"state"|"text", "questions"}     -> solo eleccion de checkpoint
  POST /predict            {"state"|"text", "questions", "model"?} -> decision real
  POST /predict            {"text", "preset": "triage"}      -> preset integrado
"""
import argparse
import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

_LOCK = threading.Lock()
_ROUTER = None
_READY = False
_ERROR = None


def _state_from(payload):
    s = payload.get("state")
    if isinstance(s, dict):
        return s
    if isinstance(s, str) and s.strip():
        return {"body": s}
    text = payload.get("text")
    if isinstance(text, str) and text.strip():
        return {"body": text}
    raise ValueError("state (objeto) o text (string) es obligatorio")


def _questions_from(payload):
    if payload.get("questions"):
        return payload["questions"]
    preset = payload.get("preset")
    if preset:
        import laya

        return getattr(laya, f"{preset}_questions")()
    return _DEFAULT_QUESTIONS


_DEFAULT_QUESTIONS = {
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


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        pass

    def _send(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/healthz":
            self._send(200 if _READY else 503, {"ready": _READY, "error": _ERROR})
        elif self.path == "/status":
            import laya

            with _LOCK:
                agents = getattr(_ROUTER, "_agents", None)
                loaded = list(agents.keys()) if isinstance(agents, dict) else []
                devices = {}
                if isinstance(agents, dict):
                    for name, agent in agents.items():
                        cfg = getattr(agent, "cfg", None)
                        devices[name] = str(getattr(agent, "device", None) or (cfg.get("device") if isinstance(cfg, dict) else None))
            self._send(200, {"ready": _READY, "laya": laya.__version__, "device": getattr(_ROUTER, "device", None), "loaded": loaded, "devices": devices})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length") or 0)
            payload = json.loads(self.rfile.read(length) or b"{}")
            if self.path == "/route":
                state = _state_from(payload)
                questions = payload.get("questions") or _DEFAULT_QUESTIONS
                with _LOCK:
                    route = _ROUTER.route(state, questions)
                self._send(200, {"routing": {"model": route.model, "reason": getattr(route, "reason", None)}})
            elif self.path == "/predict":
                state = _state_from(payload)
                questions = _questions_from(payload)
                with _LOCK:
                    t0 = time.time()
                    model = payload.get("model")
                    kwargs = {"model": model} if model and model != "auto" else {}
                    res = _ROUTER.predict(state, questions, **kwargs)
                self._send(200, {"answers": res.get("answers"), "routing": res.get("routing"), "usage": res.get("usage"), "elapsed_ms": round((time.time() - t0) * 1000, 1)})
            else:
                self._send(404, {"error": "not found"})
        except ValueError as exc:
            self._send(422, {"error": str(exc)})
        except Exception as exc:  # noqa: BLE001
            self._send(500, {"error": f"{type(exc).__name__}: {exc}"})


def main() -> int:
    global _ROUTER, _READY, _ERROR
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--preload-both", action="store_true", help="carga english+multilingual al arrancar")
    ap.add_argument("--lazy", action="store_true", help="no cargar pesos al arrancar")
    args = ap.parse_args()

    if not args.lazy:
        try:
            from laya import Router

            t0 = time.time()
            _ROUTER = Router(preload=args.preload_both)
            print(f"[laya-daemon] router listo en {time.time() - t0:.1f}s", flush=True)
        except Exception as exc:  # noqa: BLE001
            _ERROR = f"{type(exc).__name__}: {exc}"
            print(f"[laya-daemon] ERROR al cargar: {_ERROR}", flush=True)

    _READY = _ERROR is None
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"[laya-daemon] sirviendo en http://{args.host}:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
