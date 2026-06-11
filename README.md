# ⚽ Quiniela Mundial 2026

Aplicación web para hacer una quiniela del torneo de fútbol 2026 con tus amigos. Predicciones de partidos, ranking en tiempo real y estadísticas individuales — todo sincronizado al instante con **Firebase Realtime Database**.

> Proyecto personal sin fines comerciales y sin afiliación, patrocinio ni licencia de la FIFA ni de ningún organismo oficial. Los nombres de selecciones y banderas son de uso meramente informativo.

![mobile-first](https://img.shields.io/badge/mobile--first-iPhone%20%2B%20Android-ff3d71) ![firebase](https://img.shields.io/badge/Firebase-Realtime%20DB-ffca28) ![vanilla](https://img.shields.io/badge/JavaScript-vanilla-f7df1e)

---

## ✨ Funcionalidades

- **Crear / unirse** a una quiniela con un código de 6 caracteres (o enlace compartible).
- **Login simple** con tu nombre (sin contraseña; identidad anónima de Firebase).
- **Fase de grupos** (12 grupos × 4 equipos = 72 partidos) **+ eliminatorias** (16avos, octavos, cuartos, semis, 3er lugar y final) — formato real del Mundial 2026 de 48 equipos.
- **Predicciones** con marcador exacto por partido.
- **Campeón mundial**: elige tu campeón antes de que arranque el torneo para un bonus extra.
- **Ranking en tiempo real**: cambia al instante para todos cuando el admin carga un resultado.
- **Estadísticas individuales**: puntos totales, efectividad, aciertos, marcadores exactos y puntos por ronda.
- **Panel de admin**: cargar resultados reales y definir los equipos de eliminatorias.
- **Diseño mobile-first** responsivo para iPhone y Android.

---

## 🏆 Sistema de puntuación

**Categoría 1 – Aciertos de partido** (máximo 4 pts):

| Acierto | Puntos |
|---|---|
| Acertar el resultado (gana A / gana B / empate) | **+3** |
| Acertar además el marcador exacto de ambos equipos | **+1** |

**Categoría 2 – Campeón del mundo:**

- **+15 pts** si el equipo que elegiste como campeón gana la final.
- Configurable en `js/scoring.js` → constante `CHAMPION_POINTS`.

---

## 🚀 Puesta en marcha (5 minutos)

### 1. Crear el proyecto en Firebase
1. Entra a [console.firebase.google.com](https://console.firebase.google.com) y crea un proyecto.
2. En el menú lateral: **Realtime Database → Crear base de datos** (elige una región y modo *bloqueado*; las reglas las pondremos en el paso 4).
3. **Authentication → Sign-in method → Anónimo → Habilitar**.

### 2. Pegar tus credenciales
1. **Configuración del proyecto (⚙️) → Tus apps → Web (`</>`)** → registra la app.
2. Copia el objeto `firebaseConfig` y pégalo en **`js/firebase-config.js`** (reemplaza los valores `TU_...`).

### 3. Cargar las reglas de seguridad
- En **Realtime Database → Reglas**, pega el contenido de **`database.rules.json`** y publica.

### 4. Abrir la app
- Abre `index.html` en tu navegador (o súbela a cualquier hosting estático).
- Para servirla localmente:
  ```bash
  # Python
  python -m http.server 8000
  # luego abre http://localhost:8000
  ```
- Recomendado para producción gratis: **Firebase Hosting**, **Netlify** o **GitHub Pages**.

---

## 📱 Cómo se usa

1. **Tú (admin)**: escribe tu nombre → pestaña *Crear quiniela* → comparte el código con el botón `#CÓDIGO` de la barra superior.
2. **Tus amigos**: abren el enlace o escriben su nombre + el código en *Unirme a quiniela*.
3. Todos hacen sus predicciones en la pestaña **Partidos** y eligen su **campeón** (pestaña *Ranking* → "Elegir ahora") antes de que arranque el Mundial.
4. **Conforme avanza el torneo**, el admin entra a la pestaña **Admin**, escribe el marcador real y pulsa *Guardar*. Las puntuaciones y el ranking se recalculan **automáticamente para todos**.
5. En eliminatorias, el admin usa *Editar equipos* para fijar los clasificados antes de que la gente prediga.

> ⚠️ Una vez que un partido se marca como *jugado*, queda **bloqueado**: ya nadie puede crear/editar su predicción (regla de seguridad en el servidor).

---

## 🗂️ Estructura de datos (Realtime Database)

```
tournaments/
  {CODE}/
    name:        "Quiniela de la oficina"
    admin:       "<uid del creador>"
    createdAt:   <timestamp>
    participants/
      {uid}/ { name, championPick, joinedAt }
    matches/
      {matchId}/ { id, round, group, teamA:{name,flag}, teamB:{name,flag},
                   date, realA, realB, played, editable }
    predictions/
      {matchId}/
        {uid}/ { a, b, at }
```

## 🔐 Reglas de seguridad (resumen)

- **Lectura**: cualquier usuario autenticado (el ranking es público dentro de la quiniela).
- **Resultados reales (`matches`)**: solo los puede escribir el **admin** del torneo.
- **Predicciones**: cada usuario solo puede escribir las **suyas**, y solo **mientras el partido no esté jugado**.
- **Participante**: cada quien solo edita su propio nodo (nombre / campeón).

---

## 🧩 Archivos del proyecto

| Archivo | Qué hace |
|---|---|
| `index.html` | Estructura y pantallas de la app |
| `css/styles.css` | Estilos mobile-first |
| `js/firebase-config.js` | **Tus credenciales de Firebase** (editar) |
| `js/tournament-data.js` | Equipos, grupos y generación del calendario |
| `js/scoring.js` | Reglas de puntuación |
| `js/app.js` | Lógica de la app + listeners en tiempo real |
| `database.rules.json` | Reglas de seguridad para Firebase |

---

## ⚙️ Personalización rápida

- **Equipos/grupos**: edita `DEFAULT_GROUPS` en `js/tournament-data.js`.
- **Puntos**: ajusta `POINTS_RESULT`, `POINTS_EXACT`, `CHAMPION_POINTS` en `js/scoring.js`.
- **Colores/tema**: variables CSS en `:root` dentro de `css/styles.css`.

¡Que gane el mejor pronosticador! 🏆
