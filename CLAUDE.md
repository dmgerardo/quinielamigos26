# CLAUDE.md

Este proyecto usa **`AGENTS.md`** como guía técnica principal para hacer cambios.

👉 **Lee [`AGENTS.md`](AGENTS.md) antes de editar.** Contiene la arquitectura, el modelo
de datos, las funciones clave, las convenciones y los errores comunes a evitar.

Resumen mínimo:
- App web estática (HTML + CSS + JavaScript vanilla, sin build) con **Firebase Realtime Database**.
- La lógica principal está en `js/app.js`; la puntuación en `js/scoring.js`; el calendario en `js/tournament-data.js`.
- Las **reglas de seguridad** (`database.rules.json`) se publican **a mano** en Firebase Console; el push no las despliega.
- Identifica a las personas por `playerKey` (no por `auth.uid`). Escapa el HTML dinámico con `esc()`. Guarda horas en **UTC**.
- Para instalar y usar la app, ver [`README.md`](README.md).
