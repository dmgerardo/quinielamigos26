/* =========================================================
 *  CONFIGURACIÓN DE FIREBASE
 *  ---------------------------------------------------------
 *  1. Entra a https://console.firebase.google.com
 *  2. Crea un proyecto -> "Realtime Database" -> Crear base de datos
 *  3. Project settings -> "Tus apps" -> Web (</>) -> copia el objeto config
 *  4. Pega aquí TUS credenciales (reemplaza las de ejemplo).
 *  5. En Authentication -> Sign-in method -> habilita "Anónimo".
 *  6. En Realtime Database -> Reglas -> pega el contenido de
 *     database.rules.json (incluido en este proyecto).
 *
 *  NOTA: la app carga el SDK "compat" en index.html, por eso aquí
 *  inicializamos con firebase.initializeApp(...) (no la sintaxis modular).
 * ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyDfeSpTfys0-CLbOL8LxTqdMcYEhwPmcRY",
  authDomain: "quinielamigos26.firebaseapp.com",
  databaseURL: "https://quinielamigos26-default-rtdb.firebaseio.com",
  projectId: "quinielamigos26",
  storageBucket: "quinielamigos26.firebasestorage.app",
  messagingSenderId: "525432077177",
  appId: "1:525432077177:web:7f15d86fd4ddd0fc1c8da8"
};

// Inicialización (SDK compat)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// Bandera para detectar si todavía no se configuraron credenciales reales
const FIREBASE_CONFIGURED = firebaseConfig.apiKey !== "TU_API_KEY";
