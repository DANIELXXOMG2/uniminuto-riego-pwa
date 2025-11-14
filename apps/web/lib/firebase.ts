// Configuración de Firebase
// Inicializa Firebase con las credenciales de tu proyecto

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore,
  persistentLocalCache, 
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
  Firestore
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicializar Firebase (solo una vez)
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Inicializar Firestore con persistencia offline (nueva API)
// Esta configuración permite el uso de múltiples pestañas y persistencia offline
let db: Firestore;

if (typeof window !== 'undefined') {
  try {
    // Usar la nueva API de persistencia con soporte para múltiples pestañas
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: CACHE_SIZE_UNLIMITED
      })
    });
    console.log('✅ Persistencia offline de Firestore habilitada correctamente (multi-pestaña)');
  } catch (error) {
    // Si falla la inicialización con persistencia, usar configuración por defecto
    const errorCode = (error as { code?: string }).code;
    
    if (errorCode === 'failed-precondition') {
      console.warn('⚠️ Persistencia offline: Firestore ya está inicializado.');
    } else if (errorCode === 'unimplemented') {
      console.warn('⚠️ Persistencia offline: navegador no compatible. Usando modo online.');
    } else {
      console.error('❌ Error al configurar Firestore:', error);
    }
    
    // Fallback a configuración por defecto en todos los casos
    db = getFirestore(app);
  }
} else {
  // En servidor (SSR), usar configuración por defecto
  db = getFirestore(app);
}

// Servicios de Firebase
export const auth: Auth = getAuth(app);
export { db };

// Proveedor de Google para autenticación
export const googleProvider = new GoogleAuthProvider();

// Inicializar Firebase Functions con región us-central1
export const functions: Functions = getFunctions(app, 'us-central1');

// Conectar al emulador de funciones en desarrollo (opcional)
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('🔧 Conectado al emulador de Firebase Functions en localhost:5001');
  } catch (error) {
    console.warn('⚠️ No se pudo conectar al emulador de Functions:', error);
  }
}

