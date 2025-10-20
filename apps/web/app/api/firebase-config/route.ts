// API Route para servir la configuración de Firebase al Service Worker
// Los Service Workers no pueden acceder a variables de entorno directamente,
// por lo que necesitan obtenerla desde este endpoint

import { NextResponse } from "next/server";

export async function GET() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  return NextResponse.json(firebaseConfig, {
    headers: {
      "Cache-Control": "public, max-age=3600", // Cachear por 1 hora
    },
  });
}
