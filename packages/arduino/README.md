# Sistema de Riego Automatizado - Arduino UNO + ESP-12F# Sistema de Riego Automatizado - Firmware ESP32/ESP8266 v3.0



## 📋 Descripción## 📋 Descripción



Firmware para Arduino UNO que controla un sistema de riego automatizado utilizando un módulo ESP-12F (ESP8266) para conectividad WiFi mediante comandos AT. El sistema lee 18 sensores de humedad, controla 3 líneas de riego mediante electroválvulas, y envía datos al endpoint `/api/ingest` de Next.js (Vercel).Firmware completo y robusto para ESP32/ESP8266 que implementa un sistema de riego automatizado con integración a Firebase Firestore. El sistema lee 18 sensores de humedad, controla 3 líneas de riego mediante electroválvulas, y sincroniza datos y configuración con la nube.



## 🏗️ Arquitectura## 🆕 Cambios en la Versión 3.0



```### ✅ Eliminado (Código Obsoleto)

Arduino UNO (Controlador Principal)- ❌ `SoftwareSerial` y comunicación con módulo ESP8266 externo

    ├── Lee 18 sensores vía 2 multiplexores- ❌ Comandos AT para WiFi (`AT+CWJAP`, `AT+CIPSTART`, etc.)

    ├── Controla 3 electroválvulas- ❌ HTTP plano e inseguro

    ├── Se comunica con ESP-12F vía SoftwareSerial- ❌ Todas las llamadas bloqueantes `delay()` (excepto inicialización mínima)

    └── Envía datos HTTP al servidor Vercel- ❌ Funciones `conectarWiFi()` y `enviarDatos()` basadas en AT

    

ESP-12F (Módulo WiFi)### ✨ Agregado (Nuevas Características)

    ├── Firmware AT (comandos AT)- ✅ WiFi nativo ESP32/ESP8266 (`WiFi.h`)

    ├── Conecta a WiFi- ✅ Firebase ESP Client de Mobizt (autenticación, Firestore, SSL/TLS)

    └── Envía peticiones HTTP POST- ✅ Sincronización de hora con NTP para timestamps precisos

```- ✅ Lectura de configuración remota desde Firestore

- ✅ Lectura de estados `isActive` de líneas desde Firestore

## 🔧 Hardware Requerido- ✅ Envío de lecturas individuales de sensores a Firestore

- ✅ Control no bloqueante con `millis()`

### Componentes Principales- ✅ Manejo robusto de errores y reconexión automática

- **Arduino UNO** (ATmega328P)- ✅ Logging detallado en Serial Monitor

- **Módulo ESP-12F** (ESP8266) con firmware AT

- **2x Multiplexores CD74HC4067** (16:1)## 🔧 Hardware Requerido

- **18x Sensores de humedad capacitivos**

- **3x Módulos relay** para electroválvulas### Microcontrolador

- **3x Electroválvulas** 12V/24V- **ESP32** (recomendado) o **ESP8266**

- **Divisor de voltaje** (5V → 3.3V) para TX del Arduino- Mínimo 4MB de flash

- **Fuente de alimentación 3.3V** para ESP8266 (externa)

### Sensores

### Conexiones Hardware- 18x Sensores de humedad capacitivos del suelo

- 2x Multiplexores 16:1 (ej. CD74HC4067)

#### ESP-12F ↔️ Arduino UNO

```### Actuadores

IMPORTANTE: ESP8266 opera a 3.3V, usar divisor de voltaje en TX del Arduino- 3x Módulos relay para electroválvulas

- 3x Electroválvulas 12V/24V (según sistema de riego)

ESP8266 RX  ← Arduino Pin 3 (TX) [CON DIVISOR DE VOLTAJE 5V→3.3V]

ESP8266 TX  → Arduino Pin 2 (RX) [Directo, 3.3V es suficiente]### Conexiones

ESP8266 VCC → 3.3V (fuente externa, NO del Arduino)

ESP8266 GND → GND (común con Arduino)#### Multiplexores (Pines de Control Compartidos)

ESP8266 CH_PD → 3.3V (pull-up)```

ESP8266 GPIO0 → 3.3V (boot normal)S0 → GPIO 4

ESP8266 GPIO15 → GNDS1 → GPIO 5

```S2 → GPIO 6

S3 → GPIO 7

**Divisor de Voltaje (5V → 3.3V):**```

```

Arduino Pin 3 (5V) ──┬── R1 (1kΩ) ──┬── ESP8266 RX (3.3V)#### Multiplexores (Pines de Señal Analógica)

                     │               │```

                     │               R2 (2kΩ)MUX1 SIG → GPIO 34 (ADC1_CH6) - Sensores 1-16

                     │               │MUX2 SIG → GPIO 35 (ADC1_CH7) - Sensores 17-18

                     └───────────────┴── GND```



Voltaje resultante: 5V × (2kΩ / (1kΩ + 2kΩ)) = 3.33V ✓#### Electroválvulas (Relays)

``````

Línea 1 → GPIO 25

#### MultiplexoresLínea 2 → GPIO 26

```Línea 3 → GPIO 27

S0-S3 (Control): Arduino Pins 4, 5, 6, 7```

MUX1 SIG:        Arduino Pin A0 (sensores 0-15)

MUX2 SIG:        Arduino Pin A1 (sensores 16-17)**Nota ESP8266:** Solo tiene un ADC (A0), por lo que necesitarás multiplexar ambos MUX o usar solo un MUX con 18 canales.

```

## 📚 Librerías Requeridas

#### Electroválvulas (Relés)

```### Instalación en Arduino IDE

Válvula Línea 1: Arduino Pin 8

Válvula Línea 2: Arduino Pin 91. Abrir Arduino IDE

Válvula Línea 3: Arduino Pin 102. Ir a **Tools > Manage Libraries**

```3. Instalar las siguientes librerías:



## 📚 Librerías Requeridas| Librería | Autor | Versión Mínima |

|----------|-------|----------------|

### Arduino IDE| **Firebase ESP Client** | Mobizt | 4.0.0+ |

1. **ArduinoJson** (Benoit Blanchon) - versión 6.21.0+| **ArduinoJson** | Benoit Blanchon | 6.21.0+ |

   - Tools → Manage Libraries → Buscar "ArduinoJson" → Install

### Instalación en PlatformIO

2. **SoftwareSerial** - Incluida en Arduino IDE (no requiere instalación)

Agregar en `platformio.ini`:

### PlatformIO

Incluido en `platformio.ini`:```ini

```ini[env:esp32dev]

lib_deps = platform = espressif32

    bblanchon/ArduinoJson@^6.21.5board = esp32dev

```framework = arduino

lib_deps = 

## ⚙️ Configuración    mobizt/Firebase Arduino Client Library for ESP8266 and ESP32@^4.4.14

    bblanchon/ArduinoJson@^6.21.5

### 1. Copiar y Editar config.hmonitor_speed = 115200

```

```bash

cd packages/arduino/src## ⚙️ Configuración

cp config.example.h config.h

```### 1. Configuración WiFi



Editar `config.h`:Editar en `main.ino` (líneas 55-56):



```cpp```cpp

// WiFi (solo 2.4GHz)const char* WIFI_SSID = "TU_WIFI_SSID";

#define WIFI_SSID "TU_WIFI_SSID"const char* WIFI_PASSWORD = "TU_WIFI_PASSWORD";

#define WIFI_PASSWORD "TU_WIFI_PASSWORD"```



// API Backend (Vercel)### 2. Configuración Firebase

#define API_HOST "tu-app.vercel.app"  // SIN https://

#define API_ENDPOINT "/api/ingest"#### Obtener Credenciales



// Token de Autenticación (debe coincidir con Vercel .env)1. Ir a [Firebase Console](https://console.firebase.google.com/)

#define API_SECRET "TU_API_SECRET_AQUI"2. Seleccionar tu proyecto

3. Ir a **Project Settings** ⚙️

// Intervalo de lectura (ms)4. En la pestaña **General**:

#define READING_INTERVAL 600000  // 10 minutos   - Copiar **Project ID**

```   - En **Web API Key**, copiar la clave



### 2. Verificar Firmware ESP8266#### Crear Usuario para el Dispositivo



El módulo ESP-12F debe tener firmware AT instalado. Verificar con Monitor Serial:1. En Firebase Console, ir a **Authentication**

2. Habilitar **Email/Password** como método de autenticación

```3. Ir a **Users** > **Add User**

AT          → debe responder OK4. Crear un usuario específico para el dispositivo:

AT+GMR      → muestra versión del firmware   ```

```   Email: dispositivo@tudominio.com

   Password: [contraseña segura]

Si no responde o el baudrate es diferente:   ```

```

AT+UART_DEF=9600,8,1,0,0   → configura baudrate a 9600#### Configurar en el Código

```

Editar en `main.ino` (líneas 59-66):

**Actualizar Firmware AT:**

- Descargar desde: https://www.espressif.com/en/support/download/at```cpp

- Usar ESP Flash Download Tool o esptool.pyconst char* FIREBASE_HOST = "tu-proyecto-id.firebaseio.com";

const char* FIREBASE_API_KEY = "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

### 3. Configuración del Servidor (Vercel)const char* USER_EMAIL = "dispositivo@tudominio.com";

const char* USER_PASSWORD = "tu_password_seguro";

Asegurarse de que el endpoint `/api/ingest` existe y está configurado:const char* FIREBASE_PROJECT_ID = "tu-proyecto-id";

```

```typescript

// apps/web/app/api/ingest/route.ts### 3. Configuración de Zona Horaria

export async function POST(request: Request) {

  // Verificar Authorization headerEditar en `main.ino` (líneas 69-71):

  const authHeader = request.headers.get('authorization');

  const token = authHeader?.replace('Bearer ', '');```cpp

  const char* NTP_SERVER = "pool.ntp.org";

  if (token !== process.env.ARDUINO_API_SECRET) {const long GMT_OFFSET_SEC = -18000;  // GMT-5 para Colombia

    return Response.json({ error: 'Unauthorized' }, { status: 401 });const int DAYLIGHT_OFFSET_SEC = 0;

  }```

  

  const body = await request.json();Para otras zonas horarias:

  // Procesar body.readings[]- México (CDMX): `-21600` (GMT-6)

  // ...- Argentina: `-10800` (GMT-3)

}- España: `3600` (GMT+1)

```

## 🔥 Estructura Firestore Requerida

En Vercel, configurar variable de entorno:

```### Colección: `config`

ARDUINO_API_SECRET=TWWXPrBLXrG+20SNGY1/xDQXEhoKUl5wmoU2pwfnqnw=

```Documento: `device_config`



## 🚀 Compilación y Carga```json

{

### Arduino IDE  "thresholdLine1": 30.0,

  "thresholdLine2": 30.0,

1. Abrir `main.ino` en Arduino IDE  "thresholdLine3": 30.0,

2. Configurar placa: **Tools → Board → Arduino UNO**  "readingInterval": 600000

3. Seleccionar puerto: **Tools → Port → [tu puerto]**}

4. Compilar: **Sketch → Verify/Compile** (Ctrl+R)```

5. Cargar: **Sketch → Upload** (Ctrl+U)

6. Monitor Serial: **Tools → Serial Monitor** (Ctrl+Shift+M)### Colección: `irrigationLines`

   - Configurar a **9600 baud**

Documentos: `line-001`, `line-002`, `line-003`

### PlatformIO

```json

```bash{

cd packages/arduino  "name": "Línea 1",

  "isActive": true,

# Detectar puerto disponible  "sensorIds": ["sensor-001", "sensor-002", ..., "sensor-006"]

pio device list}

```

# Compilar

pio run### Colección: `sensors` (Subcolecciones Automáticas)



# Cargar al ArduinoEstructura generada automáticamente por el firmware:

pio run --target upload

```

# Monitor Serialsensors/{sensorId}/readings/{auto-id}

pio device monitor  - timestamp: timestamp

  - valueVWC: double

# Todo junto```

pio run --target upload && pio device monitor

```## 🔒 Reglas de Seguridad Firestore



## 📊 Formato de Datos (API)Configurar en Firebase Console > Firestore Database > Rules:



### Petición HTTP POST```javascript

rules_version = '2';

```httpservice cloud.firestore {

POST /api/ingest HTTP/1.1  match /databases/{database}/documents {

Host: tu-app.vercel.app    

Authorization: Bearer TWWXPrBLXrG+20SNGY1/xDQXEhoKUl5wmoU2pwfnqnw=    // Permitir lectura de configuración solo a usuarios autenticados

Content-Type: application/json    match /config/{document} {

Content-Length: 1234      allow read: if request.auth != null;

Connection: close      allow write: if false; // Solo desde la consola o funciones

    }

{    

  "readings": [    // Permitir lectura de líneas a usuarios autenticados

    {"sensorId": "sensor-0", "valueVWC": 45.6},    match /irrigationLines/{lineId} {

    {"sensorId": "sensor-1", "valueVWC": 50.1},      allow read: if request.auth != null;

    {"sensorId": "sensor-2", "valueVWC": 38.7},      allow write: if false; // Solo desde la web app

    ...    }

    {"sensorId": "sensor-17", "valueVWC": 42.3}    

  ]    // Permitir escritura de lecturas solo al usuario del dispositivo

}    match /sensors/{sensorId}/readings/{readingId} {

```      allow read: if request.auth != null;

      allow create: if request.auth != null 

### Respuesta Esperada                    && request.auth.token.email == "dispositivo@tudominio.com";

      allow update, delete: if false;

```json    }

{  }

  "success": true,}

  "message": "18 readings processed",```

  "timestamp": "2025-10-22T14:30:00.000Z"

}## 🚀 Compilación y Carga

```

### Arduino IDE

## 🧪 Pruebas

1. Instalar el soporte para ESP32/ESP8266:

### Pruebas Locales con ngrok   - **File > Preferences**

   - Agregar URL del board manager:

1. Iniciar servidor Next.js localmente:     - ESP32: `https://dl.espressif.com/dl/package_esp32_index.json`

```bash     - ESP8266: `http://arduino.esp8266.com/stable/package_esp8266com_index.json`

cd apps/web   - **Tools > Board > Boards Manager**

npm run dev   - Instalar "ESP32" o "ESP8266"

```

2. Configurar la placa:

2. Exponer puerto con ngrok:   - **Tools > Board > ESP32 Dev Module** (o tu placa específica)

```bash   - **Tools > Upload Speed > 921600**

ngrok http 3000   - **Tools > Flash Frequency > 80MHz**

```   - **Tools > Partition Scheme > Default 4MB with spiffs**



3. Copiar URL de ngrok (ej: `1234-56-789.ngrok-free.app`) a `config.h`:3. Seleccionar puerto: **Tools > Port > [tu puerto serial]**

```cpp

#define API_HOST "1234-56-789.ngrok-free.app"4. Compilar y cargar: **Sketch > Upload** (Ctrl+U)

```

5. Abrir Serial Monitor: **Tools > Serial Monitor** (Ctrl+Shift+M)

4. Recompilar y cargar firmware   - Configurar a **115200 baud**

5. Monitorear logs en Monitor Serial y en servidor Next.js

### PlatformIO

### Verificar Comunicación AT

```bash

Usar Monitor Serial a 9600 baud para enviar comandos AT manualmente:# Compilar

pio run

```

AT                     → OK# Cargar al dispositivo

AT+GMR                 → Versión del firmwarepio run --target upload

AT+CWMODE=1           → Modo estación

AT+CWJAP="ssid","pwd" → Conectar WiFi# Abrir monitor serial

AT+CIFSR              → Mostrar IP asignadapio device monitor

``````



## 📈 Monitoreo y Debugging## 📊 Monitoreo y Debugging



### Serial Monitor (9600 baud)### Serial Monitor



El firmware imprime logs detallados:El firmware proporciona logging detallado:



``````

========================================═════════════════════════════════════════

SISTEMA DE RIEGO AUTOMATIZADO  SISTEMA DE RIEGO AUTOMATIZADO v3.0

Arduino UNO + ESP-12F (AT Commands)  ESP32/ESP8266 + Firebase Firestore

========================================═════════════════════════════════════════



Iniciando comunicacion con ESP8266...🔧 Configurando hardware...

Configurando hardware...✅ Hardware configurado

Hardware configurado!─────────────────────────────────────────

📡 INICIANDO CONEXIÓN WiFi

========================================SSID: MiWiFi

CONFIGURANDO WiFi (ESP8266).....

========================================✅ WiFi conectado exitosamente

Test de comunicacion...📶 IP asignada: 192.168.1.100

AT CMD: AT📊 Intensidad de señal: -45 dBm

OK─────────────────────────────────────────

-> OK🕐 SINCRONIZANDO HORA CON NTP

Configurando modo estacion........

AT CMD: AT+CWMODE=1✅ Hora sincronizada exitosamente

OK📅 Fecha y hora actual: Mon Oct 20 14:30:00 2025

-> OK─────────────────────────────────────────

Conectando a WiFi...🔥 CONFIGURANDO FIREBASE

SSID: MiWiFi⏳ Autenticando con Firebase...

AT CMD: AT+CWJAP="MiWiFi","password123".....

WIFI CONNECTED✅ Firebase autenticado exitosamente

WIFI GOT IP👤 Usuario: dispositivo@tudominio.com

OK```

-> OK

### Troubleshooting

WiFi conectado exitosamente!

========================================#### ❌ WiFi no conecta

- Verificar SSID y contraseña

========================================- Asegurar que el WiFi es 2.4GHz (ESP8266 no soporta 5GHz)

LECTURA DE SENSORES- Verificar intensidad de señal

========================================

sensor-0: 45.60%#### ❌ Firebase no autentica

sensor-1: 50.12%- Verificar API Key y Project ID

...- Verificar que el usuario existe en Firebase Authentication

sensor-17: 42.30%- Verificar que Email/Password está habilitado

----------------------------------------

Linea 1 promedio: 48.50% (Umbral: 30.00%)#### ❌ No se envían datos a Firestore

Linea 2 promedio: 35.20% (Umbral: 30.00%)- Verificar reglas de seguridad de Firestore

Linea 3 promedio: 28.10% (Umbral: 30.00%)- Verificar que el documento `/config/device_config` existe

========================================- Revisar logs en Serial Monitor para errores específicos



========================================#### ❌ Timestamps incorrectos

ENVIANDO DATOS AL SERVIDOR- Verificar servidor NTP accesible

========================================- Verificar zona horaria configurada

Creando payload JSON...- Verificar conexión a internet estable

Payload:

{"readings":[{"sensorId":"sensor-0","valueVWC":45.6},...]}## 🔄 Flujo de Operación



Construyendo peticion HTTP...1. **Inicialización** (setup):

HTTP Packet:   - Configurar hardware (pines)

POST /api/ingest HTTP/1.1   - Conectar a WiFi

Host: tu-app.vercel.app   - Sincronizar hora con NTP

Authorization: Bearer TWWXPrBLXrG+20SNGY1/xDQXEhoKUl5wmoU2pwfnqnw=   - Autenticar con Firebase

...   - Obtener configuración inicial

   - Obtener estados de líneas

Conectando al servidor...

AT CMD: AT+CIPSTART="TCP","tu-app.vercel.app",802. **Ciclo Principal** (loop):

CONNECT   - **Continuo:** Verificar conexión WiFi

OK   - **Cada 5 min:** Sincronizar configuración desde Firestore

-> OK   - **Cada 30 seg:** Sincronizar estados `isActive` desde Firestore

   - **Según `intervaloLectura`:**

Enviando peticion HTTP...     - Leer 18 sensores

...     - Enviar lecturas a Firestore

     - Controlar válvulas según umbrales y estados `isActive`

Envio completado!

========================================## 📈 Optimizaciones Futuras



CONTROL DE VALVULAS- [ ] **Deep Sleep:** Entre lecturas para ahorro de energía

----------------------------------------- [ ] **Firestore Listeners:** Notificaciones push en lugar de polling

Valvula 1: Desactivada- [ ] **OTA Updates:** Actualización firmware por WiFi

Valvula 2: Desactivada- [ ] **Watchdog Timer:** Auto-reset en caso de fallo

Valvula 3: ACTIVADA- [ ] **Buffer Local:** SPIFFS para almacenar lecturas offline

========================================- [ ] **Portal Cautivo:** Configuración WiFi sin hardcodear

- [ ] **Encriptación:** Credenciales en EEPROM encriptadas

****************************************

Proxima lectura en: 10 minutos## 📝 Licencia

****************************************

```Este firmware es parte del proyecto Uniminuto Riego PWA.

Ver LICENSE en la raíz del repositorio.

## 🐛 Troubleshooting

## 👥 Autores

### ❌ "No se puede comunicar con ESP8266"

- Sistema refactorizado para ESP32/ESP8266 con Firebase Firestore

**Causas posibles:**- Versión 3.0 - Octubre 2025

- Conexiones RX/TX incorrectas o invertidas

- Baudrate incorrecto---

- ESP8266 sin alimentación adecuada (necesita fuente externa 3.3V)

- Falta divisor de voltaje en TX del Arduino**🔗 Enlaces Útiles:**

- [Firebase ESP Client - GitHub](https://github.com/mobizt/Firebase-ESP-Client)

**Soluciones:**- [ESP32 Pinout Reference](https://randomnerdtutorials.com/esp32-pinout-reference-gpios/)

1. Verificar conexiones (RX del ESP va a TX del Arduino, y viceversa)- [Firebase Firestore Docs](https://firebase.google.com/docs/firestore)

2. Probar diferentes baudrates (9600, 115200)- [ArduinoJson Documentation](https://arduinojson.org/)

3. Enviar comando `AT` manualmente desde Monitor Serial
4. Verificar que ESP8266 está en modo boot normal (GPIO0 a 3.3V)

### ❌ "No se pudo conectar a WiFi"

**Causas posibles:**
- SSID o password incorrectos
- WiFi 5GHz (ESP8266 solo soporta 2.4GHz)
- Señal WiFi débil
- Firmware AT desactualizado

**Soluciones:**
1. Verificar SSID y password en `config.h`
2. Asegurarse de usar WiFi 2.4GHz
3. Acercar ESP8266 al router
4. Probar comando manualmente: `AT+CWJAP="ssid","pwd"`

### ❌ "No se pudo conectar al servidor"

**Causas posibles:**
- API_HOST incorrecto o con `https://`
- Servidor no accesible desde la red
- Puerto 80 bloqueado por firewall

**Soluciones:**
1. Verificar que API_HOST sea solo el dominio (sin `https://` ni `/`)
2. Hacer ping al servidor desde otra máquina en la misma red
3. Si usas ngrok, verificar que la sesión sigue activa
4. Probar conexión manualmente: `AT+CIPSTART="TCP","api.ejemplo.com",80`

### ❌ Respuesta HTTP 401 Unauthorized

**Causas posibles:**
- API_SECRET no coincide con el servidor
- Header Authorization mal formateado

**Soluciones:**
1. Verificar que API_SECRET en `config.h` coincide con Vercel `.env`
2. Verificar logs del servidor para ver qué token recibió
3. Comprobar que el header es exactamente: `Authorization: Bearer {token}`

## 🔒 Seguridad

### Limitaciones
- **Sin HTTPS:** Arduino UNO no puede manejar SSL/TLS
- **HTTP plano:** Datos viajan sin cifrar por la red
- **Seguridad por token:** Solo el `API_SECRET` protege el endpoint

### Recomendaciones
1. ✅ Usar WiFi con WPA2/WPA3
2. ✅ Cambiar `API_SECRET` periódicamente
3. ✅ Usar network privada o VPN para mayor seguridad
4. ✅ No exponer `config.h` en repositorios públicos
5. ✅ Implementar rate limiting en el servidor
6. ⚠️ Para producción, considerar usar ESP32 con SSL/TLS

## 📝 Calibración de Sensores

La fórmula en `calcularVWC()` debe ajustarse según el modelo de sensor:

```cpp
float calcularVWC(int lectura) {
  // Fórmula cuadrática genérica
  float VWC = -0.00019 * (float)(lectura * lectura) - 0.0064 * (float)lectura + 191.6;
  
  if (VWC < 0) VWC = 0;
  if (VWC > 100) VWC = 100;
  
  return VWC;
}
```

**Proceso de calibración:**
1. Medir sensor en aire (seco) → Valor mínimo (ej: 850)
2. Medir sensor en agua (saturado) → Valor máximo (ej: 450)
3. Ajustar fórmula para que:
   - Aire → ~0% VWC
   - Agua → ~100% VWC

## 🔄 Lógica de Control

### Control de Válvulas

```cpp
if (promedio[lineaX] < umbral_lineaX) {
  // Activar válvula
  digitalWrite(VALVX, HIGH);
} else {
  // Desactivar válvula
  digitalWrite(VALVX, LOW);
}
```

**Distribución de Sensores:**
- Línea 1: sensores 0-5 (6 sensores)
- Línea 2: sensores 6-11 (6 sensores)
- Línea 3: sensores 12-17 (6 sensores)

## 📈 Optimizaciones Futuras

- [ ] **Reintentos:** Implementar reintentos en caso de falla de envío
- [ ] **Buffer EEPROM:** Guardar lecturas en EEPROM si falla WiFi
- [ ] **Watchdog Timer:** Auto-reset en caso de cuelgue
- [ ] **LED de estado:** Indicador visual de conexión WiFi
- [ ] **Modo configuración:** Portal web para configurar sin recompilar
- [ ] **Actualización remota:** OTA updates (requiere migrar a ESP32)

## 📚 Referencias

- [Comandos AT ESP8266](https://www.espressif.com/sites/default/files/documentation/4a-esp8266_at_instruction_set_en.pdf)
- [ArduinoJson Documentation](https://arduinojson.org/)
- [CD74HC4067 Datasheet](https://www.ti.com/lit/ds/symlink/cd74hc4067.pdf)
- [SoftwareSerial Library](https://docs.arduino.cc/learn/built-in-libraries/software-serial)

## 📝 Licencia

Este firmware es parte del proyecto Uniminuto Riego PWA.

---

**Versión:** Arduino UNO + ESP-12F (AT Commands)  
**Fecha:** Octubre 2025  
**Sprint:** 9-11 Combined
