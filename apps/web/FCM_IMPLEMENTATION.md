# 🔔 Firebase Cloud Messaging (FCM) - Resumen de Implementación

## ✅ Configuración Completada

He implementado Firebase Cloud Messaging (FCM) para permitir notificaciones push en la aplicación. La configuración está casi completa, pero **requiere que agregues tus credenciales de Firebase**.

## 📁 Archivos Creados/Modificados

### 1. **Service Worker para FCM**
- **Archivo:** `/public/firebase-messaging-sw.js`
- **Propósito:** Manejar notificaciones en segundo plano
- **⚠️ ACCIÓN REQUERIDA:** Reemplazar placeholders con credenciales reales de Firebase

### 2. **Hook de FCM**
- **Archivo:** `/lib/useFCM.ts`
- **Propósito:** Gestionar permisos, tokens y notificaciones en primer plano
- **⚠️ ACCIÓN REQUERIDA:** Reemplazar `VAPID_KEY` con tu clave real

### 3. **Dashboard Layout Actualizado**
- **Archivo:** `/app/(dashboard)/layout.tsx`
- **Cambios:**
  - Integrado el hook `useFCM`
  - Banner para solicitar permiso de notificaciones
  - Toast para mostrar notificaciones en primer plano
  - Confirmación visual cuando las notificaciones están activadas

### 4. **Documentación**
- **Archivo:** `/FCM_SETUP.md`
- **Contenido:** Guía completa de configuración paso a paso

### 5. **Script de Ejemplo**
- **Archivo:** `/docs/send-notification-example.js`
- **Contenido:** Ejemplos de cómo enviar notificaciones desde el backend

## 🔧 Pasos Pendientes (OBLIGATORIOS)

### Paso 1: Configurar Service Worker

Edita `/public/firebase-messaging-sw.js` líneas 11-17:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",                    // ← Reemplazar
  authDomain: "TU_AUTH_DOMAIN",            // ← Reemplazar
  projectId: "TU_PROJECT_ID",              // ← Reemplazar
  storageBucket: "TU_STORAGE_BUCKET",      // ← Reemplazar
  messagingSenderId: "TU_MESSAGING_SENDER_ID", // ← Reemplazar
  appId: "TU_APP_ID"                       // ← Reemplazar
};
```

**¿Dónde encontrar estos valores?**
- Consola Firebase → ⚙️ Configuración del proyecto → General
- Copia los valores de "Tu app web"

### Paso 2: Configurar VAPID Key

Edita `/lib/useFCM.ts` línea 10:

```typescript
const VAPID_KEY = 'TU_VAPID_KEY_AQUI'; // ← Reemplazar
```

**¿Dónde encontrar la VAPID Key?**
- Consola Firebase → ⚙️ Configuración del proyecto → Cloud Messaging
- Sección "Certificados de clave web"
- Si no existe, haz clic en "Generar par de claves"

### Paso 3: Habilitar Cloud Messaging

1. Ve a la Consola de Firebase
2. Selecciona tu proyecto
3. Ve a **Cloud Messaging**
4. Asegúrate de que esté habilitado

## 🎯 Funcionalidades Implementadas

### ✅ Solicitud de Permisos
- Banner automático en el dashboard
- Botón para activar notificaciones
- Opción "Ahora no" para posponer

### ✅ Gestión de Tokens
- Generación automática de tokens FCM
- Guardado en Firestore (array `fcmTokens` en documento de usuario)
- Soporte para múltiples dispositivos por usuario
- No se duplican tokens

### ✅ Notificaciones en Primer Plano
- Listener con `onMessage()`
- Toast visual en la esquina superior derecha
- Notificación del navegador también disponible

### ✅ Notificaciones en Segundo Plano
- Manejadas por Service Worker
- Notificación del sistema operativo
- Click abre/enfoca la aplicación

### ✅ Experiencia de Usuario
- Indicador visual cuando las notificaciones están activas
- Confirmación verde al activar notificaciones
- Toast personalizado para notificaciones en primer plano
- Banner no intrusivo para solicitar permisos

## 📊 Estructura de Datos en Firestore

```javascript
users/{userId}
  ├── email: string
  ├── role: string
  ├── fcmTokens: string[]        // ← Array de tokens FCM
  └── lastTokenUpdate: timestamp // ← Última actualización
```

## 🧪 Cómo Probar

### 1. Completar Configuración
```bash
# Editar archivos con credenciales reales
nano public/firebase-messaging-sw.js
nano lib/useFCM.ts
```

### 2. Compilar y Ejecutar
```bash
cd apps/web
bun run build
bun run start
```

### 3. Abrir en Navegador
- Ve a `http://localhost:3000`
- Inicia sesión
- Deberías ver el banner de notificaciones

### 4. Activar Notificaciones
- Haz clic en "Activar"
- Acepta el permiso del navegador
- Verifica en la consola:
  ```
  ✅ Permiso de notificaciones concedido
  ✅ Service Worker de FCM registrado
  ✅ Token FCM obtenido: ...
  ✅ Token FCM guardado en Firestore
  ```

### 5. Enviar Notificación de Prueba

#### Opción A: Desde Firebase Console
1. Cloud Messaging → "Enviar mensaje de prueba"
2. Copia el token desde la consola del navegador
3. Pega el token y envía

#### Opción B: Usando curl
```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=TU_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "TOKEN_FCM_DEL_USUARIO",
    "notification": {
      "title": "Prueba",
      "body": "Esta es una notificación de prueba"
    }
  }'
```

## 🔍 Verificación en DevTools

### Service Workers
1. F12 → Application → Service Workers
2. Deberías ver `/firebase-messaging-sw.js` registrado

### Tokens FCM
1. F12 → Console
2. Busca logs con "✅ Token FCM obtenido"
3. Copia el token para pruebas

### Firestore
1. Firebase Console → Firestore Database
2. Ve a `users/{tu-user-id}`
3. Verifica que exista el campo `fcmTokens` con tu token

## 📱 Casos de Uso

### 1. Alertas de Riego
```javascript
{
  notification: {
    title: "💧 Riego Activado",
    body: "La línea 'Zona Norte' está regando"
  },
  data: {
    type: "irrigation_started",
    lineId: "line_1"
  }
}
```

### 2. Alertas de Humedad
```javascript
{
  notification: {
    title: "⚠️ Humedad Baja",
    body: "Zona Sur: 15% de humedad"
  },
  data: {
    type: "low_humidity",
    lineId: "line_2",
    humidity: "15"
  }
}
```

### 3. Mantenimiento
```javascript
{
  notification: {
    title: "🔧 Mantenimiento",
    body: "Programado para mañana 10:00"
  },
  data: {
    type: "maintenance",
    scheduledTime: "2025-10-19T10:00:00Z"
  }
}
```

## 🛡️ Seguridad

### ✅ Tokens en Firestore
- Solo el usuario puede leer/escribir sus propios tokens
- Reglas de seguridad recomendadas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId;
    }
  }
}
```

### ✅ Service Worker
- Las credenciales son públicas (esto es normal)
- Firebase valida los permisos en el backend
- Solo usuarios autorizados pueden enviar notificaciones

### ⚠️ NO Subir a Git
- `serviceAccountKey.json` (clave privada del admin)
- `.env` con credenciales sensibles

## 📚 Documentación Adicional

- **Configuración detallada:** `FCM_SETUP.md`
- **Ejemplo de backend:** `docs/send-notification-example.js`
- **PWA setup:** `PWA_README.md`

## 🎉 Resumen

La configuración de FCM está **95% completa**. Solo necesitas:

1. ✅ Copiar credenciales de Firebase → `firebase-messaging-sw.js`
2. ✅ Copiar VAPID Key → `useFCM.ts`
3. ✅ Compilar y probar

Una vez completados estos pasos, tendrás un sistema completo de notificaciones push que funciona tanto en primer plano como en segundo plano, con soporte offline y multi-dispositivo. 🚀
