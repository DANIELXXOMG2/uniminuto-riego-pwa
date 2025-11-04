/**
 * Script para renombrar sensores de sensor-X a sensor-00X
 * Ejemplo: sensor-0 -> sensor-000, sensor-1 -> sensor-001
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Ruta al archivo de credenciales
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

// Verificar que el archivo existe
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: No se encontró el archivo de credenciales');
  console.error('');
  console.error('📁 Se esperaba el archivo en:');
  console.error(`   ${serviceAccountPath}`);
  console.error('');
  console.error('📥 Para obtener el archivo:');
  console.error('   1. Ve a https://console.firebase.google.com/');
  console.error('   2. Selecciona el proyecto "uniminuto-riego-pwa"');
  console.error('   3. Click en ⚙️ → Project Settings → Service Accounts');
  console.error('   4. Click en "Generate New Private Key"');
  console.error('   5. Renombra el archivo descargado a "serviceAccountKey.json"');
  console.error('   6. Colócalo en la raíz del proyecto');
  console.error('');
  process.exit(1);
}

// Inicializar Firebase Admin
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function renameSensor(oldId, newId) {
  console.log(`\n🔄 Renombrando ${oldId} -> ${newId}`);
  
  try {
    // 1. Obtener el documento original
    const oldDocRef = db.collection('sensors').doc(oldId);
    const oldDocSnap = await oldDocRef.get();
    
    if (!oldDocSnap.exists) {
      console.log(`⚠️  El sensor ${oldId} no existe, saltando...`);
      return;
    }
    
    const oldData = oldDocSnap.data();
    console.log(`✅ Documento ${oldId} encontrado`);
    
    // 2. Crear el nuevo documento con los mismos datos
    const newDocRef = db.collection('sensors').doc(newId);
    await newDocRef.set(oldData);
    console.log(`✅ Documento ${newId} creado con los datos`);
    
    // 3. Copiar la subcolección de readings
    const oldReadingsRef = oldDocRef.collection('readings');
    const readingsSnapshot = await oldReadingsRef.get();
    
    console.log(`📊 Copiando ${readingsSnapshot.size} lecturas...`);
    
    const batch = db.batch();
    let batchCount = 0;
    let totalCopied = 0;
    
    for (const readingDoc of readingsSnapshot.docs) {
      const newReadingRef = newDocRef.collection('readings').doc(readingDoc.id);
      batch.set(newReadingRef, readingDoc.data());
      batchCount++;
      
      // Firestore tiene un límite de 500 operaciones por batch
      if (batchCount >= 500) {
        await batch.commit();
        totalCopied += batchCount;
        console.log(`   📝 ${totalCopied} lecturas copiadas...`);
        batchCount = 0;
      }
    }
    
    // Commit cualquier operación restante
    if (batchCount > 0) {
      await batch.commit();
      totalCopied += batchCount;
    }
    
    console.log(`✅ ${totalCopied} lecturas copiadas exitosamente`);
    
    // 4. Eliminar el documento antiguo y su subcolección
    console.log(`🗑️  Eliminando ${oldId} antiguo...`);
    
    // Eliminar todas las lecturas del sensor antiguo
    const deleteBatch = db.batch();
    let deleteCount = 0;
    
    for (const readingDoc of readingsSnapshot.docs) {
      deleteBatch.delete(readingDoc.ref);
      deleteCount++;
      
      if (deleteCount >= 500) {
        await deleteBatch.commit();
        deleteCount = 0;
      }
    }
    
    if (deleteCount > 0) {
      await deleteBatch.commit();
    }
    
    // Eliminar el documento del sensor antiguo
    await oldDocRef.delete();
    console.log(`✅ ${oldId} eliminado completamente`);
    
    console.log(`✨ Renombrado completado: ${oldId} -> ${newId}`);
    
  } catch (error) {
    console.error(`❌ Error renombrando ${oldId}:`, error);
  }
}

async function renameAllSensors() {
  console.log('🚀 Iniciando renombrado de sensores...\n');
  
  // Definir los sensores a renombrar (de sensor-X a sensor-00X)
  const sensorsToRename = [];
  
  // Generar pares de renombrado: sensor-0 -> sensor-000, sensor-1 -> sensor-001, etc.
  for (let i = 0; i <= 17; i++) {
    const oldId = `sensor-${i}`;
    const newId = `sensor-${String(i).padStart(3, '0')}`;
    sensorsToRename.push({ oldId, newId });
  }
  
  console.log('📋 Sensores a renombrar:');
  sensorsToRename.forEach(({ oldId, newId }) => {
    console.log(`   ${oldId} -> ${newId}`);
  });
  console.log('');
  
  // Renombrar cada sensor
  for (const { oldId, newId } of sensorsToRename) {
    await renameSensor(oldId, newId);
  }
  
  console.log('\n✅ Proceso de renombrado completado!');
  console.log('🔍 Verifica tus sensores en Firestore para confirmar los cambios.');
}

// Ejecutar el script
renameAllSensors()
  .then(() => {
    console.log('\n✨ Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en el script:', error);
    process.exit(1);
  });
