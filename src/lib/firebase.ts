// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// Importa otros servicios de Firebase que necesites, por ejemplo, para autenticación:
// import { getAuth } from 'firebase/auth';

// Helper para asegurar que las variables de entorno existan
function getEnvVar(name: string): string {
  const value = import.meta.env[name];
  if (value === undefined || value === null) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

// Tus credenciales de Firebase desde las variables de entorno
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
  // measurementId es opcional, así que podemos manejarlo de forma diferente
  // o simplemente dejar que sea undefined si no está presente.
  // Si es estrictamente necesario y debe causar un error si falta, inclúyelo en getEnvVar.
  // Si es verdaderamente opcional para Firebase, puedes acceder directamente:
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID 
};

// Inicializar Firebase
// Comprobamos si ya existe una app inicializada para evitar errores (especialmente con HMR en desarrollo)
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // Obtener la app ya inicializada
}

// Inicializar servicios de Firebase
const db = getFirestore(app);
// const auth = getAuth(app); // Si vas a usar autenticación

// Exportar los servicios para usarlos en otras partes de tu app
export { db /*, auth */ };
