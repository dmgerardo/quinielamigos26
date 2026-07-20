# ⚽ Quiniela Mundial 2026

Aplicación web para armar una quiniela del torneo de fútbol 2026 con tus amigos: predicciones de marcador, ranking en tiempo real y estadísticas — todo sincronizado al instante con **Firebase Realtime Database**. Funciona en el celular y en la computadora, sin instalar nada para los jugadores (solo abren un enlace).

> Proyecto personal sin fines comerciales y **sin afiliación, patrocinio ni licencia de la FIFA** ni de ningún organismo oficial. Los nombres de selecciones y banderas son de uso meramente informativo.

![mobile-first](https://img.shields.io/badge/mobile--first-iPhone%20%2B%20Android-ff3d71) ![firebase](https://img.shields.io/badge/Firebase-Realtime%20DB-ffca28) ![vanilla](https://img.shields.io/badge/JavaScript-vanilla-f7df1e) ![license](https://img.shields.io/badge/licencia-MIT-blue)

---

## 🧭 ¿Qué es esto y cómo funciona?

- **Tú** (o quien instale la app) creas una quiniela y quedas como **administrador**.
- Tus **amigos** entran con un **código de 6 letras** o un enlace, ponen su nombre y una contraseña, y hacen sus predicciones.
- Conforme se juegan los partidos, **el administrador captura los resultados** y el **ranking se actualiza solo** para todos, en vivo.
- Es una página web "estática" (HTML + CSS + JavaScript). Toda la sincronización la hace **Firebase** (un servicio gratuito de Google). **No necesitas saber programar** para ponerla a andar: solo seguir los pasos de instalación.

---

## ⚠️ Antes de empezar: crea TU PROPIO Firebase (importante)

Si vas a compartir o desplegar esta app, **crea tu propio proyecto de Firebase gratuito** y usa **tus propias credenciales** (paso 2 más abajo). Así:

- Tus datos y los de tus amigos quedan en **tu** base de datos, no en la de otra persona.
- No dependes de que un proyecto ajeno siga activo.

El plan gratuito de Firebase ("Spark") es más que suficiente para una quiniela entre amigos. Las credenciales de Firebase para web **no son secretas** (van dentro de la página), la seguridad se maneja con las *reglas* y con *App Check* (pasos 4 y 5).

---

## ✨ Funcionalidades

- **Crear / unirse** a una quiniela con un código de 6 caracteres o un enlace compartible.
- **Cuenta con nombre + contraseña** (identidad estable entre dispositivos; la contraseña se guarda cifrada, nunca en texto plano).
- **Formato real del Mundial 2026 de 48 equipos**: 12 grupos × 4 (72 partidos) + eliminatorias (16avos, octavos, cuartos, semifinales, 3er lugar y final) = **104 partidos**.
- **Predicciones** de marcador exacto, con botones + / −.
- **Cierre anti-trampa**: cada partido se bloquea **15 minutos antes** de su inicio.
- **Campeón del mundo**: cada quien elige su campeón antes de la fecha límite para un **bonus de +15 pts**. El administrador define el campeón real **independiente del marcador** (por si la final se define a 90 min / penales).
- **Ranking en tiempo real** y **estadísticas** individuales.
- **Reportes** para el administrador: participantes, **puntos por partido** (ganados y acumulados) con **gráfica de tendencias**, y **reporte de auditoría imprimible**.
- **Vista por fecha/fase**: la app abre automáticamente en la fase que se está jugando; oculta por defecto los partidos de otros días.
- **Historial de versiones** (`historial.html`) y **reglas** (`reglas.html`) accesibles desde la app.
- **Diseño mobile-first** para iPhone y Android (se puede "instalar" como app en la pantalla de inicio).

---

## 🏆 Sistema de puntuación

**1) Aciertos por partido** (máximo 4 pts):

| Si aciertas… | Puntos |
|---|---|
| El resultado (gana A / gana B / empate) | **+3** |
| Además el marcador exacto de ambos equipos | **+1** |

**2) Campeón del mundo:** **+15 pts** si tu campeón gana el torneo.

> Los puntos son configurables en `js/scoring.js` (`POINTS_RESULT`, `POINTS_EXACT`, `CHAMPION_POINTS`).

---

## 🚀 Instalación paso a paso (para principiantes)

Necesitas: una **cuenta de Google** (para Firebase) y, si quieres publicarla en internet, una **cuenta de GitHub** (gratis). Tiempo: ~10–15 minutos.

### Paso 1 — Consigue el código
- **Opción fácil:** en la página de GitHub del proyecto, botón verde **Code → Download ZIP**, y descomprímelo.
- **Opción con git:** `git clone <URL-del-repo>`

### Paso 2 — Crea el proyecto en Firebase
1. Entra a [console.firebase.google.com](https://console.firebase.google.com) → **Agregar proyecto** (ponle el nombre que quieras).
2. Puedes desactivar Google Analytics (no se usa).

### Paso 3 — Activa la base de datos en tiempo real
1. Menú lateral → **Realtime Database** → **Crear base de datos**.
2. Elige la región más cercana y el modo **bloqueado** (las reglas correctas las pones en el Paso 5).

### Paso 4 — Activa el inicio de sesión anónimo
- Menú lateral → **Authentication** → **Sign-in method** → **Anónimo** → **Habilitar**.

### Paso 5 — Pega tus credenciales y las reglas
1. **⚙️ Configuración del proyecto → Tus apps → Web (`</>`)** → registra una app web y **copia el objeto `firebaseConfig`**.
2. Pega esos valores en **`js/firebase-config.js`** (reemplaza el `firebaseConfig` de ejemplo por el tuyo).
3. En **Realtime Database → Reglas**, borra lo que haya, **pega TODO el contenido de `database.rules.json`** y pulsa **Publicar**.
   > 🔑 Las reglas viven en Firebase, **no** en el código. Cada vez que cambies `database.rules.json` debes **volver a pegarlas y publicarlas** en la consola de Firebase.

### Paso 6 — (Opcional pero recomendado) App Check con reCAPTCHA
Protege tu base de datos contra abuso desde fuera de tu app:
1. Crea una clave **reCAPTCHA v3** en [google.com/recaptcha/admin](https://www.google.com/recaptcha/admin/create) para tu dominio (por ejemplo `tu-usuario.github.io`).
2. Pega la *Site key* en `js/firebase-config.js` (`RECAPTCHA_SITE_KEY`).
3. En Firebase → **App Check** → registra la app con esa misma clave (empieza en modo *Monitor*, luego *Enforce*).
   > Si no quieres usar App Check, pon `RECAPTCHA_SITE_KEY = "TU_RECAPTCHA_SITE_KEY_AQUI"` y quedará desactivado.

### Paso 7 — Ábrela o publícala
- **Para probar en tu compu:** desde la carpeta del proyecto:
  ```bash
  python -m http.server 8000
  ```
  y abre `http://localhost:8000`.
- **Para compartir por internet (gratis) con GitHub Pages:**
  1. Sube el proyecto a un repositorio de GitHub.
  2. En el repo: **Settings → Pages → Source: `main` / carpeta `/root`** → Save.
  3. En 1–2 minutos tu quiniela estará en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.
  - Alternativas igual de fáciles: **Netlify** (arrastrar la carpeta) o **Firebase Hosting**.

¡Listo! Comparte el enlace y el **código** de tu quiniela con tus amigos.

---

## 📱 Cómo se usa

1. **Administrador:** abre la app → escribe tu nombre y contraseña → pestaña **Crear quiniela** → comparte el **#CÓDIGO** (botón en la barra superior) o el enlace.
2. **Amigos:** abren el enlace o entran con su nombre + contraseña + el código en **Unirme a quiniela**.
3. Todos predicen en **Partidos** y eligen su **campeón** (pestaña **Ranking → "Elegir ahora"**) antes de la fecha límite.
4. Durante el torneo, el administrador entra a **Admin**, captura el marcador real de cada partido (botones + / −) y guarda. Todo se recalcula **solo, para todos**.
5. En **eliminatorias**, el administrador usa **Editar equipos** para fijar a los clasificados, y en la **final** define al **campeón** con el botón **🏆 Definir campeón** (independiente del marcador).

> ⚠️ Cada partido se **cierra 15 min antes** de empezar: a partir de ahí ya nadie puede crear/editar su predicción.

---

## 🗂️ Estructura de datos (Realtime Database)

```
tournaments/
  {CODE}/
    name:            "Quiniela de la oficina"
    admin:           "<uid anónimo del creador>"
    adminPlayerKey:  "<identidad estable del admin: nombre+código>"
    createdAt:       <timestamp>
    participants/
      {playerKey}/ { name, championPick, joinedAt, passwordHash }
    matches/
      {matchId}/ { id, round, group, teamA:{name,flag}, teamB:{name,flag},
                   slotA, slotB, kickoff, kickoffMs, venue,
                   realA, realB, played, editable, champion? }
    predictions/
      {matchId}/
        {playerKey}/ { a, b, at }
publicTournaments/
  {CODE}/ { name, adminName, createdAt }   # índice para la lista pública
```

## 🔐 Reglas de seguridad (resumen)

- **Lectura:** cualquier usuario autenticado del torneo (el ranking es visible dentro de la quiniela).
- **Predicciones:** se pueden guardar **hasta el cierre** (15 min antes). El administrador puede capturar a nombre de alguien incluso con el partido en curso, porque esas capturas se registran con hora *previa al cierre*.
- **Resultados y equipos (`matches`):** los administra el creador desde el panel **Admin**.
- **Participante:** cada quien edita solo su propio nodo (nombre, campeón, contraseña).

> Nota técnica: por usar login anónimo (sin correo), la seguridad es la adecuada para una quiniela entre amigos, no para datos sensibles. Los detalles están en `AGENTS.md`.

---

## 🧩 Archivos del proyecto

| Archivo | Qué hace |
|---|---|
| `index.html` | Estructura y pantallas de la app |
| `css/styles.css` | Estilos mobile-first (tema en variables `:root`) |
| `js/firebase-config.js` | **Tus credenciales de Firebase** (editar) |
| `js/tournament-data.js` | Equipos, grupos y el calendario (104 partidos) |
| `js/scoring.js` | Reglas de puntuación |
| `js/app.js` | Lógica de la app + sincronización en tiempo real |
| `database.rules.json` | Reglas de seguridad (pegar en Firebase) |
| `reglas.html` | Reglas del juego para los participantes |
| `historial.html` | Historial de versiones (changelog) |
| `LICENSE` | Licencia MIT + avisos |
| `AGENTS.md` | Guía técnica para editar el proyecto (humanos o IA) |

---

## ⚙️ Personalización rápida

- **Equipos/grupos:** edita `DEFAULT_GROUPS` en `js/tournament-data.js`.
- **Calendario:** los 104 partidos se generan desde `worldcup-soccer-2026-2.xlsx` con `python _gen_fixtures.py`. Cada partido se guarda como **instante en UTC** y la app lo muestra en la **hora local** de cada quien.
- **Puntos:** `POINTS_RESULT`, `POINTS_EXACT`, `CHAMPION_POINTS` en `js/scoring.js`.
- **Colores/tema:** variables CSS en `:root` dentro de `css/styles.css`.

---

## 🔄 Versionado automático (para que los cambios lleguen a todos)

Los navegadores cachean los `.css`/`.js`. Para forzar la recarga tras cada despliegue, los assets se cargan con `?v=N`, y ese número **sube solo** en cada commit que toque CSS o JS gracias a un hook de git:

- `scripts/bump-version.py` — sube el `?v=N` en `index.html`.
- `.githooks/pre-commit` — lo ejecuta automáticamente.

**Actívalo una sola vez por clon (requiere `python` en el PATH):**
```bash
git config core.hooksPath .githooks
```

---

## 🤖 ¿Quieres modificarlo (tú o con ayuda de una IA)?

Lee **`AGENTS.md`**: describe la arquitectura, el modelo de datos, las funciones clave, las convenciones y las "trampas" a evitar. Está pensado para que **Claude o cualquier asistente de IA** pueda hacer cambios con contexto suficiente. Pídele a la IA algo como: *"Lee AGENTS.md y luego haz [tu cambio]"*.

---

## 📜 Licencia

Publicado bajo licencia **MIT** — ver [`LICENSE`](LICENSE). Puedes usarlo, copiarlo, modificarlo y compartirlo libremente conservando el aviso de copyright. Se entrega **"tal cual", sin garantías y sin responsabilidad** para el autor. Firebase, reCAPTCHA y la fuente Inter conservan sus propias licencias (ver `LICENSE`).

¡Que gane el mejor pronosticador! 🏆
