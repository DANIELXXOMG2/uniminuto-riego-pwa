#!/usr/bin/env node

/**
 * Script para simular alerta de humedad baja
 * Uso: node scripts/test-low-humidity.js <lineId> <humidity>
 */

const admin = require("firebase-admin");
const path = require("path");

// Obtener argumentos
const lineId = process.argv[2] || "test-line-1";
const humidity = parseFloat(process.argv[3]) || 15;

if (humidity < 0 || humidity > 100) {
  console.error("❌ Error: La humedad debe estar entre 0 y 100");
  process.exit(1);
}

// Inicializar Firebase Admin con service account
try {
  const serviceAccount = require(path.join(__dirname, "..", "functions", "serviceAccountKey.json"));
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

async function testLowHumidity() {
  try {
    console.log(`\n💧 Simulando humedad baja:`);
    console.log(`   Línea: ${lineId}`);
    console.log(`   Humedad: ${humidity}%\n`);

    // Primero, establecer humedad alta para que haya un cambio
    console.log("1️⃣  Estableciendo humedad alta (30%)...");
    await db
      .collection("irrigationLines")
      .doc(lineId)
      .set(
        {
          title: `Línea de Prueba ${lineId}`,
          humidity: 30,
          isActive: false,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    console.log("⏳ Esperando 2 segundos...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Ahora bajar la humedad para disparar la alerta
    console.log(`2️⃣  Bajando humedad a ${humidity}%...`);
    await db.collection("irrigationLines").doc(lineId).update({
      humidity: humidity,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("\n✅ Documento actualizado exitosamente");
    console.log("🔔 La Cloud Function debería dispararse en unos segundos");
    console.log("\n📋 Ver logs con:");
    console.log(
      "   firebase functions:log --only onLowHumidityAlert --limit 10"
    );

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

testLowHumidity();
