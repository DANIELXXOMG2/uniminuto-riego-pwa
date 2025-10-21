# 🏗️ Arquitectura del Sistema de Riego v3.0

## 📐 Diagrama de Componentes

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                        SISTEMA DE RIEGO AUTOMATIZADO v3.0                ║
║                        ESP32/ESP8266 + Firebase Firestore                 ║
╚═══════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│                          ESP32/ESP8266 FIRMWARE                             │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                        SETUP (Inicialización)                      │   │
│  │                                                                     │   │
│  │  1. ⚙️  Configurar Hardware (pines GPIO, ADC)                     │   │
│  │  2. 📡 Conectar a WiFi (WPA2, reintentos)                         │   │
│  │  3. 🕐 Sincronizar con NTP (timestamps precisos)                  │   │
│  │  4. 🔥 Autenticar con Firebase (Email/Password)                   │   │
│  │  5. 📥 Obtener configuración inicial (umbrales, intervalos)       │   │
│  │  6. 📥 Obtener estados de líneas (isActive)                       │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                     LOOP (Ejecución Continua)                      │   │
│  │                                                                     │   │
│  │  Temporizador 1 (Continuo):                                       │   │
│  │    └─ 🔄 Verificar conexión WiFi → Reconectar si necesario       │   │
│  │                                                                     │   │
│  │  Temporizador 2 (Cada 5 minutos):                                 │   │
│  │    └─ ⚙️  Sincronizar configuración desde Firestore              │   │
│  │                                                                     │   │
│  │  Temporizador 3 (Cada 30 segundos):                               │   │
│  │    └─ 🔄 Sincronizar estados isActive desde Firestore            │   │
│  │                                                                     │   │
│  │  Temporizador 4 (Intervalo configurable - default 10 min):        │   │
│  │    ├─ 📊 Leer 18 sensores de humedad                             │   │
│  │    ├─ 📤 Enviar lecturas a Firestore                             │   │
│  │    └─ 💧 Controlar 3 válvulas (umbral + isActive)                │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                        ↕️
                            HTTPS/TLS (Puerto 443)
                                        ↕️
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FIREBASE FIRESTORE                                │
│                                                                             │
│  ┌──────────────────────────┐  ┌──────────────────────────┐               │
│  │    Colección: config     │  │ Colección: irrigationLines│              │
│  │                          │  │                            │              │
│  │  📄 device_config        │  │  📄 line-001               │              │
│  │    • thresholdLine1      │  │    • name                  │              │
│  │    • thresholdLine2      │  │    • isActive ✅          │              │
│  │    • thresholdLine3      │  │    • sensorIds[]           │              │
│  │    • readingInterval     │  │                            │              │
│  └──────────────────────────┘  │  📄 line-002 / line-003    │              │
│              ↑                  └──────────────────────────┘               │
│              │                              ↑                               │
│         READ (5 min)                   READ (30 seg)                        │
│                                                                             │
│  ┌────────────────────────────────────────────────────────┐                │
│  │              Colección: sensors                        │                │
│  │                                                         │                │
│  │  📁 sensor-001/                                        │                │
│  │    └─ 📁 readings/                                     │                │
│  │         ├─ 📄 auto-id-1 { timestamp, valueVWC }       │                │
│  │         ├─ 📄 auto-id-2 { timestamp, valueVWC }       │                │
│  │         └─ ...                                         │                │
│  │                                                         │                │
│  │  📁 sensor-002/ ... sensor-018/                        │                │
│  │    └─ (Same structure)                                 │                │
│  └────────────────────────────────────────────────────────┘                │
│                          ↑                                                  │
│                     WRITE (Cada intervalo)                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                        ↕️
                             Firebase Authentication
                             (Email/Password del dispositivo)
```

## 🔌 Diagrama de Conexiones Hardware

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                           ESP32 DevKit V1                                 ║
╚═══════════════════════════════════════════════════════════════════════════╝

        GPIO 4 ────────┐
        GPIO 5 ────────┤
        GPIO 6 ────────┼──────────────► Multiplexor 1 (S0-S3)
        GPIO 7 ────────┘                   │
                                          │  16 canales
        GPIO 34 (ADC) ◄────────────────────┘
                │
                └─ Sensor 1 (VWC)
                └─ Sensor 2 (VWC)
                └─ ...
                └─ Sensor 16 (VWC)

        GPIO 4-7 (compartidos) ────────► Multiplexor 2 (S0-S3)
                                              │
        GPIO 35 (ADC) ◄───────────────────────┘  2 canales
                │
                └─ Sensor 17 (VWC)
                └─ Sensor 18 (VWC)

        GPIO 25 ──────────► Relay Módulo 1 ──────► Electroválvula 1
        GPIO 26 ──────────► Relay Módulo 2 ──────► Electroválvula 2
        GPIO 27 ──────────► Relay Módulo 3 ──────► Electroválvula 3

        USB-C ◄───────────► Programación y Monitor Serial (115200 baud)
        
        3.3V/5V ──────────► Alimentación (sensores, multiplexores)
        GND ───────────────► Tierra común
```

## 📊 Flujo de Datos Detallado

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CICLO DE LECTURA                               │
└─────────────────────────────────────────────────────────────────────────┘

    ⏰ Cada [intervaloLectura] ms (default: 600,000 = 10 min)
         │
         ├─► 1. 📊 LEER SENSORES
         │       ├─ Multiplexor 1: Canales 0-15 → Sensores 1-16
         │       │   └─ setChannel(n) → delayMicroseconds(50) → analogRead(SIG1)
         │       ├─ Multiplexor 2: Canales 0-1  → Sensores 17-18
         │       │   └─ setChannel(n) → delayMicroseconds(50) → analogRead(SIG2)
         │       ├─ Convertir ADC a VWC: calcularVWC(lectura)
         │       └─ Calcular promedios por línea: (s1+s2+...+s6)/6
         │
         ├─► 2. 📤 ENVIAR A FIRESTORE
         │       ├─ Verificar WiFi conectado ✅
         │       ├─ Verificar Firebase autenticado ✅
         │       └─ Para cada sensor (1-18):
         │           ├─ Crear FirebaseJson con timestamp + valueVWC
         │           └─ Firebase.Firestore.createDocument(
         │               sensors/sensor-XXX/readings/{auto-id})
         │
         └─► 3. 💧 CONTROLAR VÁLVULAS
                 ├─ Línea 1: if (promedio[0] < umbral1 && isActiveLine1) → HIGH
                 ├─ Línea 2: if (promedio[1] < umbral2 && isActiveLine2) → HIGH
                 └─ Línea 3: if (promedio[2] < umbral3 && isActiveLine3) → HIGH

┌─────────────────────────────────────────────────────────────────────────┐
│                    SINCRONIZACIÓN BIDIRECCIONAL                         │
└─────────────────────────────────────────────────────────────────────────┘

    📥 DESDE FIRESTORE (Lectura)
         │
         ├─► Cada 5 minutos:
         │       └─ GET /config/device_config
         │           ├─ thresholdLine1 → umbral_linea1
         │           ├─ thresholdLine2 → umbral_linea2
         │           ├─ thresholdLine3 → umbral_linea3
         │           └─ readingInterval → intervaloLectura
         │
         └─► Cada 30 segundos:
                 └─ GET /irrigationLines/{line-001,002,003}
                     ├─ line-001.isActive → isActiveLine1
                     ├─ line-002.isActive → isActiveLine2
                     └─ line-003.isActive → isActiveLine3

    📤 HACIA FIRESTORE (Escritura)
         │
         └─► Cada [intervaloLectura]:
                 └─ CREATE /sensors/{sensorId}/readings/{auto-id}
                     ├─ timestamp: [ISO8601 de NTP]
                     └─ valueVWC: [0.0 - 100.0]
```

## 🔐 Capa de Seguridad

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AUTENTICACIÓN Y SEGURIDAD                       │
└─────────────────────────────────────────────────────────────────────────┘

    ESP32/ESP8266
         │
         ├─► 1. 🔑 AUTENTICACIÓN
         │       ├─ Email: dispositivo@tudominio.com
         │       ├─ Password: [contraseña segura]
         │       └─ Firebase.begin(&config, &auth)
         │           └─ Obtiene ID Token (JWT)
         │               ├─ Válido por 1 hora
         │               └─ Auto-renovación por librería
         │
         ├─► 2. 🔒 HTTPS/TLS
         │       ├─ Puerto 443
         │       ├─ Certificados SSL/TLS automáticos
         │       └─ Encriptación end-to-end
         │
         └─► 3. 🛡️ REGLAS FIRESTORE
                 ├─ config/* : read (auth) / write (admin only)
                 ├─ irrigationLines/* : read (auth) / write (admin/operator)
                 └─ sensors/*/readings/* : create (dispositivo only)
```

## ⏱️ Timeline de Eventos

```
T = 0 seg     ┌─► POWER ON
              ├─► Inicializar Serial (115200 baud)
              ├─► Configurar GPIO
              └─► Válvulas OFF

T = 0-5 seg   ┌─► Conectar WiFi (reintentos cada 500ms)
              └─► Obtener IP por DHCP

T = 5-10 seg  ┌─► Sincronizar con NTP
              └─► Ajustar reloj interno

T = 10-15 seg ┌─► Autenticar con Firebase
              └─► Obtener ID Token

T = 15-20 seg ┌─► GET config inicial
              ├─► GET estados isActive
              └─► Sistema listo ✅

T = 20 seg+   ┌─► LOOP CONTINUO
              │
              ├─► Cada 1ms:    Verificar WiFi
              ├─► Cada 5min:   Sync config
              ├─► Cada 30seg:  Sync isActive
              └─► Cada 10min:  Leer + Enviar + Controlar
```

## 🎛️ Estados del Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MÁQUINA DE ESTADOS                               │
└─────────────────────────────────────────────────────────────────────────┘

         [INICIO]
            │
            ▼
    ┌───────────────┐
    │ INITIALIZATION │
    │   (setup)     │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐     ❌ Error
    │  CONNECTING   ├──────────► [RETRY] (cada 30s)
    │   (WiFi)      │
    └───────┬───────┘
            │ ✅ Conectado
            ▼
    ┌───────────────┐     ❌ Error
    │ AUTHENTICATING├──────────► [RETRY] (cada 30s)
    │   (Firebase)  │
    └───────┬───────┘
            │ ✅ Autenticado
            ▼
    ┌───────────────┐
    │   FETCHING    │
    │    CONFIG     │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │   RUNNING     │◄─────┐
    │   (loop)      │      │
    │               │      │
    │ ├─ Monitor    │      │
    │ ├─ Sync       │      │
    │ ├─ Read       │      │
    │ ├─ Send       │      │
    │ └─ Control    │      │
    └───────┬───────┘      │
            │              │
            └──────────────┘
              Continuo
```

## 📈 Optimización de Recursos

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      USO DE RECURSOS ESP32                              │
└─────────────────────────────────────────────────────────────────────────┘

    RAM (SRAM):
        ├─ Stack:          ~8 KB
        ├─ Heap:           ~20 KB
        ├─ Firebase:       ~50 KB
        ├─ WiFi:           ~40 KB
        └─ Disponible:     ~200 KB (de ~320 KB total)

    Flash:
        ├─ Firmware:       ~500 KB
        ├─ Librerías:      ~300 KB
        ├─ Filesystem:     ~100 KB
        └─ Disponible:     ~3.1 MB (de ~4 MB total)

    CPU:
        ├─ Loop:           < 1% (idle la mayor parte)
        ├─ WiFi:           ~5-10% (durante transmisión)
        ├─ Firebase:       ~10-20% (durante operaciones)
        └─ Sensores:       < 1% (lectura muy rápida)

    Energía:
        ├─ WiFi activo:    ~160 mA @ 3.3V
        ├─ Transmisión:    ~200 mA picos
        ├─ Idle:           ~80 mA
        └─ Deep Sleep*:    ~10 μA (*no implementado)
```

---

**Notas:**
- Todos los diagramas son representaciones simplificadas
- Los tiempos son aproximados y pueden variar según red y hardware
- La implementación de deep sleep reduciría el consumo a < 1 mA promedio

