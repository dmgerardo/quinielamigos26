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
  adminRound: "grupos",
  adminShowPlayed: false, // ocultar partidos con resultado en vista admin
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
  const hist = loadHistory();
  if (hist.length && !$("#input-name").value) $("#input-name").value = hist[0].name;
  showScreen("auth");
  loadPublicTournaments();
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
        render();
      },
      (err) => { if (first) reject(err); }
    );
  });
}

function isAdmin() { return state.data && state.data.adminPlayerKey === state.playerKey; }

function toggleAdminTab() {
  $(".admin-only").classList.toggle("hidden", !isAdmin());
}

/* ===================== RENDER PRINCIPAL ===================== */
function render() {
  if (!state.data) return;
  renderMatches();
  renderRanking();
  renderStats();
  if (isAdmin()) renderAdmin();
}

function matchesArray() {
  return Object.values(state.data.matches || {}).sort((a, b) => a.id.localeCompare(b.id));
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
  const finCount = matchesArray().filter(m => m.round === state.round && m.played).length;
  bar.innerHTML = opts.map(o =>
    `<button class="sort-btn${state.matchSort === o.key ? " active" : ""}" data-sort="${o.key}">${o.label}</button>`
  ).join("") +
  `<button class="sort-btn sort-btn-toggle${state.showClosed ? " active" : ""}" id="btn-toggle-closed">
    ${state.showClosed ? "Ocultar finalizados" : `Finalizados (${finCount})`}
  </button>`;
  $$(".sort-btn[data-sort]", bar).forEach(b =>
    b.addEventListener("click", () => { state.matchSort = b.dataset.sort; renderMatches(); })
  );
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

  list.innerHTML = "";
  if (!matches.length) {
    list.innerHTML = `<p class="empty">${state.showClosed ? "No hay partidos en esta ronda todavía." : "No hay partidos abiertos. Pulsa <b>Cerrados</b> para ver todos."}</p>`;
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
// Fecha límite para elegir campeón: viernes 19 jun 2026 al final del día (hora local).
const CHAMPION_DEADLINE = new Date("2026-06-20T00:00:00").getTime();
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
    ${realRow}
    ${predRow}
    ${livePreds}
    <button class="match-action ${pred ? "has-pred" : ""} ${locked ? "locked" : ""}">${actionTxt}</button>
  `;

  const btn = el.querySelector(".match-action");
  if (!locked) btn.addEventListener("click", () => openPrediction(m.id));
  else btn.addEventListener("click", () => toast("Este partido ya está cerrado", true));
  return el;
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
}

function anyMatchPlayed() {
  return Object.values(state.data.matches || {}).some((m) => m.played);
}
function isChampLocked() {
  return anyMatchPlayed() || Date.now() >= CHAMPION_DEADLINE;
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
function renderAdmin() {
  renderRoundFilter("#admin-round-filter", state.adminRound, (r) => { state.adminRound = r; renderAdmin(); });

  const sortBar = $("#admin-sort-bar");
  if (sortBar) {
    const playedCount = matchesArray().filter(m => m.round === state.adminRound && m.played).length;
    sortBar.innerHTML = `<button class="sort-btn sort-btn-toggle${state.adminShowPlayed ? " active" : ""}" id="btn-admin-toggle-played">
      ${state.adminShowPlayed ? "Ocultar finalizados" : `Finalizados (${playedCount})`}
    </button>`;
    const btn = $("#btn-admin-toggle-played");
    if (btn) btn.addEventListener("click", () => { state.adminShowPlayed = !state.adminShowPlayed; renderAdmin(); });
  }

  const list = $("#admin-list");
  const matches = matchesArray()
    .filter((m) => m.round === state.adminRound && (state.adminShowPlayed || !m.played))
    .sort((a, b) => (a.kickoffMs || 0) - (b.kickoffMs || 0));
  list.innerHTML = "";
  matches.forEach((m) => list.appendChild(adminCard(m)));
  if (!matches.length) list.innerHTML = `<p class="empty">${state.adminShowPlayed ? "Sin partidos en esta ronda." : "Sin partidos pendientes. Pulsa <b>Finalizados</b> para ver todos."}</p>`;
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
    <div class="score-pill">
      <input class="box" id="ra-${m.id}" type="number" min="0" max="30" value="${m.realA != null ? m.realA : ""}" placeholder="-" inputmode="numeric" />
      <span class="sep">–</span>
      <input class="box" id="rb-${m.id}" type="number" min="0" max="30" value="${m.realB != null ? m.realB : ""}" placeholder="-" inputmode="numeric" />
    </div>
    <button class="btn btn-accent" style="margin-top:10px" id="save-${m.id}">${m.played ? "Actualizar resultado" : "Guardar resultado"}</button>
    ${editable ? `<button class="match-action" id="edit-${m.id}" style="margin-top:8px">✏️ Editar equipos (eliminatoria)</button>` : ""}
    ${m.played ? `<button class="match-action" id="clear-${m.id}" style="margin-top:8px">↺ Marcar como no jugado</button>` : ""}
  `;

  el.querySelector("#save-" + m.id).addEventListener("click", () => adminSaveResult(m.id));
  if (editable) el.querySelector("#edit-" + m.id).addEventListener("click", () => adminEditTeams(m.id));
  if (m.played) el.querySelector("#clear-" + m.id).addEventListener("click", () => adminClearResult(m.id));
  return el;
}

async function adminSaveResult(matchId) {
  const a = parseInt($("#ra-" + matchId).value, 10);
  const b = parseInt($("#rb-" + matchId).value, 10);
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

function adminEditTeams(matchId) {
  const m = state.data.matches[matchId];
  $("#modal-card").innerHTML = `
    <div class="modal-title">Editar equipos</div>
    <div class="modal-sub">${roundLabel(m.round)} — define los equipos clasificados<br>
      <small style="color:var(--muted)">${m.slotA || "Equipo A"} &nbsp;vs&nbsp; ${m.slotB || "Equipo B"}</small></div>
    <div class="champ-picker">
      <label class="field"><span>Equipo A (nombre)</span><input class="champ-select" id="ea-name" value="${esc(m.teamA.name === "Por definir" ? "" : m.teamA.name)}" placeholder="${esc(m.slotA || "Ej. Brasil")}" /></label>
      <label class="field"><span>Bandera A (emoji)</span><input class="champ-select" id="ea-flag" value="${esc(m.teamA.flag === "🏳️" ? "" : m.teamA.flag)}" placeholder="🇧🇷" maxlength="8" /></label>
      <label class="field"><span>Equipo B (nombre)</span><input class="champ-select" id="eb-name" value="${esc(m.teamB.name === "Por definir" ? "" : m.teamB.name)}" placeholder="${esc(m.slotB || "Ej. Francia")}" /></label>
      <label class="field"><span>Bandera B (emoji)</span><input class="champ-select" id="eb-flag" value="${esc(m.teamB.flag === "🏳️" ? "" : m.teamB.flag)}" placeholder="🇫🇷" maxlength="8" /></label>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="save-teams">Guardar equipos</button>
      <button class="btn btn-ghost" id="cancel-teams">Cancelar</button>
    </div>
  `;
  $("#save-teams").addEventListener("click", async () => {
    const aN = $("#ea-name").value.trim(), bN = $("#eb-name").value.trim();
    if (!aN || !bN) { toast("Escribe ambos equipos", true); return; }
    await db.ref(`tournaments/${state.code}/matches/${matchId}`).update({
      teamA: { name: aN, flag: $("#ea-flag").value.trim() || "🏳️" },
      teamB: { name: bN, flag: $("#eb-flag").value.trim() || "🏳️" }
    });
    closeModal(); toast("Equipos actualizados ✓");
  });
  $("#cancel-teams").addEventListener("click", closeModal);
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
      <td class="rp-champ">${esc(r.champ)}</td>
      <td class="rp-num">${r.predCount}/${predectable}</td>
    </tr>`;
  }).join("");

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
      <div class="section-title" style="margin:18px 0 10px">Predicciones por partido</div>
      <div class="rp-matches">${matchBlocks}</div>
    </div>
    <div class="modal-actions" style="margin-top:14px">
      <button class="btn btn-ghost" id="close-report">Cerrar</button>
    </div>
  `;
  $("#close-report").addEventListener("click", closeModal);
  openModal();
}

/* ---------- Captura de predicción por participante (solo admin) ---------- */

// "Cierre" de un partido = lockTime (15 min antes del inicio). La hora que se
// registra al capturar a nombre de un participante es 1 minuto antes de ese cierre,
// para que la predicción quede como si se hubiera enviado justo antes de cerrar.
function captureRecordedAt(m) {
  const lt = lockTime(m);
  return (isFinite(lt) ? lt : Date.now()) - 60 * 1000;
}

function openAdminCapture() {
  if (!isAdmin()) { toast("Solo el administrador puede capturar predicciones", true); return; }
  const parts = state.data.participants || {};
  const pids = Object.keys(parts).sort((a, b) =>
    (parts[a].name || "").localeCompare(parts[b].name || ""));
  // Solo partidos con equipos definidos (sin "Por definir"), ordenados por inicio.
  const matches = matchesArray()
    .filter((m) => m.teamA.name !== "Por definir" && m.teamB.name !== "Por definir")
    .sort((a, b) => (a.kickoffMs || 0) - (b.kickoffMs || 0));

  if (!pids.length) { toast("No hay participantes todavía", true); return; }
  if (!matches.length) { toast("No hay partidos con equipos definidos", true); return; }

  $("#modal-card").innerHTML = `
    <div class="modal-title">✍️ Capturar predicción</div>
    <div class="modal-sub">Registra el marcador de un participante que no alcanzó a enviarlo a tiempo. Se guardará con hora de <b>1 minuto antes del cierre</b> del partido.</div>
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
  parts.push(`Se registrará como enviado: <b>${esc(fmtKickoff(recIso))}</b> (1 min antes del cierre).`);
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
