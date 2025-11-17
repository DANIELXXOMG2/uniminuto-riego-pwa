/**
 * Firebase Cloud Functions para Sistema de Riego Inteligente
 *
 * Funciones incluidas:
 * 1. onLowHumidityAlert - Notifica cuando la humedad baja del umbral
 * 2. onSensorFailure - Detecta sensores que no reportan (ejecuta cada hora)
 * 3. onIrrigationStatusChange - Notifica cuando se activa/desactiva el riego
 */

import { setGlobalOptions } from "firebase-functions/v2/options";
import {
  onDocumentUpdated,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { FieldValue } from "firebase-admin/firestore";

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

interface SensorReading {
  valueVWC?: number;
  timestamp?: {
    seconds?: number;
  };
}

/**
 * Obtener todos los tokens FCM de usuarios administradores
 */
async function getAdminTokens(): Promise<string[]> {
  const tokens: string[] = [];

  try {
    const usersSnapshot = await admin
      .firestore()
      .collection("users")
      .where("role", "==", "admin")
      .get();

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const userTokens = (userData.fcmTokens as string[] | undefined) || [];
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
 * @param {string[]} invalidTokens - Array de tokens inválidos a limpiar
 * @param {FirebaseFirestore.QuerySnapshot} userDocs - Snapshot de usuarios
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
    const userTokens = (userData.fcmTokens as string[] | undefined) || [];
    const validTokens = userTokens.filter(
      (token: string) => !invalidTokens.includes(token)
    );

    if (validTokens.length !== userTokens.length) {
      batch.update(doc.ref, { fcmTokens: validTokens });
    }
  });

  await batch.commit();
  logger.info("Invalid tokens cleaned successfully");
}

export const aggregateSensorReading = onDocumentWritten(
  "sensors/{sensorId}/readings/{readingId}",
  async (event: any) => {
    const snap = event.data;
    if (!snap || !snap.after.exists) {
      logger.warn("No hay datos posteriores asociados al evento de lectura");
      return;
    }

    const data: SensorReading = snap.after.data();

    const valueVWC = data.valueVWC;
    if (typeof valueVWC !== "number" || isNaN(valueVWC)) {
      logger.log("Lectura sin valor numérico, se omite", data);
      return;
    }

    const { sensorId } = event.params;
    const seconds = data.timestamp?.seconds;
    const timestamp = seconds ? new Date(seconds * 1000) : new Date();
    const isoHour = timestamp.toISOString().slice(0, 13);
    const hourId = isoHour.replace("T", "-");
    const aggRef = admin
      .firestore()
      .doc(`sensors/${sensorId}/readingsHourly/${hourId}`);

    logger.log(
      `Aggregando lectura de ${sensorId}, hora ${hourId}, valor ${valueVWC}`
    );

    try {
      await admin.firestore().runTransaction(async (transaction) => {
        const aggDoc = await transaction.get(aggRef);

        if (!aggDoc.exists) {
          transaction.set(aggRef, {
            hour: hourId,
            sensorId,
            sum: valueVWC,
            count: 1,
            min: valueVWC,
            max: valueVWC,
            avg: valueVWC,
            updatedAt: FieldValue.serverTimestamp(),
          });
          return;
        }

        const aggData = aggDoc.data();
        if (!aggData) {
          transaction.set(
            aggRef,
            {
              hour: hourId,
              sensorId,
              sum: valueVWC,
              count: 1,
              min: valueVWC,
              max: valueVWC,
              avg: valueVWC,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          return;
        }

        const currentCount =
          typeof aggData.count === "number" ? aggData.count : 0;
        const currentSum = typeof aggData.sum === "number" ? aggData.sum : 0;
        const currentMin =
          typeof aggData.min === "number" ? aggData.min : valueVWC;
        const currentMax =
          typeof aggData.max === "number" ? aggData.max : valueVWC;

        const newCount = currentCount + 1;
        const newSum = currentSum + valueVWC;
        const newAvg = newSum / newCount;
        const newMin = Math.min(currentMin, valueVWC);
        const newMax = Math.max(currentMax, valueVWC);

        transaction.update(aggRef, {
          sum: newSum,
          count: newCount,
          min: newMin,
          max: newMax,
          avg: newAvg,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
    } catch (error) {
      logger.error("Error al actualizar el agregado de lecturas", error);
    }
  }
);

/**
 * 1. FUNCIÓN: Notificar Humedad Baja
 *
 * Se activa cuando se actualiza un documento en irrigationLines
 * Verifica si la humedad cruza por debajo del umbral crítico
 */
export const onLowHumidityAlert = onDocumentUpdated(
  "irrigationLines/{lineId}",
  async (event: any) => {
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

      logger.info(
        `Humidity changed for ${lineTitle}: ` +
          `${beforeHumidity}% → ${afterHumidity}%`
      );

      // Verificar si la humedad cruzó por debajo del umbral
      if (
        beforeHumidity >= HUMIDITY_THRESHOLD &&
        afterHumidity < HUMIDITY_THRESHOLD
      ) {
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

        logger.info(
          `✅ Notifications sent: ${response.successCount} successful, ` +
            `${response.failureCount} failed`
        );

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
            const userDocs = await admin
              .firestore()
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
  async (event: any) => {
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

      logger.info(
        `Irrigation status changed for ${lineTitle}: ` +
          `${beforeActive} → ${afterActive}`
      );

      // Obtener tokens de administradores
      const tokens = await getAdminTokens();

      if (tokens.length === 0) {
        logger.warn("No admin tokens found");
        return;
      }

      // Preparar mensaje según el estado
      const title = afterActive ? "💧 Riego Activado" : "⏸️ Riego Desactivado";

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

      logger.info(
        `✅ Notifications sent: ${response.successCount} successful, ` +
          `${response.failureCount} failed`
      );

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
          const userDocs = await admin
            .firestore()
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
/**
 * 2B. FUNCIÓN: Notificar Riego Automático por Humedad Objetivo
 *
 * Se activa cuando la humedad cruza el umbral de targetHumidity
 * Detecta inicio y finalización de riego automático
 */
export const onAutoIrrigationTarget = onDocumentUpdated(
  "irrigationLines/{lineId}",
  async (event: any) => {
    try {
      const lineId = event.params.lineId;
      const beforeData = event.data?.before.data() as IrrigationLine & { targetHumidity?: number };
      const afterData = event.data?.after.data() as IrrigationLine & { targetHumidity?: number };

      if (!beforeData || !afterData) {
        return;
      }

      const targetHumidity = afterData.targetHumidity || 0;
      
      // Solo procesar si hay un umbral objetivo configurado
      if (targetHumidity === 0) {
        return;
      }

      const beforeHumidity = beforeData.humidity;
      const afterHumidity = afterData.humidity;
      const lineTitle = afterData.title || `Línea ${lineId}`;
      
      // Histéresis: activa si < target - 3%, completa si >= target
      const HYSTERESIS = 3;
      const lowerThreshold = targetHumidity - HYSTERESIS;

      // Detectar cuando cruza por debajo del umbral (inicia riego automático)
      const wasAboveTarget = beforeHumidity >= lowerThreshold;
      const isBelowTarget = afterHumidity < lowerThreshold;
      const startedAutoIrrigation = wasAboveTarget && isBelowTarget && afterData.isActive;

      // Detectar cuando alcanza el objetivo (finaliza riego automático)
      const wasBelowTarget = beforeHumidity < targetHumidity;
      const reachedTarget = afterHumidity >= targetHumidity;
      const completedAutoIrrigation = wasBelowTarget && reachedTarget;

      if (!startedAutoIrrigation && !completedAutoIrrigation) {
        return;
      }

      logger.info(
        `Auto-irrigation event for ${lineTitle}: started=${startedAutoIrrigation}, completed=${completedAutoIrrigation}`
      );

      // Obtener tokens de administradores
      const tokens = await getAdminTokens();

      if (tokens.length === 0) {
        return;
      }

      let title: string;
      let body: string;
      let notifType: string;

      if (startedAutoIrrigation) {
        title = "🌱 Riego Automático Iniciado";
        body = `${lineTitle} necesita agua. Humedad: ${afterHumidity}% (objetivo: ${targetHumidity}%)`;
        notifType = "auto_irrigation_started";
      } else {
        title = "✅ Objetivo Alcanzado";
        body = `${lineTitle} alcanzó ${afterHumidity}% de humedad (objetivo: ${targetHumidity}%)`;
        notifType = "auto_irrigation_completed";
      }

      const message: admin.messaging.MulticastMessage = {
        notification: {
          title,
          body,
        },
        data: {
          type: notifType,
          lineId: lineId,
          lineName: lineTitle,
          humidity: afterHumidity.toString(),
          targetHumidity: targetHumidity.toString(),
          timestamp: Date.now().toString(),
        },
        tokens: tokens,
      };

      // Enviar notificación
      const response = await admin.messaging().sendEachForMulticast(message);

      logger.info(
        `✅ Auto-irrigation notifications sent: ${response.successCount} successful, ` +
          `${response.failureCount} failed`
      );

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
          const userDocs = await admin
            .firestore()
            .collection("users")
            .where("role", "==", "admin")
            .get();
          await cleanInvalidTokens(invalidTokens, userDocs);
        }
      }
    } catch (error) {
      logger.error("Error in onAutoIrrigationTarget:", error);
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
      const linesSnapshot = await admin
        .firestore()
        .collection("irrigationLines")
        .get();

      const failedSensors: Array<{
        id: string;
        title: string;
        lastUpdate: number;
      }> = [];

      linesSnapshot.forEach((doc) => {
        const data = doc.data();
        const lastUpdated =
          (
            data.lastUpdated as admin.firestore.Timestamp | undefined
          )?.toMillis() || 0;

        if (lastUpdated < timeoutThreshold) {
          failedSensors.push({
            id: doc.id,
            title: (data.title as string | undefined) || `Línea ${doc.id}`,
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
        const timeSinceUpdate = Math.floor(
          (now - sensor.lastUpdate) / (60 * 1000)
        );

        const message: admin.messaging.MulticastMessage = {
          notification: {
            title: "🚨 Posible Fallo de Sensor",
            body:
              `${sensor.title} no reporta desde hace ` +
              `${timeSinceUpdate} minutos`,
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
        logger.info(
          `Sensor failure notification for ${sensor.title}: ` +
            `${response.successCount} sent`
        );
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
 * Acceso: Manual invocation or scheduled fallback
 */
export const sendTestNotification = onSchedule(
  {
    schedule: "every 24 hours",
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
      logger.info(
        `✅ Test notifications sent: ${response.successCount} successful`
      );
    } catch (error) {
      logger.error("Error sending test notification:", error);
    }
  }
);

/**
 * 5. FUNCIÓN CALLABLE: Actualizar Rol de Usuario
 *
 * Permite a los administradores cambiar el rol de un usuario
 * Solo accesible por usuarios con rol 'admin'
 */
export const updateUserRole = onCall(
  {
    region: "us-central1",
  },
  async (request: any) => {
    try {
      // Verificar autenticación
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Debes estar autenticado para realizar esta operación"
        );
      }

      const callerUid = request.auth.uid;

      // Verificar que el caller es admin
      const callerDoc = await admin
        .firestore()
        .collection("users")
        .doc(callerUid)
        .get();

      const callerData = callerDoc.data();
      if (!callerData || callerData.role !== "admin") {
        throw new HttpsError(
          "permission-denied",
          "Solo los administradores pueden cambiar roles de usuario"
        );
      }

      // Obtener datos de la petición
      const { userId, newRole } = request.data as {
        userId: string;
        newRole: string;
      };

      // Validar datos
      if (!userId || typeof userId !== "string") {
        throw new HttpsError("invalid-argument", "userId es requerido");
      }

      if (
        !newRole ||
        typeof newRole !== "string" ||
        !["admin", "supervisor"].includes(newRole)
      ) {
        throw new HttpsError(
          "invalid-argument",
          "newRole debe ser 'admin' o 'supervisor'"
        );
      }

      // No permitir que un admin se quite sus propios privilegios
      if (userId === callerUid) {
        throw new HttpsError(
          "permission-denied",
          "No puedes cambiar tu propio rol"
        );
      }

      logger.info(
        `Admin ${callerUid} updating role for user ${userId} to ${newRole}`
      );

      // Actualizar custom claims
      await admin.auth().setCustomUserClaims(userId, { role: newRole });

      // Actualizar documento en Firestore
      await admin.firestore().collection("users").doc(userId).update({
        role: newRole,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: callerUid,
      });

      logger.info(`✅ Role updated successfully for user ${userId}`);

      return {
        success: true,
        message: "Rol actualizado exitosamente",
        userId,
        newRole,
      };
    } catch (error) {
      logger.error("Error updating user role:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Error al actualizar el rol del usuario"
      );
    }
  }
);

/**
 * 6. FUNCIÓN CALLABLE: Eliminar Usuario
 *
 * Permite a los administradores eliminar un usuario del sistema
 * Solo accesible por usuarios con rol 'admin'
 */
export const deleteUser = onCall(
  {
    region: "us-central1",
  },
  async (request: any) => {
    try {
      // Verificar autenticación
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Debes estar autenticado para realizar esta operación"
        );
      }

      const callerUid = request.auth.uid;

      // Verificar que el caller es admin
      const callerDoc = await admin
        .firestore()
        .collection("users")
        .doc(callerUid)
        .get();

      const callerData = callerDoc.data();
      if (!callerData || callerData.role !== "admin") {
        throw new HttpsError(
          "permission-denied",
          "Solo los administradores pueden eliminar usuarios"
        );
      }

      // Obtener datos de la petición
      const { userId } = request.data as { userId: string };

      // Validar datos
      if (!userId || typeof userId !== "string") {
        throw new HttpsError("invalid-argument", "userId es requerido");
      }

      // No permitir que un admin se elimine a sí mismo
      if (userId === callerUid) {
        throw new HttpsError(
          "permission-denied",
          "No puedes eliminarte a ti mismo"
        );
      }

      logger.info(`Admin ${callerUid} deleting user ${userId}`);

      // Eliminar documento de Firestore
      await admin.firestore().collection("users").doc(userId).delete();

      // Eliminar usuario de Authentication
      await admin.auth().deleteUser(userId);

      logger.info(`✅ User ${userId} deleted successfully`);

      return {
        success: true,
        message: "Usuario eliminado exitosamente",
        userId,
      };
    } catch (error) {
      logger.error("Error deleting user:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      // Manejar casos específicos
      if (
        error instanceof Error &&
        error.message.includes("auth/user-not-found")
      ) {
        // Si el usuario ya no existe en Auth, solo eliminamos de Firestore
        const { userId } = request.data as { userId: string };
        await admin.firestore().collection("users").doc(userId).delete();

        return {
          success: true,
          message: "Usuario eliminado exitosamente",
          userId,
        };
      }

      throw new HttpsError("internal", "Error al eliminar el usuario");
    }
  }
);
