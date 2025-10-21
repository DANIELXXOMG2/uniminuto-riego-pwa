/**
 * Script para crear notificaciones de prueba en Firestore
 * 
 * Este script crea diferentes tipos de notificaciones para probar
 * la funcionalidad del panel de notificaciones.
 * 
 * Uso:
 *   node scripts/test-notifications-create.js <email-usuario>
 * 
 * Ejemplo:
 *   node scripts/test-notifications-create.js admin@uniminuto.edu
 */

const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase Admin
const serviceAccount = require(path.join(__dirname, '../functions/serviceAccountKey.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

/**
 * Crea notificaciones de prueba para un usuario
 */
async function createTestNotifications(userEmail) {
  try {
    // Buscar el usuario por email
    console.log(`🔍 Buscando usuario: ${userEmail}`);
    const usersSnapshot = await db.collection('users')
      .where('email', '==', userEmail)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error('❌ Usuario no encontrado');
      process.exit(1);
    }

    const userId = usersSnapshot.docs[0].id;
    console.log(`✅ Usuario encontrado: ${userId}`);

    // Referencias a la colección de notificaciones
    const notificationsRef = db.collection('users').doc(userId).collection('notifications');

    // Crear diferentes tipos de notificaciones
    const notifications = [
      {
        title: 'Sistema de riego activado',
        body: 'El riego automático se ha iniciado en la línea 1',
        type: 'irrigation_started',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
        data: {
          lineId: 'linea-1',
        },
      },
      {
        title: 'Humedad baja detectada',
        body: 'El sensor 1 reporta 25% de humedad. Se recomienda activar el riego.',
        type: 'low_humidity',
        timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600000)), // 1 hora atrás
        read: false,
        data: {
          sensorId: 'sensor-1',
          humidity: 25,
          lineId: 'linea-1',
        },
      },
      {
        title: 'Riego completado',
        body: 'El ciclo de riego de la línea 2 ha finalizado exitosamente',
        type: 'irrigation_stopped',
        timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 7200000)), // 2 horas atrás
        read: true,
        data: {
          lineId: 'linea-2',
        },
      },
      {
        title: 'Fallo en sensor detectado',
        body: 'El sensor 3 no responde. Por favor, verifica la conexión.',
        type: 'sensor_failure',
        timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 10800000)), // 3 horas atrás
        read: false,
        data: {
          sensorId: 'sensor-3',
          lineId: 'linea-3',
        },
      },
      {
        title: 'Nivel de agua bajo',
        body: 'El nivel del depósito de agua está por debajo del 20%',
        type: 'system_alert',
        timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 86400000)), // 1 día atrás
        read: true,
        data: {
          waterLevel: 18,
        },
      },
      {
        title: 'Notificación de prueba',
        body: 'Esta es una notificación de prueba del sistema',
        type: 'test',
        timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 172800000)), // 2 días atrás
        read: true,
        data: {},
      },
    ];

    // Crear todas las notificaciones
    console.log(`📝 Creando ${notifications.length} notificaciones de prueba...`);
    
    const batch = db.batch();
    notifications.forEach((notification) => {
      const docRef = notificationsRef.doc();
      batch.set(docRef, notification);
    });

    await batch.commit();

    console.log('✅ Notificaciones de prueba creadas exitosamente');
    console.log('\n📊 Resumen:');
    console.log(`   Usuario: ${userEmail}`);
    console.log(`   ID: ${userId}`);
    console.log(`   Total de notificaciones: ${notifications.length}`);
    console.log(`   No leídas: ${notifications.filter(n => !n.read).length}`);
    console.log(`   Leídas: ${notifications.filter(n => n.read).length}`);

  } catch (error) {
    console.error('❌ Error al crear notificaciones:', error);
    process.exit(1);
  }
}

// Ejecutar el script
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('❌ Debes proporcionar un email de usuario');
  console.log('\nUso: node scripts/test-notifications-create.js <email-usuario>');
  console.log('Ejemplo: node scripts/test-notifications-create.js admin@uniminuto.edu');
  process.exit(1);
}

createTestNotifications(userEmail)
  .then(() => {
    console.log('\n🎉 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
