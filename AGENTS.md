# AGENTS.md — Guía para modificar este proyecto (humanos e IA)

Este archivo da el contexto necesario para hacer cambios en la **Quiniela Mundial 2026**.
Está escrito para que **Claude o cualquier asistente de IA** (o una persona) pueda
editar el proyecto de forma segura. Léelo completo antes de proponer cambios.

> Documentos hermanos: `README.md` (instalación y uso), `LICENSE` (MIT), `reglas.html`
> (reglas del juego), `historial.html` (changelog visible en la app).

---

## 1. Qué es y con qué está hecho

- App web **estática**: HTML + CSS + **JavaScript vanilla** (sin framework, sin build, sin npm).
- Backend: **Firebase Realtime Database** (SDK "compat" v10, cargado por `<script>` desde CDN en `index.html`), con **Authentication anónima** y, opcionalmente, **App Check (reCAPTCHA v3)**.
- Se despliega en cualquier hosting estático (GitHub Pages / Netlify / Firebase Hosting).
- Idioma de la UI y los textos: **español**.

**No hay paso de compilación.** Editas los archivos y recargas el navegador.

---

## 2. Mapa de archivos

| Archivo | Contenido |
|---|---|
| `index.html` | DOM de las pantallas: auth, app (topbar, vistas Partidos/Ranking/Stats/Admin, nav inferior), modal y toast. Carga los `<script>` con `?v=N`. |
| `css/styles.css` | Todos los estilos. Tema en variables CSS `:root` (`--bg`, `--primary`, `--accent`, `--gold`, `--line`, `--card`, etc.). |
| `js/firebase-config.js` | `firebaseConfig`, init de Firebase, `db`/`auth`, y activación de App Check con `RECAPTCHA_SITE_KEY`. **Credenciales del usuario.** |
| `js/tournament-data.js` | `DEFAULT_GROUPS`, `ROUNDS`, `WC_FIXTURES` (104 partidos), `buildInitialMatches()`, `teamFlag()`, `allTeamNames()`. |
| `js/scoring.js` | `POINTS_RESULT`, `POINTS_EXACT`, `CHAMPION_POINTS`, `outcome()`, `scoreMatch()`, `computeUserScore()`, `getRealChampion()`. |
| `js/app.js` | Todo lo demás: estado, listeners de Firebase, render de vistas, modales, panel admin, reportes, gráfica. **Es el archivo grande.** |
| `database.rules.json` | Reglas de seguridad de Realtime Database. **Se despliegan a mano en Firebase Console** (ver §6). |
| `reglas.html`, `historial.html` | Páginas estáticas enlazadas desde la app (reglas y changelog). |
| `_gen_fixtures.py`, `worldcup-soccer-2026-2.xlsx` | Generador del calendario (opcional). |
| `scripts/bump-version.py`, `.githooks/pre-commit` | Cache-busting automático del `?v=N` (ver §7). |

---

## 3. Modelo de datos (Realtime Database)

```
tournaments/{CODE}/
  name, admin(uid), adminPlayerKey, createdAt
  participants/{playerKey}/ { name, championPick, joinedAt, passwordHash }
  matches/{matchId}/ { id, no, round, group, teamA:{name,flag}, teamB:{name,flag},
                       slotA, slotB, kickoff(ISO UTC), kickoffMs(ms), venue,
                       realA, realB, played, editable, champion? }
  predictions/{matchId}/{playerKey}/ { a, b, at }
publicTournaments/{CODE}/ { name, adminName, createdAt }
```

- `matchId`: `m001`…`m104`. Grupos `m001–m072`; luego dieciseisavos, octavos, cuartos, semis, tercer, final.
- `round` ∈ claves de `ROUNDS`: `grupos, dieciseisavos, octavos, cuartos, semis, tercer, final`.
- Eliminatorias: `teamA/teamB.name = "Por definir"` hasta que el admin los fija; `slotA/slotB` describen el cupo (ej. `"1º Grupo A"`, `"Ganador #74"`).
- `champion` (solo en la final): campeón fijado por el admin, **independiente del marcador**.

---

## 4. Conceptos clave (invariantes que NO debes romper)

- **Identidad estable:** `playerKey = makePlayerKey(nombre, code)` (slug de nombre + código). Es la identidad entre dispositivos. **NO** uses `auth.uid` para identificar personas (el uid anónimo cambia por navegador).
- **Admin:** `isAdmin()` compara `state.data.adminPlayerKey === state.playerKey`. En reglas de Firebase el admin no se puede verificar por playerKey (solo por uid), por eso las reglas de escritura de predicciones **no** dependen del admin (ver §6).
- **Cierre de predicciones:** `isLocked(m)` = `m.played || Date.now() >= lockTime(m)`, con `lockTime = kickoffMs - 15min` (`LOCK_BEFORE_MS`).
- **Campeón real:** `getRealChampion(matches)` prioriza `finalMatch.champion` (fijado por el admin); si no, deriva del marcador de la final (si no es empate). El bonus `CHAMPION_POINTS` se suma en `computeUserScore()`.
- **Fecha límite de campeón:** `CHAMPION_DEADLINE` (solo fecha).
- **Horas en UTC:** `kickoff` es ISO en UTC y `kickoffMs` su timestamp. La UI convierte a hora local con `Intl.DateTimeFormat` (`_DTF`, `_DDF`, `_AUDITF`). Nunca guardes horas en local.
- **Fase por defecto:** al entrar, `currentRoundKey()` fija `state.round` y `state.adminRound` a la fase en curso (por fecha).
- **Captura del admin:** al capturar un pronóstico a nombre de alguien, `adminCaptureSave()` guarda `at = captureRecordedAt(m) = kickoffMs - 16min` (backdated). Esto es lo que permite que pase la regla de escritura aunque el partido esté en curso. No lo cambies a la hora real sin ajustar la regla.

---

## 5. Rendimiento del render (importante)

El listener de Firebase (`enterTournament`) recibe TODO el árbol del torneo en cada cambio.
Para no reconstruir todo:

- **`scheduleRender()`** agrupa ráfagas de snapshots en **un solo render por frame** (`requestAnimationFrame`).
- **Render por vista:** solo se reconstruye la pestaña visible (`renderView(state.view)`); las demás se marcan en `_dirtyViews` y se renderizan al abrirlas (`switchView`).

Si agregas una vista nueva, intégrala en `renderView`, `scheduleRender` y `switchView`.

---

## 6. Reglas de seguridad de Firebase (LEER)

- Las reglas viven en `database.rules.json` **pero se aplican solo al pegarlas y publicarlas en Firebase Console** (Realtime Database → Reglas). Un cambio en el repo **no** las despliega. Si editas las reglas, recuérdale al usuario publicarlas.
- **Escritura de predicciones** (`predictions/$matchId/$pid`): permitida si el partido no está `played` **y** (antes del cierre **o** el `at` escrito es anterior al cierre, `newData.child('at').val() <= kickoffMs - 900000`). Esta condición basada en `at` es lo que deja al admin capturar partidos en curso **desde cualquier dispositivo** (porque backdatea `at`), sin depender de `auth.uid`.
- **`matches`** (resultados/equipos): `.write: auth != null` (la app restringe el acceso por UI, no por reglas).
- Login **anónimo**: el `auth.uid` cambia por navegador; por eso la seguridad "fuerte" no es posible sin migrar a cuentas reales. Es intencional (quiniela entre amigos).

---

## 7. Convenciones de código

- **Escapar SIEMPRE** el contenido dinámico que va al DOM con `esc(...)` (previene XSS). Ya se usa en todo `innerHTML`.
- **Modales:** un solo contenedor `#modal-card`; se llena con `innerHTML`, se abre con `openModal()` y se cierra con `closeModal()`. Los listeners se enganchan después de asignar el HTML.
- **Avisos:** `toast(msg, esError)`.
- **Reportes que se imprimen** (auditoría, puntos, gráfica): se generan en una **ventana nueva** (`window.open`) con su propio `<style>`; no dependen del CSS de la app.
- **Sin dependencias nuevas por CDN** salvo que sea imprescindible (App Check bloquea hosts externos por CSP en algunos entornos; mantén todo self-contained).
- Estilo de nombres y comentarios: en español, como el resto del archivo.

---

## 8. Versionado, ramas y despliegue

- **Cache-busting:** el hook `.githooks/pre-commit` ejecuta `scripts/bump-version.py`, que **incrementa `?v=N`** en `index.html` **solo cuando el commit toca `.css` o `.js`**. Un cambio que solo toca `.html`/`.md`/`.json` **no** sube la versión.
- **Activar el hook** (una vez por clon): `git config core.hooksPath .githooks` (requiere `python`).
- **Historial de versiones:** en cada cambio funcional, agrega una tarjeta `.ver-card` **al principio** de la lista en `historial.html`, con el badge de la versión de assets resultante. Si el cambio fue solo corrección, la tarjeta dice `Mejoras de estabilidad`.
- **Despliegue:** hacer push a la rama publicada (GitHub Pages sirve `main`). GitHub Pages tarda ~1–2 min.
- **Rollback (convención del repo original):** antes de cada commit se etiqueta el HEAD actual como `release-vNN` para poder volver con `git reset --hard release-vNN`.

---

## 9. Cómo probar un cambio localmente

```bash
python -m http.server 8000   # luego abre http://localhost:8000
```

Sin credenciales de Firebase reales verás un error de red de Firebase (normal). Para
verificar lógica sin backend, puedes montar un `state.data` de prueba en la consola del
navegador y llamar a las funciones (así se validaron los reportes). Revisa la consola en
busca de errores de sintaxis tras editar `js/`.

---

## 10. Errores comunes a evitar

- Identificar personas por `auth.uid` en vez de `playerKey`.
- Guardar horas en local en vez de UTC (`kickoff`/`kickoffMs`).
- Olvidar `esc()` al inyectar datos de usuario en HTML.
- Cambiar la hora `at` de la captura del admin sin ajustar la regla de Firebase.
- Editar `database.rules.json` y creer que se despliega con el push (hay que publicarlo a mano).
- No actualizar `historial.html` tras un cambio funcional.
- Romper `scheduleRender`/`renderView`/`switchView` al agregar vistas.
