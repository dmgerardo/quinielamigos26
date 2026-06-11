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

// ── App Check (reCAPTCHA v3) ──────────────────────────────────────────────
//  1. Ve a https://www.google.com/recaptcha/admin/create
//     · Tipo: reCAPTCHA v3  · Dominio: dmgerardo.github.io
//  2. Copia el "Site key" y pégalo abajo en RECAPTCHA_SITE_KEY.
//  3. En Firebase Console → App Check → Realtime Database → registra la app
//     con esa misma site key y pon el enforcement en "Monitor" primero, luego "Enforce".
const RECAPTCHA_SITE_KEY = "6LfCvxktAAAAAGAZjRCKJFUwsIfKLZJjuef0UW7W";

if (RECAPTCHA_SITE_KEY !== "TU_RECAPTCHA_SITE_KEY_AQUI") {
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true; // token de debug para desarrollo local
  }
  firebase.appCheck().activate(
    new firebase.appCheck.ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
    true // refresco automático de token
  );
}

// Bandera para detectar si todavía no se configuraron credenciales reales
const FIREBASE_CONFIGURED = firebaseConfig.apiKey !== "TU_API_KEY";
