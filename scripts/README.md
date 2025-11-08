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

### 3. `rename-sensors.js` 🔄

Script para renombrar sensores de formato corto a formato con padding (sensor-0 → sensor-000).

**Uso:**

```bash
cd scripts
node rename-sensors.js
```

**Funcionalidades:**

- 🔄 Renombra sensores de `sensor-X` a `sensor-00X` (ej: sensor-0 → sensor-000)
- 📊 Copia todas las lecturas (subcolección `readings`) al nuevo sensor
- 🗑️ Elimina los sensores antiguos después de copiar
- ✅ Procesa múltiples sensores en una sola ejecución
- 📝 Muestra progreso detallado de cada operación

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

### `scripts/init-irrigation-line.js` 🆕

Script rápido para crear o actualizar un SOLO documento dentro de `irrigationLines/` cuando no necesitas inicializar toda la estructura completa.

**Uso básico:**

```bash
node scripts/init-irrigation-line.js --id=test-line-1 --title="Línea de Prueba" --isActive=false --humidity=18 --sensors=sensor-000,sensor-001
```

**Argumentos:**

| Flag | Descripción | Default |
|------|-------------|---------|
| `--id` | ID del documento (obligatorio) | - |
| `--title` | Título visible / name | `Línea <id>` |
| `--isActive` | Estado remoto de activación | `false` |
| `--humidity` | Humedad inicial (opcional) | omitido |
| `--sensors` | Lista separada por comas de sensorIds | omitido |
| `--key` | Ruta al serviceAccount JSON | `functions/serviceAccountKey.json` |

**Ejemplos (PowerShell):**

```powershell
# Crear línea inicial desactivada
node scripts/init-irrigation-line.js --id=linea-1 --title="Línea 1 - Norte" --isActive=false

# Actualizar activación y humedad
node scripts/init-irrigation-line.js --id=linea-1 --isActive=true --humidity=22.7

# Asignar sensores y título
node scripts/init-irrigation-line.js --id=linea-2 --title="Línea 2" --sensors=sensor-006,sensor-007,sensor-008
```

**Qué hace:**

- Crea el documento si no existe, con `createdAt` / `updatedAt` / `lastUpdated` (serverTimestamp).
- Si existe, solo actualiza los campos provistos y refresca `lastUpdated` / `updatedAt`.
- No borra campos existentes no mencionados.
- Facilita pruebas de firmware que leen `isActive` y `humidity`.

**Cuándo usar cada script:**

- `init-firestore-for-arduino.js`: Primera vez, quieres TODA la estructura (config, líneas, sensores, lectura ejemplo).
- `init-irrigation-line.js`: Ajustes puntuales de UNA línea (activar/desactivar, cambiar título, asignar sensores, setear humedad inicial).

> Asegúrate de tener `functions/serviceAccountKey.json` y permisos adecuados antes de ejecutar.

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
