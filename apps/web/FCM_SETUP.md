# Configuración de Firebase Cloud Messaging (FCM)

## 📱 Notificaciones Push - Guía de Configuración

Esta aplicación está configurada para recibir notificaciones push usando Firebase Cloud Messaging (FCM). Sin embargo, necesitas completar la configuración con tus credenciales de Firebase.

## 🔑 Paso 1: Habilitar Cloud Messaging en Firebase

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Configuración del proyecto** (⚙️) → **Cloud Messaging**
4. Si Cloud Messaging no está habilitado, habilítalo

## 🔐 Paso 2: Obtener la VAPID Key

1. En la consola de Firebase, ve a **Cloud Messaging**
2. Desplázate hasta **Certificados de clave web**
3. Si no tienes una clave, haz clic en **Generar par de claves**
4. Copia la clave pública (VAPID Key)

## 📝 Paso 3: Configurar el Service Worker

Abre el archivo `/public/firebase-messaging-sw.js` y reemplaza los valores de configuración:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",              // De la consola Firebase
  authDomain: "TU_AUTH_DOMAIN_AQUI",      // ej: tu-proyecto.firebaseapp.com
  projectId: "TU_PROJECT_ID_AQUI",        // ID de tu proyecto
  storageBucket: "TU_STORAGE_BUCKET",     // ej: tu-proyecto.appspot.com
  messagingSenderId: "TU_SENDER_ID_AQUI", // ID numérico del remitente
  appId: "TU_APP_ID_AQUI"                 // ID de tu app web
};
```

**⚠️ IMPORTANTE:** Este archivo **NO** puede usar variables de entorno porque se ejecuta directamente en el navegador como Service Worker. Debes usar valores literales.

## 🔧 Paso 4: Configurar la VAPID Key en el Hook

Abre el archivo `/lib/useFCM.ts` y reemplaza la VAPID Key:

```typescript
const VAPID_KEY = 'TU_VAPID_KEY_AQUI'; // La que copiaste en el Paso 2
```

## 🚀 Paso 5: Probar las Notificaciones

### Desarrollo Local

1. Compila y ejecuta la aplicación:
   ```bash
   bun run build
   bun run start
   ```

2. Abre la aplicación en tu navegador (debe ser HTTPS o localhost)

3. Deberías ver un banner pidiendo activar las notificaciones

4. Haz clic en "Activar" y acepta el permiso del navegador

5. Verifica en la consola que aparezca:
   ```
   ✅ Permiso de notificaciones concedido
   ✅ Service Worker de FCM registrado
   ✅ Token FCM obtenido: ...
   ✅ Token FCM guardado en Firestore
   ```

### Enviar una Notificación de Prueba

#### Opción 1: Desde la Consola de Firebase

1. Ve a **Cloud Messaging** en la consola de Firebase
2. Haz clic en **Enviar tu primer mensaje**
3. Escribe un título y mensaje
4. Haz clic en **Enviar mensaje de prueba**
5. Pega el token FCM que se muestra en la consola del navegador
6. Envía el mensaje

#### Opción 2: Usando la API de Firebase Admin (Backend)

```javascript
const admin = require('firebase-admin');

// Inicializar Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Enviar notificación
const message = {
  notification: {
    title: '💧 Alerta de Riego',
    body: 'La línea de riego #1 ha sido activada'
  },
  data: {
    lineId: '1',
    action: 'line_activated',
    timestamp: Date.now().toString()
  },
  token: 'TOKEN_FCM_DEL_USUARIO'
};

admin.messaging().send(message)
  .then((response) => {
    console.log('Mensaje enviado:', response);
  })
  .catch((error) => {
    console.error('Error al enviar mensaje:', error);
  });
```

## 📊 Estructura de la Base de Datos

Los tokens FCM se guardan en Firestore en el documento del usuario:

```javascript
users/{userId}
  ├── email: string
  ├── role: string
  ├── fcmTokens: array<string>  // ← Aquí se guardan los tokens
  └── lastTokenUpdate: timestamp
```

Esto permite:
- Enviar notificaciones a un usuario específico
- Soportar múltiples dispositivos por usuario
- Eliminar tokens obsoletos

## 🔔 Tipos de Notificaciones

### 1. Notificaciones en Primer Plano

Cuando la app está **abierta y enfocada**:
- Se manejan con `onMessage()` en `useFCM.ts`
- Se muestra un toast en la parte superior derecha
- También se puede mostrar una notificación del navegador

### 2. Notificaciones en Segundo Plano

Cuando la app está **cerrada o en segundo plano**:
- Se manejan con `onBackgroundMessage()` en `firebase-messaging-sw.js`
- Se muestra automáticamente como notificación del sistema
- Al hacer clic, se abre/enfoca la aplicación

## 🎨 Personalización de Notificaciones

### Cambiar el Icono

Edita en `firebase-messaging-sw.js`:
```javascript
const notificationOptions = {
  icon: "/icon-192x192.png", // Cambia a tu icono
  badge: "/icon-192x192.png"
};
```

### Agregar Acciones

```javascript
const notificationOptions = {
  body: payload.notification.body,
  icon: "/icon-192x192.png",
  actions: [
    { action: 'view', title: 'Ver detalles' },
    { action: 'dismiss', title: 'Descartar' }
  ]
};
```

### Sonido y Vibración

```javascript
const notificationOptions = {
  body: payload.notification.body,
  icon: "/icon-192x192.png",
  vibrate: [200, 100, 200], // Patrón de vibración
  silent: false              // Reproducir sonido
};
```

## 🐛 Solución de Problemas

### "Token FCM no se genera"

1. Verifica que HTTPS esté habilitado (o estés en localhost)
2. Verifica que la VAPID Key sea correcta
3. Verifica que el Service Worker esté registrado:
   - DevTools → Application → Service Workers
4. Revisa la consola del navegador para ver errores

### "Service Worker no se registra"

1. Verifica que las credenciales en `firebase-messaging-sw.js` sean correctas
2. Abre DevTools → Console y busca errores
3. Verifica que la URL del Service Worker sea correcta: `/firebase-messaging-sw.js`
4. Limpia la caché: DevTools → Application → Clear storage

### "Notificaciones no llegan"

1. Verifica que el permiso esté concedido:
   ```javascript
   console.log(Notification.permission); // Debe ser "granted"
   ```
2. Verifica que el token esté guardado en Firestore
3. Verifica que el token usado para enviar sea el correcto
4. Verifica en Firebase Console → Cloud Messaging → Estadísticas

### "Error: Missing or insufficient permissions"

El usuario no tiene permisos en Firestore. Agrega estas reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 📚 Referencias

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [FCM Web Setup](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Service Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)

## ✅ Checklist de Configuración

- [ ] Cloud Messaging habilitado en Firebase Console
- [ ] VAPID Key generada y copiada
- [ ] Credenciales de Firebase en `firebase-messaging-sw.js`
- [ ] VAPID Key en `lib/useFCM.ts`
- [ ] Aplicación compilada en modo producción
- [ ] Permiso de notificaciones concedido
- [ ] Token FCM generado y guardado en Firestore
- [ ] Notificación de prueba enviada y recibida
- [ ] Notificaciones funcionan en primer plano
- [ ] Notificaciones funcionan en segundo plano

## 🎯 Casos de Uso

### Alertas de Riego

```javascript
{
  notification: {
    title: "💧 Línea de Riego Activada",
    body: "La línea 'Zona Norte' ha iniciado el riego automático"
  },
  data: {
    type: "irrigation_started",
    lineId: "line_1",
    lineName: "Zona Norte"
  }
}
```

### Alertas de Humedad

```javascript
{
  notification: {
    title: "⚠️ Humedad Baja Detectada",
    body: "La línea 'Zona Sur' tiene 15% de humedad"
  },
  data: {
    type: "low_humidity",
    lineId: "line_2",
    humidity: "15"
  }
}
```

### Mantenimiento

```javascript
{
  notification: {
    title: "🔧 Mantenimiento Programado",
    body: "Se realizará mantenimiento del sistema mañana a las 10:00"
  },
  data: {
    type: "maintenance",
    scheduledTime: "2025-10-19T10:00:00Z"
  }
}
```
