/* =========================================================
 *  SISTEMA DE PUNTUACIÓN
 *  ---------------------------------------------------------
 *  Categoría 1 – Aciertos de partido (máx 4 pts):
 *    +3  si aciertas el resultado (gana A / gana B / empate)
 *    +1  adicional si aciertas los goles exactos de AMBOS equipos
 *
 *  Categoría 2 – Campeón del mundo:
 *    +CHAMPION_POINTS si el equipo que elegiste como campeón
 *    gana la final (se otorga al cargar el resultado de la final).
 * ========================================================= */

const POINTS_RESULT = 3;   // acertar ganador/empate
const POINTS_EXACT  = 1;   // bonus por goles exactos
const CHAMPION_POINTS = 15; // bonus por acertar al campeón (configurable)

// Resultado 1 (gana A) / X (empate) / 2 (gana B)
function outcome(a, b) {
  if (a > b) return "1";
  if (a < b) return "2";
  return "X";
}

/**
 * Puntos de una predicción contra el resultado real de UN partido.
 * @returns {number} 0..4
 */
function scoreMatch(pred, realA, realB) {
  if (!pred || realA == null || realB == null) return 0;
  let pts = 0;
  if (outcome(pred.a, pred.b) === outcome(realA, realB)) {
    pts += POINTS_RESULT;
    if (pred.a === realA && pred.b === realB) pts += POINTS_EXACT;
  }
  return pts;
}

/**
 * Calcula la puntuación total y desglose de un usuario.
 * @param {object} matches      mapa de partidos {id: match}
 * @param {object} userPreds    predicciones del usuario {matchId: {a,b}}
 * @param {string} championPick nombre del equipo elegido como campeón
 * @param {string|null} realChampion nombre del campeón real (ganador de la final)
 */
function computeUserScore(matches, userPreds, championPick, realChampion) {
  const stats = {
    total: 0,
    byRound: {},      // { grupos: pts, octavos: pts, ... }
    correct: 0,       // partidos con >=3 pts
    exact: 0,         // partidos con 4 pts
    playedPredicted: 0, // partidos jugados que el usuario predijo
    championBonus: 0
  };

  Object.values(matches || {}).forEach((m) => {
    if (!m.played) return;
    const pred = userPreds && userPreds[m.id];
    if (!pred) return;
    stats.playedPredicted++;
    const pts = scoreMatch(pred, m.realA, m.realB);
    stats.total += pts;
    stats.byRound[m.round] = (stats.byRound[m.round] || 0) + pts;
    if (pts >= POINTS_RESULT) stats.correct++;
    if (pts === POINTS_RESULT + POINTS_EXACT) stats.exact++;
  });

  // Bonus de campeón
  if (championPick && realChampion && championPick === realChampion) {
    stats.championBonus = CHAMPION_POINTS;
    stats.total += CHAMPION_POINTS;
    stats.byRound["final"] = (stats.byRound["final"] || 0) + CHAMPION_POINTS;
  }

  return stats;
}

/**
 * Campeón real del torneo.
 * Prioridad: campeón fijado manualmente por el admin en la final (campo
 * `champion`), independiente del marcador — la final se captura a 90 min y
 * puede terminar en empate (se define por penales, que no se capturan).
 * Compatibilidad: si no se fijó manualmente, se deriva del marcador de la
 * final si hay un ganador claro.
 */
function getRealChampion(matches) {
  const finalMatch = Object.values(matches || {}).find((m) => m.round === "final");
  if (!finalMatch) return null;
  if (typeof finalMatch.champion === "string" && finalMatch.champion) return finalMatch.champion;
  if (!finalMatch.played) return null;
  if (finalMatch.realA === finalMatch.realB) return null; // empate: el admin debe fijar el campeón
  return finalMatch.realA > finalMatch.realB
    ? finalMatch.teamA.name
    : finalMatch.teamB.name;
}
