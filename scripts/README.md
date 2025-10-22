# 🧪 Scripts de Testing y Deployment

Este directorio contiene scripts auxiliares para probar y desplegar el sistema de riego.

## 📋 Scripts Principales

### 1. `deploy-functions.sh` 🚀

Script interactivo para desplegar Cloud Functions a Firebase.

**Uso:**

```bash
./deploy-functions.sh
```

**Funcionalidades:**

- ✅ Verifica autenticación con Firebase
- 🔨 Compila y valida Functions con ESLint y TypeScript
- 📦 Despliega funciones individuales o todas a la vez
- 📊 Muestra información de logs y estado

### 2. `test-notifications.sh` 🧪

Script interactivo para probar el sistema de notificaciones push.

**Uso:**

```bash
./test-notifications.sh
```

**Opciones:**

1. **Test de notificación manual** - Ver logs de la función de prueba
2. **Simular humedad baja** - Crea una alerta cuando la humedad cae por debajo del umbral
3. **Simular cambio de estado de riego** - Notifica cuando se activa/desactiva el riego
4. **Ver logs de Functions** - Muestra logs de cualquier función
5. **Ver tokens FCM** - Lista todos los tokens registrados de usuarios
6. **Salir**

---

## 📁 Scripts Auxiliares (Node.js)

### `scripts/test-low-humidity.js`

Simula una alerta de humedad baja.

**Uso:**

```bash
node scripts/test-low-humidity.js [lineId] [humidity]
```

**Ejemplo:**

```bash
node scripts/test-low-humidity.js line-1 15
```

### `scripts/test-status-change.js`

Simula cambio de estado de riego (activado/desactivado).

**Uso:**

```bash
node scripts/test-status-change.js [lineId] [newState]
```

**Ejemplo:**

```bash
node scripts/test-status-change.js line-1 true
```

### `scripts/get-fcm-tokens.js`

Lista todos los tokens FCM registrados.

**Uso:**

```bash
node scripts/get-fcm-tokens.js
```

### `scripts/init-firestore-for-arduino.js` 🆕

Inicializa la estructura de Firestore requerida para el firmware ESP32/ESP8266 v3.0.

**Uso:**

```bash
node scripts/init-firestore-for-arduino.js
```

**Acciones:**

- ✅ Crea documento de configuración del dispositivo (`config/device_config`)
- 💧 Crea documentos de líneas de riego con sensores asignados
- 🌡️ Crea documentos de sensores con metadata
- 📈 Crea lectura de ejemplo para testing
- 📊 Muestra recomendaciones de índices compuestos
- 🔒 Muestra reglas de seguridad recomendadas

**Nota:** Ejecutar este script antes de compilar y cargar el firmware Arduino.

### `scripts/test-ingest-api.js` 🆕

Prueba el API Route `/api/ingest` para ingesta de datos del Arduino.

**Uso:**

```bash
# Desarrollo (localhost)
node scripts/test-ingest-api.js

# Producción
API_URL=https://tu-dominio.vercel.app ARDUINO_API_SECRET=tu_secret node scripts/test-ingest-api.js
```

**Tests que ejecuta:**

1. ✅ Envío exitoso de lecturas
2. 🚫 Sin token de autenticación (debe fallar)
3. 🚫 Token incorrecto (debe fallar)
4. 🚫 Array de lecturas vacío (debe fallar)
5. 🚫 Falta propiedad `sensorId` (debe fallar)
6. 🚫 Falta propiedad `valueVWC` (debe fallar)

**Variables de entorno:**

- `API_URL`: URL del servidor (default: `http://localhost:3000`)
- `ARDUINO_API_SECRET`: Token de autenticación (default: `test-secret-123`)

**Nota:** Este script valida que el API esté funcionando correctamente antes de integrar con el Arduino.

---

## 🔧 Requisitos

- **Firebase CLI**: `npm install -g firebase-tools`
- **Node.js**: v18 o superior
- **Bun**: Para compilación de Functions
- **Autenticación**: Ejecutar `firebase login` antes de usar los scripts

---

## 📝 Notas

- Los scripts de prueba requieren que las Cloud Functions estén desplegadas
- Las notificaciones solo se envían si hay usuarios con tokens FCM registrados
- Los logs pueden tardar unos segundos en aparecer después de ejecutar las pruebas
- Para ver logs en tiempo real: `firebase functions:log --follow`

---

## 🐛 Troubleshooting

### Error: "Firebase CLI no está instalado"

```bash
npm install -g firebase-tools
```

### Error: "No estás autenticado en Firebase"

```bash
firebase login
```

### Error: "Cannot find module 'firebase-admin'"

```bash
cd functions && bun install
```

### Las notificaciones no llegan

1. Verifica que hay tokens FCM registrados: `./test-notifications.sh` → opción 5
2. Revisa los logs: `firebase functions:log --only onLowHumidityAlert`
3. Verifica que las Functions estén desplegadas: `firebase functions:list`
