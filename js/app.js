/* =========================================================
 *  APP – Quiniela Mundial 2026
 *  Vanilla JS + Firebase Realtime Database
 * ========================================================= */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const LS_KEY = "quiniela2026_session";

const state = {
  uid: null,
  name: null,
  code: null,
  view: "matches",
  round: "grupos",
  adminRound: "grupos",
  data: null,        // snapshot completo del torneo
  ref: null          // referencia firebase con listener activo
};

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

  // ¿Sesión guardada? -> reentrar automáticamente
  const saved = loadSession();
  if (saved && saved.code && saved.name) {
    state.name = saved.name;
    try {
      await enterTournament(saved.code);
      return;
    } catch (_) { clearSession(); }
  }

  hideLoader();
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

  // Navegación inferior
  $$(".nav-btn").forEach((b) =>
    b.addEventListener("click", () => switchView(b.dataset.view))
  );

  // Cerrar modal al tocar el fondo
  $(".modal-backdrop").addEventListener("click", closeModal);
}

/* ===================== CREAR / UNIRSE ===================== */
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

  let code, exists = true, tries = 0;
  do {
    code = genCode();
    exists = (await db.ref("tournaments/" + code + "/name").get()).exists();
  } while (exists && ++tries < 5);

  state.name = name;

  const payload = {
    name: tname,
    admin: state.uid,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    matches: buildInitialMatches(),
    participants: {
      [state.uid]: { name, championPick: "", joinedAt: firebase.database.ServerValue.TIMESTAMP }
    }
  };

  try {
    await db.ref("tournaments/" + code).set(payload);
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

  const snap = await db.ref("tournaments/" + code + "/name").get();
  if (!snap.exists()) { showAuthError("No existe una quiniela con ese código."); return; }

  state.name = name;
  try {
    await db.ref(`tournaments/${code}/participants/${state.uid}`).update({
      name,
      joinedAt: firebase.database.ServerValue.TIMESTAMP
    });
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
        // asegurar mi participante
        if (!state.data.participants || !state.data.participants[state.uid]) {
          if (first) { reject(new Error("No inscrito")); return; }
        }
        saveSession();
        if (first) {
          first = false;
          hideLoader();
          showScreen("app");
          $("#t-name").textContent = state.data.name;
          $("#t-code").textContent = code;
          $("#u-name").textContent = state.name;
          toggleAdminTab();
          resolve();
        }
        render();
      },
      (err) => { if (first) reject(err); }
    );
  });
}

function isAdmin() { return state.data && state.data.admin === state.uid; }

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
  Object.keys(p).forEach((mid) => { if (p[mid][state.uid]) out[mid] = p[mid][state.uid]; });
  return out;
}
function predForView(uid) {
  const p = state.data.predictions || {};
  const out = {};
  Object.keys(p).forEach((mid) => { if (p[mid][uid]) out[mid] = p[mid][uid]; });
  return out;
}

/* ---------- Vista PARTIDOS ---------- */
function renderMatches() {
  renderRoundFilter("#round-filter", state.round, (r) => { state.round = r; renderMatches(); });

  const list = $("#matches-list");
  const preds = myPreds();
  const matches = matchesArray().filter((m) => m.round === state.round);

  list.innerHTML = "";
  if (!matches.length) { list.innerHTML = `<p class="empty">No hay partidos en esta ronda todavía.</p>`; return; }

  // Agrupar por grupo en fase de grupos
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

function statusBadge(m) {
  if (m.played) return `<span class="match-status status-final">FINAL</span>`;
  return `<span class="match-status status-open">ABIERTO</span>`;
}

// Para eliminatorias sin equipos definidos, muestra el descriptor de
// clasificación (slot) en vez de "Por definir".
function teamName(team, slot) {
  return (team.name === "Por definir" && slot) ? slot : team.name;
}
function metaLine(m) {
  return `${roundLabel(m.round)}${m.group ? " · Grupo " + m.group : ""}` +
         `${m.date ? " · " + m.date : ""}${m.venue ? " · 📍 " + m.venue : ""}`;
}

function matchCard(m, pred) {
  const el = document.createElement("div");
  el.className = "match";
  const locked = m.played;
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

  const actionTxt = locked
    ? (pred ? "🔒 Predicción cerrada" : "🔒 Sin predicción")
    : (pred ? "✏️ Editar predicción" : "🎯 Hacer predicción");

  el.innerHTML = `
    <div class="match-top">
      <span class="match-meta">${metaLine(m)}</span>
      ${statusBadge(m)}
    </div>
    <div class="teams-row">
      <div class="team"><span class="flag">${m.teamA.flag}</span><span class="tname">${teamName(m.teamA, m.slotA)}</span></div>
      <span class="vs">VS</span>
      <div class="team"><span class="flag">${m.teamB.flag}</span><span class="tname">${teamName(m.teamB, m.slotB)}</span></div>
    </div>
    ${realRow}
    ${predRow}
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
  const existing = myPreds()[matchId];
  modalScore = { a: existing ? existing.a : 0, b: existing ? existing.b : 0, matchId };

  $("#modal-card").innerHTML = `
    <div class="modal-title">Tu predicción</div>
    <div class="modal-sub">${roundLabel(m.round)}${m.group ? " · Grupo " + m.group : ""}</div>
    <div class="modal-teams">
      <div class="modal-team">
        <span class="flag">${m.teamA.flag}</span><span class="tname">${m.teamA.name}</span>
        <div class="stepper">
          <button data-d="-1" data-s="a">−</button>
          <span class="num" id="num-a">${modalScore.a}</span>
          <button data-d="1" data-s="a">+</button>
        </div>
      </div>
      <div class="modal-vs">:</div>
      <div class="modal-team">
        <span class="flag">${m.teamB.flag}</span><span class="tname">${m.teamB.name}</span>
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
  const txt = o === "X" ? "Empate" : "Gana <b>" + (o === "1" ? m.teamA.name : m.teamB.name) + "</b>";
  $("#winner-tag").innerHTML = txt;
}

async function savePrediction(m) {
  try {
    await db.ref(`tournaments/${state.code}/predictions/${m.id}/${state.uid}`).set({
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
  const matches = state.data.matches || {};
  const realChamp = getRealChampion(matches);
  const parts = state.data.participants || {};

  const rows = Object.keys(parts).map((uid) => {
    const s = computeUserScore(matches, predForView(uid), parts[uid].championPick, realChamp);
    return { uid, name: parts[uid].name, isAdmin: uid === state.data.admin, ...s };
  });
  rows.sort((a, b) => b.total - a.total || b.exact - a.exact || a.name.localeCompare(b.name));

  // banner campeón
  const banner = $("#champion-banner");
  const myPick = parts[state.uid] && parts[state.uid].championPick;
  if (realChamp) {
    banner.className = "champion-banner show";
    banner.innerHTML = `🏆 Campeón del torneo: <b>${realChamp}</b> · quienes lo eligieron ganaron +${CHAMPION_POINTS} pts.`;
  } else {
    banner.className = "champion-banner show";
    banner.innerHTML = myPick
      ? `🏆 Tu campeón: <b>${myPick}</b> (+${CHAMPION_POINTS} pts si acierta). <a href="#" id="change-champ" style="color:var(--accent)">Cambiar</a>`
      : `🏆 Aún no eliges campeón mundial (+${CHAMPION_POINTS} pts). <a href="#" id="change-champ" style="color:var(--accent)">Elegir ahora</a>`;
    const lockChamp = anyMatchPlayed();
    const link = $("#change-champ");
    if (link) {
      if (lockChamp) { link.replaceWith(document.createTextNode(" (bloqueado: el torneo ya inició)")); }
      else link.addEventListener("click", (e) => { e.preventDefault(); openChampionPicker(); });
    }
  }

  const list = $("#ranking-list");
  list.innerHTML = "";
  rows.forEach((r, i) => {
    const li = document.createElement("li");
    li.className = "rank-item" + (i < 3 ? " top" + (i + 1) : "") + (r.uid === state.uid ? " me" : "");
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1;
    li.innerHTML = `
      <div class="rank-pos">${medal}</div>
      <div class="rank-name">
        <span>${r.name}
          ${r.uid === state.uid ? '<span class="you-tag">TÚ</span>' : ""}
          ${r.isAdmin ? '<span class="admin-tag">ADMIN</span>' : ""}
        </span>
        <small>${r.correct} aciertos · ${r.exact} exactos</small>
      </div>
      <div class="rank-pts">${r.total}<small> pts</small></div>
    `;
    list.appendChild(li);
  });
  if (!rows.length) list.innerHTML = `<p class="empty">Sin participantes aún.</p>`;
}

function anyMatchPlayed() {
  return Object.values(state.data.matches || {}).some((m) => m.played);
}

function openChampionPicker() {
  const teams = allTeamNames();
  const current = (state.data.participants[state.uid] || {}).championPick || "";
  $("#modal-card").innerHTML = `
    <div class="modal-title">🏆 Elige al campeón</div>
    <div class="modal-sub">Ganarás +${CHAMPION_POINTS} pts si tu equipo gana el Mundial. Solo puedes elegir antes de que inicie el torneo.</div>
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
    if (anyMatchPlayed()) { toast("El torneo ya inició", true); closeModal(); return; }
    await db.ref(`tournaments/${state.code}/participants/${state.uid}/championPick`).set(val);
    closeModal(); toast("Campeón guardado 🏆");
  });
  $("#cancel-champ").addEventListener("click", closeModal);
  openModal();
}

/* ---------- Vista ESTADÍSTICAS ---------- */
function renderStats() {
  const matches = state.data.matches || {};
  const realChamp = getRealChampion(matches);
  const s = computeUserScore(matches, myPreds(), (state.data.participants[state.uid] || {}).championPick, realChamp);
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
  const list = $("#admin-list");
  const matches = matchesArray().filter((m) => m.round === state.adminRound);
  list.innerHTML = "";
  matches.forEach((m) => list.appendChild(adminCard(m)));
  if (!matches.length) list.innerHTML = `<p class="empty">Sin partidos en esta ronda.</p>`;
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
      <div class="team"><span class="flag">${m.teamA.flag}</span><span class="tname">${teamName(m.teamA, m.slotA)}</span></div>
      <span class="vs">VS</span>
      <div class="team"><span class="flag">${m.teamB.flag}</span><span class="tname">${teamName(m.teamB, m.slotB)}</span></div>
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
      <label class="field"><span>Equipo A (nombre)</span><input class="champ-select" id="ea-name" value="${m.teamA.name === "Por definir" ? "" : m.teamA.name}" placeholder="${m.slotA || "Ej. Brasil"}" /></label>
      <label class="field"><span>Bandera A (emoji)</span><input class="champ-select" id="ea-flag" value="${m.teamA.flag === "🏳️" ? "" : m.teamA.flag}" placeholder="🇧🇷" maxlength="8" /></label>
      <label class="field"><span>Equipo B (nombre)</span><input class="champ-select" id="eb-name" value="${m.teamB.name === "Por definir" ? "" : m.teamB.name}" placeholder="${m.slotB || "Ej. Francia"}" /></label>
      <label class="field"><span>Bandera B (emoji)</span><input class="champ-select" id="eb-flag" value="${m.teamB.flag === "🏳️" ? "" : m.teamB.flag}" placeholder="🇫🇷" maxlength="8" /></label>
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

/* ===================== SESIÓN ===================== */
function saveSession() { localStorage.setItem(LS_KEY, JSON.stringify({ code: state.code, name: state.name })); }
function loadSession() { try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch (_) { return null; } }
function clearSession() { localStorage.removeItem(LS_KEY); }

function logout() {
  if (state.ref) state.ref.off();
  clearSession();
  state.code = null; state.data = null; state.ref = null;
  showScreen("auth");
  $("#input-code").value = "";
}
