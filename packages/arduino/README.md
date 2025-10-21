# Sistema de Riego Automatizado - Firmware ESP32/ESP8266 v3.0

## 📋 Descripción

Firmware completo y robusto para ESP32/ESP8266 que implementa un sistema de riego automatizado con integración a Firebase Firestore. El sistema lee 18 sensores de humedad, controla 3 líneas de riego mediante electroválvulas, y sincroniza datos y configuración con la nube.

## 🆕 Cambios en la Versión 3.0

### ✅ Eliminado (Código Obsoleto)
- ❌ `SoftwareSerial` y comunicación con módulo ESP8266 externo
- ❌ Comandos AT para WiFi (`AT+CWJAP`, `AT+CIPSTART`, etc.)
- ❌ HTTP plano e inseguro
- ❌ Todas las llamadas bloqueantes `delay()` (excepto inicialización mínima)
- ❌ Funciones `conectarWiFi()` y `enviarDatos()` basadas en AT

### ✨ Agregado (Nuevas Características)
- ✅ WiFi nativo ESP32/ESP8266 (`WiFi.h`)
- ✅ Firebase ESP Client de Mobizt (autenticación, Firestore, SSL/TLS)
- ✅ Sincronización de hora con NTP para timestamps precisos
- ✅ Lectura de configuración remota desde Firestore
- ✅ Lectura de estados `isActive` de líneas desde Firestore
- ✅ Envío de lecturas individuales de sensores a Firestore
- ✅ Control no bloqueante con `millis()`
- ✅ Manejo robusto de errores y reconexión automática
- ✅ Logging detallado en Serial Monitor

## 🔧 Hardware Requerido

### Microcontrolador
- **ESP32** (recomendado) o **ESP8266**
- Mínimo 4MB de flash

### Sensores
- 18x Sensores de humedad capacitivos del suelo
- 2x Multiplexores 16:1 (ej. CD74HC4067)

### Actuadores
- 3x Módulos relay para electroválvulas
- 3x Electroválvulas 12V/24V (según sistema de riego)

### Conexiones

#### Multiplexores (Pines de Control Compartidos)
```
S0 → GPIO 4
S1 → GPIO 5
S2 → GPIO 6
S3 → GPIO 7
```

#### Multiplexores (Pines de Señal Analógica)
```
MUX1 SIG → GPIO 34 (ADC1_CH6) - Sensores 1-16
MUX2 SIG → GPIO 35 (ADC1_CH7) - Sensores 17-18
```

#### Electroválvulas (Relays)
```
Línea 1 → GPIO 25
Línea 2 → GPIO 26
Línea 3 → GPIO 27
```

**Nota ESP8266:** Solo tiene un ADC (A0), por lo que necesitarás multiplexar ambos MUX o usar solo un MUX con 18 canales.

## 📚 Librerías Requeridas

### Instalación en Arduino IDE

1. Abrir Arduino IDE
2. Ir a **Tools > Manage Libraries**
3. Instalar las siguientes librerías:

| Librería | Autor | Versión Mínima |
|----------|-------|----------------|
| **Firebase ESP Client** | Mobizt | 4.0.0+ |
| **ArduinoJson** | Benoit Blanchon | 6.21.0+ |

### Instalación en PlatformIO

Agregar en `platformio.ini`:

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
lib_deps = 
    mobizt/Firebase Arduino Client Library for ESP8266 and ESP32@^4.4.14
    bblanchon/ArduinoJson@^6.21.5
monitor_speed = 115200
```

## ⚙️ Configuración

### 1. Configuración WiFi

Editar en `main.ino` (líneas 55-56):

```cpp
const char* WIFI_SSID = "TU_WIFI_SSID";
const char* WIFI_PASSWORD = "TU_WIFI_PASSWORD";
```

### 2. Configuración Firebase

#### Obtener Credenciales

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Seleccionar tu proyecto
3. Ir a **Project Settings** ⚙️
4. En la pestaña **General**:
   - Copiar **Project ID**
   - En **Web API Key**, copiar la clave

#### Crear Usuario para el Dispositivo

1. En Firebase Console, ir a **Authentication**
2. Habilitar **Email/Password** como método de autenticación
3. Ir a **Users** > **Add User**
4. Crear un usuario específico para el dispositivo:
   ```
   Email: dispositivo@tudominio.com
   Password: [contraseña segura]
   ```

#### Configurar en el Código

Editar en `main.ino` (líneas 59-66):

```cpp
const char* FIREBASE_HOST = "tu-proyecto-id.firebaseio.com";
const char* FIREBASE_API_KEY = "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
const char* USER_EMAIL = "dispositivo@tudominio.com";
const char* USER_PASSWORD = "tu_password_seguro";
const char* FIREBASE_PROJECT_ID = "tu-proyecto-id";
```

### 3. Configuración de Zona Horaria

Editar en `main.ino` (líneas 69-71):

```cpp
const char* NTP_SERVER = "pool.ntp.org";
const long GMT_OFFSET_SEC = -18000;  // GMT-5 para Colombia
const int DAYLIGHT_OFFSET_SEC = 0;
```

Para otras zonas horarias:
- México (CDMX): `-21600` (GMT-6)
- Argentina: `-10800` (GMT-3)
- España: `3600` (GMT+1)

## 🔥 Estructura Firestore Requerida

### Colección: `config`

Documento: `device_config`

```json
{
  "thresholdLine1": 30.0,
  "thresholdLine2": 30.0,
  "thresholdLine3": 30.0,
  "readingInterval": 600000
}
```

### Colección: `irrigationLines`

Documentos: `line-001`, `line-002`, `line-003`

```json
{
  "name": "Línea 1",
  "isActive": true,
  "sensorIds": ["sensor-001", "sensor-002", ..., "sensor-006"]
}
```

### Colección: `sensors` (Subcolecciones Automáticas)

Estructura generada automáticamente por el firmware:

```
sensors/{sensorId}/readings/{auto-id}
  - timestamp: timestamp
  - valueVWC: double
```

## 🔒 Reglas de Seguridad Firestore

Configurar en Firebase Console > Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Permitir lectura de configuración solo a usuarios autenticados
    match /config/{document} {
      allow read: if request.auth != null;
      allow write: if false; // Solo desde la consola o funciones
    }
    
    // Permitir lectura de líneas a usuarios autenticados
    match /irrigationLines/{lineId} {
      allow read: if request.auth != null;
      allow write: if false; // Solo desde la web app
    }
    
    // Permitir escritura de lecturas solo al usuario del dispositivo
    match /sensors/{sensorId}/readings/{readingId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
                    && request.auth.token.email == "dispositivo@tudominio.com";
      allow update, delete: if false;
    }
  }
}
```

## 🚀 Compilación y Carga

### Arduino IDE

1. Instalar el soporte para ESP32/ESP8266:
   - **File > Preferences**
   - Agregar URL del board manager:
     - ESP32: `https://dl.espressif.com/dl/package_esp32_index.json`
     - ESP8266: `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
   - **Tools > Board > Boards Manager**
   - Instalar "ESP32" o "ESP8266"

2. Configurar la placa:
   - **Tools > Board > ESP32 Dev Module** (o tu placa específica)
   - **Tools > Upload Speed > 921600**
   - **Tools > Flash Frequency > 80MHz**
   - **Tools > Partition Scheme > Default 4MB with spiffs**

3. Seleccionar puerto: **Tools > Port > [tu puerto serial]**

4. Compilar y cargar: **Sketch > Upload** (Ctrl+U)

5. Abrir Serial Monitor: **Tools > Serial Monitor** (Ctrl+Shift+M)
   - Configurar a **115200 baud**

### PlatformIO

```bash
# Compilar
pio run

# Cargar al dispositivo
pio run --target upload

# Abrir monitor serial
pio device monitor
```

## 📊 Monitoreo y Debugging

### Serial Monitor

El firmware proporciona logging detallado:

```
═════════════════════════════════════════
  SISTEMA DE RIEGO AUTOMATIZADO v3.0
  ESP32/ESP8266 + Firebase Firestore
═════════════════════════════════════════

🔧 Configurando hardware...
✅ Hardware configurado
─────────────────────────────────────────
📡 INICIANDO CONEXIÓN WiFi
SSID: MiWiFi
.....
✅ WiFi conectado exitosamente
📶 IP asignada: 192.168.1.100
📊 Intensidad de señal: -45 dBm
─────────────────────────────────────────
🕐 SINCRONIZANDO HORA CON NTP
.....
✅ Hora sincronizada exitosamente
📅 Fecha y hora actual: Mon Oct 20 14:30:00 2025
─────────────────────────────────────────
🔥 CONFIGURANDO FIREBASE
⏳ Autenticando con Firebase...
.....
✅ Firebase autenticado exitosamente
👤 Usuario: dispositivo@tudominio.com
```

### Troubleshooting

#### ❌ WiFi no conecta
- Verificar SSID y contraseña
- Asegurar que el WiFi es 2.4GHz (ESP8266 no soporta 5GHz)
- Verificar intensidad de señal

#### ❌ Firebase no autentica
- Verificar API Key y Project ID
- Verificar que el usuario existe en Firebase Authentication
- Verificar que Email/Password está habilitado

#### ❌ No se envían datos a Firestore
- Verificar reglas de seguridad de Firestore
- Verificar que el documento `/config/device_config` existe
- Revisar logs en Serial Monitor para errores específicos

#### ❌ Timestamps incorrectos
- Verificar servidor NTP accesible
- Verificar zona horaria configurada
- Verificar conexión a internet estable

## 🔄 Flujo de Operación

1. **Inicialización** (setup):
   - Configurar hardware (pines)
   - Conectar a WiFi
   - Sincronizar hora con NTP
   - Autenticar con Firebase
   - Obtener configuración inicial
   - Obtener estados de líneas

2. **Ciclo Principal** (loop):
   - **Continuo:** Verificar conexión WiFi
   - **Cada 5 min:** Sincronizar configuración desde Firestore
   - **Cada 30 seg:** Sincronizar estados `isActive` desde Firestore
   - **Según `intervaloLectura`:**
     - Leer 18 sensores
     - Enviar lecturas a Firestore
     - Controlar válvulas según umbrales y estados `isActive`

## 📈 Optimizaciones Futuras

- [ ] **Deep Sleep:** Entre lecturas para ahorro de energía
- [ ] **Firestore Listeners:** Notificaciones push en lugar de polling
- [ ] **OTA Updates:** Actualización firmware por WiFi
- [ ] **Watchdog Timer:** Auto-reset en caso de fallo
- [ ] **Buffer Local:** SPIFFS para almacenar lecturas offline
- [ ] **Portal Cautivo:** Configuración WiFi sin hardcodear
- [ ] **Encriptación:** Credenciales en EEPROM encriptadas

## 📝 Licencia

Este firmware es parte del proyecto Uniminuto Riego PWA.
Ver LICENSE en la raíz del repositorio.

## 👥 Autores

- Sistema refactorizado para ESP32/ESP8266 con Firebase Firestore
- Versión 3.0 - Octubre 2025

---

**🔗 Enlaces Útiles:**
- [Firebase ESP Client - GitHub](https://github.com/mobizt/Firebase-ESP-Client)
- [ESP32 Pinout Reference](https://randomnerdtutorials.com/esp32-pinout-reference-gpios/)
- [Firebase Firestore Docs](https://firebase.google.com/docs/firestore)
- [ArduinoJson Documentation](https://arduinojson.org/)
