# 🔥 Firebase Cloud Functions - Sistema de Riego

## 📋 Funciones Implementadas

Este proyecto incluye 4 Cloud Functions para gestionar notificaciones push automáticas:

### 1. `onLowHumidityAlert` 🌡️

**Trigger:** `onDocumentUpdated` en `irrigationLines/{lineId}`

**Propósito:** Detectar cuando la humedad de una línea de riego cae por debajo del umbral crítico (20%).

**Comportamiento:**

- Se activa cada vez que se actualiza un documento en `irrigationLines`
- Compara la humedad anterior vs. la nueva
- Si la humedad cruza por debajo de 20% (y antes estaba por encima):
  - Obtiene tokens FCM de todos los administradores
  - Envía notificación con título: "⚠️ Alerta de Humedad Baja"
  - Incluye el nombre de la línea y el porcentaje actual
  - Limpia tokens inválidos automáticamente

**Datos enviados:**

```javascript
{
  type: "low_humidity",
  lineId: "line_1",
  lineName: "Zona Norte",
  humidity: "18",
  threshold: "20",
  timestamp: "1697654321000"
}
```

---

### 2. `onIrrigationStatusChange` 💧

**Trigger:** `onDocumentUpdated` en `irrigationLines/{lineId}`

**Propósito:** Notificar cuando se activa o desactiva el riego en una línea.

**Comportamiento:**

- Se activa cada vez que se actualiza un documento en `irrigationLines`
- Compara el estado `isActive` anterior vs. el nuevo
- Si el estado cambió:
  - Envía notificación a administradores
  - Título: "💧 Riego Activado" o "⏸️ Riego Desactivado"
  - Incluye información de la línea y humedad actual

**Datos enviados (activado):**

```javascript
{
  type: "irrigation_started",
  lineId: "line_1",
  lineName: "Zona Norte",
  isActive: "true",
  humidity: "25",
  timestamp: "1697654321000"
}
```

**Datos enviados (desactivado):**

```javascript
{
  type: "irrigation_stopped",
  lineId: "line_1",
  lineName: "Zona Norte",
  isActive: "false",
  humidity: "45",
  timestamp: "1697654321000"
}
```

---

### 3. `onSensorFailureCheck` 🔍

**Trigger:** `onSchedule` - Cada 1 hora

**Propósito:** Detectar sensores que no están reportando datos.

**Comportamiento:**

- Se ejecuta automáticamente cada hora
- Verifica el campo `lastUpdated` de cada línea
- Si alguna línea no se ha actualizado en la última hora:
  - Envía notificación de "Posible Fallo de Sensor"
  - Indica cuánto tiempo lleva sin reportar
  - Notifica a todos los administradores

**Datos enviados:**

```javascript
{
  type: "sensor_failure",
  lineId: "line_2",
  lineName: "Zona Sur",
  timeSinceUpdate: "75", // minutos
  lastUpdate: "1697650000000",
  timestamp: "1697654321000"
}
```

---

### 4. `sendTestNotification` 🧪

**Trigger:** `onSchedule` - Cada 24 horas (o manual)

**Propósito:** Función de prueba para verificar que las notificaciones funcionan.

**Comportamiento:**

- Se puede ejecutar manualmente
- Envía notificación de prueba a todos los administradores
- Útil para verificar que el sistema funciona correctamente

**Datos enviados:**

```javascript
{
  type: "test",
  timestamp: "1697654321000"
}
```

---

## 🚀 Despliegue

### Requisitos Previos

1. **Firebase CLI instalado:**

   ```bash
   npm install -g firebase-tools
   ```

2. **Autenticado en Firebase:**

   ```bash
   firebase login
   ```

3. **Proyecto inicializado:**
   ```bash
   firebase init functions
   ```

### Compilar Functions

```bash
cd functions
npm run build
```

### Desplegar Todas las Functions

```bash
firebase deploy --only functions
```

### Desplegar una Función Específica

```bash
# Solo humedad baja
firebase deploy --only functions:onLowHumidityAlert

# Solo cambio de estado
firebase deploy --only functions:onIrrigationStatusChange

# Solo verificación de sensores
firebase deploy --only functions:onSensorFailureCheck

# Solo función de prueba
firebase deploy --only functions:sendTestNotification
```

### Ver Logs

```bash
# Logs en tiempo real
firebase functions:log --only onLowHumidityAlert

# Logs de todas las funciones
firebase functions:log
```

---

## ⚙️ Configuración

### Cambiar Umbral de Humedad

Edita el archivo `/functions/src/index.ts`:

```typescript
// Cambiar el umbral de 20% a otro valor
const HUMIDITY_THRESHOLD = 20; // ← Cambiar aquí
```

### Cambiar Frecuencia de Verificación de Sensores

```typescript
export const onSensorFailureCheck = onSchedule(
  {
    schedule: "every 1 hours", // ← Cambiar aquí
    // Otras opciones:
    // "every 30 minutes"
    // "every 2 hours"
    // "0 */4 * * *" (cada 4 horas)
    timeZone: "America/Bogota",
  }
  // ...
);
```

### Cambiar Tiempo Máximo sin Actualización

```typescript
// Cambiar de 1 hora a otro valor
const SENSOR_TIMEOUT = 60 * 60 * 1000; // ← Cambiar aquí
// Ejemplos:
// 30 minutos: 30 * 60 * 1000
// 2 horas: 2 * 60 * 60 * 1000
```

### Cambiar Región

```typescript
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1", // ← Cambiar aquí
  // Otras regiones:
  // "us-east1"
  // "europe-west1"
  // "asia-northeast1"
});
```

---

## 🧪 Probar Localmente

### Emular Functions

```bash
firebase emulators:start --only functions,firestore
```

Esto iniciará:

- Functions emulator en `http://localhost:5001`
- Firestore emulator en `http://localhost:8080`

### Probar Manualmente

1. **Crear una línea de riego de prueba en Firestore:**

   ```javascript
   // En Firestore Console o usando el emulador
   collection: irrigationLines
   document: test_line_1
   {
     title: "Línea de Prueba",
     isActive: false,
     humidity: 25,
     lastUpdated: Timestamp.now()
   }
   ```

2. **Actualizar la humedad para activar alerta:**

   ```javascript
   // Cambiar humidity a 18 (por debajo del umbral)
   {
     humidity: 18;
   }
   ```

3. **Activar el riego:**
   ```javascript
   // Cambiar isActive a true
   {
     isActive: true;
   }
   ```

---

## 📊 Monitoreo

### Firebase Console

1. Ve a Firebase Console → Functions
2. Verás un dashboard con:
   - Número de invocaciones
   - Tiempo de ejecución
   - Errores
   - Logs

### Logs Estructurados

Las funciones usan logging estructurado:

```typescript
logger.info("Humidity changed", {
  lineId: "line_1",
  before: 25,
  after: 18,
});
```

Puedes filtrar logs en Cloud Console por:

- Severidad (info, warn, error)
- Función específica
- Rango de tiempo

---

## 💰 Costos

### Cálculo Estimado

**Plan Spark (Gratis):**

- 125,000 invocaciones/mes
- 40,000 GB-seg de tiempo de cómputo
- 5 GB de salida de red

**Plan Blaze (Pago por uso):**

- $0.40 por millón de invocaciones
- $0.0000025 por GB-seg
- Primeros 2 millones de invocaciones gratis cada mes

**Ejemplo de uso:**

- `onLowHumidityAlert`: ~100 invocaciones/día = 3,000/mes
- `onIrrigationStatusChange`: ~200 invocaciones/día = 6,000/mes
- `onSensorFailureCheck`: 24 invocaciones/día = 720/mes
- **Total:** ~9,720 invocaciones/mes → **GRATIS** en plan Spark

---

## 🔐 Seguridad

### Reglas de Firestore

Las functions usan el Admin SDK, que tiene acceso completo. Asegúrate de que las reglas de Firestore protejan los datos:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo administradores pueden escribir en irrigationLines
    match /irrigationLines/{lineId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
                    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Los usuarios solo pueden leer/escribir sus propios datos
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Variables de Entorno Sensibles

Si necesitas usar API keys o secretos:

```bash
firebase functions:config:set someservice.key="THE API KEY"
```

Luego en el código:

```typescript
const apiKey = functions.config().someservice.key;
```

---

## 🐛 Solución de Problemas

### "Function deployment failed"

1. Verifica que estés autenticado:

   ```bash
   firebase login --reauth
   ```

2. Verifica que el proyecto sea correcto:

   ```bash
   firebase use uniminuto-riego-pwa
   ```

3. Verifica que el código compile:
   ```bash
   cd functions && npm run build
   ```

### "No tokens found"

1. Verifica que hay usuarios con role="admin" en Firestore
2. Verifica que esos usuarios tienen fcmTokens en su documento
3. Revisa los logs:
   ```bash
   firebase functions:log
   ```

### "Permission denied"

1. Verifica las reglas de Firestore
2. Asegúrate de que el Admin SDK esté inicializado:
   ```typescript
   admin.initializeApp();
   ```

### "Timeout error"

1. Aumenta el timeout de la función:
   ```typescript
   export const myFunction = onDocumentUpdated(
     {
       document: "irrigationLines/{lineId}",
       timeoutSeconds: 60, // ← Aumentar
     },
     async (event) => { ... }
   );
   ```

---

## 📚 Referencias

- [Firebase Functions v2 Docs](https://firebase.google.com/docs/functions)
- [Firestore Triggers](https://firebase.google.com/docs/functions/firestore-events)
- [Scheduled Functions](https://firebase.google.com/docs/functions/schedule-functions)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Admin SDK Messaging](https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging)

---

## ✅ Checklist de Despliegue

- [ ] Firebase CLI instalado y autenticado
- [ ] Proyecto inicializado con `firebase init functions`
- [ ] Código compilado sin errores (`npm run build`)
- [ ] Configuración revisada (umbrales, región, etc.)
- [ ] Reglas de Firestore configuradas
- [ ] Functions desplegadas (`firebase deploy --only functions`)
- [ ] Logs verificados (`firebase functions:log`)
- [ ] Prueba de notificación enviada exitosamente
- [ ] Monitoreo configurado en Firebase Console

---

## 🎉 ¡Funciones Listas!

Las Cloud Functions están configuradas y listas para:

- ✅ Detectar humedad baja automáticamente
- ✅ Notificar cambios en el estado de riego
- ✅ Alertar sobre sensores que no reportan
- ✅ Enviar notificaciones de prueba

**Siguiente paso:** Desplegar con `firebase deploy --only functions`
