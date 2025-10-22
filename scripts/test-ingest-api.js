#!/usr/bin/env node

/**
 * Script de prueba para el API de ingesta de datos del Arduino
 * 
 * Uso:
 *   node test-ingest-api.js
 * 
 * O con variables de entorno:
 *   API_URL=https://tu-dominio.vercel.app ARDUINO_API_SECRET=tu_secret node test-ingest-api.js
 */

// Configuración
const API_URL = process.env.API_URL || 'http://localhost:3000';
const ARDUINO_API_SECRET = process.env.ARDUINO_API_SECRET || 'test-secret-123';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, emoji, message) {
  console.log(`${colors[color]}${emoji} ${message}${colors.reset}`);
}

async function testIngestAPI() {
  log('blue', '🚀', 'Iniciando pruebas del API de ingesta...\n');
  
  // Test 1: Petición exitosa
  log('yellow', '📝', 'Test 1: Envío exitoso de lecturas');
  try {
    const response = await fetch(`${API_URL}/api/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ARDUINO_API_SECRET}`
      },
      body: JSON.stringify({
        readings: [
          { sensorId: 'sensor-0', valueVWC: 45.6 },
          { sensorId: 'sensor-1', valueVWC: 50.1 },
          { sensorId: 'sensor-2', valueVWC: 38.3 }
        ]
      })
    });
    
    const data = await response.json();
    
    if (response.status === 200 && data.success) {
      log('green', '✅', `Test 1 PASADO: ${data.message}`);
      console.log('   Respuesta:', JSON.stringify(data, null, 2));
    } else {
      log('red', '❌', `Test 1 FALLIDO: ${response.status}`);
      console.log('   Respuesta:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    log('red', '❌', `Test 1 ERROR: ${error.message}`);
  }
  
  console.log('');
  
  // Test 2: Sin token de autenticación
  log('yellow', '📝', 'Test 2: Sin token de autenticación (debe fallar)');
  try {
    const response = await fetch(`${API_URL}/api/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        readings: [
          { sensorId: 'sensor-0', valueVWC: 45.6 }
        ]
      })
    });
    
    const data = await response.json();
    
    if (response.status === 401 && data.error === 'Unauthorized') {
      log('green', '✅', 'Test 2 PASADO: Rechazó petición sin token');
      console.log('   Respuesta:', JSON.stringify(data, null, 2));
    } else {
      log('red', '❌', `Test 2 FALLIDO: Debería retornar 401, obtuvo ${response.status}`);
      console.log('   Respuesta:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    log('red', '❌', `Test 2 ERROR: ${error.message}`);
  }
  
  console.log('');
  
  // Test 3: Token incorrecto
  log('yellow', '📝', 'Test 3: Token incorrecto (debe fallar)');
  try {
    const response = await fetch(`${API_URL}/api/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token_incorrecto'
      },
      body: JSON.stringify({
        readings: [
          { sensorId: 'sensor-0', valueVWC: 45.6 }
        ]
      })
    });
    
    const data = await response.json();
    
    if (response.status === 401 && data.error === 'Unauthorized') {
      log('green', '✅', 'Test 3 PASADO: Rechazó token incorrecto');
      console.log('   Respuesta:', JSON.stringify(data, null, 2));
    } else {
      log('red', '❌', `Test 3 FALLIDO: Debería retornar 401, obtuvo ${response.status}`);
      console.log('   Respuesta:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    log('red', '❌', `Test 3 ERROR: ${error.message}`);
  }
  
  console.log('');
  
  // Test 4: Array de lecturas vacío
  log('yellow', '📝', 'Test 4: Array de lecturas vacío (debe fallar)');
  try {
    const response = await fetch(`${API_URL}/api/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ARDUINO_API_SECRET}`
      },
      body: JSON.stringify({
        readings: []
      })
    });
    
    const data = await response.json();
    
    if (response.status === 400 && data.error === 'Bad Request') {
      log('green', '✅', 'Test 4 PASADO: Rechazó array vacío');
      console.log('   Respuesta:', JSON.stringify(data, null, 2));
    } else {
      log('red', '❌', `Test 4 FALLIDO: Debería retornar 400, obtuvo ${response.status}`);
      console.log('   Respuesta:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    log('red', '❌', `Test 4 ERROR: ${error.message}`);
  }
  
  console.log('');
  
  // Test 5: Falta propiedad sensorId
  log('yellow', '📝', 'Test 5: Falta propiedad sensorId (debe fallar)');
  try {
    const response = await fetch(`${API_URL}/api/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ARDUINO_API_SECRET}`
      },
      body: JSON.stringify({
        readings: [
          { valueVWC: 45.6 }
        ]
      })
    });
    
    const data = await response.json();
    
    if (response.status === 400 && data.error === 'Bad Request') {
      log('green', '✅', 'Test 5 PASADO: Rechazó lectura sin sensorId');
      console.log('   Respuesta:', JSON.stringify(data, null, 2));
    } else {
      log('red', '❌', `Test 5 FALLIDO: Debería retornar 400, obtuvo ${response.status}`);
      console.log('   Respuesta:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    log('red', '❌', `Test 5 ERROR: ${error.message}`);
  }
  
  console.log('');
  
  // Test 6: Falta propiedad valueVWC
  log('yellow', '📝', 'Test 6: Falta propiedad valueVWC (debe fallar)');
  try {
    const response = await fetch(`${API_URL}/api/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ARDUINO_API_SECRET}`
      },
      body: JSON.stringify({
        readings: [
          { sensorId: 'sensor-0' }
        ]
      })
    });
    
    const data = await response.json();
    
    if (response.status === 400 && data.error === 'Bad Request') {
      log('green', '✅', 'Test 6 PASADO: Rechazó lectura sin valueVWC');
      console.log('   Respuesta:', JSON.stringify(data, null, 2));
    } else {
      log('red', '❌', `Test 6 FALLIDO: Debería retornar 400, obtuvo ${response.status}`);
      console.log('   Respuesta:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    log('red', '❌', `Test 6 ERROR: ${error.message}`);
  }
  
  console.log('');
  log('blue', '🎉', 'Pruebas completadas!');
  log('yellow', '💡', `API URL: ${API_URL}/api/ingest`);
  log('yellow', '🔑', `Token: ${ARDUINO_API_SECRET.substring(0, 10)}...`);
}

// Ejecutar pruebas
testIngestAPI().catch(error => {
  log('red', '💥', `Error fatal: ${error.message}`);
  process.exit(1);
});
