/*
 * Archivo de Configuración - Plantilla
 * 
 * INSTRUCCIONES:
 * 1. Copiar este archivo como "config.h":
 *    cp config.example.h config.h
 * 
 * 2. Editar config.h con tus valores reales
 * 
 * 3. NO subir config.h a Git (ya está en .gitignore)
 * 
 * IMPORTANTE: Este archivo (config.example.h) SÍ se sube a Git como plantilla
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// CONFIGURACIÓN WiFi
// ============================================================================
// Reemplazar con tu SSID y contraseña de WiFi
// NOTA: ESP8266 solo soporta WiFi 2.4GHz

const char* WIFI_SSID = "TU_WIFI_AQUI";
const char* WIFI_PASSWORD = "TU_PASSWORD_AQUI";

// ============================================================================
// CONFIGURACIÓN FIREBASE
// ============================================================================
// Obtener estos valores desde Firebase Console > Project Settings

// Firebase Host (sin https://)
// Ejemplo: "mi-proyecto-riego.firebaseio.com"
const char* FIREBASE_HOST = "tu-proyecto-id.firebaseio.com";

// Web API Key
// Encontrar en: Firebase Console > Project Settings > General > Web API Key
// Ejemplo: "AIzaSyDxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxX"
const char* FIREBASE_API_KEY = "TU_WEB_API_KEY_AQUI";

// Project ID
// Encontrar en: Firebase Console > Project Settings > General > Project ID
// Ejemplo: "mi-proyecto-riego"
const char* FIREBASE_PROJECT_ID = "tu-proyecto-id";

// ============================================================================
// FIREBASE AUTHENTICATION - Usuario del Dispositivo
// ============================================================================
// IMPORTANTE: Crear un usuario dedicado para el dispositivo
// 
// Pasos:
// 1. Firebase Console > Authentication
// 2. Sign-in method > Email/Password > Habilitar
// 3. Users > Add user
// 4. Email: dispositivo@tudominio.com (o similar)
// 5. Password: Generar contraseña segura (min 16 caracteres)
// 
// SEGURIDAD: Este usuario debe tener permisos limitados en las reglas de Firestore

const char* USER_EMAIL = "dispositivo@example.com";
const char* USER_PASSWORD = "password_super_seguro_aqui";

// ============================================================================
// CONFIGURACIÓN NTP (Sincronización de Hora)
// ============================================================================
// Servidor NTP para sincronizar hora
const char* NTP_SERVER = "pool.ntp.org";

// Zona horaria en segundos (GMT offset)
// Colombia (GMT-5): -18000
// México CDMX (GMT-6): -21600
// Argentina (GMT-3): -10800
// España (GMT+1): 3600
const long GMT_OFFSET_SEC = -18000;  // Ajustar según tu ubicación

// Horario de verano (0 si no aplica)
const int DAYLIGHT_OFFSET_SEC = 0;

// ============================================================================
// ESTRUCTURA FIRESTORE ESPERADA
// ============================================================================
/*
  /config/device_config
    - thresholdLine1: 30.0 (double)
    - thresholdLine2: 30.0 (double)
    - thresholdLine3: 30.0 (double)
    - readingInterval: 600000 (integer, milisegundos)
  
  /irrigationLines/{linea-1, linea-2, linea-3}
    - name: "Línea X" (string)
    - isActive: true (boolean)
    - sensorIds: ["sensor-0", ...] (array)
  
  /sensors/{sensor-0 a sensor-17}
    - lineId: "linea-X" (string)
    - status: "active" (string)
    - title: "Sensor Pasillo X" (string)
    
    /readings/{auto-id}
      - timestamp: (timestamp)
      - valueVWC: 35.5 (double)
*/

// ============================================================================
// NOTAS DE SEGURIDAD
// ============================================================================
/*
  1. NUNCA subir este archivo (config.h) a repositorios públicos
  
  2. Usar contraseñas fuertes (mínimo 16 caracteres, combinación de 
     mayúsculas, minúsculas, números y símbolos)
  
  3. Crear usuario de Firebase específico para el dispositivo con 
     permisos limitados
  
  4. Configurar reglas de seguridad en Firestore para limitar acceso
  
  5. Rotar credenciales periódicamente (cada 3-6 meses)
  
  6. No compartir credenciales por canales inseguros (email, chat sin cifrar)
  
  7. En producción, considerar usar WiFiManager para configuración 
     vía portal cautivo
*/

#endif // CONFIG_H
