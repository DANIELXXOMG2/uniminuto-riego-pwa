#!/usr/bin/env node

/**
 * Script para simular cambio de estado de riego
 * Uso: node scripts/test-status-change.js <lineId> <newState>
 */

const admin = require("firebase-admin");

// Obtener argumentos
const lineId = process.argv[2] || "test-line-1";
const newStateArg = process.argv[3] || "true";
const newState = newStateArg === "true" || newStateArg === "1";

// Inicializar Firebase Admin
try {
  admin.initializeApp();
} catch (error) {
  console.error("❌ Error al inicializar Firebase:", error.message);
  process.exit(1);
}

const db = admin.firestore();

async function testStatusChange() {
  try {
    console.log(`\n💧 Simulando cambio de estado:`);
    console.log(`   Línea: ${lineId}`);
    console.log(`   Nuevo estado: ${newState ? "ACTIVO" : "INACTIVO"}\n`);

    // Verificar si el documento existe
    const docRef = db.collection("irrigationLines").doc(lineId);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log("⚠️  El documento no existe, creándolo...");
      await docRef.set({
        title: `Línea de Prueba ${lineId}`,
        humidity: 50,
        isActive: !newState, // Estado opuesto para que haya cambio
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("⏳ Esperando 2 segundos...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Actualizar el estado
    console.log(
      `Cambiando estado a: ${newState ? "ACTIVO ✅" : "INACTIVO ⏸️"}`
    );
    await docRef.update({
      isActive: newState,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("\n✅ Estado actualizado exitosamente");
    console.log("🔔 La Cloud Function debería dispararse en unos segundos");
    console.log("\n📋 Ver logs con:");
    console.log(
      "   firebase functions:log --only onIrrigationStatusChange --limit 10"
    );

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

testStatusChange();
