# Decisiones y respuestas con Laya

Regla central: **antes de comprometerte con una decisión de ingeniería, pásala por Laya** y refleja el
resultado en tu respuesta. Laya es un motor System 1 no autoregresivo (solo `choice`/`score`/`noul`),
no un LLM: da etiquetas, puntuaciones y probabilidades calibradas en una sola pasada, sin alucinar.

## Cuándo usarlo

Úsalo cuando la respuesta implique **decidir**:

- Clasificar una tarea, bug, ticket o mensaje de error (`action_type`).
- Evaluar el riesgo de un comando o cambio antes de ejecutarlo (`risk_level`).
- Decidir si algo se resuelve localmente en CPU o conviene mandarlo a un modelo grande (`execute_locally`).
- Guardrails: inyecciones de prompt, contenido tóxico o acciones bloqueables (presets `guard`, `moderation`).
- Triages de soporte (`triage`) o ruteo de modelo (`model_router`).

**No lo uses** para: saludos, preguntas factuales, lectura de archivos, o cuando solo necesitas
explicar algo. Tampoco lo bloques: si no responde en 120 s, continúa sin él y dilo.

## Cómo invocarlo (en este orden)

1. **MCP (si la sesión tiene las tools `laya_*`)**: `laya_predict`, `laya_route`, `laya_preset`, `laya_status`.
2. **Daemon local** (~0.5 s en caliente):

   ```powershell
   Invoke-RestMethod -Uri "http://127.0.0.1:8765/predict" -Method Post `
     -ContentType "application/json" -Body (@{ text = "texto a decidir" } | ConvertTo-Json)
   ```

   Si `http://127.0.0.1:8765/healthz` no responde, arráncalo (primera predicción tarda ~45 s en cargar pesos):

   ```powershell
   Start-Process python -ArgumentList "scripts\laya-daemon.py","--port","8765" `
     -WorkingDirectory <raíz-del-proyecto> -WindowStyle Hidden
   ```

   Endpoints: `POST /predict {text|state, questions?, preset?, model?}`, `POST /route`, `GET /status`.
   `questions` por defecto = esquema `action_type` + `risk_level` + `execute_locally` (el del subagente `@laya`).
3. **CLI en frío** (si no hay daemon): `python scripts/laya-decide.py "texto" [--route-only] [--preset triage] [--questions esquema.json]`.
   `--route-only` tarda ~0.3 s y no descarga pesos; el predict en frío tarda ~45 s.

## Formato de la respuesta

Cuando una respuesta lleve una decisión, encabezala así:

**[Laya Decision Head]**
- 🔹 **Clasificación:** `action_type` (p. ej. `bug_fix`)
- 📊 **Nivel de Riesgo (Score):** `X.XX / 2.0`
- 💻 **Ejecución Local Sugerida:** Sí/No (P = `noul`)
- 🎯 **Confianza:** `answer_confidence` real devuelta por Laya
- 🔀 **Enrutamiento:** checkpoint usado (`english`/`multilingual`/`typed-decisions`)

**[Acción de Enrutamiento]** — recomendación concreta: seguir en local o escalar a `@build`/`@plan`.

## Honestidad de los datos

- Cita **solo** probabilidades que vengan de una llamada real; el `answer_confidence` es la métrica
  fiable para gates (no el campo `confidence`).
- Si no pudiste llamar a Laya, di "clasificación simulada" y no inventes números.
- Los checkpoints base son débiles en zero-shot fuera de su dominio: úsalos para **ordenar y
  descartar**, no como verdad absoluta. Desconfía de `noul` extremos en negaciones.
- `laya_route` no ejecuta inferencia: sirve para justificar el idioma/checkpoint, no para clasificar.

## Fallos conocidos de Laya y cómo mitigarlos

Medidos o confirmados en este entorno (Laya 0.3.20):

- **Temperaturas inválidas en el checkpoint publicado**: aviso
  `choice:11+ = 0.1006 -> clamp 0.5 ... treat confidence as uncalibrated`. La confianza de ese
  tramo no está calibrada: usa `answer_confidence` con cautela y no la tomes como verdad.
- **#131 — `laya-multilingual` nunca elige la primera opción de `score`** (0/290 en su test).
  Nuestro `risk_level` empieza por `"seguro"`: en español/multilingüe ese nivel puede no salir
  nunca. Si en multilingüe el riesgo sale siempre ≥ 1, desconfía y reordena/reescribe la rúbrica.
- **#54 — routing de textos cortos**: un idioma no detectado se trata como inglés; textos cortos
  sin acentos pueden ir al checkpoint equivocado. Pasa `lang` o usa `laya_route` para comprobar.
- **#377 — negaciones**: en peticiones negadas puede elegir la opción contraria con P≈0.9998.
  No uses `noul`/`choice` como único guardia de acciones destructivas.
- **Latencias reales aquí**: frío 28–48 s por checkpoint (carga en CPU; **cada idioma la paga a su
  primer uso**), caliente 1.5 s (multilingüe) – 4.1 s (inglés). `laya_route` 0.05–0.3 s.
- **Zero-shot débil fuera de su dominio**: los checkpoints base están cerca del azar en
  typed-decisions (0.362 vs 0.461 de la mayoría). Sirven para **ordenar**, no para decidir solos.

El esquema por defecto (`action_type` con `analysis` y `other`, `risk_level`, `execute_locally`)
vive en `scripts/laya-daemon.py`, `scripts/laya-decide.py` y `.opencode/agent/laya.md`: si lo
cambies, cámbialo en los tres.

## Verificación

`GET /healthz` → `{"ready": true}`. `GET /status` → versiones y checkpoints residentes.
