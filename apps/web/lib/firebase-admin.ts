import * as admin from 'firebase-admin';

/**
 * Inicializa Firebase Admin SDK
 * Usa variables de entorno para las credenciales del Service Account
 */
export function initFirebaseAdmin() {
  // Verificar si ya está inicializada
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Validar que las variables de entorno necesarias estén presentes
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!serviceAccountEmail || !privateKey || !projectId) {
    throw new Error(
      'Faltan variables de entorno requeridas para Firebase Admin SDK: ' +
      'GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID'
    );
  }

  // Inicializar con las credenciales
  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail: serviceAccountEmail,
      // Reemplazar \n literales con saltos de línea reales
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
    projectId,
  });
}

export { admin };
