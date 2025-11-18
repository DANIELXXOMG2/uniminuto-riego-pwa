// setAdminSimple.js - Configurar rol de admin sin service account
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Configuración de Firebase (desde tu proyecto)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const userEmail = process.argv[2];

if (!userEmail) {
  console.error("❌ Debes proporcionar un email: node setAdminSimple.js <email>");
  process.exit(1);
}

async function setUserAsAdmin() {
  try {
    // Primero necesitas autenticarte como admin existente
    console.log(`\n⚠️  Este script requiere autenticación manual en la consola de Firebase`);
    console.log(`\n📋 Pasos para establecer rol de admin:`);
    console.log(`\n1. Ve a Firebase Console: https://console.firebase.google.com/project/uniminuto-riego-pwa/firestore`);
    console.log(`2. Navega a la colección 'users'`);
    console.log(`3. Busca el documento con el email: ${userEmail}`);
    console.log(`4. Edita el campo 'role' y establécelo como: admin`);
    console.log(`5. Si no existe el campo 'role', agrégalo como string con valor: admin\n`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

setUserAsAdmin();
