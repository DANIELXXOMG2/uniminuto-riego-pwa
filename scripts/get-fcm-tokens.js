#!/usr/bin/env node

/**
 * Script para listar todos los tokens FCM de usuarios
 * Uso: node scripts/get-fcm-tokens.js
 */

const admin = require("firebase-admin");
const path = require("path");

// Inicializar Firebase Admin con service account
try {
  const serviceAccount = require(
    path.join(__dirname, "..", "functions", "serviceAccountKey.json")
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Autenticado con Firebase Admin SDK");
} catch (error) {
  console.error("❌ Error al inicializar Firebase:", error.message);
  console.error("💡 Asegúrate de tener functions/serviceAccountKey.json");
  process.exit(1);
}

const db = admin.firestore();

async function getTokens() {
  try {
    console.log("\n🔑 Obteniendo tokens FCM de usuarios...\n");

    const usersSnapshot = await db.collection("users").get();

    if (usersSnapshot.empty) {
      console.log("⚠️  No hay usuarios registrados");
      process.exit(0);
    }

    console.log(`📊 Total de usuarios: ${usersSnapshot.size}\n`);
    console.log("═".repeat(60));

    let totalTokens = 0;
    let adminTokens = 0;

    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      const tokens = data.fcmTokens || [];
      const role = data.role || "user";
      const email = data.email || "N/A";

      console.log(`\n👤 Usuario: ${doc.id}`);
      console.log(`   Email: ${email}`);
      console.log(`   Rol: ${role.toUpperCase()}`);
      console.log(`   Tokens: ${tokens.length}`);

      if (tokens.length > 0) {
        totalTokens += tokens.length;
        if (role === "admin") {
          adminTokens += tokens.length;
        }

        tokens.forEach((token, idx) => {
          const preview = token.substring(0, 40);
          const ellipsis = token.length > 40 ? "..." : "";
          console.log(`   ${idx + 1}. ${preview}${ellipsis}`);
        });
      } else {
        console.log("   ⚠️  Sin tokens registrados");
      }
    }

    console.log("\n" + "═".repeat(60));
    console.log(`\n📊 Resumen:`);
    console.log(`   Total de tokens: ${totalTokens}`);
    console.log(`   Tokens de admins: ${adminTokens}`);
    console.log(`   Tokens de usuarios: ${totalTokens - adminTokens}\n`);

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

getTokens();
