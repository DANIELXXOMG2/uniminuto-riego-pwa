# 📝 Resumen de Ajustes: IDs de Base de Datos y Gestión de Credenciales

**Fecha:** Octubre 20, 2025  
**Sprint:** 5  

---

## 🔄 Cambios Realizados

### 1. ✅ Ajuste de IDs de Sensores y Líneas

**Problema identificado:**
- El código usaba IDs con formato `sensor-001` a `sensor-018`
- La base de datos real usa formato `sensor-0` a `sensor-17`
- Las líneas usaban `line-001` en lugar de `linea-1`

**Cambios aplicados:**

#### En `main.ino`:
```cpp
// ANTES:
const String sensorIds[18] = {
  "sensor-001", "sensor-002", ..., "sensor-018"
};
const String lineIds[3] = {
  "line-001", "line-002", "line-003"
};

// AHORA:
const String sensorIds[18] = {
  "sensor-0", "sensor-1", ..., "sensor-17"
};
const String lineIds[3] = {
  "linea-1", "linea-2", "linea-3"
};
```

#### En `init-firestore-for-arduino.js`:
- Actualizado IRRIGATION_LINES: `linea-1`, `linea-2`, `linea-3`
- Actualizado SENSORS: `sensor-0` a `sensor-17`
- Ajustados campos: `title` en lugar de `name` para sensores
- Estructura coincide con tu base de datos existente

**Estructura Firestore Real:**
```javascript
// sensors/sensor-0
{
  lineId: "linea-1",
  status: "active",
  title: "Sensor Pasillo 1"
}

// sensors/sensor-12
{
  lineId: "linea-3",
  status: "active",
  title: "Sensor Pasillo 3"
}

// irrigationLines/linea-1
{
  name: "Línea 1",
  isActive: true,
  sensorIds: ["sensor-0", ..., "sensor-5"]
}
```

---

### 2. 🔐 Implementación de Gestión de Credenciales

**Respuesta a tu pregunta: "¿Manejamos .env?"**

❌ **No se puede usar .env directamente en Arduino** como en Node.js

✅ **Solución implementada:** Archivo `config.h` separado

#### Archivos creados:

##### `config.example.h` ✅ (Se sube a Git)
- Plantilla con valores de ejemplo
- Comentarios explicativos
- Instrucciones de configuración
- Estructura Firestore documentada

##### `config.h` ⚠️ (NO se sube a Git)
- Cada desarrollador crea su propia copia
- Contiene credenciales reales
- Ya está en `.gitignore`

#### Modificaciones en `main.ino`:
```cpp
// ANTES: Credenciales hardcodeadas
const char* WIFI_SSID = "NOMBRE_DE_TU_WIFI";
const char* WIFI_PASSWORD = "CONTRASENA_DE_TU_WIFI";
// ... más credenciales

// AHORA: Se importan desde config.h
#include "config.h"
```

#### Actualización de `.gitignore`:
```gitignore
# Arduino - Credenciales y configuración local
packages/arduino/src/config.h
packages/arduino/*.bin
packages/arduino/*.elf
packages/arduino/.pio/
```

---

## 📖 Documentación Creada

### 1. `CREDENTIALS_MANAGEMENT.md` 🔐
**Contenido completo sobre:**
- ¿Por qué no se puede usar .env en Arduino?
- 3 opciones de gestión de credenciales:
  - ⭐ **Opción 1:** `config.h` separado (RECOMENDADO para ahora)
  - 🔥 **Opción 2:** SPIFFS/LittleFS (Avanzado)
  - 🌟 **Opción 3:** Portal Cautivo WiFiManager (Ideal para producción)
- Comparación de métodos
- Mejores prácticas de seguridad
- Checklist de implementación

### 2. `config.example.h` 📋
**Plantilla lista para usar:**
- Variables de WiFi
- Variables de Firebase
- Configuración NTP
- Comentarios explicativos
- Notas de seguridad

---

## 🚀 Cómo Usar (Para Desarrolladores)

### Setup Inicial:

```bash
# 1. Navegar al directorio de Arduino
cd packages/arduino/src

# 2. Copiar plantilla
cp config.example.h config.h

# 3. Editar con tus credenciales
nano config.h  # o tu editor preferido

# 4. Compilar
# Arduino IDE: Sketch > Upload
# PlatformIO: pio run --target upload
```

### Configuración de `config.h`:

```cpp
// WiFi
const char* WIFI_SSID = "MiWiFi";  // Tu SSID real
const char* WIFI_PASSWORD = "mipassword123";  // Tu password real

// Firebase (desde Firebase Console)
const char* FIREBASE_HOST = "mi-proyecto-riego.firebaseio.com";
const char* FIREBASE_API_KEY = "AIzaSyXXXXXXXXXXXXXXXXXXX";
const char* FIREBASE_PROJECT_ID = "mi-proyecto-riego";

// Usuario dedicado del dispositivo
const char* USER_EMAIL = "esp32-device@midominio.com";
const char* USER_PASSWORD = "password_seguro_16caracteres_min";

// Zona horaria
const long GMT_OFFSET_SEC = -18000;  // GMT-5 para Colombia
```

---

## ✅ Verificación

### Checklist de IDs:

- [x] ✅ Sensores usan formato: `sensor-0` a `sensor-17`
- [x] ✅ Líneas usan formato: `linea-1`, `linea-2`, `linea-3`
- [x] ✅ Campo `title` en sensores (no `name`)
- [x] ✅ Campo `lineId` usa `linea-X` (no `line-XXX`)
- [x] ✅ Script de inicialización actualizado
- [x] ✅ Firmware actualizado

### Checklist de Credenciales:

- [x] ✅ `config.example.h` creado (plantilla)
- [x] ✅ `config.h` añadido a `.gitignore`
- [x] ✅ `main.ino` usa `#include "config.h"`
- [x] ✅ Documentación completa en `CREDENTIALS_MANAGEMENT.md`
- [x] ✅ `.gitignore` actualizado con entradas de Arduino

---

## 📊 Estructura de Archivos Arduino (Actualizada)

```
packages/arduino/
├── src/
│   ├── main.ino                    ✅ Actualizado (usa config.h)
│   ├── config.example.h            ✅ NUEVO (plantilla)
│   └── config.h                    ⚠️  CREAR (no en Git)
│
├── README.md                        ✅ Guía completa
├── MIGRATION_GUIDE.md              ✅ Guía de migración v2→v3
├── REFACTORING_SUMMARY.md          ✅ Resumen de refactorización
├── ARCHITECTURE.md                 ✅ Diagramas arquitectura
├── CREDENTIALS_MANAGEMENT.md       ✅ NUEVO (gestión credenciales)
└── platformio.ini                  ✅ Config PlatformIO
```

---

## 🎯 Próximos Pasos para Ti

### 1. Crear tu `config.h` local:

```bash
cd packages/arduino/src
cp config.example.h config.h
# Editar config.h con tus credenciales reales
```

### 2. Obtener credenciales Firebase:

1. Firebase Console > Project Settings
2. Copiar:
   - Web API Key
   - Project ID
   - Firebase Host

### 3. Crear usuario del dispositivo:

1. Firebase Console > Authentication
2. Habilitar Email/Password
3. Add User:
   - Email: `esp32-riego@tudominio.com`
   - Password: Generar segura (16+ caracteres)

### 4. Compilar y probar:

```bash
# Con Arduino IDE
# - Abrir main.ino
# - Tools > Board > ESP32 Dev Module
# - Sketch > Upload

# Con PlatformIO
cd packages/arduino
pio run --target upload
pio device monitor
```

### 5. Verificar en Serial Monitor (115200 baud):

```
✅ WiFi conectado exitosamente
✅ Hora sincronizada
✅ Firebase autenticado
✅ Configuración obtenida
✅ Estados de líneas obtenidos
✅ Sistema operativo
```

---

## 🔒 Recordatorios de Seguridad

### ✅ HACER:

- ✅ Usar `config.h` para credenciales
- ✅ Añadir `config.h` al `.gitignore`
- ✅ Crear usuario dedicado para el dispositivo
- ✅ Usar contraseñas fuertes (16+ caracteres)
- ✅ Limitar permisos en reglas Firestore
- ✅ Proporcionar `config.example.h` como plantilla

### ❌ NO HACER:

- ❌ Subir `config.h` con credenciales reales a Git
- ❌ Hardcodear credenciales en `main.ino`
- ❌ Compartir credenciales por canales inseguros
- ❌ Usar la misma password para todos los dispositivos
- ❌ Dar permisos de admin al usuario del dispositivo

---

## 📚 Referencias Rápidas

| Documento | Propósito |
|-----------|-----------|
| `README.md` | Guía completa de instalación |
| `CREDENTIALS_MANAGEMENT.md` | Todo sobre credenciales y .env |
| `config.example.h` | Plantilla de configuración |
| `MIGRATION_GUIDE.md` | Migración v2.0 → v3.0 |
| `ARCHITECTURE.md` | Diagramas y flujos |

---

## 💡 Comparación: .env vs config.h

| Aspecto | Node.js (.env) | Arduino (config.h) |
|---------|----------------|-------------------|
| **Cargado en runtime** | ✅ Sí | ❌ No (compilado) |
| **Fácil cambiar** | ✅ Sí | ⚠️  Recompilación |
| **Separado del código** | ✅ Sí | ✅ Sí |
| **No sube a Git** | ✅ Sí | ✅ Sí |
| **Plantilla ejemplo** | ✅ .env.example | ✅ config.example.h |
| **Soporte nativo** | ✅ Librerías | ❌ No existe |

**Conclusión:** `config.h` es el equivalente más cercano a `.env` en Arduino.

---

## ✨ Resumen Ejecutivo

**Cambios aplicados:**

1. ✅ IDs actualizados para coincidir con tu base de datos real
   - Sensores: `sensor-0` a `sensor-17`
   - Líneas: `linea-1`, `linea-2`, `linea-3`

2. ✅ Sistema de credenciales implementado
   - Archivo `config.h` separado (como .env)
   - Plantilla `config.example.h` documentada
   - `.gitignore` actualizado
   - Guía completa en `CREDENTIALS_MANAGEMENT.md`

3. ✅ Todo listo para compilar
   - Solo necesitas crear tu `config.h` local
   - Seguir instrucciones en `config.example.h`
   - Compilar y cargar al ESP32

**Estado:** ✅ Listo para desarrollo
