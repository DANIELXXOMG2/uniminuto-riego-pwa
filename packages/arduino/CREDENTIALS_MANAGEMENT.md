# 🔐 Gestión de Credenciales en Firmware Arduino

## ❓ ¿Se puede usar .env en Arduino?

**Respuesta corta:** No directamente como en Node.js, pero hay mejores alternativas.

## 🎯 Mejores Prácticas para Credenciales

### Opción 1: Archivo de Configuración Separado (RECOMENDADO) ⭐

Esta es la mejor práctica para desarrollo y producción:

#### Paso 1: Crear archivo `config.h`

```cpp
// config.h - NO SUBIR A GIT
#ifndef CONFIG_H
#define CONFIG_H

// WiFi
const char* WIFI_SSID = "TU_WIFI_AQUI";
const char* WIFI_PASSWORD = "TU_PASSWORD_AQUI";

// Firebase
const char* FIREBASE_HOST = "tu-proyecto.firebaseio.com";
const char* FIREBASE_API_KEY = "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
const char* FIREBASE_PROJECT_ID = "tu-proyecto-id";

// Firebase Auth - Usuario del dispositivo
const char* USER_EMAIL = "dispositivo@tudominio.com";
const char* USER_PASSWORD = "password_super_seguro";

// NTP
const char* NTP_SERVER = "pool.ntp.org";
const long GMT_OFFSET_SEC = -18000;  // GMT-5 Colombia
const int DAYLIGHT_OFFSET_SEC = 0;

#endif
```

#### Paso 2: Crear plantilla para el repositorio

```cpp
// config.example.h - SÍ SUBIR A GIT
#ifndef CONFIG_H
#define CONFIG_H

// WiFi - REEMPLAZAR CON TUS VALORES
const char* WIFI_SSID = "TU_WIFI_AQUI";
const char* WIFI_PASSWORD = "TU_PASSWORD_AQUI";

// Firebase - Obtener desde Firebase Console > Project Settings
const char* FIREBASE_HOST = "tu-proyecto.firebaseio.com";
const char* FIREBASE_API_KEY = "TU_API_KEY_AQUI";
const char* FIREBASE_PROJECT_ID = "tu-proyecto-id";

// Firebase Auth - Crear usuario en Firebase Authentication
const char* USER_EMAIL = "dispositivo@example.com";
const char* USER_PASSWORD = "password_aqui";

// NTP - Configurar según tu zona horaria
const char* NTP_SERVER = "pool.ntp.org";
const long GMT_OFFSET_SEC = -18000;  // Ajustar según zona
const int DAYLIGHT_OFFSET_SEC = 0;

#endif
```

#### Paso 3: Modificar `main.ino`

```cpp
// main.ino
#include "config.h"  // Incluir configuración

// ... resto del código
```

#### Paso 4: Actualizar `.gitignore`

```gitignore
# Credenciales - NO SUBIR A GIT
packages/arduino/src/config.h

# Binarios compilados
packages/arduino/*.bin
packages/arduino/*.elf
packages/arduino/.pio/
packages/arduino/.vscode/
```

#### Paso 5: Instrucciones para el equipo

```bash
# Al clonar el repositorio, cada desarrollador debe:
cd packages/arduino/src
cp config.example.h config.h
# Editar config.h con sus credenciales locales
```

---

### Opción 2: Archivo SPIFFS/LittleFS (Avanzado) 🔥

Para producción con múltiples dispositivos:

```cpp
#include <SPIFFS.h>
#include <ArduinoJson.h>

void loadConfig() {
  if (!SPIFFS.begin(true)) {
    Serial.println("Error al montar SPIFFS");
    return;
  }
  
  File configFile = SPIFFS.open("/config.json", "r");
  if (!configFile) {
    Serial.println("Error al abrir config.json");
    return;
  }
  
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, configFile);
  configFile.close();
  
  if (error) {
    Serial.println("Error al parsear JSON");
    return;
  }
  
  // Cargar valores
  strlcpy(wifiSSID, doc["wifi"]["ssid"], sizeof(wifiSSID));
  strlcpy(wifiPassword, doc["wifi"]["password"], sizeof(wifiPassword));
  strlcpy(firebaseHost, doc["firebase"]["host"], sizeof(firebaseHost));
  // ... etc
}

// En setup():
loadConfig();
```

**Contenido de `/data/config.json`** (cargar con herramienta SPIFFS):

```json
{
  "wifi": {
    "ssid": "MiWiFi",
    "password": "password123"
  },
  "firebase": {
    "host": "proyecto.firebaseio.com",
    "apiKey": "AIzaSy...",
    "projectId": "proyecto-id",
    "userEmail": "dispositivo@example.com",
    "userPassword": "password"
  },
  "ntp": {
    "server": "pool.ntp.org",
    "gmtOffset": -18000,
    "daylightOffset": 0
  }
}
```

---

### Opción 3: Portal Cautivo WiFi Manager (Producción Profesional) 🌟

Para dispositivos comerciales sin hardcodear nada:

```cpp
#include <WiFiManager.h>

WiFiManager wifiManager;

void setup() {
  // Portal cautivo automático si no hay WiFi configurado
  // El usuario se conecta al AP "ESP32-Setup" y configura desde el navegador
  wifiManager.autoConnect("ESP32-Setup");
  
  // Campos personalizados para Firebase
  WiFiManagerParameter custom_firebase_host("host", "Firebase Host", "", 50);
  WiFiManagerParameter custom_firebase_key("key", "API Key", "", 50);
  
  wifiManager.addParameter(&custom_firebase_host);
  wifiManager.addParameter(&custom_firebase_key);
  
  if (wifiManager.autoConnect()) {
    // Guardar valores en EEPROM/SPIFFS
    String firebaseHost = custom_firebase_host.getValue();
    String firebaseKey = custom_firebase_key.getValue();
  }
}
```

---

## 📊 Comparación de Métodos

| Método | Seguridad | Facilidad | Producción | Multiusuario |
|--------|-----------|-----------|------------|--------------|
| **Hardcoded en .ino** | ❌ Baja | ✅ Fácil | ❌ No | ❌ No |
| **config.h separado** | ⭐ Media | ✅ Fácil | ⭐ Sí | ⭐ Sí |
| **SPIFFS/LittleFS** | ⭐⭐ Alta | 🔧 Media | ⭐⭐ Sí | ⭐⭐ Sí |
| **Portal Cautivo** | ⭐⭐⭐ Muy Alta | 🔧 Media | ⭐⭐⭐ Ideal | ⭐⭐⭐ Perfecto |

---

## ✅ Recomendación para Tu Proyecto

### Para Desarrollo/Prototipo (Ahora)

Usa **Opción 1: config.h separado**

**Ventajas:**
- ✅ Simple de implementar
- ✅ No sube credenciales a Git
- ✅ Cada desarrollador tiene sus propias credenciales
- ✅ Fácil de entender y mantener

**Implementación:**

```bash
cd packages/arduino/src

# Crear config.example.h (plantilla)
cat > config.example.h << 'EOF'
#ifndef CONFIG_H
#define CONFIG_H

const char* WIFI_SSID = "TU_WIFI_AQUI";
const char* WIFI_PASSWORD = "TU_PASSWORD_AQUI";
const char* FIREBASE_HOST = "tu-proyecto.firebaseio.com";
const char* FIREBASE_API_KEY = "TU_API_KEY";
const char* FIREBASE_PROJECT_ID = "tu-proyecto-id";
const char* USER_EMAIL = "dispositivo@example.com";
const char* USER_PASSWORD = "password_aqui";
const char* NTP_SERVER = "pool.ntp.org";
const long GMT_OFFSET_SEC = -18000;
const int DAYLIGHT_OFFSET_SEC = 0;

#endif
EOF

# Copiar y editar con tus credenciales reales
cp config.example.h config.h
nano config.h  # o tu editor preferido
```

### Para Producción (Futuro)

Migrar a **Opción 3: Portal Cautivo WiFi Manager**

**Ventajas:**
- ✅ Usuario final configura desde navegador
- ✅ No hay credenciales en el código
- ✅ Cambio de WiFi sin reprogramar
- ✅ Escalable a múltiples dispositivos

---

## 🔧 Implementación Actual (Temporal)

Mientras implementas `config.h`, puedes mantener las credenciales en `main.ino` pero con estas precauciones:

### 1. Crear rama de desarrollo privada

```bash
git checkout -b dev-local-credentials
# Esta rama NUNCA se sube al repositorio principal
```

### 2. Configurar Git para ignorar cambios en main.ino

```bash
git update-index --skip-worktree packages/arduino/src/main.ino
```

### 3. Al hacer commit de otros cambios

```bash
# Restaurar temporalmente el tracking
git update-index --no-skip-worktree packages/arduino/src/main.ino

# Reemplazar credenciales con placeholders
sed -i 's/const char\* WIFI_SSID = ".*"/const char* WIFI_SSID = "TU_WIFI_AQUI"/' main.ino

# Hacer commit
git add main.ino
git commit -m "feat: actualizar firmware"

# Restaurar credenciales reales
git checkout main.ino
git update-index --skip-worktree packages/arduino/src/main.ino
```

---

## 🔒 Mejores Prácticas de Seguridad

### DO ✅

- ✅ Usar archivo separado (`config.h`)
- ✅ Añadir `config.h` al `.gitignore`
- ✅ Proporcionar `config.example.h` como plantilla
- ✅ Documentar dónde obtener cada credencial
- ✅ Usar contraseñas fuertes (min 16 caracteres)
- ✅ Crear usuario dedicado para el dispositivo
- ✅ Limitar permisos del usuario en Firebase
- ✅ Rotar credenciales periódicamente

### DON'T ❌

- ❌ Hardcodear credenciales directamente en `.ino`
- ❌ Subir archivos con credenciales reales a Git
- ❌ Compartir credenciales por email/chat sin cifrar
- ❌ Usar la misma contraseña para todos los dispositivos
- ❌ Usar cuentas de administrador para dispositivos
- ❌ Dejar credenciales por defecto
- ❌ Ignorar advertencias de seguridad

---

## 📝 Checklist de Implementación

### Setup Inicial

- [ ] Crear `packages/arduino/src/config.example.h`
- [ ] Añadir `config.h` a `.gitignore`
- [ ] Crear tu `config.h` local con credenciales reales
- [ ] Modificar `main.ino` para incluir `#include "config.h"`
- [ ] Compilar y verificar que funciona
- [ ] Documentar el proceso en README.md

### Verificación

- [ ] Confirmar que `config.h` NO está en Git
- [ ] Confirmar que `config.example.h` SÍ está en Git
- [ ] Verificar que otro desarrollador puede clonar y configurar
- [ ] Probar compilación en otro equipo

### Seguridad

- [ ] Credenciales de producción diferentes a desarrollo
- [ ] Usuario de Firebase con permisos mínimos
- [ ] Contraseñas fuertes y únicas
- [ ] Documentar proceso de rotación

---

## 🔗 Referencias

- [WiFiManager Library](https://github.com/tzapu/WiFiManager)
- [SPIFFS File System](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/storage/spiffs.html)
- [ArduinoJson Library](https://arduinojson.org/)
- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/basics)

---

## 💡 Resumen

**Para tu proyecto AHORA:**

1. Crea `config.h` con tus credenciales
2. Añade `config.h` al `.gitignore`
3. Crea `config.example.h` como plantilla
4. Incluye `#include "config.h"` en `main.ino`
5. ✅ Listo - seguro y simple

**Para producción DESPUÉS:**

1. Implementa WiFiManager con portal cautivo
2. Almacena configuración en SPIFFS/LittleFS
3. Permite configuración via web sin reprogramar
4. ✅ Profesional y escalable
