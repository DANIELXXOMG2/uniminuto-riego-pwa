# Sistema de Notificaciones - Estructura de Datos

## Descripción General

El sistema de notificaciones permite enviar alertas en tiempo real a los usuarios sobre eventos importantes del sistema de riego, como cambios en los niveles de humedad, activación/desactivación del riego, fallos en sensores, etc.

## Estructura de Firestore

### Colección de Notificaciones

Las notificaciones se almacenan en una subcolección dentro de cada documento de usuario:

```
/users/{userId}/notifications/{notificationId}
```

### Esquema de Documento de Notificación

Cada documento de notificación tiene la siguiente estructura:

```typescript
{
  title: string;           // Título de la notificación
  body: string;            // Cuerpo del mensaje
  timestamp: Timestamp;    // Fecha y hora de creación
  read: boolean;           // Estado de lectura (false por defecto)
  type: string;            // Tipo de notificación
  data: {                  // Datos adicionales específicos del tipo
    [key: string]: any;
  }
}
```

### Campos

#### `title` (string, requerido)
Título breve de la notificación que se muestra en el panel y en las notificaciones push.

**Ejemplo:** `"Humedad baja detectada"`

#### `body` (string, requerido)
Descripción detallada de la notificación con información adicional.

**Ejemplo:** `"El sensor 1 reporta 25% de humedad. Se recomienda activar el riego."`

#### `timestamp` (Timestamp, requerido)
Fecha y hora de creación de la notificación usando `serverTimestamp()` o un Timestamp específico.

**Ejemplo:** `Timestamp.now()` o `FieldValue.serverTimestamp()`

#### `read` (boolean, requerido)
Indica si la notificación ha sido leída por el usuario.

- `false`: No leída (valor por defecto)
- `true`: Leída

#### `type` (string, requerido)
Categoría de la notificación que determina el icono y color en la UI.

**Tipos soportados:**
- `low_humidity`: Humedad baja detectada
- `irrigation_started`: Sistema de riego iniciado
- `irrigation_stopped`: Sistema de riego detenido
- `sensor_failure`: Fallo en sensor
- `system_alert`: Alerta del sistema
- `test`: Notificación de prueba

#### `data` (object, opcional)
Mapa de datos adicionales específicos del tipo de notificación.

**Campos comunes:**
- `lineId`: ID de la línea de riego afectada
- `sensorId`: ID del sensor involucrado
- `humidity`: Nivel de humedad (para tipo `low_humidity`)
- `waterLevel`: Nivel de agua (para tipo `system_alert`)

## Ejemplos de Notificaciones

### 1. Humedad Baja

```javascript
{
  title: "Humedad baja detectada",
  body: "El sensor 1 reporta 25% de humedad. Se recomienda activar el riego.",
  type: "low_humidity",
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
  read: false,
  data: {
    sensorId: "sensor-1",
    humidity: 25,
    lineId: "linea-1"
  }
}
```

### 2. Riego Iniciado

```javascript
{
  title: "Sistema de riego activado",
  body: "El riego automático se ha iniciado en la línea 1",
  type: "irrigation_started",
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
  read: false,
  data: {
    lineId: "linea-1"
  }
}
```

### 3. Riego Detenido

```javascript
{
  title: "Riego completado",
  body: "El ciclo de riego de la línea 2 ha finalizado exitosamente",
  type: "irrigation_stopped",
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
  read: false,
  data: {
    lineId: "linea-2"
  }
}
```

### 4. Fallo en Sensor

```javascript
{
  title: "Fallo en sensor detectado",
  body: "El sensor 3 no responde. Por favor, verifica la conexión.",
  type: "sensor_failure",
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
  read: false,
  data: {
    sensorId: "sensor-3",
    lineId: "linea-3"
  }
}
```

### 5. Alerta del Sistema

```javascript
{
  title: "Nivel de agua bajo",
  body: "El nivel del depósito de agua está por debajo del 20%",
  type: "system_alert",
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
  read: false,
  data: {
    waterLevel: 18
  }
}
```

## Reglas de Seguridad

Para proteger las notificaciones de los usuarios, se deben configurar las siguientes reglas en Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reglas para notificaciones de usuario
    match /users/{userId}/notifications/{notificationId} {
      // Los usuarios solo pueden leer y actualizar sus propias notificaciones
      allow read, update: if request.auth != null && request.auth.uid == userId;
      
      // Solo el backend puede crear notificaciones
      allow create: if false;
      
      // No se pueden eliminar notificaciones desde el cliente
      allow delete: if false;
    }
  }
}
```

**Nota:** La creación de notificaciones debe realizarse exclusivamente desde:
- Cloud Functions (backend)
- Scripts administrativos con credenciales de administrador
- Sistema Arduino a través de Cloud Functions

## Integración con Firebase Cloud Messaging (FCM)

Cuando se crea una notificación en Firestore, también se puede enviar una notificación push usando FCM:

```javascript
// Ejemplo de Cloud Function que crea notificación y envía push
const admin = require('firebase-admin');

async function sendNotification(userId, notificationData) {
  // 1. Crear notificación en Firestore
  await admin.firestore()
    .collection('users')
    .doc(userId)
    .collection('notifications')
    .add({
      ...notificationData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    });

  // 2. Obtener token FCM del usuario
  const userDoc = await admin.firestore()
    .collection('users')
    .doc(userId)
    .get();
  
  const fcmToken = userDoc.data()?.fcmToken;

  // 3. Enviar notificación push
  if (fcmToken) {
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: notificationData.title,
        body: notificationData.body
      },
      data: notificationData.data || {}
    });
  }
}
```

## Consultas Comunes

### Obtener todas las notificaciones del usuario (ordenadas por fecha)

```javascript
const notificationsRef = db
  .collection('users')
  .doc(userId)
  .collection('notifications')
  .orderBy('timestamp', 'desc')
  .limit(20);
```

### Obtener solo notificaciones no leídas

```javascript
const unreadNotificationsRef = db
  .collection('users')
  .doc(userId)
  .collection('notifications')
  .where('read', '==', false)
  .orderBy('timestamp', 'desc');
```

### Marcar una notificación como leída

```javascript
await db
  .collection('users')
  .doc(userId)
  .collection('notifications')
  .doc(notificationId)
  .update({ read: true });
```

### Marcar todas como leídas (batch)

```javascript
const batch = db.batch();
const unreadDocs = await db
  .collection('users')
  .doc(userId)
  .collection('notifications')
  .where('read', '==', false)
  .get();

unreadDocs.forEach(doc => {
  batch.update(doc.ref, { read: true });
});

await batch.commit();
```

## Límites y Consideraciones

1. **Límite de documentos:** Se recomienda implementar una política de limpieza para mantener solo las últimas N notificaciones (ej. 50-100).

2. **Índices:** Firestore creará automáticamente índices para las consultas simples. Para consultas compuestas, puede requerir índices personalizados.

3. **Costos:** Cada lectura en tiempo real (onSnapshot) cuenta como una lectura. Limita la cantidad de notificaciones con `.limit()`.

4. **Persistencia offline:** Las notificaciones se cachean localmente y están disponibles sin conexión.

5. **Seguridad:** Nunca permitir que los clientes creen notificaciones directamente. Usar Cloud Functions o scripts administrativos.

## Testing

Para probar el sistema de notificaciones, usa el script incluido:

```bash
node scripts/test-notifications-create.js usuario@ejemplo.com
```

Este script crea 6 notificaciones de prueba de diferentes tipos con timestamps variados.

## Hook de React

El hook `useNotifications` en `/apps/web/lib/useNotifications.ts` proporciona:

- Suscripción en tiempo real a notificaciones
- Contador de notificaciones no leídas
- Funciones para marcar como leídas
- Manejo de estados de carga y errores

Uso:

```tsx
const {
  notifications,
  unreadCount,
  loading,
  error,
  markAsRead,
  markAllAsRead
} = useNotifications();
```

## Mantenimiento

### Limpiar notificaciones antiguas

Se recomienda implementar una Cloud Function programada para eliminar notificaciones antiguas:

```javascript
// Eliminar notificaciones más antiguas de 30 días
const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
);

const oldNotifications = await db
  .collectionGroup('notifications')
  .where('timestamp', '<', thirtyDaysAgo)
  .get();

const batch = db.batch();
oldNotifications.forEach(doc => {
  batch.delete(doc.ref);
});

await batch.commit();
```

## Referencias

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Timestamps](https://firebase.google.com/docs/reference/js/firestore_.timestamp)
