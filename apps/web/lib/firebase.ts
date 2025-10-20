// Configuración de Firebase
// Inicializa Firebase con las credenciales de tu proyecto

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Servicios de Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');

// Conectar al emulador de funciones en desarrollo (opcional)
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

// Habilitar persistencia offline de Firestore
// Esto permite que la aplicación lea y escriba datos incluso sin conexión
// Las operaciones se encolarán y se sincronizarán automáticamente cuando se restablezca la conexión
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log('✅ Persistencia offline de Firestore habilitada correctamente');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // Múltiples pestañas abiertas: la persistencia solo puede estar habilitada en una pestaña a la vez
        console.warn('⚠️ Persistencia offline: múltiples pestañas detectadas. Solo funciona en una pestaña.');
      } else if (err.code === 'unimplemented') {
        // El navegador actual no soporta todas las características necesarias
        console.warn('⚠️ Persistencia offline: navegador no compatible con todas las características necesarias.');
      } else {
        console.error('❌ Error al habilitar persistencia offline de Firestore:', err);
      }
    });
}

export default app;
