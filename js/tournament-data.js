/* =========================================================
 *  ESTRUCTURA DEL TORNEO – MUNDIAL 2026 (formato real)
 *  48 equipos en 12 grupos (A–L) de 4 + eliminatorias.
 *  Avanzan: 1º y 2º de cada grupo (24) + los 8 mejores
 *  terceros = 32 -> dieciseisavos (Ronda de 32).
 *  Los nombres de equipo son editables por el admin
 *  (sobre todo en eliminatorias, que dependen de los grupos).
 * ========================================================= */

// 12 grupos de 4 equipos. Edítalos como admin cuando se realice el sorteo.
const DEFAULT_GROUPS = {
  A: [["México", "🇲🇽"], ["Croacia", "🇭🇷"], ["Nigeria", "🇳🇬"], ["Noruega", "🇳🇴"]],
  B: [["Canadá", "🇨🇦"], ["Bélgica", "🇧🇪"], ["Egipto", "🇪🇬"], ["Perú", "🇵🇪"]],
  C: [["Argentina", "🇦🇷"], ["Dinamarca", "🇩🇰"], ["Costa de Marfil", "🇨🇮"], ["Costa Rica", "🇨🇷"]],
  D: [["Estados Unidos", "🇺🇸"], ["Marruecos", "🇲🇦"], ["Túnez", "🇹🇳"], ["Paraguay", "🇵🇾"]],
  E: [["España", "🇪🇸"], ["Uruguay", "🇺🇾"], ["Ghana", "🇬🇭"], ["Suecia", "🇸🇪"]],
  F: [["Brasil", "🇧🇷"], ["Suiza", "🇨🇭"], ["Camerún", "🇨🇲"], ["Panamá", "🇵🇦"]],
  G: [["Francia", "🇫🇷"], ["Colombia", "🇨🇴"], ["Senegal", "🇸🇳"], ["Austria", "🇦🇹"]],
  H: [["Portugal", "🇵🇹"], ["Japón", "🇯🇵"], ["Argelia", "🇩🇿"], ["Escocia", "🏴󠁧󠁢󠁳󠁣󠁴󠁿"]],
  I: [["Alemania", "🇩🇪"], ["Ecuador", "🇪🇨"], ["Arabia Saudita", "🇸🇦"], ["Turquía", "🇹🇷"]],
  J: [["Inglaterra", "🏴󠁧󠁢󠁥󠁮󠁧󠁿"], ["Serbia", "🇷🇸"], ["Catar", "🇶🇦"], ["Ucrania", "🇺🇦"]],
  K: [["Italia", "🇮🇹"], ["Corea del Sur", "🇰🇷"], ["Irán", "🇮🇷"], ["Chile", "🇨🇱"]],
  L: [["Países Bajos", "🇳🇱"], ["Polonia", "🇵🇱"], ["Australia", "🇦🇺"], ["Nueva Zelanda", "🇳🇿"]]
};

// Orden y etiqueta de las rondas (para filtros y bonus)
const ROUNDS = [
  { key: "grupos",        label: "Grupos" },
  { key: "dieciseisavos", label: "16avos" },
  { key: "octavos",       label: "Octavos" },
  { key: "cuartos",       label: "Cuartos" },
  { key: "semis",         label: "Semis" },
  { key: "tercer",        label: "3er lugar" },
  { key: "final",         label: "Final" }
];

// Pares de cada grupo (round-robin de 4 equipos = 6 partidos)
const RR_PAIRS = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];

const PLACEHOLDER = ["Por definir", "🏳️"];

/**
 * Genera el objeto inicial de partidos del torneo.
 * Cada partido: { id, round, group, teamA:{name,flag}, teamB:{name,flag},
 *                 date, realA:null, realB:null, played:false, editable }
 */
function buildInitialMatches() {
  const matches = {};
  let n = 0;
  const team = (t) => ({ name: t[0], flag: t[1] });

  // ---- Fase de grupos ----
  Object.keys(DEFAULT_GROUPS).forEach((g) => {
    const teams = DEFAULT_GROUPS[g];
    RR_PAIRS.forEach(([i, j]) => {
      const id = "m" + String(n++).padStart(3, "0");
      matches[id] = {
        id, round: "grupos", group: g,
        teamA: team(teams[i]), teamB: team(teams[j]),
        date: "", realA: null, realB: null, played: false, editable: false
      };
    });
  });

  // ---- Eliminatorias (equipos por definir, editables por el admin) ----
  const ko = (round, count) => {
    for (let k = 0; k < count; k++) {
      const id = "m" + String(n++).padStart(3, "0");
      matches[id] = {
        id, round, group: null,
        teamA: { name: PLACEHOLDER[0], flag: PLACEHOLDER[1] },
        teamB: { name: PLACEHOLDER[0], flag: PLACEHOLDER[1] },
        date: "", realA: null, realB: null, played: false, editable: true
      };
    }
  };
  ko("dieciseisavos", 16);
  ko("octavos", 8);
  ko("cuartos", 4);
  ko("semis", 2);
  ko("tercer", 1);
  ko("final", 1);

  return matches;
}

// Lista de equipos (para el selector de campeón)
function allTeamNames() {
  const set = [];
  Object.values(DEFAULT_GROUPS).forEach((g) => g.forEach((t) => set.push(t)));
  return set.sort((a, b) => a[0].localeCompare(b[0]));
}
