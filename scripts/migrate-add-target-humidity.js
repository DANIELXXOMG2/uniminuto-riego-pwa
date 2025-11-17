/**
 * Script de Migración: Agregar targetHumidity a irrigationLines
 * 
 * Este script agrega el campo targetHumidity (valor por defecto: 30) a todas
 * las líneas de riego existentes y crea/actualiza system/config con autoIrrigationEnabled.
 * 
 * Uso:
 *   node scripts/migrate-add-target-humidity.js
 * 
 * Requisitos:
 *   - serviceAccountKey.json en la carpeta functions/
 *   - Conexión a internet
 */

const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase Admin
const serviceAccount = require(path.join(__dirname, '../functions/serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const DEFAULT_TARGET_HUMIDITY = 30;
const DEFAULT_AUTO_IRRIGATION = true;

async function migrateIrrigationLines() {
  console.log('🔄 Iniciando migración de irrigationLines...\n');

  try {
    const linesSnapshot = await db.collection('irrigationLines').get();
    
    if (linesSnapshot.empty) {
      console.log('⚠️  No se encontraron líneas de riego en la base de datos.');
      return;
    }

    console.log(`📊 Encontradas ${linesSnapshot.size} líneas de riego.\n`);

    const batch = db.batch();
    let updatedCount = 0;
    let skippedCount = 0;

    linesSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Solo actualizar si no tiene targetHumidity
      if (data.targetHumidity === undefined) {
        batch.update(doc.ref, {
          targetHumidity: DEFAULT_TARGET_HUMIDITY
        });
        console.log(`✅ ${doc.id}: agregando targetHumidity = ${DEFAULT_TARGET_HUMIDITY}%`);
        updatedCount++;
      } else {
        console.log(`⏭️  ${doc.id}: ya tiene targetHumidity = ${data.targetHumidity}% (omitido)`);
        skippedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`\n✅ Se actualizaron ${updatedCount} líneas de riego.`);
    }
    
    if (skippedCount > 0) {
      console.log(`⏭️  Se omitieron ${skippedCount} líneas (ya tenían targetHumidity).`);
    }

  } catch (error) {
    console.error('❌ Error al migrar irrigationLines:', error);
    throw error;
  }
}

async function createSystemConfig() {
  console.log('\n🔄 Configurando system/config...\n');

  try {
    const configRef = db.collection('system').doc('config');
    const configDoc = await configRef.get();

    if (configDoc.exists) {
      const data = configDoc.data();
      
      // Solo agregar si no existe
      if (data.autoIrrigationEnabled === undefined) {
        await configRef.update({
          autoIrrigationEnabled: DEFAULT_AUTO_IRRIGATION
        });
        console.log(`✅ system/config: agregado autoIrrigationEnabled = ${DEFAULT_AUTO_IRRIGATION}`);
      } else {
        console.log(`⏭️  system/config: ya tiene autoIrrigationEnabled = ${data.autoIrrigationEnabled} (omitido)`);
      }
    } else {
      // Crear el documento con valores por defecto
      await configRef.set({
        autoIrrigationEnabled: DEFAULT_AUTO_IRRIGATION,
        defaultReadingIntervalSeconds: 300,  // 5 minutos
        activeIrrigationIntervalSeconds: 5    // 5 segundos
      });
      console.log('✅ system/config: documento creado con valores por defecto');
    }

  } catch (error) {
    console.error('❌ Error al configurar system/config:', error);
    throw error;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  MIGRACIÓN: targetHumidity + autoIrrigationEnabled');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    await migrateIrrigationLines();
    await createSystemConfig();
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Migración completada exitosamente');
    console.log('═══════════════════════════════════════════════════════\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ La migración falló:', error.message);
    process.exit(1);
  }
}

main();
