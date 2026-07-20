/* =========================================================
 *  APP – Quiniela Mundial 2026
 *  Vanilla JS + Firebase Realtime Database
 * ========================================================= */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

// Escapa HTML para evitar XSS al insertar datos de Firebase en innerHTML.
const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const HISTORY_KEY = "quiniela2026_history"; // lista de quinielas en las que participo

const state = {
  uid: null,        // Firebase anonymous UID (solo para checar admin)
  playerKey: null,  // clave estable entre dispositivos: slugify(name)_code
  name: null,
  code: null,
  view: "matches",
  round: "grupos",
  matchSort: "fecha",    // "grupo" | "fecha"
  showClosed: false,     // ocultar partidos cerrados en vista de predicciones
  showFuture: false,     // ocultar partidos de mañana en adelante en vista de predicciones
  adminRound: "grupos",
  adminShowPlayed: false, // ocultar partidos con resultado en vista admin
  adminShowFuture: false, // ocultar partidos de mañana en adelante en vista admin
  data: null,        // snapshot completo del torneo
  ref: null          // referencia firebase con listener activo
};

// Genera una clave estable a partir del nombre del usuario y el código del torneo.
// Mismo nombre + mismo código → misma clave en cualquier dispositivo.
function makePlayerKey(name, code) {
  const slug = name.toLowerCase().trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // quitar acentos
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 15);
  return slug + "_" + code.toLowerCase();
}

/* ===================== ARRANQUE ===================== */
window.addEventListener("DOMContentLoaded", init);

async function init() {
  bindStaticEvents();

  // Prefill de código desde la URL (?code=XXXXX)
  const urlCode = new URLSearchParams(location.search).get("code");
  if (urlCode) $("#input-code").value = urlCode.toUpperCase();

  if (!FIREBASE_CONFIGURED) {
    hideLoader();
    showAuthError("⚠️ Falta configurar Firebase en js/firebase-config.js (lee el README).");
    return;
  }

  try {
    const cred = await auth.signInAnonymously();
    state.uid = cred.user.uid;
  } catch (e) {
    hideLoader();
    showAuthError("No se pudo conectar con Firebase: " + e.message);
    return;
  }

  // Mostrar la pantalla de inicio con la lista "Mis quinielas".
  hideLoader();
  renderHistory();
  loadPublicTournaments();
  const hist = loadHistory();
  if (hist.length && !$("#input-name").value) $("#input-name").value = hist[0].name;

  // Si el participante tiene exactamente UN torneo registrado (y no llegó por un
  // enlace con código específico), entra directo sin esperar clic. Para registrar
  // o entrar a otro torneo, usa el botón "Salir" (⎋) dentro de la app: regresa a
  // esta pantalla sin reingresar automáticamente.
  if (hist.length === 1 && !urlCode) {
    quickEnter(hist[0].code);
    return;
  }

  showScreen("auth");
}

/* ===================== EVENTOS ESTÁTICOS ===================== */
function bindStaticEvents() {
  // Tabs crear / unirse
  $$(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      $$(".tab").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      $$(".pane").forEach((p) => p.classList.remove("active"));
      $("#pane-" + t.dataset.tab).classList.add("active");
    })
  );

  $("#btn-create").addEventListener("click", handleCreate);
  $("#btn-join").addEventListener("click", handleJoin);
  $("#btn-logout").addEventListener("click", logout);
  $("#t-code-chip").addEventListener("click", shareCode);
  $("#btn-report").addEventListener("click", openAdminReport);
  $("#btn-capture").addEventListener("click", openAdminCapture);

  // Navegación inferior
  $$(".nav-btn").forEach((b) =>
    b.addEventListener("click", () => switchView(b.dataset.view))
  );

  // Cerrar modal al tocar el fondo
  $(".modal-backdrop").addEventListener("click", closeModal);
}

/* ===================== CREAR / UNIRSE ===================== */

// Valida complejidad de contraseña. Devuelve mensaje de error o null si es válida.
function validatePassword(pw) {
  if (pw.length < 8)              return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[A-Z]/.test(pw))         return "Debe incluir al menos una letra mayúscula.";
  if (!/[a-z]/.test(pw))         return "Debe incluir al menos una letra minúscula.";
  if (!/[0-9]/.test(pw))         return "Debe incluir al menos un número.";
  if (!/[^A-Za-z0-9]/.test(pw))  return "Debe incluir al menos un carácter especial (ej. !@#$%).";
  return null;
}

// SHA-256 del password + playerKey como sal. Devuelve hex de 64 chars o null si no hay password.
async function hashPassword(password, playerKey) {
  if (!password) return null;
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "|" + playerKey);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function readName() {
  const name = $("#input-name").value.trim();
  if (name.length < 2) { showAuthError("Escribe tu nombre (mín. 2 letras)."); return null; }
  return name;
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

async function handleCreate() {
  showAuthError("");
  const name = readName();
  if (!name) return;
  const tname = $("#input-tname").value.trim() || "Quiniela Mundial 2026";
  const password = $("#input-password").value;
  const pwErr = validatePassword(password); if (pwErr) { showAuthError(pwErr); return; }

  let code, exists = true, tries = 0;
  do {
    code = genCode();
    exists = (await db.ref("tournaments/" + code + "/name").get()).exists();
  } while (exists && ++tries < 5);

  state.name = name;
  state.playerKey = makePlayerKey(name, code);

  const pwHash = await hashPassword(password, state.playerKey);
  const me = { name, championPick: "", joinedAt: firebase.database.ServerValue.TIMESTAMP };
  if (pwHash) me.passwordHash = pwHash;

  const payload = {
    name: tname,
    admin: state.uid,
    adminPlayerKey: state.playerKey,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    matches: buildInitialMatches(),
    participants: { [state.playerKey]: me }
  };

  try {
    await db.ref("tournaments/" + code).set(payload);
    // Publica el torneo en el índice público para que otros lo vean en la lista
    await db.ref("publicTournaments/" + code).set({
      name: tname,
      adminName: name,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    await enterTournament(code);
  } catch (e) {
    showAuthError("Error al crear: " + e.message);
  }
}

async function handleJoin() {
  showAuthError("");
  const name = readName();
  if (!name) return;
  const code = $("#input-code").value.trim().toUpperCase();
  if (code.length < 4) { showAuthError("Código inválido."); return; }
  const password = $("#input-password").value;
  const pwErr = validatePassword(password); if (pwErr) { showAuthError(pwErr); return; }

  const snap = await db.ref("tournaments/" + code + "/name").get();
  if (!snap.exists()) { showAuthError("No existe una quiniela con ese código."); return; }

  state.name = name;
  state.playerKey = makePlayerKey(name, code);

  // Si el participante ya existe con contraseña, verificar antes de entrar
  const hashSnap = await db.ref(`tournaments/${code}/participants/${state.playerKey}/passwordHash`).get();
  const existingHash = hashSnap.val();
  if (existingHash) {
    const enteredHash = await hashPassword(password, state.playerKey);
    if (enteredHash !== existingHash) {
      showAuthError("Contraseña incorrecta. Ese nombre ya está registrado en esta quiniela.");
      return;
    }
  }

  try {
    const update = { name, joinedAt: firebase.database.ServerValue.TIMESTAMP };
    // Guardar hash solo si aún no tiene contraseña y el usuario ingresó una
    if (!existingHash && password) update.passwordHash = await hashPassword(password, state.playerKey);
    await db.ref(`tournaments/${code}/participants/${state.playerKey}`).update(update);
    await enterTournament(code);
  } catch (e) {
    showAuthError("Error al unirse: " + e.message);
  }
}

/* ===================== ENTRAR + LISTENER TIEMPO REAL ===================== */
function enterTournament(code) {
  return new Promise((resolve, reject) => {
    if (state.ref) state.ref.off();
    state.code = code;
    state.ref = db.ref("tournaments/" + code);

    let first = true;
    state.ref.on(
      "value",
      (snap) => {
        if (!snap.exists()) { // torneo borrado
          if (first) reject(new Error("Torneo no encontrado"));
          else logout();
          return;
        }
        state.data = snap.val();
        if (first) {
          first = false;
          // Selecciona por defecto la fase en curso (según fecha) en Pronósticos y Admin.
          const cur = currentRoundKey();
          state.round = cur;
          state.adminRound = cur;
          addHistory(code, state.data.name, state.name);
          hideLoader();
          showScreen("app");
          $("#t-name").textContent = state.data.name;
          $("#t-code").textContent = code;
          $("#u-name").textContent = state.name;
          const verEl = $("#app-ver");
          if (verEl) {
            const s = document.querySelector('script[src*="app.js"]');
            const m = s && s.src.match(/[?&]v=(\d+)/);
            if (m) verEl.textContent = "v" + m[1];
          }
          toggleAdminTab();
          resolve();
        }
        scheduleRender();
      },
      (err) => { if (first) reject(err); }
    );
  });
}

function isAdmin() { return state.data && state.data.adminPlayerKey === state.playerKey; }

function toggleAdminTab() {
  $(".admin-only").classList.toggle("hidden", !isAdmin());
}

/* ===================== RENDER PRINCIPAL =====================
 * Optimización de performance:
 *  · Coalescing: Firebase puede emitir muchos snapshots seguidos (p. ej. cuando
 *    varios participantes guardan a la vez). En lugar de reconstruir el DOM en
 *    cada uno, agendamos un único render por frame con requestAnimationFrame.
 *  · Render por vista: solo se reconstruye la pestaña visible. Las demás se
 *    marcan como "pendientes" y se reconstruyen al abrirlas (switchView).
 */
const _dirtyViews = new Set();
let _renderScheduled = false;

function renderView(v) {
  if (!state.data) return;
  switch (v) {
    case "matches": renderMatches(); break;
    case "ranking": renderRanking(); break;
    case "stats":   renderStats();   break;
    case "admin":   if (isAdmin()) renderAdmin(); break;
  }
  _dirtyViews.delete(v);
}

// Punto de entrada desde el listener de Firebase: marca todo como pendiente y
// agenda un solo render (de la vista visible) en el próximo frame.
function scheduleRender() {
  if (!state.data) return;
  ["matches", "ranking", "stats", "admin"].forEach((v) => _dirtyViews.add(v));
  if (_renderScheduled) return;
  _renderScheduled = true;
  requestAnimationFrame(() => {
    _renderScheduled = false;
    renderView(state.view);
  });
}

function matchesArray() {
  return Object.values(state.data.matches || {}).sort((a, b) => a.id.localeCompare(b.id));
}

// Ronda "en curso" según fecha: la del próximo partido (de hoy en adelante).
// Si ya pasaron todos los partidos, devuelve la última ronda con partidos.
function currentRoundKey() {
  const ms = matchesArray();
  if (!ms.length) return "grupos";
  const startToday = startOfTodayMs();
  const upcoming = ms
    .filter((m) => typeof m.kickoffMs === "number" && m.kickoffMs >= startToday)
    .sort((a, b) => a.kickoffMs - b.kickoffMs);
  if (upcoming.length) return upcoming[0].round;
  for (let i = ROUNDS.length - 1; i >= 0; i--) {
    if (ms.some((m) => m.round === ROUNDS[i].key)) return ROUNDS[i].key;
  }
  return "grupos";
}
function myPreds() {
  const p = state.data.predictions || {};
  const out = {};
  Object.keys(p).forEach((mid) => { if (p[mid][state.playerKey]) out[mid] = p[mid][state.playerKey]; });
  return out;
}
function predForView(pid) {
  const p = state.data.predictions || {};
  const out = {};
  Object.keys(p).forEach((mid) => { if (p[mid][pid]) out[mid] = p[mid][pid]; });
  return out;
}

/* ---------- Sort bar ---------- */
function renderSortBar() {
  const bar = $("#sort-bar");
  if (!bar) return;
  const opts = [
    { key: "grupo", label: "Por grupo" },
    { key: "fecha", label: "Por fecha" }
  ];
  const tomorrow = startOfTomorrowMs();
  const isFuture = (m) => typeof m.kickoffMs === "number" && m.kickoffMs >= tomorrow;
  const inRound = matchesArray().filter(m => m.round === state.round);
  const finCount = inRound.filter(m => m.played).length;
  const futureCount = inRound.filter(m => !m.played && isFuture(m)).length;
  bar.innerHTML = opts.map(o =>
    `<button class="sort-btn${state.matchSort === o.key ? " active" : ""}" data-sort="${o.key}">${o.label}</button>`
  ).join("") +
  `<button class="sort-btn sort-btn-toggle${state.showFuture ? " active" : ""}" id="btn-toggle-future">
    ${state.showFuture ? "Ocultar próximos" : `Próximos (${futureCount})`}
  </button>` +
  `<button class="sort-btn sort-btn-toggle${state.showClosed ? " active" : ""}" id="btn-toggle-closed">
    ${state.showClosed ? "Ocultar finalizados" : `Finalizados (${finCount})`}
  </button>`;
  $$(".sort-btn[data-sort]", bar).forEach(b =>
    b.addEventListener("click", () => { state.matchSort = b.dataset.sort; renderMatches(); })
  );
  const futBtn = $("#btn-toggle-future");
  if (futBtn) futBtn.addEventListener("click", () => { state.showFuture = !state.showFuture; renderMatches(); });
  const toggleBtn = $("#btn-toggle-closed");
  if (toggleBtn) toggleBtn.addEventListener("click", () => { state.showClosed = !state.showClosed; renderMatches(); });
}

/* ---------- Vista PARTIDOS ---------- */
function renderMatches() {
  renderRoundFilter("#round-filter", state.round, (r) => { state.round = r; renderMatches(); });
  renderSortBar();

  const list = $("#matches-list");
  const preds = myPreds();
  let matches = matchesArray().filter((m) => m.round === state.round);
  if (!state.showClosed) matches = matches.filter(m => !m.played);
  if (!state.showFuture) {
    const tomorrow = startOfTomorrowMs();
    matches = matches.filter(m => !(typeof m.kickoffMs === "number" && m.kickoffMs >= tomorrow));
  }

  list.innerHTML = "";
  if (!matches.length) {
    list.innerHTML = `<p class="empty">No hay partidos de hoy en esta ronda. Pulsa <b>Próximos</b> o <b>Finalizados</b> para ver más.</p>`;
    return;
  }

  if (state.matchSort === "fecha") {
    matches = matches.slice().sort((a, b) => (a.kickoffMs || 0) - (b.kickoffMs || 0));
    let lastDay = null;
    matches.forEach((m) => {
      const dk = dayKey(m.kickoff);
      if (dk && dk !== lastDay) {
        lastDay = dk;
        const lbl = document.createElement("div");
        lbl.className = "group-label";
        lbl.textContent = fmtDay(m.kickoff);
        list.appendChild(lbl);
      }
      list.appendChild(matchCard(m, preds[m.id]));
    });
  } else {
    // Default: agrupar por grupo en fase de grupos
    let lastGroup = null;
    matches.forEach((m) => {
      if (m.round === "grupos" && m.group !== lastGroup) {
        lastGroup = m.group;
        const lbl = document.createElement("div");
        lbl.className = "group-label";
        lbl.textContent = "Grupo " + m.group;
        list.appendChild(lbl);
      }
      list.appendChild(matchCard(m, preds[m.id]));
    });
  }
}

// Las predicciones se cierran 15 minutos antes del inicio del partido (anti-trampa).
const LOCK_BEFORE_MS = 15 * 60 * 1000;
// Fecha límite para elegir campeón: sábado 20 jun 2026 al final del día (hora local).
const CHAMPION_DEADLINE = new Date("2026-06-21T00:00:00").getTime();
function lockTime(m) { return typeof m.kickoffMs === "number" ? m.kickoffMs - LOCK_BEFORE_MS : Infinity; }
function isLocked(m) { return m.played || Date.now() >= lockTime(m); }

function statusBadge(m) {
  if (m.played) return `<span class="match-status status-final">FINAL</span>`;
  if (Date.now() >= lockTime(m)) return `<span class="match-status status-locked">CERRADO</span>`;
  return `<span class="match-status status-open">ABIERTO</span>`;
}

// Para eliminatorias sin equipos definidos, muestra el descriptor de
// clasificación (slot) en vez de "Por definir".
function teamName(team, slot) {
  return (team.name === "Por definir" && slot) ? slot : team.name;
}
// Formatea el instante UTC del partido en la zona horaria LOCAL del usuario.
const _DTF = new Intl.DateTimeFormat("es-MX", {
  weekday: "short", day: "numeric", month: "short",
  hour: "2-digit", minute: "2-digit", hour12: false
});
const _DDF = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "long" });
// Sello de tiempo con fecha + hora + segundos para auditoría (hora local del usuario)
const _AUDITF = new Intl.DateTimeFormat("es-MX", {
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
});
function fmtStamp(ms) {
  return (typeof ms === "number" && isFinite(ms)) ? _AUDITF.format(new Date(ms)).replace(/,/g, "") : "—";
}
// Duración (ms) como "Nd Nh Nm Ns", omitiendo unidades iniciales en cero pero
// siempre mostrando hasta segundos. "" si no es positiva.
function fmtLeadTime(ms) {
  if (typeof ms !== "number" || !isFinite(ms) || ms <= 0) return "";
  let s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600);  s -= h * 3600;
  const m = Math.floor(s / 60);    s -= m * 60;
  const parts = [];
  if (d > 0) parts.push(d + "d");
  if (h > 0 || parts.length) parts.push(h + "h");
  if (m > 0 || parts.length) parts.push(m + "m");
  parts.push(s + "s");
  return parts.join(" ");
}
function fmtKickoff(iso) {
  if (!iso) return "";
  const s = _DTF.format(new Date(iso)).replace(/,/g, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function fmtDay(iso) {
  if (!iso) return "";
  const s = _DDF.format(new Date(iso)).replace(/,/g, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
// Clave de día local para agrupar headers (ej. "2026-06-11 America/Mexico_City")
function dayKey(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("sv"); // "YYYY-MM-DD" en timezone local
}
function metaLine(m) {
  return `${roundLabel(m.round)}${m.group ? " · Grupo " + m.group : ""}` +
         `${m.kickoff ? " · " + fmtKickoff(m.kickoff) : ""}${m.venue ? " · 📍 " + esc(m.venue) : ""}`;
}

function matchCard(m, pred) {
  const el = document.createElement("div");
  el.className = "match";
  const locked = isLocked(m);
  const pts = m.played && pred ? scoreMatch(pred, m.realA, m.realB) : null;

  let realRow = "";
  if (m.played) {
    realRow = `<div class="score-pill">
        <div class="box real">${m.realA}</div><span class="sep">–</span><div class="box real">${m.realB}</div>
      </div>`;
  }

  let predRow = "";
  if (pred) {
    predRow = `<div class="pred-line">
        <span class="pred-label">Tu predicción</span>
        <span class="pred-value">${pred.a} – ${pred.b}
        ${pts != null ? `<span class="pts-badge ${pts ? "" : "zero"}">+${pts} pts</span>` : ""}</span>
      </div>`;
  }

  // Muestra predicciones del grupo solo cuando el partido está en curso (cerrado pero sin resultado)
  let livePreds = "";
  if (locked && !m.played) {
    const allPreds = (state.data.predictions || {})[m.id] || {};
    const parts = state.data.participants || {};
    const rows = Object.entries(allPreds)
      .map(([pid, p]) => ({ name: esc((parts[pid] || {}).name || pid), a: p.a, b: p.b }))
      .sort((x, y) => x.name.localeCompare(y.name));
    if (rows.length) {
      livePreds = `<div class="live-preds">
        <div class="live-preds-title">Predicciones del grupo</div>
        ${rows.map(r => `<div class="live-pred-row">
          <span class="live-pred-name">${r.name}</span>
          <span class="live-pred-val">${r.a}–${r.b}</span>
        </div>`).join("")}
      </div>`;
    }
  }

  const actionTxt = locked
    ? (pred ? "🔒 Predicción cerrada" : "🔒 Sin predicción")
    : (pred ? "✏️ Editar predicción" : "🎯 Hacer predicción");

  // Bandera clickeable (abre el historial del equipo en el torneo). Solo si el
  // equipo está definido (no "Por definir" en eliminatorias).
  const flagSpan = (team) => {
    const clickable = team.name && team.name !== "Por definir";
    return `<span class="flag${clickable ? " flag-team" : ""}"${clickable
      ? ` data-team="${esc(team.name)}" role="button" tabindex="0" title="Ver resultados de ${esc(team.name)} en este torneo"`
      : ""}>${esc(team.flag)}</span>`;
  };

  el.innerHTML = `
    <div class="match-top">
      <span class="match-meta">${metaLine(m)}</span>
      ${statusBadge(m)}
    </div>
    <div class="teams-row">
      <div class="team">${flagSpan(m.teamA)}<span class="tname">${esc(teamName(m.teamA, m.slotA))}</span></div>
      <span class="vs">VS</span>
      <div class="team">${flagSpan(m.teamB)}<span class="tname">${esc(teamName(m.teamB, m.slotB))}</span></div>
    </div>
    ${realRow}
    ${predRow}
    ${livePreds}
    <button class="match-action ${pred ? "has-pred" : ""} ${locked ? "locked" : ""}">${actionTxt}</button>
  `;

  const btn = el.querySelector(".match-action");
  if (!locked) btn.addEventListener("click", () => openPrediction(m.id));
  else btn.addEventListener("click", () => toast("Este partido ya está cerrado", true));

  el.querySelectorAll(".flag-team").forEach((f) => {
    const open = (e) => { e.stopPropagation(); openTeamHistory(f.dataset.team); };
    f.addEventListener("click", open);
    f.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") open(e); });
  });
  return el;
}

/* ---------- Historial de un equipo en el torneo ----------
 * Se abre al tocar la bandera de un equipo en la vista de pronósticos.
 * Muestra todos sus partidos (jugados con resultado, y los próximos con estado),
 * más un resumen de ganados/empatados/perdidos y goles. */
function openTeamHistory(name) {
  if (!name || name === "Por definir") return;
  const flag = teamFlag(name);
  const all = matchesArray()
    .filter((m) => m.teamA.name === name || m.teamB.name === name)
    .sort((a, b) => (a.kickoffMs || 0) - (b.kickoffMs || 0));

  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  const rows = all.map((m) => {
    const isA = m.teamA.name === name;
    const opp = isA ? m.teamB : m.teamA;
    const oppName = teamName(opp, isA ? m.slotB : m.slotA);
    let res;
    if (m.played) {
      const my = isA ? m.realA : m.realB;
      const their = isA ? m.realB : m.realA;
      gf += my; ga += their;
      let cls, letter;
      if (my > their) { cls = "win"; letter = "G"; w++; }
      else if (my < their) { cls = "loss"; letter = "P"; l++; }
      else { cls = "draw"; letter = "E"; d++; }
      res = `<span class="th-score">${my}–${their}</span><span class="th-tag th-${cls}">${letter}</span>`;
    } else {
      res = `<span class="th-pending">${isLocked(m) ? "En juego" : "Por jugar"}</span>`;
    }
    return `<div class="th-row">
      <div class="th-info">
        <span class="th-when">${esc(roundLabel(m.round))}${m.group ? " · Grp " + esc(m.group) : ""}${m.kickoff ? " · " + esc(fmtDay(m.kickoff)) : ""}</span>
        <span class="th-opp">${esc(flag)} ${esc(name)} <span class="th-vs">vs</span> ${esc(opp.flag)} ${esc(oppName)}</span>
      </div>
      <div class="th-res">${res}</div>
    </div>`;
  }).join("");

  const playedCount = w + d + l;
  const summary = playedCount
    ? `${playedCount} jugado${playedCount !== 1 ? "s" : ""} · <b>${w}</b>G <b>${d}</b>E <b>${l}</b>P · goles ${gf}:${ga}`
    : "Aún sin partidos jugados";

  $("#modal-card").innerHTML = `
    <div class="modal-title">${esc(flag)} ${esc(name)}</div>
    <div class="modal-sub">Resultados en este torneo · ${summary}</div>
    <div class="rp-scroll">
      <div class="th-list">${rows || '<p class="empty">Sin partidos.</p>'}</div>
    </div>
    <div class="modal-actions" style="margin-top:14px">
      <button class="btn btn-ghost" id="th-close">Cerrar</button>
    </div>
  `;
  $("#th-close").addEventListener("click", closeModal);
  openModal();
}

/* ---------- Modal PREDICCIÓN ---------- */
let modalScore = { a: 0, b: 0, matchId: null };

function openPrediction(matchId) {
  const m = state.data.matches[matchId];
  if (m.teamA.name === "Por definir" || m.teamB.name === "Por definir") {
    toast("Equipos por definir — disponible cuando el admin los cargue", true); return;
  }
  if (isLocked(m)) {
    toast("⏱️ Cerrado: las predicciones se bloquean 1 h antes del partido", true); return;
  }
  const existing = myPreds()[matchId];
  modalScore = { a: existing ? existing.a : 0, b: existing ? existing.b : 0, matchId };

  $("#modal-card").innerHTML = `
    <div class="modal-title">Tu predicción</div>
    <div class="modal-sub">${roundLabel(m.round)}${m.group ? " · Grupo " + m.group : ""}</div>
    <div class="modal-teams">
      <div class="modal-team">
        <span class="flag">${esc(m.teamA.flag)}</span><span class="tname">${esc(m.teamA.name)}</span>
        <div class="stepper">
          <button data-d="-1" data-s="a">−</button>
          <span class="num" id="num-a">${modalScore.a}</span>
          <button data-d="1" data-s="a">+</button>
        </div>
      </div>
      <div class="modal-vs">:</div>
      <div class="modal-team">
        <span class="flag">${esc(m.teamB.flag)}</span><span class="tname">${esc(m.teamB.name)}</span>
        <div class="stepper">
          <button data-d="-1" data-s="b">−</button>
          <span class="num" id="num-b">${modalScore.b}</span>
          <button data-d="1" data-s="b">+</button>
        </div>
      </div>
    </div>
    <div class="winner-tag" id="winner-tag"></div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="save-pred">Guardar predicción</button>
      <button class="btn btn-ghost" id="cancel-pred">Cancelar</button>
    </div>
  `;

  $$("#modal-card .stepper button").forEach((b) =>
    b.addEventListener("click", () => {
      const s = b.dataset.s;
      modalScore[s] = Math.max(0, Math.min(20, modalScore[s] + Number(b.dataset.d)));
      $("#num-" + s).textContent = modalScore[s];
      updateWinnerTag(m);
    })
  );
  $("#save-pred").addEventListener("click", () => savePrediction(m));
  $("#cancel-pred").addEventListener("click", closeModal);
  updateWinnerTag(m);
  openModal();
}

function updateWinnerTag(m) {
  const o = outcome(modalScore.a, modalScore.b);
  const txt = o === "X" ? "Empate" : "Gana <b>" + esc(o === "1" ? m.teamA.name : m.teamB.name) + "</b>";
  $("#winner-tag").innerHTML = txt;
}

async function savePrediction(m) {
  if (isLocked(m)) { toast("⏱️ Este partido ya está cerrado", true); closeModal(); return; }
  try {
    await db.ref(`tournaments/${state.code}/predictions/${m.id}/${state.playerKey}`).set({
      a: modalScore.a, b: modalScore.b, at: firebase.database.ServerValue.TIMESTAMP
    });
    closeModal();
    toast("Predicción guardada ✓");
  } catch (e) {
    toast("Error: " + e.message, true);
  }
}

/* ---------- Vista RANKING ---------- */
function renderRanking() {
  const matches = matchesArray();
  const matchesMap = state.data.matches || {};
  const realChamp = getRealChampion(matchesMap);
  const parts = state.data.participants || {};

  const rows = Object.keys(parts).map((pid) => {
    const s = computeUserScore(matchesMap, predForView(pid), parts[pid].championPick, realChamp);
    const predCount = Object.keys(predForView(pid)).length;
    return { pid, name: parts[pid].name, isAdmin: pid === state.data.adminPlayerKey, champ: parts[pid].championPick || "—", predCount, ...s };
  });
  rows.sort((a, b) => b.total - a.total || b.exact - a.exact || a.name.localeCompare(b.name));

  // banner campeón
  const banner = $("#champion-banner");
  const myPick = parts[state.playerKey] && parts[state.playerKey].championPick;
  banner.className = "champion-banner show";
  if (realChamp) {
    banner.innerHTML = `🏆 Campeón del torneo: <b>${esc(realChamp)}</b> · quienes lo eligieron ganaron +${CHAMPION_POINTS} pts.`;
  } else if (myPick) {
    banner.innerHTML = `🏆 Tu campeón: <b>${esc(myPick)}</b> 🔒 (+${CHAMPION_POINTS} pts si acierta). Esta elección es definitiva.`;
  } else {
    banner.innerHTML = `🏆 Aún no eliges campeón mundial (+${CHAMPION_POINTS} pts). <a href="#" id="change-champ" style="color:var(--accent)">Elegir ahora</a>`;
    const link = $("#change-champ");
    if (link) {
      if (isChampLocked()) link.replaceWith(document.createTextNode(" (bloqueado: plazo vencido o torneo iniciado)"));
      else link.addEventListener("click", (e) => { e.preventDefault(); openChampionPicker(); });
    }
  }

  const predectable = matches.filter(
    (m) => m.teamA.name !== "Por definir" && m.teamB.name !== "Por definir"
  ).length;

  const list = $("#ranking-list");
  if (!rows.length) { list.innerHTML = `<p class="empty">Sin participantes aún.</p>`; return; }

  const pointsBtn = `<button class="btn btn-ghost" id="btn-points-report" style="width:100%;margin-bottom:12px">📈 Reporte de puntos por partido</button>`;

  const tableRows = rows.map((r, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `<span class="rk-pos">${i + 1}</span>`;
    const isMe = r.pid === state.playerKey;
    return `<tr class="${isMe ? "rk-me" : ""}">
      <td class="rp-name">
        ${medal} ${esc(r.name)}
        ${isMe ? '<span class="you-tag">TÚ</span>' : ""}
        ${r.isAdmin ? '<span class="admin-tag">A</span>' : ""}
      </td>
      <td class="rp-num">${r.total}</td>
      <td class="rp-num">${r.correct}</td>
      <td class="rp-num">${r.exact}</td>
      <td class="rp-champ">${esc(r.champ)}</td>
      <td class="rp-num">${r.predCount}/${predectable}</td>
    </tr>`;
  }).join("");

  list.innerHTML = `
    ${pointsBtn}
    <div class="rp-table-wrap">
      <table class="rp-table">
        <thead>
          <tr>
            <th class="rp-name">Participante</th>
            <th class="rp-num">Pts</th>
            <th class="rp-num">Ac.</th>
            <th class="rp-num">Ex.</th>
            <th class="rp-champ">Campeón</th>
            <th class="rp-num">Preds.</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  `;
  const prBtn = $("#btn-points-report");
  if (prBtn) prBtn.addEventListener("click", openPointsReport);
}

/* ---------- Reporte de puntos por partido (ganados y acumulados) ----------
 * Matriz tipo planilla: filas = partidos jugados (orden cronológico), con un
 * bloque de "Puntos Ganados" (0/3/4 por partido) y otro de "Puntos Acumulados"
 * (suma corrida), una columna por participante. Botones para mostrar/ocultar
 * cada bloque. El orden de participantes sigue el del ranking.
 */
let _ptsRep = { ganados: true, acum: true };

function pointsReportData() {
  const matchesMap = state.data.matches || {};
  const parts = state.data.participants || {};
  const preds = state.data.predictions || {};
  const realChamp = getRealChampion(matchesMap);

  const order = Object.keys(parts).map((pid) => {
    const s = computeUserScore(matchesMap, predForView(pid), parts[pid].championPick, realChamp);
    return { pid, name: parts[pid].name, total: s.total, exact: s.exact, championBonus: s.championBonus };
  }).sort((a, b) => b.total - a.total || b.exact - a.exact || a.name.localeCompare(b.name));

  const played = Object.values(matchesMap)
    .filter((m) => m.played)
    .sort((a, b) => (a.kickoffMs || 0) - (b.kickoffMs || 0));

  const cum = {};
  order.forEach((p) => { cum[p.pid] = 0; });
  const rows = played.map((m) => {
    const cells = order.map((p) => {
      const pred = preds[m.id] && preds[m.id][p.pid];
      const won = scoreMatch(pred, m.realA, m.realB);
      cum[p.pid] += won;
      return { won, acum: cum[p.pid] };
    });
    return {
      label: `${teamName(m.teamA, m.slotA)} vs ${teamName(m.teamB, m.slotB)}`,
      result: `${m.realA}–${m.realB}`,
      cells
    };
  });

  // Fila del bonus de campeón (+15) cuando ya hay campeón definido.
  let champRow = null;
  if (realChamp) {
    const cells = order.map((p) => {
      const won = p.championBonus || 0; // 15 si acertó al campeón, 0 si no
      cum[p.pid] += won;
      return { won, acum: cum[p.pid] };
    });
    champRow = { label: `🏆 Campeón: ${realChamp}`, result: `+${CHAMPION_POINTS}`, cells, isChamp: true };
  }

  return { order, rows, champRow, realChamp };
}

function pointsReportTableHtml(data, flags) {
  const { order, rows, champRow } = data;
  const P = order.length;
  const showG = flags.ganados, showA = flags.acum;

  let h1 = `<th class="rp-name"></th>`;
  if (showG) h1 += `<th colspan="${P}" class="pr-block">Puntos Ganados</th>`;
  if (showA) h1 += `<th colspan="${P}" class="pr-block pr-acum">Puntos Acumulados</th>`;

  let h2 = `<th class="rp-name">PARTIDO</th>`;
  if (showG) h2 += order.map((p) => `<th class="rp-num">${esc(p.name)}</th>`).join("");
  if (showA) h2 += order.map((p) => `<th class="rp-num pr-acum">${esc(p.name)}</th>`).join("");

  const allRows = champRow ? rows.concat(champRow) : rows;
  const body = allRows.map((r) => {
    const cls = r.isChamp ? ' class="pr-champ-row"' : "";
    let tds = `<td class="rp-name">${esc(r.label)} <span class="pr-res">${esc(r.result)}</span></td>`;
    if (showG) tds += r.cells.map((c) => `<td class="rp-num">${c.won}</td>`).join("");
    if (showA) tds += r.cells.map((c) => `<td class="rp-num pr-acum">${c.acum}</td>`).join("");
    return `<tr${cls}>${tds}</tr>`;
  }).join("");

  return `<table class="rp-table pr-table">
    <thead><tr>${h1}</tr><tr>${h2}</tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function openPointsReport() {
  const data = pointsReportData();
  if (!data.rows.length && !data.champRow) { toast("Aún no hay partidos jugados para el reporte", true); return; }
  renderPointsReportModal(data);
  openModal();
}

function renderPointsReportModal(data) {
  const f = _ptsRep;
  const tableHtml = (f.ganados || f.acum)
    ? pointsReportTableHtml(data, f)
    : `<p class="empty">Activa al menos un bloque (Ganados o Acumulados).</p>`;
  $("#modal-card").innerHTML = `
    <div class="modal-title">📈 Puntos por partido</div>
    <div class="modal-sub">${esc(state.data.name || state.code)} · ${data.rows.length} partido(s) jugado(s)</div>
    <div class="sort-bar" style="margin-bottom:10px">
      <button class="sort-btn sort-btn-toggle${f.ganados ? " active" : ""}" id="pr-tg-ganados">Puntos ganados</button>
      <button class="sort-btn sort-btn-toggle${f.acum ? " active" : ""}" id="pr-tg-acum">Puntos acumulados</button>
    </div>
    <div class="rp-scroll"><div class="rp-table-wrap">${tableHtml}</div></div>
    <div class="modal-actions" style="margin-top:14px">
      <button class="btn btn-accent" id="pr-chart">📊 Gráfica de tendencias</button>
      <button class="btn btn-primary" id="pr-print">🖨️ Versión imprimible</button>
      <button class="btn btn-ghost" id="pr-close">Cerrar</button>
    </div>
  `;
  $("#pr-tg-ganados").addEventListener("click", () => { _ptsRep.ganados = !_ptsRep.ganados; renderPointsReportModal(data); });
  $("#pr-tg-acum").addEventListener("click", () => { _ptsRep.acum = !_ptsRep.acum; renderPointsReportModal(data); });
  $("#pr-chart").addEventListener("click", () => openPointsChart(data));
  $("#pr-print").addEventListener("click", () => printPointsReport(data));
  $("#pr-close").addEventListener("click", closeModal);
}

function printPointsReport(data) {
  if (!_ptsRep.ganados && !_ptsRep.acum) { toast("Activa al menos un bloque para imprimir", true); return; }
  const tableHtml = pointsReportTableHtml(data, _ptsRep);
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <title>Puntos por partido — ${esc(state.data.name || state.code)}</title>
    <style>
      body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; margin: 24px; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      .meta { font-size: 11px; color: #444; margin-bottom: 12px; }
      table { border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #bbb; padding: 4px 7px; text-align: center; white-space: nowrap; }
      td:first-child, th.rp-name { text-align: left; }
      thead th { background: #eee; }
      .pr-block { background: #d9e7ff; text-transform: uppercase; letter-spacing: .3px; }
      .pr-block.pr-acum { background: #ffe9cf; }
      .pr-res { color: #777; font-weight: 400; }
      tr.pr-champ-row td { background: #fff5d6; font-weight: 800; border-top: 2px solid #d9a400; }
      .noprint { margin-bottom: 14px; }
      .noprint button { font-size: 13px; padding: 8px 16px; margin-right: 8px; cursor: pointer; }
      @media print { .noprint { display: none; } body { margin: 10mm; } }
    </style></head><body>
    <div class="noprint">
      <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
      <button onclick="window.close()">Cerrar</button>
    </div>
    <h1>Puntos por partido — ${esc(state.data.name || state.code)}</h1>
    <div class="meta">Código: <b>${esc(state.code)}</b> · ${data.rows.length} partido(s) jugado(s) · Generado: <b>${fmtStamp(Date.now())}</b></div>
    ${tableHtml}
    </body></html>`;
  const w = window.open("", "_blank");
  if (!w) { toast("Permite las ventanas emergentes para imprimir", true); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* Gráfica de tendencias: líneas de puntos acumulados por participante a lo
 * largo de los partidos jugados. Se abre en una ventana nueva (SVG, scroll
 * horizontal e imprimible). */
function openPointsChart(data) {
  const { order } = data;
  // Incluye la columna del bonus de campeón al final (si ya hay campeón).
  const cols = data.champRow ? data.rows.concat(data.champRow) : data.rows;
  if (!cols.length || !order.length) { toast("No hay datos para la gráfica", true); return; }

  const N = cols.length;
  const palette = ["#3aa0ff", "#ff7a3a", "#2ecc71", "#1fc4d6", "#e84393", "#f4d03f",
                   "#9b59b6", "#e74c3c", "#16a085", "#e67e22", "#56d364", "#ff6ad5",
                   "#c0c0c0", "#7f8cff", "#f78fb3", "#00b894"];

  const series = order.map((p, i) => ({
    name: p.name,
    color: palette[i % palette.length],
    vals: cols.map((r) => r.cells[i].acum)
  }));

  let maxAcum = 1;
  series.forEach((s) => s.vals.forEach((v) => { if (v > maxAcum) maxAcum = v; }));
  const maxY = Math.ceil(maxAcum / 10) * 10 || 10;

  // Layout del SVG
  const mL = 55, mR = 30, mT = 56, mB = 250;
  const stepX = Math.max(28, Math.min(64, 1000 / Math.max(1, N - 1)));
  const plotW = (N - 1) * stepX || 1;
  const plotH = 430;
  const W = mL + plotW + mR;
  const H = mT + plotH + mB;
  const xAt = (i) => mL + i * stepX;
  const yAt = (v) => mT + plotH * (1 - v / maxY);

  // Cuadrícula + etiquetas eje Y (cada 10)
  let grid = "";
  for (let v = 0; v <= maxY; v += 10) {
    const yy = yAt(v);
    grid += `<line x1="${mL}" y1="${yy}" x2="${mL + plotW}" y2="${yy}" stroke="#2a3a66" stroke-width="1"/>`;
    grid += `<text x="${mL - 8}" y="${yy + 4}" text-anchor="end" font-size="12" fill="#9fb0d8">${v}</text>`;
  }
  // Eje Y y línea base
  grid += `<line x1="${mL}" y1="${mT}" x2="${mL}" y2="${mT + plotH}" stroke="#46568a" stroke-width="1.5"/>`;
  grid += `<line x1="${mL}" y1="${mT + plotH}" x2="${mL + plotW}" y2="${mT + plotH}" stroke="#46568a" stroke-width="1.5"/>`;

  // Etiquetas eje X (rotadas)
  let xlabels = "";
  cols.forEach((r, i) => {
    const xx = xAt(i);
    const lbl = esc(`${r.label} ${r.result}`);
    const fill = r.isChamp ? "#f4d03f" : "#c7d3f5";
    xlabels += `<text x="${xx}" y="${mT + plotH + 14}" transform="rotate(-60 ${xx} ${mT + plotH + 14})" text-anchor="end" font-size="11" fill="${fill}">${lbl}</text>`;
  });

  // Líneas + puntos
  let lines = "";
  series.forEach((s) => {
    const pts = s.vals.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
    lines += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    lines += s.vals.map((v, i) => `<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(v).toFixed(1)}" r="2.6" fill="${s.color}"/>`).join("");
  });

  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Inter,Arial,sans-serif">
    <rect width="${W}" height="${H}" fill="#0b1437"/>
    <text x="${mL + plotW / 2}" y="30" text-anchor="middle" font-size="18" font-weight="700" fill="#ffffff">Tendencia de puntos acumulados</text>
    ${grid}
    ${lines}
    ${xlabels}
  </svg>`;

  const legendHtml = series.map((s) =>
    `<span class="lg"><i style="background:${s.color}"></i>${esc(s.name)}</span>`
  ).join("");

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <title>Tendencia de puntos — ${esc(state.data.name || state.code)}</title>
    <style>
      body { margin: 0; background: #0b1437; color: #e7ecff; font-family: Inter, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
      .bar { position: sticky; top: 0; background: #0b1437; padding: 12px 16px; border-bottom: 1px solid #2a3a66; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .bar button { font-size: 13px; padding: 8px 14px; cursor: pointer; border-radius: 8px; border: 1px solid #3a4566; background: #16204a; color: #e7ecff; }
      .bar .info { font-size: 12px; color: #9fb0d8; }
      .legend { display: flex; flex-wrap: wrap; gap: 10px 18px; padding: 12px 16px 4px; font-size: 13px; }
      .lg { display: inline-flex; align-items: center; gap: 6px; }
      .lg i { width: 16px; height: 4px; border-radius: 2px; display: inline-block; }
      .chart { overflow-x: auto; padding: 8px 16px 24px; }
      @media print { .noprint { display: none; } .chart { overflow: visible; } }
    </style></head><body>
    <div class="bar noprint">
      <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
      <button onclick="window.close()">Cerrar</button>
      <span class="info">${esc(state.data.name || state.code)} · ${data.rows.length} partido(s) jugado(s)${data.champRow ? " · incluye campeón" : ""}</span>
    </div>
    <div class="legend">${legendHtml}</div>
    <div class="chart">${svg}</div>
    </body></html>`;

  const w = window.open("", "_blank");
  if (!w) { toast("Permite las ventanas emergentes para abrir la gráfica", true); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function anyMatchPlayed() {
  return Object.values(state.data.matches || {}).some((m) => m.played);
}
function isChampLocked() {
  return Date.now() >= CHAMPION_DEADLINE;
}

function openChampionPicker() {
  const teams = allTeamNames();
  const current = (state.data.participants[state.playerKey] || {}).championPick || "";
  $("#modal-card").innerHTML = `
    <div class="modal-title">🏆 Elige al campeón</div>
    <div class="modal-sub">Ganarás +${CHAMPION_POINTS} pts si tu equipo gana el Mundial. ⚠️ Solo puedes elegir <b>una vez</b> y <b>no se puede cambiar</b>. Plazo límite: <b>viernes 19 de junio</b>.</div>
    <div class="champ-picker">
      <select class="champ-select" id="champ-select">
        <option value="">— Selecciona un equipo —</option>
        ${teams.map((t) => `<option value="${t[0]}" ${t[0] === current ? "selected" : ""}>${t[1]} ${t[0]}</option>`).join("")}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-accent" id="save-champ">Guardar campeón</button>
      <button class="btn btn-ghost" id="cancel-champ">Cancelar</button>
    </div>
  `;
  $("#save-champ").addEventListener("click", async () => {
    const val = $("#champ-select").value;
    if (!val) { toast("Selecciona un equipo", true); return; }
    if (current) { toast("Ya elegiste campeón; no se puede cambiar", true); closeModal(); return; }
    if (isChampLocked()) { toast("Plazo vencido: la elección de campeón cerró el viernes 19 de junio", true); closeModal(); return; }
    await db.ref(`tournaments/${state.code}/participants/${state.playerKey}/championPick`).set(val);
    closeModal(); toast("Campeón guardado 🏆");
  });
  $("#cancel-champ").addEventListener("click", closeModal);
  openModal();
}

/* ---------- Vista ESTADÍSTICAS ---------- */
function renderStats() {
  const matches = state.data.matches || {};
  const realChamp = getRealChampion(matches);
  const s = computeUserScore(matches, myPreds(), (state.data.participants[state.playerKey] || {}).championPick, realChamp);
  const pct = s.playedPredicted ? Math.round((s.correct / s.playedPredicted) * 100) : 0;

  const maxRound = Math.max(1, ...ROUNDS.map((r) => s.byRound[r.key] || 0));
  const bars = ROUNDS.map((r) => {
    const v = s.byRound[r.key] || 0;
    return `<div class="bar-row">
      <span class="bl">${r.label}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(v / maxRound) * 100}%"></span></span>
      <span class="bar-val">${v}</span>
    </div>`;
  }).join("");

  $("#stats-content").innerHTML = `
    <div class="stat-grid">
      <div class="stat-box"><div class="big gold">${s.total}</div><div class="lbl">Puntos totales</div></div>
      <div class="stat-box"><div class="big accent">${pct}%</div><div class="lbl">Efectividad</div></div>
      <div class="stat-box"><div class="big">${s.correct}</div><div class="lbl">Resultados acertados</div></div>
      <div class="stat-box"><div class="big">${s.exact}</div><div class="lbl">Marcadores exactos</div></div>
    </div>
    <div class="card">
      <div class="section-title">Puntos por ronda</div>
      ${bars}
    </div>
    <div class="card">
      <div class="section-title">Resumen</div>
      <div class="bar-row"><span class="bl">Predicciones</span><span style="flex:1"></span><span class="bar-val">${Object.keys(myPreds()).length}</span></div>
      <div class="bar-row"><span class="bl">Partidos jugados</span><span style="flex:1"></span><span class="bar-val">${s.playedPredicted}</span></div>
      <div class="bar-row"><span class="bl">Bonus campeón</span><span style="flex:1"></span><span class="bar-val">${s.championBonus}</span></div>
    </div>
  `;
}

/* ---------- Vista ADMIN ---------- */
// Inicio del día de mañana (medianoche local). Un partido es "futuro" si su
// inicio cae mañana o después.
function startOfTomorrowMs() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d.getTime();
}

function renderAdmin() {
  renderRoundFilter("#admin-round-filter", state.adminRound, (r) => { state.adminRound = r; renderAdmin(); });

  const tomorrow = startOfTomorrowMs();
  const isFuture = (m) => typeof m.kickoffMs === "number" && m.kickoffMs >= tomorrow;

  const sortBar = $("#admin-sort-bar");
  if (sortBar) {
    const inRound = matchesArray().filter((m) => m.round === state.adminRound);
    const playedCount = inRound.filter((m) => m.played).length;
    const futureCount = inRound.filter((m) => !m.played && isFuture(m)).length;
    sortBar.innerHTML = `
      <button class="sort-btn sort-btn-toggle${state.adminShowFuture ? " active" : ""}" id="btn-admin-toggle-future">
        ${state.adminShowFuture ? "Ocultar próximos" : `Próximos (${futureCount})`}
      </button>
      <button class="sort-btn sort-btn-toggle${state.adminShowPlayed ? " active" : ""}" id="btn-admin-toggle-played">
        ${state.adminShowPlayed ? "Ocultar finalizados" : `Finalizados (${playedCount})`}
      </button>`;
    const fBtn = $("#btn-admin-toggle-future");
    if (fBtn) fBtn.addEventListener("click", () => { state.adminShowFuture = !state.adminShowFuture; renderAdmin(); });
    const pBtn = $("#btn-admin-toggle-played");
    if (pBtn) pBtn.addEventListener("click", () => { state.adminShowPlayed = !state.adminShowPlayed; renderAdmin(); });
  }

  const list = $("#admin-list");
  const matches = matchesArray()
    .filter((m) => m.round === state.adminRound)
    .filter((m) => state.adminShowPlayed || !m.played)
    .filter((m) => state.adminShowFuture || !isFuture(m))
    .sort((a, b) => (a.kickoffMs || 0) - (b.kickoffMs || 0));
  list.innerHTML = "";
  matches.forEach((m) => list.appendChild(adminCard(m)));
  if (!matches.length) list.innerHTML = `<p class="empty">No hay partidos para capturar en esta ronda. Pulsa <b>Próximos</b> o <b>Finalizados</b> para ver más.</p>`;
}

function adminCard(m) {
  const el = document.createElement("div");
  el.className = "match";
  const editable = m.editable; // eliminatorias: permitir editar nombres
  el.innerHTML = `
    <div class="match-top">
      <span class="match-meta">${metaLine(m)}</span>
      ${statusBadge(m)}
    </div>
    <div class="teams-row">
      <div class="team"><span class="flag">${esc(m.teamA.flag)}</span><span class="tname">${esc(teamName(m.teamA, m.slotA))}</span></div>
      <span class="vs">VS</span>
      <div class="team"><span class="flag">${esc(m.teamB.flag)}</span><span class="tname">${esc(teamName(m.teamB, m.slotB))}</span></div>
    </div>
    <div class="score-pill admin-steppers">
      <div class="stepper">
        <button type="button" data-d="-1" data-s="a">−</button>
        <span class="num" id="ra-${m.id}">${m.realA != null ? m.realA : 0}</span>
        <button type="button" data-d="1" data-s="a">+</button>
      </div>
      <span class="sep">–</span>
      <div class="stepper">
        <button type="button" data-d="-1" data-s="b">−</button>
        <span class="num" id="rb-${m.id}">${m.realB != null ? m.realB : 0}</span>
        <button type="button" data-d="1" data-s="b">+</button>
      </div>
    </div>
    <button class="btn btn-accent" style="margin-top:10px" id="save-${m.id}">${m.played ? "Actualizar resultado" : "Guardar resultado"}</button>
    ${editable ? `<button class="match-action" id="edit-${m.id}" style="margin-top:8px">✏️ Editar equipos (eliminatoria)</button>` : ""}
    <button class="match-action" id="info-${m.id}" style="margin-top:8px">📅 Editar fecha / sede</button>
    ${m.round === "final" ? `<button class="match-action" id="champ-${m.id}" style="margin-top:8px">🏆 Definir campeón${m.champion ? ": " + esc(m.champion) : ""}</button>` : ""}
    ${m.played ? `<button class="match-action" id="clear-${m.id}" style="margin-top:8px">↺ Marcar como no jugado</button>` : ""}
  `;

  el.querySelectorAll(".admin-steppers .stepper button").forEach((b) =>
    b.addEventListener("click", () => {
      const span = el.querySelector("#" + (b.dataset.s === "a" ? "ra-" : "rb-") + m.id);
      const v = (parseInt(span.textContent, 10) || 0) + Number(b.dataset.d);
      span.textContent = Math.max(0, Math.min(30, v));
    })
  );
  el.querySelector("#save-" + m.id).addEventListener("click", () => adminSaveResult(m.id));
  if (editable) el.querySelector("#edit-" + m.id).addEventListener("click", () => adminEditTeams(m.id));
  el.querySelector("#info-" + m.id).addEventListener("click", () => adminEditMatchInfo(m.id));
  if (m.round === "final") el.querySelector("#champ-" + m.id).addEventListener("click", () => adminSetChampion(m.id));
  if (m.played) el.querySelector("#clear-" + m.id).addEventListener("click", () => adminClearResult(m.id));
  return el;
}

// Fija (o quita) el campeón del torneo manualmente, independiente del marcador
// de la final. El campeón debe ser uno de los dos finalistas.
function adminSetChampion(matchId) {
  const m = state.data.matches[matchId];
  const a = m.teamA, b = m.teamB;
  const undef = a.name === "Por definir" || b.name === "Por definir";
  const current = m.champion || "";
  $("#modal-card").innerHTML = `
    <div class="modal-title">🏆 Campeón del torneo</div>
    <div class="modal-sub">Elige al campeón de la final. Es <b>independiente del marcador</b>: la final se captura a 90 minutos y puede terminar en empate (definida por penales).</div>
    ${undef
      ? `<p class="empty">Primero define los equipos de la final con “Editar equipos”.</p>`
      : `<div class="champ-picker">
          <button class="btn ${current === a.name ? "btn-accent" : "btn-ghost"}" id="champ-a">${esc(a.flag)} ${esc(a.name)}${current === a.name ? " ✓" : ""}</button>
          <button class="btn ${current === b.name ? "btn-accent" : "btn-ghost"}" id="champ-b">${esc(b.flag)} ${esc(b.name)}${current === b.name ? " ✓" : ""}</button>
        </div>`}
    <div class="modal-actions" style="margin-top:14px">
      ${current ? `<button class="btn btn-ghost" id="champ-clear">Quitar campeón (${esc(current)})</button>` : ""}
      <button class="btn btn-ghost" id="champ-cancel">Cerrar</button>
    </div>
  `;
  const setChamp = async (name) => {
    try {
      await db.ref(`tournaments/${state.code}/matches/${matchId}`).update({ champion: name });
      closeModal();
      toast(name ? `Campeón: ${name} 🏆` : "Campeón eliminado");
    } catch (e) { toast("Error: " + e.message, true); }
  };
  if (!undef) {
    $("#champ-a").addEventListener("click", () => setChamp(a.name));
    $("#champ-b").addEventListener("click", () => setChamp(b.name));
  }
  if (current) $("#champ-clear").addEventListener("click", () => setChamp(null));
  $("#champ-cancel").addEventListener("click", closeModal);
  openModal();
}

async function adminSaveResult(matchId) {
  const a = parseInt($("#ra-" + matchId).textContent, 10);
  const b = parseInt($("#rb-" + matchId).textContent, 10);
  if (isNaN(a) || isNaN(b) || a < 0 || b < 0) { toast("Ingresa un marcador válido", true); return; }
  try {
    await db.ref(`tournaments/${state.code}/matches/${matchId}`).update({ realA: a, realB: b, played: true });
    toast("Resultado guardado. Puntuaciones actualizadas ✓");
  } catch (e) { toast("Error: " + e.message, true); }
}

async function adminClearResult(matchId) {
  try {
    await db.ref(`tournaments/${state.code}/matches/${matchId}`).update({ realA: null, realB: null, played: false });
    toast("Partido reabierto");
  } catch (e) { toast("Error: " + e.message, true); }
}

// Opciones de un <select> de equipos, agrupadas por grupo (A–L) con bandera.
// `selected` preselecciona el equipo actual si ya estaba definido.
function teamSelectOptions(selected) {
  let html = `<option value="">— Selecciona equipo —</option>`;
  Object.keys(DEFAULT_GROUPS).forEach((g) => {
    html += `<optgroup label="Grupo ${g}">`;
    DEFAULT_GROUPS[g].forEach(([name, flag]) => {
      const sel = name === selected ? " selected" : "";
      html += `<option value="${esc(name)}"${sel}>${flag} ${esc(name)}</option>`;
    });
    html += `</optgroup>`;
  });
  return html;
}

function adminEditTeams(matchId) {
  const m = state.data.matches[matchId];
  const curA = m.teamA.name === "Por definir" ? "" : m.teamA.name;
  const curB = m.teamB.name === "Por definir" ? "" : m.teamB.name;
  $("#modal-card").innerHTML = `
    <div class="modal-title">Editar equipos</div>
    <div class="modal-sub">${roundLabel(m.round)} — define los equipos clasificados<br>
      <small style="color:var(--muted)">${esc(m.slotA || "Equipo A")} &nbsp;vs&nbsp; ${esc(m.slotB || "Equipo B")}</small></div>
    <div class="champ-picker">
      <label class="field"><span>Equipo A <small style="color:var(--muted)">(${esc(m.slotA || "")})</small></span>
        <select class="champ-select" id="ea-name">${teamSelectOptions(curA)}</select></label>
      <label class="field"><span>Equipo B <small style="color:var(--muted)">(${esc(m.slotB || "")})</small></span>
        <select class="champ-select" id="eb-name">${teamSelectOptions(curB)}</select></label>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="save-teams">Guardar equipos</button>
      <button class="btn btn-ghost" id="cancel-teams">Cancelar</button>
    </div>
  `;
  $("#save-teams").addEventListener("click", async () => {
    const aN = $("#ea-name").value, bN = $("#eb-name").value;
    if (!aN || !bN) { toast("Selecciona ambos equipos", true); return; }
    if (aN === bN) { toast("Los dos equipos no pueden ser el mismo", true); return; }
    await db.ref(`tournaments/${state.code}/matches/${matchId}`).update({
      teamA: { name: aN, flag: teamFlag(aN) },
      teamB: { name: bN, flag: teamFlag(bN) }
    });
    closeModal(); toast("Equipos actualizados ✓");
  });
  $("#cancel-teams").addEventListener("click", closeModal);
  openModal();
}

function adminEditMatchInfo(matchId) {
  const m = state.data.matches[matchId];
  // Convierte el kickoff UTC a valor datetime-local en hora local del usuario
  let localDt = "";
  if (m.kickoff) {
    const d = new Date(m.kickoff);
    const pad = n => String(n).padStart(2, "0");
    localDt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  $("#modal-card").innerHTML = `
    <div class="modal-title">📅 Editar partido</div>
    <div class="modal-sub">${esc(teamName(m.teamA, m.slotA))} vs ${esc(teamName(m.teamB, m.slotB))}</div>
    <div class="champ-picker">
      <label class="field">
        <span>Fecha y hora <small style="color:var(--muted)">(hora local)</small></span>
        <input id="edit-kickoff" type="datetime-local" value="${localDt}" style="color-scheme:dark;width:100%" />
      </label>
      <label class="field">
        <span>Sede</span>
        <input id="edit-venue" class="champ-select" type="text" maxlength="40" value="${esc(m.venue || "")}" placeholder="Ej. Mexico City" />
      </label>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="save-match-info">Guardar</button>
      <button class="btn btn-ghost" id="cancel-match-info">Cancelar</button>
    </div>
  `;
  $("#save-match-info").addEventListener("click", async () => {
    const dtVal = $("#edit-kickoff").value;
    const venue = $("#edit-venue").value.trim();
    const update = { venue };
    if (dtVal) {
      const d = new Date(dtVal); // datetime-local se parsea como hora local
      update.kickoff = d.toISOString();
      update.kickoffMs = d.getTime();
    }
    try {
      await db.ref(`tournaments/${state.code}/matches/${matchId}`).update(update);
      closeModal();
      toast("Partido actualizado ✓");
    } catch (e) { toast("Error: " + e.message, true); }
  });
  $("#cancel-match-info").addEventListener("click", closeModal);
  openModal();
}

/* ---------- Reporte admin ---------- */
function openAdminReport() {
  const matches = matchesArray();
  const parts = state.data.participants || {};
  const realChamp = getRealChampion(state.data.matches || {});

  // Calcular puntuaciones y ordenar por pts desc
  const pids = Object.keys(parts);
  const scored = pids.map((pid) => {
    const s = computeUserScore(state.data.matches || {}, predForView(pid), parts[pid].championPick, realChamp);
    const predCount = Object.keys(predForView(pid)).length;
    return { pid, name: parts[pid].name, champ: parts[pid].championPick || "—", predCount, ...s };
  });
  scored.sort((a, b) => b.total - a.total || b.exact - a.exact || a.name.localeCompare(b.name));

  const predectable = matches.filter(
    (m) => m.teamA.name !== "Por definir" && m.teamB.name !== "Por definir"
  ).length;

  // Fila de la tabla resumen
  const tableRows = scored.map((r, i) => {
    const isAdm = r.pid === state.data.adminPlayerKey;
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1;
    return `<tr>
      <td class="rp-name">${medal} ${esc(r.name)}${isAdm ? ' <span class="admin-tag" style="font-size:10px">A</span>' : ""}</td>
      <td class="rp-num">${r.total}</td>
      <td class="rp-num">${r.correct}</td>
      <td class="rp-num">${r.exact}</td>
      <td class="rp-champ">${esc(r.champ)}${r.championBonus > 0 ? ` <b class="rp-pts pos">+${CHAMPION_POINTS}</b>` : ""}</td>
      <td class="rp-num">${r.predCount}/${predectable}</td>
    </tr>`;
  }).join("");

  // Bloque de campeón (+15) — hace visible el bonus por acertar al campeón.
  const champBlock = realChamp ? `
    <div class="section-title" style="margin:18px 0 10px">🏆 Campeón mundial: ${esc(realChamp)} <span style="color:var(--muted);font-size:12px">(+${CHAMPION_POINTS} pts)</span></div>
    <div class="rp-match">
      ${scored.map((r) => `<div class="rp-pred-row">
        <span class="rp-pred-name">${esc(r.name)}</span>
        <span class="rp-pred-val">${esc(r.champ)} <b class="rp-pts ${r.championBonus > 0 ? "pos" : "zero"}">+${r.championBonus > 0 ? CHAMPION_POINTS : 0}</b></span>
      </div>`).join("")}
    </div>` : "";

  // Detalle por partido (jugados o cerrados)
  const closedMatches = matches.filter((m) => m.played || isLocked(m))
    .sort((a, b) => (a.kickoffMs || 0) - (b.kickoffMs || 0));

  const matchBlocks = closedMatches.length
    ? closedMatches.map((m) => {
        const predRows = scored.map((r) => {
          const pred = predForView(r.pid)[m.id];
          const pts = pred && m.played ? scoreMatch(pred, m.realA, m.realB) : null;
          return `<div class="rp-pred-row">
            <span class="rp-pred-name">${esc(r.name)}</span>
            <span class="rp-pred-val">
              ${pred ? `${pred.a}–${pred.b}` : '<span style="color:var(--muted)">—</span>'}
              ${pts != null ? `<b class="rp-pts ${pts > 0 ? "pos" : "zero"}">+${pts}</b>` : ""}
            </span>
          </div>`;
        }).join("");
        const resultLabel = m.played
          ? `<b>${m.realA}–${m.realB}</b>`
          : `<span style="color:var(--gold);font-size:11px">CERRADO</span>`;
        return `<div class="rp-match">
          <div class="rp-match-hdr">
            <span>${esc(m.teamA.flag)} ${esc(teamName(m.teamA, m.slotA))} ${resultLabel} ${esc(teamName(m.teamB, m.slotB))} ${esc(m.teamB.flag)}</span>
            <span class="rp-round">${roundLabel(m.round)}${m.group ? " · Grp " + m.group : ""}</span>
          </div>
          ${predRows}
        </div>`;
      }).join("")
    : `<p class="empty">Sin partidos jugados o cerrados aún.</p>`;

  $("#modal-card").innerHTML = `
    <div class="modal-title">📋 Reporte de participantes</div>
    <div class="modal-sub">${esc(state.data.name || state.code)} · ${scored.length} participante${scored.length !== 1 ? "s" : ""}</div>
    <div class="rp-scroll">
      <div class="rp-table-wrap">
        <table class="rp-table">
          <thead>
            <tr>
              <th class="rp-name">Participante</th>
              <th class="rp-num">Pts</th>
              <th class="rp-num">Ac.</th>
              <th class="rp-num">Ex.</th>
              <th class="rp-champ">Campeón</th>
              <th class="rp-num">Preds.</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      ${champBlock}
      <div class="section-title" style="margin:18px 0 10px">Predicciones por partido</div>
      <div class="rp-matches">${matchBlocks}</div>
    </div>
    <div class="modal-actions" style="margin-top:14px">
      <button class="btn btn-primary" id="print-report">🖨️ Versión imprimible (auditoría)</button>
      <button class="btn btn-ghost" id="close-report">Cerrar</button>
    </div>
  `;
  $("#print-report").addEventListener("click", openAuditReport);
  $("#close-report").addEventListener("click", closeModal);
  openModal();
}

/* ---------- Reporte imprimible para auditoría ----------
 * Abre una ventana nueva con un documento de impresión (tema claro) que incluye:
 *  · Tabla resumen con puntuaciones.
 *  · Detalle por participante con CADA pronóstico y la fecha/hora exacta en que
 *    fue capturado (campo `at`), para fines de auditoría.
 * Se genera de forma autónoma (no depende del modal en pantalla).
 */
function openAuditReport() {
  const matchesMap = state.data.matches || {};
  const parts = state.data.participants || {};
  const realChamp = getRealChampion(matchesMap);

  const matchById = matchesMap;
  const orderedMatchIds = Object.values(matchesMap)
    .sort((a, b) => (a.kickoffMs || 0) - (b.kickoffMs || 0))
    .map((m) => m.id);

  const pids = Object.keys(parts);
  const scored = pids.map((pid) => {
    const preds = predForView(pid);
    const s = computeUserScore(matchesMap, preds, parts[pid].championPick, realChamp);
    return { pid, name: parts[pid].name, champ: parts[pid].championPick || "—", preds, ...s };
  });
  scored.sort((a, b) => b.total - a.total || b.exact - a.exact || a.name.localeCompare(b.name));

  const esc2 = esc; // reutiliza el escape de la app
  const genStamp = fmtStamp(Date.now());

  // Tabla resumen
  const summaryRows = scored.map((r, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${esc2(r.name)}</td>
      <td class="c">${r.total}</td>
      <td class="c">${r.correct}</td>
      <td class="c">${r.exact}</td>
      <td>${esc2(r.champ)}${realChamp && r.championBonus > 0 ? ` <b>(+${CHAMPION_POINTS})</b>` : ""}</td>
      <td class="c">${Object.keys(r.preds).length}</td>
    </tr>`).join("");

  // Detalle por participante con sello de captura
  const detailBlocks = scored.map((r) => {
    const rows = orderedMatchIds.filter((mid) => r.preds[mid]).map((mid) => {
      const m = matchById[mid];
      const pred = r.preds[mid];
      const matchLbl = `${teamName(m.teamA, m.slotA)} vs ${teamName(m.teamB, m.slotB)}`;
      const result = m.played ? `${m.realA}–${m.realB}` : "—";
      const pts = (pred && m.played) ? "+" + scoreMatch(pred, m.realA, m.realB) : "";
      const lead = (typeof m.kickoffMs === "number" && typeof pred.at === "number") ? m.kickoffMs - pred.at : null;
      const leadStr = fmtLeadTime(lead);
      return `<tr>
        <td>${esc2(matchLbl)}</td>
        <td class="c">${pred.a}–${pred.b}</td>
        <td class="c">${fmtStamp(pred.at)}${leadStr ? `<br><span class="lead">${leadStr} antes del partido</span>` : ""}</td>
        <td class="c">${result}</td>
        <td class="c">${pts}</td>
      </tr>`;
    }).join("");
    // Fila del bonus de campeón (si ya hay campeón definido).
    const champLine = realChamp ? `<tr>
        <td>🏆 Campeón mundial: ${esc2(realChamp)}</td>
        <td class="c">${esc2(r.champ)}</td>
        <td class="c">—</td>
        <td class="c">—</td>
        <td class="c">+${r.championBonus > 0 ? CHAMPION_POINTS : 0}</td>
      </tr>` : "";
    const body = (rows + champLine) || `<tr><td colspan="5" class="muted">Sin pronósticos capturados.</td></tr>`;
    return `
      <div class="audit-part">
        <h3>${esc2(r.name)} <span class="muted">· Campeón: ${esc2(r.champ)}${realChamp && r.championBonus > 0 ? " ✓ +" + CHAMPION_POINTS : ""} · Total: ${r.total} pts</span></h3>
        <table class="audit-tbl">
          <thead><tr><th>Partido</th><th>Pronóstico</th><th>Capturado (fecha y hora · antelación)</th><th>Resultado</th><th>Pts</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
  }).join("");

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <title>Auditoría — ${esc2(state.data.name || state.code)}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; margin: 24px; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      h2 { font-size: 14px; margin: 22px 0 8px; border-bottom: 2px solid #333; padding-bottom: 4px; }
      h3 { font-size: 13px; margin: 14px 0 4px; }
      .muted { color: #666; font-weight: 400; font-size: 11px; }
      .meta { font-size: 11px; color: #444; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #bbb; padding: 4px 6px; text-align: left; }
      th { background: #eee; font-size: 10px; text-transform: uppercase; letter-spacing: .3px; }
      td.c, th.c { text-align: center; }
      .audit-part { margin-bottom: 14px; page-break-inside: avoid; }
      .lead { color: #2563eb; font-size: 10px; }
      tfoot { font-size: 10px; color: #777; }
      @media print {
        body { margin: 12mm; }
        .noprint { display: none; }
        h2 { page-break-before: auto; }
      }
      .noprint { margin-bottom: 16px; }
      .noprint button { font-size: 13px; padding: 8px 16px; margin-right: 8px; cursor: pointer; }
    </style></head><body>
    <div class="noprint">
      <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
      <button onclick="window.close()">Cerrar</button>
    </div>
    <h1>Reporte de auditoría — ${esc2(state.data.name || state.code)}</h1>
    <div class="meta">
      Código de torneo: <b>${esc2(state.code)}</b> ·
      Participantes: <b>${scored.length}</b> ·
      Generado: <b>${genStamp}</b>${realChamp ? ` · Campeón: <b>${esc2(realChamp)}</b>` : ""}
    </div>

    <h2>Resumen de puntuaciones</h2>
    <table>
      <thead><tr><th class="c">#</th><th>Participante</th><th class="c">Pts</th><th class="c">Aciertos</th><th class="c">Exactos</th><th>Campeón</th><th class="c">Pronósticos</th></tr></thead>
      <tbody>${summaryRows}</tbody>
    </table>

    <h2>Detalle de pronósticos por participante</h2>
    ${detailBlocks}

    <p class="muted" style="margin-top:18px">
      Nota: la columna «Capturado» refleja la marca de tiempo registrada en la base de datos al guardar el pronóstico
      (hora local). Cuando el participante guarda o modifica su pronóstico, se registra la fecha y hora real de ese momento.
      Los pronósticos capturados por el administrador en nombre de un participante se registran con hora de 16 minutos antes
      del inicio del partido. La «antelación» es el tiempo entre esa marca y el inicio del partido; no se muestra si el pronóstico
      se registró después del inicio. «—» indica que no existe marca de tiempo.
      La fila «🏆 Campeón mundial» refleja el bonus de ${CHAMPION_POINTS} puntos que reciben quienes acertaron al campeón del torneo;
      ya está incluido en la columna «Pts» del resumen.
    </p>
    </body></html>`;

  const w = window.open("", "_blank");
  if (!w) { toast("Permite las ventanas emergentes para abrir el reporte imprimible", true); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* ---------- Captura de predicción por participante (solo admin) ---------- */

// Hora con la que se registra una predicción capturada por el administrador:
// 16 minutos antes del inicio (1 min antes del cierre de 15 min). Se backdatea
// para que quede como enviada justo antes del cierre y para cumplir la regla de
// escritura del servidor (que sólo admite pronósticos previos al cierre), de modo
// que el admin pueda capturar incluso con el partido en curso.
function captureRecordedAt(m) {
  const lt = lockTime(m); // kickoffMs - 15 min
  return (isFinite(lt) ? lt : Date.now()) - 60 * 1000; // = kickoffMs - 16 min
}

// Inicio del día de hoy (medianoche local).
function startOfTodayMs() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function openAdminCapture() {
  if (!isAdmin()) { toast("Solo el administrador puede capturar predicciones", true); return; }
  const parts = state.data.participants || {};
  const pids = Object.keys(parts).sort((a, b) =>
    (parts[a].name || "").localeCompare(parts[b].name || ""));
  // Solo partidos de HOY con equipos definidos (sin "Por definir"), por inicio.
  const startToday = startOfTodayMs();
  const startTomorrow = startOfTomorrowMs();
  const matches = matchesArray()
    .filter((m) => m.teamA.name !== "Por definir" && m.teamB.name !== "Por definir")
    .filter((m) => typeof m.kickoffMs === "number" && m.kickoffMs >= startToday && m.kickoffMs < startTomorrow)
    .sort((a, b) => (a.kickoffMs || 0) - (b.kickoffMs || 0));

  if (!pids.length) { toast("No hay participantes todavía", true); return; }
  if (!matches.length) { toast("No hay partidos de hoy con equipos definidos", true); return; }

  $("#modal-card").innerHTML = `
    <div class="modal-title">✍️ Capturar predicción</div>
    <div class="modal-sub">Registra el marcador de un participante que no alcanzó a enviarlo a tiempo. Se guardará con hora de <b>16 minutos antes del inicio</b> del partido.</div>
    <div class="champ-picker">
      <label class="field"><span>Participante</span>
        <select class="champ-select" id="cap-pid">
          ${pids.map((pid) => `<option value="${esc(pid)}">${esc(parts[pid].name)}</option>`).join("")}
        </select>
      </label>
      <label class="field"><span>Partido</span>
        <select class="champ-select" id="cap-mid">
          ${matches.map((m) => `<option value="${esc(m.id)}">${esc(roundLabel(m.round))}${m.group ? " · Grp " + esc(m.group) : ""} — ${esc(teamName(m.teamA, m.slotA))} vs ${esc(teamName(m.teamB, m.slotB))}</option>`).join("")}
        </select>
      </label>
      <div class="score-pill" style="margin-top:6px">
        <input class="box" id="cap-a" type="number" min="0" max="20" placeholder="-" inputmode="numeric" />
        <span class="sep">–</span>
        <input class="box" id="cap-b" type="number" min="0" max="20" placeholder="-" inputmode="numeric" />
      </div>
      <p class="hint" id="cap-info" style="text-align:left;font-size:11px;margin-top:8px"></p>
    </div>
    <div class="modal-actions">
      <button class="btn btn-accent" id="cap-save">Guardar predicción</button>
      <button class="btn btn-ghost" id="cap-cancel">Cerrar</button>
    </div>
  `;

  $("#cap-pid").addEventListener("change", refreshCaptureInfo);
  $("#cap-mid").addEventListener("change", refreshCaptureInfo);
  $("#cap-save").addEventListener("click", adminCaptureSave);
  $("#cap-cancel").addEventListener("click", closeModal);
  refreshCaptureInfo();
  openModal();
}

// Pre-llena el marcador con la predicción existente (si la hay) y muestra
// la hora con la que se registrará.
function refreshCaptureInfo() {
  const pid = $("#cap-pid").value;
  const mid = $("#cap-mid").value;
  const m = state.data.matches[mid];
  if (!m) return;
  const existing = predForView(pid)[mid];
  $("#cap-a").value = existing ? existing.a : "";
  $("#cap-b").value = existing ? existing.b : "";

  const recIso = new Date(captureRecordedAt(m)).toISOString();
  const parts = [];
  parts.push(existing
    ? `Predicción actual: <b>${existing.a}–${existing.b}</b> (se reemplazará).`
    : "Sin predicción registrada.");
  if (m.played) parts.push(`⚠️ Este partido ya está marcado como <b>jugado</b> (${m.realA}–${m.realB}).`);
  parts.push(`Se registrará como enviado: <b>${esc(fmtKickoff(recIso))}</b> (16 min antes del inicio).`);
  $("#cap-info").innerHTML = parts.join("<br>");
}

async function adminCaptureSave() {
  if (!isAdmin()) { toast("Solo el administrador puede capturar predicciones", true); return; }
  const pid = $("#cap-pid").value;
  const mid = $("#cap-mid").value;
  const a = parseInt($("#cap-a").value, 10);
  const b = parseInt($("#cap-b").value, 10);
  if (!pid || !mid) { toast("Selecciona participante y partido", true); return; }
  if (isNaN(a) || isNaN(b) || a < 0 || b < 0 || a > 20 || b > 20) {
    toast("Marcador inválido (0–20)", true); return;
  }
  const m = state.data.matches[mid];
  const name = (state.data.participants[pid] || {}).name || pid;
  try {
    await db.ref(`tournaments/${state.code}/predictions/${mid}/${pid}`).set({
      a, b, at: captureRecordedAt(m)
    });
    toast(`Predicción de ${name} capturada ✓`);
    refreshCaptureInfo(); // refleja el nuevo valor sin cerrar el modal
  } catch (e) {
    toast("Error: " + e.message, true);
  }
}

/* ===================== UTILIDADES UI ===================== */
function renderRoundFilter(sel, active, onPick) {
  const cont = $(sel);
  cont.innerHTML = "";
  ROUNDS.forEach((r) => {
    const c = document.createElement("button");
    c.className = "chip" + (r.key === active ? " active" : "");
    c.textContent = r.label;
    c.addEventListener("click", () => onPick(r.key));
    cont.appendChild(c);
  });
}

function roundLabel(key) {
  const r = ROUNDS.find((x) => x.key === key);
  return r ? r.label : key;
}

function switchView(v) {
  state.view = v;
  $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
  $$(".view").forEach((x) => x.classList.remove("active"));
  $("#view-" + v).classList.add("active");
  // Si la vista quedó pendiente por un snapshot mientras no era visible, la
  // reconstruimos ahora con los datos más recientes.
  if (_dirtyViews.has(v)) renderView(v);
}

function showScreen(name) {
  $("#screen-auth").classList.toggle("hidden", name !== "auth");
  $("#screen-app").classList.toggle("hidden", name !== "app");
}

function openModal() { $("#modal").classList.remove("hidden"); }
function closeModal() { $("#modal").classList.add("hidden"); }

function showLoader() { $("#loader").classList.remove("hidden"); }
function hideLoader() { $("#loader").classList.add("hidden"); }
function showAuthError(msg) { $("#auth-error").textContent = msg; }

let toastTimer;
function toast(msg, isErr = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast show" + (isErr ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

async function shareCode() {
  const url = location.origin + location.pathname + "?code=" + state.code;
  const text = `¡Únete a mi Quiniela Mundial 2026! Código: ${state.code}\n${url}`;
  if (navigator.share) {
    try { await navigator.share({ title: "Quiniela Mundial 2026", text, url }); return; } catch (_) {}
  }
  try { await navigator.clipboard.writeText(text); toast("Invitación copiada ✓"); }
  catch (_) { toast("Código: " + state.code); }
}

/* ===================== LISTA PÚBLICA DE QUINIELAS ===================== */
async function loadPublicTournaments() {
  const el = $("#public-list");
  if (!el) return;
  el.innerHTML = `<p class="public-loading">Cargando quinielas…</p>`;
  try {
    // Sin orderByChild para evitar requerir índice en las reglas;
    // ordenamos por createdAt en el cliente.
    const snap = await db.ref("publicTournaments").get();

    if (!snap.exists()) {
      el.innerHTML = `<p class="public-empty">No hay quinielas disponibles. ¡Sé el primero en crear una!</p>`;
      return;
    }

    const items = [];
    snap.forEach((c) => items.push({ code: c.key, ...c.val() }));
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (items.length > 30) items.splice(30);

    el.innerHTML = `
      <p class="public-hint">Elige una quiniela para unirte:</p>
      ${items.map((t) => `
        <button class="public-item" data-code="${esc(t.code)}">
          <span class="public-name">${esc(t.name)}</span>
          <span class="public-meta">por ${esc(t.adminName)} · #${esc(t.code)}</span>
        </button>`).join("")}`;

    $$(".public-item", el).forEach((b) =>
      b.addEventListener("click", () => {
        $("#input-code").value = b.dataset.code;
        $$(".public-item", el).forEach((x) => x.classList.remove("selected"));
        b.classList.add("selected");
        $("#input-code").scrollIntoView({ behavior: "smooth", block: "nearest" });
      })
    );
  } catch (e) {
    console.warn("[publicTournaments]", e.code, e.message);
    el.innerHTML = `<p class="public-empty">No se pudo cargar la lista. <a href="#" id="retry-list" style="color:var(--accent)">Reintentar</a></p>`;
    const r = document.getElementById("retry-list");
    if (r) r.addEventListener("click", (ev) => { ev.preventDefault(); loadPublicTournaments(); });
  }
}

/* ===================== HISTORIAL "MIS QUINIELAS" ===================== */
function loadHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch (_) { return []; } }
function saveHistory(arr) { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(0, 20))); }
function addHistory(code, tname, name) {
  const arr = loadHistory().filter((x) => x.code !== code);
  arr.unshift({ code, tname, name, ts: Date.now() });
  saveHistory(arr);
}
function removeHistory(code) { saveHistory(loadHistory().filter((x) => x.code !== code)); }

function renderHistory() {
  const arr = loadHistory();
  const sec = $("#history-section");
  const list = $("#history-list");
  if (!arr.length) { sec.classList.add("hidden"); return; }
  sec.classList.remove("hidden");
  list.innerHTML = "";
  arr.forEach((h) => {
    const item = document.createElement("div");
    item.className = "hist-item";
    item.innerHTML = `
      <button class="hist-enter" data-code="${esc(h.code)}">
        <span class="hist-name">${esc(h.tname || "Quiniela")}</span>
        <span class="hist-meta">#${esc(h.code)} · como ${esc(h.name)}</span>
      </button>
      <button class="hist-del" data-code="${esc(h.code)}" title="Quitar de la lista">✕</button>`;
    list.appendChild(item);
  });
  $$(".hist-enter").forEach((b) => b.addEventListener("click", () => quickEnter(b.dataset.code)));
  $$(".hist-del").forEach((b) =>
    b.addEventListener("click", () => { removeHistory(b.dataset.code); renderHistory(); })
  );
}

async function quickEnter(code) {
  const h = loadHistory().find((x) => x.code === code);
  if (!h) return;
  state.name = h.name;
  state.playerKey = makePlayerKey(h.name, code);
  showLoader();
  try {
    // Asegura que el slot del participante exista (migra torneos anteriores al nuevo playerKey)
    await db.ref(`tournaments/${code}/participants/${state.playerKey}`).update({
      name: h.name,
      joinedAt: firebase.database.ServerValue.TIMESTAMP
    });
    await enterTournament(code);
  } catch (e) {
    hideLoader();
    showScreen("auth");
    toast("No se pudo abrir #" + code + ": " + (e.message || "error"), true);
  }
}

function logout() {
  if (state.ref) state.ref.off();
  state.code = null; state.data = null; state.ref = null; state.playerKey = null;
  showScreen("auth");
  $("#input-code").value = "";
  renderHistory(); // la lista se conserva para reingresar fácil
}
