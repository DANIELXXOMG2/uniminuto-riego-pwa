#!/usr/bin/env node

/**
 * Script de Inicialización de Firestore para Sistema de Riego v3.0
 * 
 * Este script crea la estructura de datos inicial necesaria para que
 * el firmware ESP32/ESP8266 funcione correctamente.
 * 
 * PREREQUISITOS:
 * - Node.js instalado
 * - Firebase Admin SDK configurado
 * - Service Account Key en functions/serviceAccountKey.json
 * 
 * USO:
 * node scripts/init-firestore-for-arduino.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase Admin
const serviceAccount = require(path.join(__dirname, '../functions/serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ============================================================================
// CONFIGURACIÓN INICIAL
// ============================================================================

const INITIAL_CONFIG = {
  thresholdLine1: 30.0,
  thresholdLine2: 30.0,
  thresholdLine3: 30.0,
  readingInterval: 600000 // 10 minutos en milisegundos
};

const IRRIGATION_LINES = [
  {
    id: 'linea-1',
    name: 'Línea 1 - Zona Norte',
    isActive: true,
    sensorIds: ['sensor-0', 'sensor-1', 'sensor-2', 'sensor-3', 'sensor-4', 'sensor-5']
  },
  {
    id: 'linea-2',
    name: 'Línea 2 - Zona Centro',
    isActive: true,
    sensorIds: ['sensor-6', 'sensor-7', 'sensor-8', 'sensor-9', 'sensor-10', 'sensor-11']
  },
  {
    id: 'linea-3',
    name: 'Línea 3 - Zona Sur',
    isActive: true,
    sensorIds: ['sensor-12', 'sensor-13', 'sensor-14', 'sensor-15', 'sensor-16', 'sensor-17']
  }
];

const SENSORS = [
  { id: 'sensor-0', title: 'Sensor Pasillo 1', lineId: 'linea-1', status: 'active', channel: 0, mux: 1 },
  { id: 'sensor-1', title: 'Sensor Pasillo 1', lineId: 'linea-1', status: 'active', channel: 1, mux: 1 },
  { id: 'sensor-2', title: 'Sensor Pasillo 1', lineId: 'linea-1', status: 'active', channel: 2, mux: 1 },
  { id: 'sensor-3', title: 'Sensor Pasillo 1', lineId: 'linea-1', status: 'active', channel: 3, mux: 1 },
  { id: 'sensor-4', title: 'Sensor Pasillo 1', lineId: 'linea-1', status: 'active', channel: 4, mux: 1 },
  { id: 'sensor-5', title: 'Sensor Pasillo 1', lineId: 'linea-1', status: 'active', channel: 5, mux: 1 },
  { id: 'sensor-6', title: 'Sensor Pasillo 2', lineId: 'linea-2', status: 'active', channel: 6, mux: 1 },
  { id: 'sensor-7', title: 'Sensor Pasillo 2', lineId: 'linea-2', status: 'active', channel: 7, mux: 1 },
  { id: 'sensor-8', title: 'Sensor Pasillo 2', lineId: 'linea-2', status: 'active', channel: 8, mux: 1 },
  { id: 'sensor-9', title: 'Sensor Pasillo 2', lineId: 'linea-2', status: 'active', channel: 9, mux: 1 },
  { id: 'sensor-10', title: 'Sensor Pasillo 2', lineId: 'linea-2', status: 'active', channel: 10, mux: 1 },
  { id: 'sensor-11', title: 'Sensor Pasillo 2', lineId: 'linea-2', status: 'active', channel: 11, mux: 1 },
  { id: 'sensor-12', title: 'Sensor Pasillo 3', lineId: 'linea-3', status: 'active', channel: 12, mux: 1 },
  { id: 'sensor-13', title: 'Sensor Pasillo 3', lineId: 'linea-3', status: 'active', channel: 13, mux: 1 },
  { id: 'sensor-14', title: 'Sensor Pasillo 3', lineId: 'linea-3', status: 'active', channel: 14, mux: 1 },
  { id: 'sensor-15', title: 'Sensor Pasillo 3', lineId: 'linea-3', status: 'active', channel: 15, mux: 1 },
  { id: 'sensor-16', title: 'Sensor Pasillo 3', lineId: 'linea-3', status: 'active', channel: 0, mux: 2 },
  { id: 'sensor-17', title: 'Sensor Pasillo 3', lineId: 'linea-3', status: 'active', channel: 1, mux: 2 }
];

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Verifica si un documento existe
 */
async function documentExists(collectionPath, docId) {
  const docRef = db.collection(collectionPath).doc(docId);
  const doc = await docRef.get();
  return doc.exists;
}

/**
 * Crea el documento de configuración del dispositivo
 */
async function createDeviceConfig() {
  console.log('\n📋 Creando configuración del dispositivo...');
  
  const configRef = db.collection('config').doc('device_config');
  const exists = await documentExists('config', 'device_config');
  
  if (exists) {
    console.log('⚠️  La configuración ya existe. ¿Desea sobrescribirla? (manual)');
    // En producción, pedir confirmación al usuario
    return;
  }
  
  await configRef.set(INITIAL_CONFIG);
  console.log('✅ Configuración creada exitosamente');
  console.log('   Valores:', INITIAL_CONFIG);
}

/**
 * Crea los documentos de líneas de riego
 */
async function createIrrigationLines() {
  console.log('\n💧 Creando líneas de riego...');
  
  for (const line of IRRIGATION_LINES) {
    const { id, ...data } = line;
    const lineRef = db.collection('irrigationLines').doc(id);
    const exists = await documentExists('irrigationLines', id);
    
    if (exists) {
      console.log(`⏭️  ${id} ya existe, saltando...`);
      continue;
    }
    
    await lineRef.set({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ ${id} creada: ${data.name}`);
  }
}

/**
 * Crea los documentos de sensores
 */
async function createSensors() {
  console.log('\n🌡️  Creando sensores...');
  
  for (const sensor of SENSORS) {
    const { id, ...data } = sensor;
    const sensorRef = db.collection('sensors').doc(id);
    const exists = await documentExists('sensors', id);
    
    if (exists) {
      console.log(`⏭️  ${id} ya existe, saltando...`);
      continue;
    }
    
    await sensorRef.set({
      ...data,
      lastReading: null,
      lastReadingTime: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ ${id} creado: ${data.title}`);
  }
}

/**
 * Crea índices compuestos recomendados (solo información, se deben crear manualmente)
 */
function printIndexRecommendations() {
  console.log('\n📊 ÍNDICES COMPUESTOS RECOMENDADOS:');
  console.log('──────────────────────────────────────────────────────────');
  console.log('Para mejor rendimiento, crear los siguientes índices en');
  console.log('Firebase Console > Firestore Database > Indexes:\n');
  
  console.log('1. Colección: sensors/{sensorId}/readings');
  console.log('   Campos: timestamp (Descending)');
  console.log('   Uso: Obtener lecturas más recientes');
  
  console.log('\n2. Colección: irrigationLines');
  console.log('   Campos: isActive (Ascending), updatedAt (Descending)');
  console.log('   Uso: Consultar líneas activas');
  
  console.log('\n3. Colección: sensors');
  console.log('   Campos: lineId (Ascending), status (Ascending)');
  console.log('   Uso: Consultar sensores por línea');
  
  console.log('──────────────────────────────────────────────────────────');
}

/**
 * Imprime reglas de seguridad recomendadas
 */
function printSecurityRules() {
  console.log('\n🔒 REGLAS DE SEGURIDAD RECOMENDADAS:');
  console.log('──────────────────────────────────────────────────────────');
  console.log(`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Configuración del dispositivo
    match /config/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    
    // Líneas de riego
    match /irrigationLines/{lineId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true 
                   || request.auth.token.operator == true;
    }
    
    // Sensores
    match /sensors/{sensorId} {
      allow read: if request.auth != null;
      allow write: if false; // Solo desde funciones
      
      // Lecturas de sensores
      match /readings/{readingId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null 
                      && request.auth.token.email.matches('dispositivo@.*');
        allow update, delete: if false;
      }
    }
  }
}
  `);
  console.log('──────────────────────────────────────────────────────────');
}

/**
 * Crea un documento de ejemplo de lectura (para testing)
 */
async function createSampleReading() {
  console.log('\n📈 Creando lectura de ejemplo...');
  
  const sensorId = 'sensor-0';
  const readingRef = db.collection('sensors').doc(sensorId).collection('readings').doc();
  
  await readingRef.set({
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    valueVWC: 35.5
  });
  
  console.log(`✅ Lectura de ejemplo creada en sensors/${sensorId}/readings/${readingRef.id}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  INICIALIZACIÓN DE FIRESTORE PARA SISTEMA DE RIEGO v3.0');
  console.log('═══════════════════════════════════════════════════════════');
  
  try {
    // Crear documentos
    await createDeviceConfig();
    await createIrrigationLines();
    await createSensors();
    await createSampleReading();
    
    // Información adicional
    printIndexRecommendations();
    printSecurityRules();
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ INICIALIZACIÓN COMPLETADA EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nPRÓXIMOS PASOS:');
    console.log('1. Configurar reglas de seguridad en Firebase Console');
    console.log('2. Crear índices compuestos recomendados');
    console.log('3. Crear usuario "dispositivo@tudominio.com" en Authentication');
    console.log('4. Configurar credenciales en el firmware Arduino');
    console.log('5. Compilar y cargar el firmware al ESP32/ESP8266');
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ ERROR durante la inicialización:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Ejecutar
if (require.main === module) {
  main();
}

module.exports = { main };
