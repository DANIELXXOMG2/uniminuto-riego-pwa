/**
 * Firebase Cloud Functions para Sistema de Riego Inteligente
 * 
 * Funciones incluidas:
 * 1. onLowHumidityAlert - Notifica cuando la humedad baja del umbral
 * 2. onSensorFailure - Detecta sensores que no reportan (ejecuta cada hora)
 * 3. onIrrigationStatusChange - Notifica cuando se activa/desactiva el riego
 */

import {setGlobalOptions} from "firebase-functions/v2/options";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Inicializar Firebase Admin SDK
admin.initializeApp();

// Configuración global
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1", // Cambia según tu región preferida
});

// Umbral de humedad crítica (en porcentaje)
const HUMIDITY_THRESHOLD = 20;

// Tiempo máximo sin actualización del sensor (en milisegundos)
const SENSOR_TIMEOUT = 60 * 60 * 1000; // 1 hora

/**
 * Interfaz para una línea de riego
 */
interface IrrigationLine {
  title: string;
  isActive: boolean;
  humidity: number;
}

/**
 * Obtener todos los tokens FCM de usuarios administradores
 */
async function getAdminTokens(): Promise<string[]> {
  const tokens: string[] = [];
  
  try {
    const usersSnapshot = await admin.firestore()
      .collection("users")
      .where("role", "==", "admin")
      .get();

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const userTokens = userData.fcmTokens || [];
      tokens.push(...userTokens);
    });

    logger.info(`Found ${tokens.length} admin tokens`);
    return tokens;
  } catch (error) {
    logger.error("Error getting admin tokens:", error);
    return [];
  }
}

/**
 * Limpiar tokens inválidos de Firestore
 */
async function cleanInvalidTokens(
  invalidTokens: string[],
  userDocs: FirebaseFirestore.QuerySnapshot
) {
  if (invalidTokens.length === 0) return;

  logger.info(`Cleaning ${invalidTokens.length} invalid tokens`);

  const batch = admin.firestore().batch();

  userDocs.forEach((doc) => {
    const userData = doc.data();
    const userTokens = userData.fcmTokens || [];
    const validTokens = userTokens.filter(
      (token: string) => !invalidTokens.includes(token)
    );

    if (validTokens.length !== userTokens.length) {
      batch.update(doc.ref, {fcmTokens: validTokens});
    }
  });

  await batch.commit();
  logger.info("Invalid tokens cleaned successfully");
}

/**
 * 1. FUNCIÓN: Notificar Humedad Baja
 * 
 * Se activa cuando se actualiza un documento en irrigationLines
 * Verifica si la humedad cruza por debajo del umbral crítico
 */
export const onLowHumidityAlert = onDocumentUpdated(
  "irrigationLines/{lineId}",
  async (event) => {
    try {
      const lineId = event.params.lineId;
      const beforeData = event.data?.before.data() as IrrigationLine;
      const afterData = event.data?.after.data() as IrrigationLine;

      if (!beforeData || !afterData) {
        logger.warn("No data in document change");
        return;
      }

      const beforeHumidity = beforeData.humidity;
      const afterHumidity = afterData.humidity;
      const lineTitle = afterData.title || `Línea ${lineId}`;

      logger.info(`Humidity changed for ${lineTitle}: ${beforeHumidity}% → ${afterHumidity}%`);

      // Verificar si la humedad cruzó por debajo del umbral
      if (beforeHumidity >= HUMIDITY_THRESHOLD && afterHumidity < HUMIDITY_THRESHOLD) {
        logger.info(`🚨 Low humidity alert triggered for ${lineTitle}`);

        // Obtener tokens de administradores
        const tokens = await getAdminTokens();

        if (tokens.length === 0) {
          logger.warn("No admin tokens found");
          return;
        }

        // Preparar mensaje de notificación
        const message: admin.messaging.MulticastMessage = {
          notification: {
            title: "⚠️ Alerta de Humedad Baja",
            body: `${lineTitle} tiene ${afterHumidity}% de humedad (crítico)`,
          },
          data: {
            type: "low_humidity",
            lineId: lineId,
            lineName: lineTitle,
            humidity: afterHumidity.toString(),
            threshold: HUMIDITY_THRESHOLD.toString(),
            timestamp: Date.now().toString(),
          },
          tokens: tokens,
        };

        // Enviar notificación
        const response = await admin.messaging().sendEachForMulticast(message);
        
        logger.info(`✅ Notifications sent: ${response.successCount} successful, ${response.failureCount} failed`);

        // Limpiar tokens inválidos
        if (response.failureCount > 0) {
          const invalidTokens: string[] = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const error = resp.error;
              if (
                error?.code === "messaging/invalid-registration-token" ||
                error?.code === "messaging/registration-token-not-registered"
              ) {
                invalidTokens.push(tokens[idx]);
              }
            }
          });

          if (invalidTokens.length > 0) {
            const userDocs = await admin.firestore()
              .collection("users")
              .where("role", "==", "admin")
              .get();
            await cleanInvalidTokens(invalidTokens, userDocs);
          }
        }
      }
    } catch (error) {
      logger.error("Error in onLowHumidityAlert:", error);
    }
  }
);

/**
 * 2. FUNCIÓN: Notificar Cambio de Estado de Riego
 * 
 * Se activa cuando se actualiza el estado isActive de una línea
 */
export const onIrrigationStatusChange = onDocumentUpdated(
  "irrigationLines/{lineId}",
  async (event) => {
    try {
      const lineId = event.params.lineId;
      const beforeData = event.data?.before.data() as IrrigationLine;
      const afterData = event.data?.after.data() as IrrigationLine;

      if (!beforeData || !afterData) {
        logger.warn("No data in document change");
        return;
      }

      const beforeActive = beforeData.isActive;
      const afterActive = afterData.isActive;
      const lineTitle = afterData.title || `Línea ${lineId}`;

      // Solo notificar si el estado cambió
      if (beforeActive === afterActive) {
        return;
      }

      logger.info(`Irrigation status changed for ${lineTitle}: ${beforeActive} → ${afterActive}`);

      // Obtener tokens de administradores
      const tokens = await getAdminTokens();

      if (tokens.length === 0) {
        logger.warn("No admin tokens found");
        return;
      }

      // Preparar mensaje según el estado
      const title = afterActive 
        ? "💧 Riego Activado" 
        : "⏸️ Riego Desactivado";
      
      const body = afterActive
        ? `${lineTitle} ha iniciado el riego automático`
        : `${lineTitle} ha detenido el riego`;

      const message: admin.messaging.MulticastMessage = {
        notification: {
          title,
          body,
        },
        data: {
          type: afterActive ? "irrigation_started" : "irrigation_stopped",
          lineId: lineId,
          lineName: lineTitle,
          isActive: afterActive.toString(),
          humidity: afterData.humidity.toString(),
          timestamp: Date.now().toString(),
        },
        tokens: tokens,
      };

      // Enviar notificación
      const response = await admin.messaging().sendEachForMulticast(message);
      
      logger.info(`✅ Notifications sent: ${response.successCount} successful, ${response.failureCount} failed`);

      // Limpiar tokens inválidos
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error;
            if (
              error?.code === "messaging/invalid-registration-token" ||
              error?.code === "messaging/registration-token-not-registered"
            ) {
              invalidTokens.push(tokens[idx]);
            }
          }
        });

        if (invalidTokens.length > 0) {
          const userDocs = await admin.firestore()
            .collection("users")
            .where("role", "==", "admin")
            .get();
          await cleanInvalidTokens(invalidTokens, userDocs);
        }
      }
    } catch (error) {
      logger.error("Error in onIrrigationStatusChange:", error);
    }
  }
);

/**
 * 3. FUNCIÓN: Detectar Fallo de Sensores
 * 
 * Se ejecuta cada hora para verificar sensores que no reportan
 * Programada con Cloud Scheduler
 */
export const onSensorFailureCheck = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "America/Bogota", // Cambia según tu zona horaria
  },
  async () => {
    try {
      logger.info("🔍 Starting sensor failure check");

      const now = Date.now();
      const timeoutThreshold = now - SENSOR_TIMEOUT;

      // Obtener todas las líneas de riego
      const linesSnapshot = await admin.firestore()
        .collection("irrigationLines")
        .get();

      const failedSensors: Array<{id: string; title: string; lastUpdate: number}> = [];

      linesSnapshot.forEach((doc) => {
        const data = doc.data();
        const lastUpdated = data.lastUpdated?.toMillis() || 0;

        if (lastUpdated < timeoutThreshold) {
          failedSensors.push({
            id: doc.id,
            title: data.title || `Línea ${doc.id}`,
            lastUpdate: lastUpdated,
          });
        }
      });

      if (failedSensors.length === 0) {
        logger.info("✅ All sensors are reporting normally");
        return;
      }

      logger.warn(`⚠️ Found ${failedSensors.length} sensors not reporting`);

      // Obtener tokens de administradores
      const tokens = await getAdminTokens();

      if (tokens.length === 0) {
        logger.warn("No admin tokens found");
        return;
      }

      // Enviar notificación por cada sensor fallido
      for (const sensor of failedSensors) {
        const timeSinceUpdate = Math.floor((now - sensor.lastUpdate) / (60 * 1000)); // en minutos
        
        const message: admin.messaging.MulticastMessage = {
          notification: {
            title: "🚨 Posible Fallo de Sensor",
            body: `${sensor.title} no reporta desde hace ${timeSinceUpdate} minutos`,
          },
          data: {
            type: "sensor_failure",
            lineId: sensor.id,
            lineName: sensor.title,
            timeSinceUpdate: timeSinceUpdate.toString(),
            lastUpdate: sensor.lastUpdate.toString(),
            timestamp: Date.now().toString(),
          },
          tokens: tokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        logger.info(`Sensor failure notification for ${sensor.title}: ${response.successCount} sent`);
      }

      logger.info("✅ Sensor failure check completed");
    } catch (error) {
      logger.error("Error in onSensorFailureCheck:", error);
    }
  }
);

/**
 * 4. FUNCIÓN DE PRUEBA: Enviar Notificación Manual
 * 
 * Función HTTP para probar el envío de notificaciones
 * Acceso: https://[region]-[project-id].cloudfunctions.net/sendTestNotification
 */
export const sendTestNotification = onSchedule(
  {
    schedule: "every 24 hours", // Solo como fallback, se puede invocar manualmente
  },
  async () => {
    try {
      logger.info("📨 Sending test notification");

      const tokens = await getAdminTokens();

      if (tokens.length === 0) {
        logger.warn("No admin tokens found");
        return;
      }

      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: "🧪 Notificación de Prueba",
          body: "El sistema de notificaciones está funcionando correctamente",
        },
        data: {
          type: "test",
          timestamp: Date.now().toString(),
        },
        tokens: tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      logger.info(`✅ Test notifications sent: ${response.successCount} successful`);
    } catch (error) {
      logger.error("Error sending test notification:", error);
    }
  }
);
