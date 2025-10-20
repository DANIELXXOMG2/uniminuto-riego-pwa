/**
 * Script de ejemplo para enviar notificaciones FCM desde el backend
 *
 * REQUISITOS:
 * 1. Instalar Firebase Admin SDK: npm install firebase-admin
 * 2. Descargar la clave privada de servicio desde Firebase Console:
 *    Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada
 * 3. Guardar el archivo JSON en un lugar seguro (NO lo subas a git)
 *
 * USO:
 * node send-notification.js
 */

const admin = require("firebase-admin");

// Inicializar Firebase Admin SDK
// Opción 1: Usando archivo de credenciales
const serviceAccount = require("./path/to/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Opción 2: Usando variables de entorno (recomendado para producción)
/*
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});
*/

/**
 * Enviar notificación a un usuario específico
 */
async function sendNotificationToUser(userId, title, body, data = {}) {
  try {
    // Obtener tokens del usuario desde Firestore
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .get();
    const fcmTokens = userDoc.data()?.fcmTokens || [];

    if (fcmTokens.length === 0) {
      console.log(`Usuario ${userId} no tiene tokens FCM registrados`);
      return;
    }

    // Preparar mensaje
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        timestamp: Date.now().toString(),
      },
    };

    // Enviar a todos los tokens del usuario
    const results = await Promise.allSettled(
      fcmTokens.map((token) => admin.messaging().send({ ...message, token }))
    );

    // Procesar resultados
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(
      `✅ Notificaciones enviadas: ${successful} exitosas, ${failed} fallidas`
    );

    // Remover tokens inválidos
    const invalidTokens = [];
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const error = result.reason;
        if (
          error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/registration-token-not-registered"
        ) {
          invalidTokens.push(fcmTokens[index]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      await admin
        .firestore()
        .collection("users")
        .doc(userId)
        .update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
        });
      console.log(`🗑️ Removidos ${invalidTokens.length} tokens inválidos`);
    }
  } catch (error) {
    console.error("❌ Error al enviar notificación:", error);
  }
}

/**
 * Enviar notificación a múltiples usuarios
 */
async function sendNotificationToUsers(userIds, title, body, data = {}) {
  for (const userId of userIds) {
    await sendNotificationToUser(userId, title, body, data);
  }
}

/**
 * Enviar notificación a todos los usuarios con cierto rol
 */
async function sendNotificationByRole(role, title, body, data = {}) {
  try {
    const usersSnapshot = await admin
      .firestore()
      .collection("users")
      .where("role", "==", role)
      .get();

    const userIds = usersSnapshot.docs.map((doc) => doc.id);
    await sendNotificationToUsers(userIds, title, body, data);
  } catch (error) {
    console.error("❌ Error al enviar notificación por rol:", error);
  }
}

// ==================== EJEMPLOS DE USO ====================

// Ejemplo 1: Notificar cuando una línea de riego se activa
async function notifyIrrigationStarted(lineId, lineName) {
  await sendNotificationByRole(
    "admin",
    "💧 Línea de Riego Activada",
    `La línea '${lineName}' ha iniciado el riego automático`,
    {
      type: "irrigation_started",
      lineId,
      lineName,
      action: "view_line",
    }
  );
}

// Ejemplo 2: Notificar humedad baja
async function notifyLowHumidity(lineId, lineName, humidity) {
  await sendNotificationByRole(
    "admin",
    "⚠️ Humedad Baja Detectada",
    `La línea '${lineName}' tiene ${humidity}% de humedad`,
    {
      type: "low_humidity",
      lineId,
      lineName,
      humidity: humidity.toString(),
      action: "view_line",
    }
  );
}

// Ejemplo 3: Notificar error en el sistema
async function notifySystemError(errorMessage) {
  await sendNotificationByRole("admin", "🚨 Error del Sistema", errorMessage, {
    type: "system_error",
    severity: "high",
    action: "view_admin",
  });
}

// Ejemplo 4: Notificación programada de mantenimiento
async function notifyMaintenance(scheduledTime) {
  await sendNotificationByRole(
    "admin",
    "🔧 Mantenimiento Programado",
    `Se realizará mantenimiento del sistema el ${scheduledTime}`,
    {
      type: "maintenance",
      scheduledTime,
      action: "view_dashboard",
    }
  );
}

// Ejemplo 5: Enviar notificación de prueba
async function sendTestNotification(userId) {
  await sendNotificationToUser(
    userId,
    "🧪 Notificación de Prueba",
    "Esta es una notificación de prueba del sistema de riego",
    {
      type: "test",
      timestamp: new Date().toISOString(),
    }
  );
}

// ==================== EJECUTAR EJEMPLOS ====================

// Descomenta para probar:

// sendTestNotification('USER_ID_AQUI')
//   .then(() => console.log('✅ Notificación de prueba enviada'))
//   .catch(err => console.error('❌ Error:', err));

// notifyIrrigationStarted('line_1', 'Zona Norte')
//   .then(() => console.log('✅ Notificación enviada'))
//   .catch(err => console.error('❌ Error:', err));

// notifyLowHumidity('line_2', 'Zona Sur', 15)
//   .then(() => console.log('✅ Notificación enviada'))
//   .catch(err => console.error('❌ Error:', err));

module.exports = {
  sendNotificationToUser,
  sendNotificationToUsers,
  sendNotificationByRole,
  notifyIrrigationStarted,
  notifyLowHumidity,
  notifySystemError,
  notifyMaintenance,
  sendTestNotification,
};
