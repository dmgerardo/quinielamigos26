/* =========================================================
 *  ESTRUCTURA DEL TORNEO – MUNDIAL 2026 (datos oficiales)
 *  48 equipos en 12 grupos (A–L). Calendario real de fase de
 *  grupos y eliminatorias generado desde el fixture oficial.
 *  Horarios en hora del Este de EE. UU. (ET).
 *  NO EDITAR A MANO: regenerar con _gen_fixtures.py si cambia.
 * ========================================================= */

// 12 grupos de 4 equipos [nombre, bandera]
const DEFAULT_GROUPS = {
  A: [["México", "🇲🇽"], ["Sudáfrica", "🇿🇦"], ["Corea del Sur", "🇰🇷"], ["Chequia", "🇨🇿"]],
  B: [["Canadá", "🇨🇦"], ["Bosnia y Herzegovina", "🇧🇦"], ["Catar", "🇶🇦"], ["Suiza", "🇨🇭"]],
  C: [["Brasil", "🇧🇷"], ["Marruecos", "🇲🇦"], ["Haití", "🇭🇹"], ["Escocia", "🏴󠁧󠁢󠁳󠁣󠁴󠁿"]],
  D: [["Estados Unidos", "🇺🇸"], ["Paraguay", "🇵🇾"], ["Australia", "🇦🇺"], ["Turquía", "🇹🇷"]],
  E: [["Alemania", "🇩🇪"], ["Curazao", "🇨🇼"], ["Costa de Marfil", "🇨🇮"], ["Ecuador", "🇪🇨"]],
  F: [["Países Bajos", "🇳🇱"], ["Japón", "🇯🇵"], ["Suecia", "🇸🇪"], ["Túnez", "🇹🇳"]],
  G: [["Bélgica", "🇧🇪"], ["Egipto", "🇪🇬"], ["Irán", "🇮🇷"], ["Nueva Zelanda", "🇳🇿"]],
  H: [["España", "🇪🇸"], ["Cabo Verde", "🇨🇻"], ["Arabia Saudita", "🇸🇦"], ["Uruguay", "🇺🇾"]],
  I: [["Francia", "🇫🇷"], ["Senegal", "🇸🇳"], ["Irak", "🇮🇶"], ["Noruega", "🇳🇴"]],
  J: [["Argentina", "🇦🇷"], ["Argelia", "🇩🇿"], ["Austria", "🇦🇹"], ["Jordania", "🇯🇴"]],
  K: [["Portugal", "🇵🇹"], ["RD Congo", "🇨🇩"], ["Uzbekistán", "🇺🇿"], ["Colombia", "🇨🇴"]],
  L: [["Inglaterra", "🏴󠁧󠁢󠁥󠁮󠁧󠁿"], ["Croacia", "🇭🇷"], ["Ghana", "🇬🇭"], ["Panamá", "🇵🇦"]],
};

// Rondas (orden y etiqueta) para filtros y bonus
const ROUNDS = [
  { key: "grupos",        label: "Grupos" },
  { key: "dieciseisavos", label: "16avos" },
  { key: "octavos",       label: "Octavos" },
  { key: "cuartos",       label: "Cuartos" },
  { key: "semis",         label: "Semis" },
  { key: "tercer",        label: "3er lugar" },
  { key: "final",         label: "Final" }
];

// Calendario oficial (104 partidos). Para eliminatorias, teamA/teamB
// son "Por definir" y slotA/slotB describen quién clasifica
// (ej. "1º Grupo A", "Mejor 3º", "Ganador #74"); el admin fija los
// equipos reales conforme avanza el torneo.
const WC_FIXTURES = [
  {
    "id": "m001",
    "no": 1,
    "round": "grupos",
    "group": "A",
    "teamA": {
      "name": "México",
      "flag": "🇲🇽"
    },
    "teamB": {
      "name": "Sudáfrica",
      "flag": "🇿🇦"
    },
    "slotA": "",
    "slotB": "",
    "date": "Jue 11 jun · 15:00 ET",
    "venue": "Mexico City",
    "editable": false
  },
  {
    "id": "m002",
    "no": 2,
    "round": "grupos",
    "group": "A",
    "teamA": {
      "name": "Corea del Sur",
      "flag": "🇰🇷"
    },
    "teamB": {
      "name": "Chequia",
      "flag": "🇨🇿"
    },
    "slotA": "",
    "slotB": "",
    "date": "Jue 11 jun · 22:00 ET",
    "venue": "Guadalajara",
    "editable": false
  },
  {
    "id": "m003",
    "no": 3,
    "round": "grupos",
    "group": "A",
    "teamA": {
      "name": "Chequia",
      "flag": "🇨🇿"
    },
    "teamB": {
      "name": "Sudáfrica",
      "flag": "🇿🇦"
    },
    "slotA": "",
    "slotB": "",
    "date": "Jue 18 jun · 12:00 ET",
    "venue": "Atlanta",
    "editable": false
  },
  {
    "id": "m004",
    "no": 4,
    "round": "grupos",
    "group": "A",
    "teamA": {
      "name": "México",
      "flag": "🇲🇽"
    },
    "teamB": {
      "name": "Corea del Sur",
      "flag": "🇰🇷"
    },
    "slotA": "",
    "slotB": "",
    "date": "Jue 18 jun · 21:00 ET",
    "venue": "Guadalajara",
    "editable": false
  },
  {
    "id": "m005",
    "no": 5,
    "round": "grupos",
    "group": "A",
    "teamA": {
      "name": "Chequia",
      "flag": "🇨🇿"
    },
    "teamB": {
      "name": "México",
      "flag": "🇲🇽"
    },
    "slotA": "",
    "slotB": "",
    "date": "Mié 24 jun · 21:00 ET",
    "venue": "Mexico City",
    "editable": false
  },
  {
    "id": "m006",
    "no": 6,
    "round": "grupos",
    "group": "A",
    "teamA": {
      "name": "Sudáfrica",
      "flag": "🇿🇦"
    },
    "teamB": {
      "name": "Corea del Sur",
      "flag": "🇰🇷"
    },
    "slotA": "",
    "slotB": "",
    "date": "Mié 24 jun · 21:00 ET",
    "venue": "Monterrey",
    "editable": false
  },
  {
    "id": "m007",
    "no": 7,
    "round": "grupos",
    "group": "B",
    "teamA": {
      "name": "Canadá",
      "flag": "🇨🇦"
    },
    "teamB": {
      "name": "Bosnia y Herzegovina",
      "flag": "🇧🇦"
    },
    "slotA": "",
    "slotB": "",
    "date": "Vie 12 jun · 15:00 ET",
    "venue": "Toronto",
    "editable": false
  },
  {
    "id": "m008",
    "no": 8,
    "round": "grupos",
    "group": "B",
    "teamA": {
      "name": "Catar",
      "flag": "🇶🇦"
    },
    "teamB": {
      "name": "Suiza",
      "flag": "🇨🇭"
    },
    "slotA": "",
    "slotB": "",
    "date": "Sáb 13 jun · 15:00 ET",
    "venue": "San Francisco Bay Area",
    "editable": false
  },
  {
    "id": "m009",
    "no": 9,
    "round": "grupos",
    "group": "B",
    "teamA": {
      "name": "Suiza",
      "flag": "🇨🇭"
    },
    "teamB": {
      "name": "Bosnia y Herzegovina",
      "flag": "🇧🇦"
    },
    "slotA": "",
    "slotB": "",
    "date": "Jue 18 jun · 15:00 ET",
    "venue": "Los Angeles",
    "editable": false
  },
  {
    "id": "m010",
    "no": 10,
    "round": "grupos",
    "group": "B",
    "teamA": {
      "name": "Canadá",
      "flag": "🇨🇦"
    },
    "teamB": {
      "name": "Catar",
      "flag": "🇶🇦"
    },
    "slotA": "",
    "slotB": "",
    "date": "Jue 18 jun · 18:00 ET",
    "venue": "Vancouver",
    "editable": false
  },
  {
    "id": "m011",
    "no": 11,
    "round": "grupos",
    "group": "B",
    "teamA": {
      "name": "Suiza",
      "flag": "🇨🇭"
    },
    "teamB": {
      "name": "Canadá",
      "flag": "🇨🇦"
    },
    "slotA": "",
    "slotB": "",
    "date": "Mié 24 jun · 15:00 ET",
    "venue": "Vancouver",
    "editable": false
  },
  {
    "id": "m012",
    "no": 12,
    "round": "grupos",
    "group": "B",
    "teamA": {
      "name": "Bosnia y Herzegovina",
      "flag": "🇧🇦"
    },
    "teamB": {
      "name": "Catar",
      "flag": "🇶🇦"
    },
    "slotA": "",
    "slotB": "",
    "date": "Mié 24 jun · 15:00 ET",
    "venue": "Seattle",
    "editable": false
  },
  {
    "id": "m013",
    "no": 13,
    "round": "grupos",
    "group": "C",
    "teamA": {
      "name": "Brasil",
      "flag": "🇧🇷"
    },
    "teamB": {
      "name": "Marruecos",
      "flag": "🇲🇦"
    },
    "slotA": "",
    "slotB": "",
    "date": "Sáb 13 jun · 18:00 ET",
    "venue": "New York / New Jersy",
    "editable": false
  },
  {
    "id": "m014",
    "no": 14,
    "round": "grupos",
    "group": "C",
    "teamA": {
      "name": "Haití",
      "flag": "🇭🇹"
    },
    "teamB": {
      "name": "Escocia",
      "flag": "🏴󠁧󠁢󠁳󠁣󠁴󠁿"
    },
    "slotA": "",
    "slotB": "",
    "date": "Sáb 13 jun · 21:00 ET",
    "venue": "Boston",
    "editable": false
  },
  {
    "id": "m015",
    "no": 15,
    "round": "grupos",
    "group": "C",
    "teamA": {
      "name": "Escocia",
      "flag": "🏴󠁧󠁢󠁳󠁣󠁴󠁿"
    },
    "teamB": {
      "name": "Marruecos",
      "flag": "🇲🇦"
    },
    "slotA": "",
    "slotB": "",
    "date": "Vie 19 jun · 18:00 ET",
    "venue": "Boston",
    "editable": false
  },
  {
    "id": "m016",
    "no": 16,
    "round": "grupos",
    "group": "C",
    "teamA": {
      "name": "Brasil",
      "flag": "🇧🇷"
    },
    "teamB": {
      "name": "Haití",
      "flag": "🇭🇹"
    },
    "slotA": "",
    "slotB": "",
    "date": "Vie 19 jun · 21:00 ET",
    "venue": "Philadelphia",
    "editable": false
  },
  {
    "id": "m017",
    "no": 17,
    "round": "grupos",
    "group": "C",
    "teamA": {
      "name": "Escocia",
      "flag": "🏴󠁧󠁢󠁳󠁣󠁴󠁿"
    },
    "teamB": {
      "name": "Brasil",
      "flag": "🇧🇷"
    },
    "slotA": "",
    "slotB": "",
    "date": "Mié 24 jun · 18:00 ET",
    "venue": "Miami",
    "editable": false
  },
  {
    "id": "m018",
    "no": 18,
    "round": "grupos",
    "group": "C",
    "teamA": {
      "name": "Marruecos",
      "flag": "🇲🇦"
    },
    "teamB": {
      "name": "Haití",
      "flag": "🇭🇹"
    },
    "slotA": "",
    "slotB": "",
    "date": "Mié 24 jun · 18:00 ET",
    "venue": "Atlanta",
    "editable": false
  },
  {
    "id": "m019",
    "no": 19,
    "round": "grupos",
    "group": "D",
    "teamA": {
      "name": "Estados Unidos",
      "flag": "🇺🇸"
    },
    "teamB": {
      "name": "Paraguay",
      "flag": "🇵🇾"
    },
    "slotA": "",
    "slotB": "",
    "date": "Vie 12 jun · 21:00 ET",
    "venue": "Los Angeles",
    "editable": false
  },
  {
    "id": "m020",
    "no": 20,
    "round": "grupos",
    "group": "D",
    "teamA": {
      "name": "Australia",
      "flag": "🇦🇺"
    },
    "teamB": {
      "name": "Turquía",
      "flag": "🇹🇷"
    },
    "slotA": "",
    "slotB": "",
    "date": "Sáb 13 jun · 00:00 ET",
    "venue": "Vancouver",
    "editable": false
  },
  {
    "id": "m021",
    "no": 21,
    "round": "grupos",
    "group": "D",
    "teamA": {
      "name": "Estados Unidos",
      "flag": "🇺🇸"
    },
    "teamB": {
      "name": "Australia",
      "flag": "🇦🇺"
    },
    "slotA": "",
    "slotB": "",
    "date": "Vie 19 jun · 15:00 ET",
    "venue": "Seattle",
    "editable": false
  },
  {
    "id": "m022",
    "no": 22,
    "round": "grupos",
    "group": "D",
    "teamA": {
      "name": "Turquía",
      "flag": "🇹🇷"
    },
    "teamB": {
      "name": "Paraguay",
      "flag": "🇵🇾"
    },
    "slotA": "",
    "slotB": "",
    "date": "Vie 19 jun · 00:00 ET",
    "venue": "San Francisco Bay Area",
    "editable": false
  },
  {
    "id": "m023",
    "no": 23,
    "round": "grupos",
    "group": "D",
    "teamA": {
      "name": "Turquía",
      "flag": "🇹🇷"
    },
    "teamB": {
      "name": "Estados Unidos",
      "flag": "🇺🇸"
    },
    "slotA": "",
    "slotB": "",
    "date": "Jue 25 jun · 22:00 ET",
    "venue": "Los Angeles",
    "editable": false
  },
  {
    "id": "m024",
    "no": 24,
    "round": "grupos",
    "group": "D",
    "teamA": {
      "name": "Paraguay",
      "flag": "🇵🇾"
    },
    "teamB": {
      "name": "Australia",
      "flag": "🇦🇺"
    },
    "slotA": "",
    "slotB": "",
    "date": "Jue 25 jun · 22:00 ET",
    "venue": "San Francisco Bay Area",
    "editable": false
  },
  {
    "id": "m025",
    "no": 25,
    "round": "grupos",
    "group": "E",
    "teamA": {
      "name": "Alemania",
      "flag": "🇩🇪"
    },
    "teamB": {
      "name": "Curazao",
      "flag": "🇨🇼"
    },
    "slotA": "",
    "slotB": "",
    "date": "Dom 14 jun · 13:00 ET",
    "venue": "Houston",
    "editable": false
  },
  {
    "id": "m026",
    "no": 26,
    "round": "grupos",
    "group": "E",
    "teamA": {
      "name": "Costa de Marfil",
      "flag": "🇨🇮"
    },
    "teamB": {
      "name": "Ecuador",
      "flag": "🇪🇨"
    },
    "slotA": "",
    "slotB": "",
    "date": "Dom 14 jun · 19:00 ET",
    "venue": "Philadelphia",
    "editable": false
  },
  {
    "id": "m027",
    "no": 27,
    "round": "grupos",
    "group": "E",
    "teamA": {
      "name": "Alemania",
      "flag": "🇩🇪"
    },
    "teamB": {
      "name": "Costa de Marfil",
      "flag": "🇨🇮"
    },
    "slotA": "",
    "slotB": "",
    "date": "Sáb 20 jun · 16:00 ET",
    "venue": "Toronto",
    "editable": false
  },
  {
    "id": "m028",
    "no": 28,
    "round": "grupos",
    "group": "E",
    "teamA": {
      "name": "Ecuador",
      "flag": "🇪🇨"
    },
    "teamB": {
      "name": "Curazao",
      "flag": "🇨🇼"
    },
    "slotA": "",
    "slotB": "",
    "date": "Sáb 20 jun · 20:00 ET",
    "venue": "Kansas City",
    "editable": false
  },
  {
    "id": "m029",
    "no": 29,
    "round": "grupos",
    "group": "E",
    "teamA": {
      "name": "Curazao",
      "flag": "🇨🇼"
    },
    "teamB": {
      "name": "Costa de Marfil",
      "flag": "🇨🇮"
    },
    "slotA": "",
    "slotB": "",
    "date": "Jue 25 jun · 16:00 ET",
    "venue": "Philadelphia",
    "editable": false
  },
  {
    "id": "m030",
    "no": 30,
    "round": "grupos",
    "group": "E",
    "teamA": {
      "name": "Ecuador",
      "flag": "🇪🇨"
    },
    "teamB": {
      "name": "Alemania",
      "flag": "🇩🇪"
    },
    "slotA": "",
    "slotB": "",
    "date": "Jue 25 jun · 16:00 ET",
    "venue": "New York / New Jersy",
    "editable": false
  },
  {
    "id": "m031",
    "no": 31,
    "round": "grupos",
    "group": "F",
    "teamA": {
      "name": "Países Bajos",
      "flag": "🇳🇱"
    },
    "teamB": {
      "name": "Japón",
      "flag": "🇯🇵"
    },
    "slotA": "",
    "slotB": "",
    "date": "Dom 14 jun · 16:00 ET",
    "venue": "Dallas",
    "editable": false
  },
  {
    "id": "m032",
    "no": 32,
    "round": "grupos",
    "group": "F",
    "teamA": {
      "name": "Suecia",
      "flag": "🇸🇪"
    },
    "teamB": {
      "name": "Túnez",
      "flag": "🇹🇳"
    },
    "slotA": "",
    "slotB": "",
    "date": "Dom 14 jun · 22:00 ET",
    "venue": "Monterrey",
    "editable": false
  },
  {
    "id": "m033",
    "no": 33,
    "round": "grupos",
    "group": "F",
    "teamA": {
      "name": "Países Bajos",
      "flag": "🇳🇱"
    },
    "teamB": {
      "name": "Suecia",
      "flag": "🇸🇪"
    },
    "slotA": "",
    "slotB": "",
    "date": "Sáb 20 jun · 13:00 ET",
    "venue": "Houston",
    "editable": false
  },
  {
    "id": "m034",
    "no": 34,
    "round": "grupos",
    "group": "F",
    "teamA": {
      "name": "Túnez",
      "flag": "🇹🇳"
    },
    "teamB": {
      "name": "Japón",
      "flag": "🇯🇵"
    },
    "slotA": "",
    "slotB": "",
    "date": "Sáb 20 jun · 00:00 ET",
    "venue": "Monterrey",
    "editable": false
  },
  {
    "id": "m035",
    "no": 35,
    "round": "grupos",
    "group": "F",
    "teamA": {
      "name": "Japón",
      "flag": "🇯🇵"
    },
    "teamB": {
      "name": "Suecia",
      "flag": "🇸🇪"
    },
    "slotA": "",
    "slotB": "",
    "date": "Jue 25 jun · 19:00 ET",
    "venue": "Dallas",
    "editable": false
  },
  {
    "id": "m036",
    "no": 36,
    "round": "grupos",
    "group": "F",
    "teamA": {
      "name": "Túnez",
      "flag": "🇹🇳"
    },
    "teamB": {
      "name": "Países Bajos",
      "flag": "🇳🇱"
    },
    "slotA": "",
    "slotB": "",
    "date": "Jue 25 jun · 19:00 ET",
    "venue": "Kansas City",
    "editable": false
  },
  {
    "id": "m037",
    "no": 37,
    "round": "grupos",
    "group": "G",
    "teamA": {
      "name": "Bélgica",
      "flag": "🇧🇪"
    },
    "teamB": {
      "name": "Egipto",
      "flag": "🇪🇬"
    },
    "slotA": "",
    "slotB": "",
    "date": "Lun 15 jun · 15:00 ET",
    "venue": "Seattle",
    "editable": false
  },
  {
    "id": "m038",
    "no": 38,
    "round": "grupos",
    "group": "G",
    "teamA": {
      "name": "Irán",
      "flag": "🇮🇷"
    },
    "teamB": {
      "name": "Nueva Zelanda",
      "flag": "🇳🇿"
    },
    "slotA": "",
    "slotB": "",
    "date": "Lun 15 jun · 21:00 ET",
    "venue": "Los Angeles",
    "editable": false
  },
  {
    "id": "m039",
    "no": 39,
    "round": "grupos",
    "group": "G",
    "teamA": {
      "name": "Bélgica",
      "flag": "🇧🇪"
    },
    "teamB": {
      "name": "Irán",
      "flag": "🇮🇷"
    },
    "slotA": "",
    "slotB": "",
    "date": "Dom 21 jun · 15:00 ET",
    "venue": "Los Angeles",
    "editable": false
  },
  {
    "id": "m040",
    "no": 40,
    "round": "grupos",
    "group": "G",
    "teamA": {
      "name": "Nueva Zelanda",
      "flag": "🇳🇿"
    },
    "teamB": {
      "name": "Egipto",
      "flag": "🇪🇬"
    },
    "slotA": "",
    "slotB": "",
    "date": "Dom 21 jun · 21:00 ET",
    "venue": "Vancouver",
    "editable": false
  },
  {
    "id": "m041",
    "no": 41,
    "round": "grupos",
    "group": "G",
    "teamA": {
      "name": "Egipto",
      "flag": "🇪🇬"
    },
    "teamB": {
      "name": "Irán",
      "flag": "🇮🇷"
    },
    "slotA": "",
    "slotB": "",
    "date": "Vie 26 jun · 23:00 ET",
    "venue": "Seattle",
    "editable": false
  },
  {
    "id": "m042",
    "no": 42,
    "round": "grupos",
    "group": "G",
    "teamA": {
      "name": "Nueva Zelanda",
      "flag": "🇳🇿"
    },
    "teamB": {
      "name": "Bélgica",
      "flag": "🇧🇪"
    },
    "slotA": "",
    "slotB": "",
    "date": "Vie 26 jun · 23:00 ET",
    "venue": "Vancouver",
    "editable": false
  },
  {
    "id": "m043",
    "no": 43,
    "round": "grupos",
    "group": "H",
    "teamA": {
      "name": "España",
      "flag": "🇪🇸"
    },
    "teamB": {
      "name": "Cabo Verde",
      "flag": "🇨🇻"
    },
    "slotA": "",
    "slotB": "",
    "date": "Lun 15 jun · 12:00 ET",
    "venue": "Atlanta",
    "editable": false
  },
  {
    "id": "m044",
    "no": 44,
    "round": "grupos",
    "group": "H",
    "teamA": {
      "name": "Arabia Saudita",
      "flag": "🇸🇦"
    },
    "teamB": {
      "name": "Uruguay",
      "flag": "🇺🇾"
    },
    "slotA": "",
    "slotB": "",
    "date": "Lun 15 jun · 18:00 ET",
    "venue": "Miami",
    "editable": false
  },
  {
    "id": "m045",
    "no": 45,
    "round": "grupos",
    "group": "H",
    "teamA": {
      "name": "España",
      "flag": "🇪🇸"
    },
    "teamB": {
      "name": "Arabia Saudita",
      "flag": "🇸🇦"
    },
    "slotA": "",
    "slotB": "",
    "date": "Dom 21 jun · 12:00 ET",
    "venue": "Atlanta",
    "editable": false
  },
  {
    "id": "m046",
    "no": 46,
    "round": "grupos",
    "group": "H",
    "teamA": {
      "name": "Uruguay",
      "flag": "🇺🇾"
    },
    "teamB": {
      "name": "Cabo Verde",
      "flag": "🇨🇻"
    },
    "slotA": "",
    "slotB": "",
    "date": "Dom 21 jun · 18:00 ET",
    "venue": "Miami",
    "editable": false
  },
  {
    "id": "m047",
    "no": 47,
    "round": "grupos",
    "group": "H",
    "teamA": {
      "name": "Cabo Verde",
      "flag": "🇨🇻"
    },
    "teamB": {
      "name": "Arabia Saudita",
      "flag": "🇸🇦"
    },
    "slotA": "",
    "slotB": "",
    "date": "Vie 26 jun · 20:00 ET",
    "venue": "Houston",
    "editable": false
  },
  {
    "id": "m048",
    "no": 48,
    "round": "grupos",
    "group": "H",
    "teamA": {
      "name": "Uruguay",
      "flag": "🇺🇾"
    },
    "teamB": {
      "name": "España",
      "flag": "🇪🇸"
    },
    "slotA": "",
    "slotB": "",
    "date": "Vie 26 jun · 20:00 ET",
    "venue": "Guadalajara",
    "editable": false
  },
  {
    "id": "m049",
    "no": 49,
    "round": "grupos",
    "group": "I",
    "teamA": {
      "name": "Francia",
      "flag": "🇫🇷"
    },
    "teamB": {
      "name": "Senegal",
      "flag": "🇸🇳"
    },
    "slotA": "",
    "slotB": "",
    "date": "Mar 16 jun · 15:00 ET",
    "venue": "New York / New Jersy",
    "editable": false
  },
  {
    "id": "m050",
    "no": 50,
    "round": "grupos",
    "group": "I",
    "teamA": {
      "name": "Irak",
      "flag": "🇮🇶"
    },
    "teamB": {
      "name": "Noruega",
      "flag": "🇳🇴"
    },
    "slotA": "",
    "slotB": "",
    "date": "Mar 16 jun · 18:00 ET",
    "venue": "Boston",
    "editable": false
  },
  {
    "id": "m051",
    "no": 51,
    "round": "grupos",
    "group": "I",
    "teamA": {
      "name": "Francia",
      "flag": "🇫🇷"
    },
    "teamB": {
      "name": "Irak",
      "flag": "🇮🇶"
    },
    "slotA": "",
    "slotB": "",
    "date": "Lun 22 jun · 17:00 ET",
    "venue": "Philadelphia",
    "editable": false
  },
  {
    "id": "m052",
    "no": 52,
    "round": "grupos",
    "group": "I",
    "teamA": {
      "name": "Noruega",
      "flag": "🇳🇴"
    },
    "teamB": {
      "name": "Senegal",
      "flag": "🇸🇳"
    },
    "slotA": "",
    "slotB": "",
    "date": "Lun 22 jun · 20:00 ET",
    "venue": "New York / New Jersy",
    "editable": false
  },
  {
    "id": "m053",
    "no": 53,
    "round": "grupos",
    "group": "I",
    "teamA": {
      "name": "Noruega",
      "flag": "🇳🇴"
    },
    "teamB": {
      "name": "Francia",
      "flag": "🇫🇷"
    },
    "slotA": "",
    "slotB": "",
    "date": "Vie 26 jun · 15:00 ET",
    "venue": "Boston",
    "editable": false
  },
  {
    "id": "m054",
    "no": 54,
    "round": "grupos",
    "group": "I",
    "teamA": {
      "name": "Senegal",
      "flag": "🇸🇳"
    },
    "teamB": {
      "name": "Irak",
      "flag": "🇮🇶"
    },
    "slotA": "",
    "slotB": "",
    "date": "Vie 26 jun · 15:00 ET",
    "venue": "Toronto",
    "editable": false
  },
  {
    "id": "m055",
    "no": 55,
    "round": "grupos",
    "group": "J",
    "teamA": {
      "name": "Argentina",
      "flag": "🇦🇷"
    },
    "teamB": {
      "name": "Argelia",
      "flag": "🇩🇿"
    },
    "slotA": "",
    "slotB": "",
    "date": "Mar 16 jun · 21:00 ET",
    "venue": "Kansas City",
    "editable": false
  },
  {
    "id": "m056",
    "no": 56,
    "round": "grupos",
    "group": "J",
    "teamA": {
      "name": "Austria",
      "flag": "🇦🇹"
    },
    "teamB": {
      "name": "Jordania",
      "flag": "🇯🇴"
    },
    "slotA": "",
    "slotB": "",
    "date": "Mar 16 jun · 00:00 ET",
    "venue": "San Francisco Bay Area",
    "editable": false
  },
  {
    "id": "m057",
    "no": 57,
    "round": "grupos",
    "group": "J",
    "teamA": {
      "name": "Argentina",
      "flag": "🇦🇷"
    },
    "teamB": {
      "name": "Austria",
      "flag": "🇦🇹"
    },
    "slotA": "",
    "slotB": "",
    "date": "Lun 22 jun · 13:00 ET",
    "venue": "Dallas",
    "editable": false
  },
  {
    "id": "m058",
    "no": 58,
    "round": "grupos",
    "group": "J",
    "teamA": {
      "name": "Jordania",
      "flag": "🇯🇴"
    },
    "teamB": {
      "name": "Argelia",
      "flag": "🇩🇿"
    },
    "slotA": "",
    "slotB": "",
    "date": "Lun 22 jun · 23:00 ET",
    "venue": "San Francisco Bay Area",
    "editable": false
  },
  {
    "id": "m059",
    "no": 59,
    "round": "grupos",
    "group": "J",
    "teamA": {
      "name": "Argelia",
      "flag": "🇩🇿"
    },
    "teamB": {
      "name": "Austria",
      "flag": "🇦🇹"
    },
    "slotA": "",
    "slotB": "",
    "date": "Sáb 27 jun · 22:00 ET",
    "venue": "Kansas City",
    "editable": false
  },
  {
    "id": "m060",
    "no": 60,
    "round": "grupos",
    "group": "J",
    "teamA": {
      "name": "Jordania",
      "flag": "🇯🇴"
    },
    "teamB": {
      "name": "Argentina",
      "flag": "🇦🇷"
    },
    "slotA": "",
    "slotB": "",
    "date": "Sáb 27 jun · 22:00 ET",
    "venue": "Dallas",
    "editable": false
  },
  {
    "id": "m061",
    "no": 61,
    "round": "grupos",
    "group": "K",
    "teamA": {
      "name": "Portugal",
      "flag": "🇵🇹"
    },
    "teamB": {
      "name": "RD Congo",
      "flag": "🇨🇩"
    },
    "slotA": "",
    "slotB": "",
    "date": "Mié 17 jun · 13:00 ET",
    "venue": "Houston",
    "editable": false
  },
  {
    "id": "m062",
    "no": 62,
    "round": "grupos",
    "group": "K",
    "teamA": {
      "name": "Uzbekistán",
      "flag": "🇺🇿"
    },
    "teamB": {
      "name": "Colombia",
      "flag": "🇨🇴"
    },
    "slotA": "",
    "slotB": "",
    "date": "Mié 17 jun · 22:00 ET",
    "venue": "Mexico City",
    "editable": false
  },
  {
    "id": "m063",
    "no": 63,
    "round": "grupos",
    "group": "K",
    "teamA": {
      "name": "Portugal",
      "flag": "🇵🇹"
    },
    "teamB": {
      "name": "Uzbekistán",
      "flag": "🇺🇿"
    },
    "slotA": "",
    "slotB": "",
    "date": "Mar 23 jun · 13:00 ET",
    "venue": "Houston",
    "editable": false
  },
  {
    "id": "m064",
    "no": 64,
    "round": "grupos",
    "group": "K",
    "teamA": {
      "name": "Colombia",
      "flag": "🇨🇴"
    },
    "teamB": {
      "name": "RD Congo",
      "flag": "🇨🇩"
    },
    "slotA": "",
    "slotB": "",
    "date": "Mar 23 jun · 22:00 ET",
    "venue": "Guadalajara",
    "editable": false
  },
  {
    "id": "m065",
    "no": 65,
    "round": "grupos",
    "group": "K",
    "teamA": {
      "name": "Colombia",
      "flag": "🇨🇴"
    },
    "teamB": {
      "name": "Portugal",
      "flag": "🇵🇹"
    },
    "slotA": "",
    "slotB": "",
    "date": "Sáb 27 jun · 19:30 ET",
    "venue": "Miami",
    "editable": false
  },
  {
    "id": "m066",
    "no": 66,
    "round": "grupos",
    "group": "K",
    "teamA": {
      "name": "RD Congo",
      "flag": "🇨🇩"
    },
    "teamB": {
      "name": "Uzbekistán",
      "flag": "🇺🇿"
    },
    "slotA": "",
    "slotB": "",
    "date": "Sáb 27 jun · 19:30 ET",
    "venue": "Atlanta",
    "editable": false
  },
  {
    "id": "m067",
    "no": 67,
    "round": "grupos",
    "group": "L",
    "teamA": {
      "name": "Inglaterra",
      "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿"
    },
    "teamB": {
      "name": "Croacia",
      "flag": "🇭🇷"
    },
    "slotA": "",
    "slotB": "",
    "date": "Mié 17 jun · 16:00 ET",
    "venue": "Dallas",
    "editable": false
  },
  {
    "id": "m068",
    "no": 68,
    "round": "grupos",
    "group": "L",
    "teamA": {
      "name": "Ghana",
      "flag": "🇬🇭"
    },
    "teamB": {
      "name": "Panamá",
      "flag": "🇵🇦"
    },
    "slotA": "",
    "slotB": "",
    "date": "Mié 17 jun · 19:00 ET",
    "venue": "Toronto",
    "editable": false
  },
  {
    "id": "m069",
    "no": 69,
    "round": "grupos",
    "group": "L",
    "teamA": {
      "name": "Inglaterra",
      "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿"
    },
    "teamB": {
      "name": "Ghana",
      "flag": "🇬🇭"
    },
    "slotA": "",
    "slotB": "",
    "date": "Mar 23 jun · 16:00 ET",
    "venue": "Boston",
    "editable": false
  },
  {
    "id": "m070",
    "no": 70,
    "round": "grupos",
    "group": "L",
    "teamA": {
      "name": "Panamá",
      "flag": "🇵🇦"
    },
    "teamB": {
      "name": "Croacia",
      "flag": "🇭🇷"
    },
    "slotA": "",
    "slotB": "",
    "date": "Mar 23 jun · 19:00 ET",
    "venue": "Toronto",
    "editable": false
  },
  {
    "id": "m071",
    "no": 71,
    "round": "grupos",
    "group": "L",
    "teamA": {
      "name": "Panamá",
      "flag": "🇵🇦"
    },
    "teamB": {
      "name": "Inglaterra",
      "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿"
    },
    "slotA": "",
    "slotB": "",
    "date": "Sáb 27 jun · 17:00 ET",
    "venue": "New York / New Jersy",
    "editable": false
  },
  {
    "id": "m072",
    "no": 72,
    "round": "grupos",
    "group": "L",
    "teamA": {
      "name": "Croacia",
      "flag": "🇭🇷"
    },
    "teamB": {
      "name": "Ghana",
      "flag": "🇬🇭"
    },
    "slotA": "",
    "slotB": "",
    "date": "Sáb 27 jun · 17:00 ET",
    "venue": "Philadelphia",
    "editable": false
  },
  {
    "id": "m073",
    "no": 73,
    "round": "dieciseisavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "2º Grupo A",
    "slotB": "2º Grupo B",
    "date": "Dom 28 jun · 15:00 ET",
    "venue": "Los Angeles",
    "editable": true
  },
  {
    "id": "m074",
    "no": 74,
    "round": "dieciseisavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "1º Grupo E",
    "slotB": "Mejor 3º",
    "date": "Lun 29 jun · 16:30 ET",
    "venue": "Boston",
    "editable": true
  },
  {
    "id": "m075",
    "no": 75,
    "round": "dieciseisavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "1º Grupo F",
    "slotB": "2º Grupo C",
    "date": "Lun 29 jun · 21:00 ET",
    "venue": "Monterrey",
    "editable": true
  },
  {
    "id": "m076",
    "no": 76,
    "round": "dieciseisavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "1º Grupo C",
    "slotB": "2º Grupo F",
    "date": "Lun 29 jun · 13:00 ET",
    "venue": "Houston",
    "editable": true
  },
  {
    "id": "m077",
    "no": 77,
    "round": "dieciseisavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "1º Grupo I",
    "slotB": "Mejor 3º",
    "date": "Mar 30 jun · 17:00 ET",
    "venue": "New York / New Jersey",
    "editable": true
  },
  {
    "id": "m078",
    "no": 78,
    "round": "dieciseisavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "2º Grupo E",
    "slotB": "2º Grupo I",
    "date": "Mar 30 jun · 13:00 ET",
    "venue": "Dallas",
    "editable": true
  },
  {
    "id": "m079",
    "no": 79,
    "round": "dieciseisavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "1º Grupo A",
    "slotB": "Mejor 3º",
    "date": "Mar 30 jun · 21:00 ET",
    "venue": "Mexico City",
    "editable": true
  },
  {
    "id": "m080",
    "no": 80,
    "round": "dieciseisavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "1º Grupo L",
    "slotB": "Mejor 3º",
    "date": "Mié 1 jul · 12:00 ET",
    "venue": "Atlanta",
    "editable": true
  },
  {
    "id": "m081",
    "no": 81,
    "round": "dieciseisavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "1º Grupo D",
    "slotB": "Mejor 3º",
    "date": "Mié 1 jul · 20:00 ET",
    "venue": "San Francisco Bay Area",
    "editable": true
  },
  {
    "id": "m082",
    "no": 82,
    "round": "dieciseisavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "1º Grupo G",
    "slotB": "Mejor 3º",
    "date": "Mié 1 jul · 16:00 ET",
    "venue": "Seattle",
    "editable": true
  },
  {
    "id": "m083",
    "no": 83,
    "round": "dieciseisavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "2º Grupo K",
    "slotB": "2º Grupo L",
    "date": "Jue 2 jul · 19:00 ET",
    "venue": "Toronto",
    "editable": true
  },
  {
    "id": "m084",
    "no": 84,
    "round": "dieciseisavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "1º Grupo H",
    "slotB": "2º Grupo J",
    "date": "Jue 2 jul · 15:00 ET",
    "venue": "Los Angeles",
    "editable": true
  },
  {
    "id": "m085",
    "no": 85,
    "round": "dieciseisavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "1º Grupo B",
    "slotB": "Mejor 3º",
    "date": "Jue 2 jul · 23:00 ET",
    "venue": "Vancouver",
    "editable": true
  },
  {
    "id": "m086",
    "no": 86,
    "round": "dieciseisavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "1º Grupo J",
    "slotB": "2º Grupo H",
    "date": "Sáb 4 jul · 18:00 ET",
    "venue": "Miami",
    "editable": true
  },
  {
    "id": "m087",
    "no": 87,
    "round": "dieciseisavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "1º Grupo K",
    "slotB": "Mejor 3º",
    "date": "Vie 3 jul · 21:30 ET",
    "venue": "Kansas City",
    "editable": true
  },
  {
    "id": "m088",
    "no": 88,
    "round": "dieciseisavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "2º Grupo D",
    "slotB": "2º Grupo G",
    "date": "Vie 3 jul · 14:00 ET",
    "venue": "Dallas",
    "editable": true
  },
  {
    "id": "m089",
    "no": 89,
    "round": "octavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "Ganador #74",
    "slotB": "Ganador #77",
    "date": "Sáb 4 jul · 17:00 ET",
    "venue": "Philadelphia",
    "editable": true
  },
  {
    "id": "m090",
    "no": 90,
    "round": "octavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "Ganador #73",
    "slotB": "Ganador #75",
    "date": "Sáb 4 jul · 13:00 ET",
    "venue": "Houston",
    "editable": true
  },
  {
    "id": "m091",
    "no": 91,
    "round": "octavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "Ganador #76",
    "slotB": "Ganador #78",
    "date": "Dom 5 jul · 16:00 ET",
    "venue": "New York / New Jersey",
    "editable": true
  },
  {
    "id": "m092",
    "no": 92,
    "round": "octavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "Ganador #79",
    "slotB": "Ganador #80",
    "date": "Dom 5 jul · 20:00 ET",
    "venue": "Mexico City",
    "editable": true
  },
  {
    "id": "m093",
    "no": 93,
    "round": "octavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "Ganador #83",
    "slotB": "Ganador #84",
    "date": "Lun 6 jul · 15:00 ET",
    "venue": "Dallas",
    "editable": true
  },
  {
    "id": "m094",
    "no": 94,
    "round": "octavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "Ganador #81",
    "slotB": "Ganador #82",
    "date": "Lun 6 jul · 20:00 ET",
    "venue": "Seattle",
    "editable": true
  },
  {
    "id": "m095",
    "no": 95,
    "round": "octavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "Ganador #86",
    "slotB": "Ganador #88",
    "date": "Mar 7 jul · 12:00 ET",
    "venue": "Atlanta",
    "editable": true
  },
  {
    "id": "m096",
    "no": 96,
    "round": "octavos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "Ganador #85",
    "slotB": "Ganador #87",
    "date": "Mar 7 jul · 16:00 ET",
    "venue": "Vancouver",
    "editable": true
  },
  {
    "id": "m097",
    "no": 97,
    "round": "cuartos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "Ganador #89",
    "slotB": "Ganador #90",
    "date": "Jue 9 jul · 16:00 ET",
    "venue": "Boston",
    "editable": true
  },
  {
    "id": "m098",
    "no": 98,
    "round": "cuartos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "Ganador #93",
    "slotB": "Ganador #94",
    "date": "Vie 10 jul · 15:00 ET",
    "venue": "Los Angeles",
    "editable": true
  },
  {
    "id": "m099",
    "no": 99,
    "round": "cuartos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "Ganador #91",
    "slotB": "Ganador #92",
    "date": "Sáb 11 jul · 17:00 ET",
    "venue": "Miami",
    "editable": true
  },
  {
    "id": "m100",
    "no": 100,
    "round": "cuartos",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "Ganador #95",
    "slotB": "Ganador #96",
    "date": "Sáb 11 jul · 21:00 ET",
    "venue": "Kansas City",
    "editable": true
  },
  {
    "id": "m101",
    "no": 101,
    "round": "semis",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "Ganador #97",
    "slotB": "Ganador #98",
    "date": "Mar 14 jul · 15:00 ET",
    "venue": "Dallas",
    "editable": true
  },
  {
    "id": "m102",
    "no": 102,
    "round": "semis",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "Ganador #99",
    "slotB": "Ganador #100",
    "date": "Mié 15 jul · 15:00 ET",
    "venue": "Atlanta",
    "editable": true
  },
  {
    "id": "m103",
    "no": 103,
    "round": "tercer",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "Perdedor #101",
    "slotB": "Perdedor #102",
    "date": "Sáb 18 jul · 17:00 ET",
    "venue": "Miami",
    "editable": true
  },
  {
    "id": "m104",
    "no": 104,
    "round": "final",
    "group": null,
    "teamA": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "teamB": {
      "name": "Por definir",
      "flag": "🏳️"
    },
    "slotA": "Ganador #101",
    "slotB": "Ganador #102",
    "date": "Dom 19 jul · 15:00 ET",
    "venue": "New York / New Jersey",
    "editable": true
  }
];

/** Genera el mapa inicial de partidos {id: match} para un torneo nuevo. */
function buildInitialMatches() {
  const matches = {};
  WC_FIXTURES.forEach((f) => {
    matches[f.id] = Object.assign({}, f, {
      teamA: { name: f.teamA.name, flag: f.teamA.flag },
      teamB: { name: f.teamB.name, flag: f.teamB.flag },
      realA: null, realB: null, played: false
    });
  });
  return matches;
}

// Lista de equipos (para el selector de campeón)
function allTeamNames() {
  const set = [];
  Object.values(DEFAULT_GROUPS).forEach((g) => g.forEach((t) => set.push(t)));
  return set.sort((a, b) => a[0].localeCompare(b[0]));
}
