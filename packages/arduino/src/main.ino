/*
  Sistema de Riego Automatizado con Firebase Firestore - Versión 3.0
  ---------------------------------------------------------------
  - Plataforma: ESP32/ESP8266 (WiFi nativo, no requiere shield externo)
  - Lee 18 sensores de humedad usando 2 multiplexores 16:1
  - Envía lecturas individuales a Firebase Firestore
  - Lee configuración y estado de líneas desde Firestore
  - Control automático basado en umbrales y estado isActive remoto
  - Usa temporizadores no bloqueantes (millis())
  - Autenticación segura con Firebase
  - Sincronización de hora con NTP para timestamps precisos
  ---------------------------------------------------------------
  REQUIERE:
  - ESP32 o ESP8266
  - Librerías:
    * WiFi.h (incluida en ESP32/ESP8266 core)
    * Firebase ESP Client (Mobizt) - https://github.com/mobizt/Firebase-ESP-Client
    * ArduinoJson v6+
    * time.h (para NTP)
  
  INSTALACIÓN DE LIBRERÍAS:
  - Arduino IDE: Tools > Manage Libraries > buscar "Firebase ESP Client"
  - PlatformIO: añadir "mobizt/Firebase Arduino Client Library for ESP8266 and ESP32" en platformio.ini
  
  JUSTIFICACIÓN DE LIBRERÍA FIREBASE:
  - Firebase ESP Client de Mobizt es la más completa y mantenida para ESP32/ESP8266
  - Soporta autenticación, Firestore, RTDB, Storage, Cloud Messaging
  - Compatible con el plan gratuito Spark de Firebase
  - Maneja automáticamente tokens, reconexión y SSL/TLS
*/

// ============================================================================
// LIBRERÍAS
// ============================================================================
#include <WiFi.h>              // Para ESP32 (usar ESP8266WiFi.h si es ESP8266)
#include <Firebase_ESP_Client.h> // Firebase ESP Client de Mobizt
#include <ArduinoJson.h>       // Para manejo de JSON
#include <time.h>              // Para sincronización NTP

// Provee las definiciones de payload y autenticación de Firebase
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// ============================================================================
// CONFIGURACIÓN - Archivo Separado (Credenciales)
// ============================================================================
// IMPORTANTE: Copiar config.example.h a config.h y editar con tus credenciales
// El archivo config.h está en .gitignore y NO se sube a Git
// Ver CREDENTIALS_MANAGEMENT.md para más información

#include "config.h"

// Si no existe config.h, crear uno basándote en config.example.h:
//   cp config.example.h config.h
//   # Luego editar config.h con tus valores reales

// ============================================================================
// CONFIGURACIÓN DE HARDWARE - PINES
// ============================================================================
// Multiplexores - Pines de control compartidos (S0-S3)
const int S0 = 4;
const int S1 = 5;
const int S2 = 6;
const int S3 = 7;

// Multiplexores - Pines de señal analógica
const int SIG1 = 34; // ESP32 ADC1_CH6 (GPIO 34) - MUX1 (sensores 1-16)
const int SIG2 = 35; // ESP32 ADC1_CH7 (GPIO 35) - MUX2 (sensores 17-18)
// Nota: Usa pines ADC1 en ESP32. Para ESP8266, usa A0 y necesitarás un solo MUX o multiplexación por software

// Electroválvulas - Pines de salida digital
const int VALV1 = 25; // Electroválvula línea 1
const int VALV2 = 26; // Electroválvula línea 2
const int VALV3 = 27; // Electroválvula línea 3

// ============================================================================
// VARIABLES GLOBALES - CONFIGURACIÓN Y ESTADO
// ============================================================================
// Configuración que se sincroniza desde Firestore
float umbral_linea1 = 30.0;      // Umbral de humedad línea 1 (%)
float umbral_linea2 = 30.0;      // Umbral de humedad línea 2 (%)
float umbral_linea3 = 30.0;      // Umbral de humedad línea 3 (%)
unsigned long intervaloLectura = 600000; // Intervalo entre lecturas (ms) - Default: 10 minutos

// Estado remoto de las líneas (leído desde Firestore)
bool isActiveLine1 = true;       // Estado isActive de línea 1
bool isActiveLine2 = true;       // Estado isActive de línea 2
bool isActiveLine3 = true;       // Estado isActive de línea 3

// Arrays para almacenar lecturas de sensores
float vwc[18];                   // Valores de %VWC de cada sensor (0-17)
float promedio[3];               // Promedios de cada línea de riego

// Temporizadores no bloqueantes
unsigned long tiempoAnteriorLectura = 0;      // Para lecturas periódicas de sensores
unsigned long tiempoAnteriorConfig = 0;       // Para sincronización de configuración
unsigned long tiempoAnteriorEstado = 0;       // Para sincronización de estados isActive
const unsigned long intervaloConfig = 300000; // Sincronizar config cada 5 minutos
const unsigned long intervaloEstado = 30000;  // Verificar estados cada 30 segundos

// Objetos de Firebase
FirebaseData fbdo;               // Objeto para operaciones de Firebase
FirebaseAuth auth;               // Objeto de autenticación
FirebaseConfig config;           // Objeto de configuración de Firebase

// Estado de conexión
bool wifiConnected = false;
bool firebaseReady = false;
unsigned long tiempoReconexionWiFi = 0;
const unsigned long intervaloReconexionWiFi = 30000; // Reintentar WiFi cada 30s

// IDs de sensores y líneas para Firestore (coinciden con tu estructura real)
const String sensorIds[18] = {
  "sensor-0", "sensor-1", "sensor-2", "sensor-3", "sensor-4", "sensor-5",
  "sensor-6", "sensor-7", "sensor-8", "sensor-9", "sensor-10", "sensor-11",
  "sensor-12", "sensor-13", "sensor-14", "sensor-15", "sensor-16", "sensor-17"
};

const String lineIds[3] = {
  "linea-1", "linea-2", "linea-3"
};

// ============================================================================
// FUNCIONES DE HARDWARE - SENSORES Y VÁLVULAS
// ============================================================================

/**
 * Configura el canal del multiplexor (0-15)
 * Los pines S0-S3 controlan ambos multiplexores simultáneamente
 */
void setChannel(int channel) {
  digitalWrite(S0, channel & 0x01);
  digitalWrite(S1, (channel >> 1) & 0x01);
  digitalWrite(S2, (channel >> 2) & 0x01);
  digitalWrite(S3, (channel >> 3) & 0x01);
}

/**
 * Calcula el porcentaje de humedad volumétrica (VWC) a partir de la lectura ADC
 * Fórmula de calibración específica del sensor capacitivo
 * @param lectura: Valor ADC del sensor (0-4095 en ESP32, 0-1023 en ESP8266)
 * @return: Porcentaje de VWC (0-100%)
 */
float calcularVWC(int lectura) {
  // Fórmula de calibración cuadrática
  float VWC = -0.000049 * pow(lectura, 2) - 0.0016 * lectura + 47.9;
  
  // Limitar valores al rango válido
  if (VWC < 0) VWC = 0;
  if (VWC > 100) VWC = 100;
  
  return VWC;
}

/**
 * Lee todos los 18 sensores de humedad y calcula los promedios por línea
 * Sensores 0-5: Línea 1
 * Sensores 6-11: Línea 2
 * Sensores 12-17: Línea 3
 */
void leerSensores() {
  int index = 0;
  
  // Leer los primeros 16 sensores del MUX1
  for (int canal = 0; canal < 16; canal++) {
    setChannel(canal);
    delayMicroseconds(50); // Pequeña pausa para estabilización (no bloqueante significativamente)
    vwc[index++] = calcularVWC(analogRead(SIG1));
  }
  
  // Leer los últimos 2 sensores del MUX2 (canales 0 y 1)
  for (int canal = 0; canal < 2; canal++) {
    setChannel(canal);
    delayMicroseconds(50);
    vwc[index++] = calcularVWC(analogRead(SIG2));
  }
  
  // Calcular promedios por línea de riego
  promedio[0] = (vwc[0] + vwc[1] + vwc[2] + vwc[3] + vwc[4] + vwc[5]) / 6.0;
  promedio[1] = (vwc[6] + vwc[7] + vwc[8] + vwc[9] + vwc[10] + vwc[11]) / 6.0;
  promedio[2] = (vwc[12] + vwc[13] + vwc[14] + vwc[15] + vwc[16] + vwc[17]) / 6.0;
  
  // Log de lecturas
  Serial.println("─────────────────────────────────────────");
  Serial.println("📊 LECTURAS DE SENSORES");
  Serial.printf("Línea 1 promedio: %.2f%% (Umbral: %.2f%%)\n", promedio[0], umbral_linea1);
  Serial.printf("Línea 2 promedio: %.2f%% (Umbral: %.2f%%)\n", promedio[1], umbral_linea2);
  Serial.printf("Línea 3 promedio: %.2f%% (Umbral: %.2f%%)\n", promedio[2], umbral_linea3);
}

/**
 * Controla las electroválvulas basándose en:
 * 1. Promedio de humedad < umbral
 * 2. Estado isActive = true (desde Firestore)
 * 
 * La válvula solo se activa si AMBAS condiciones se cumplen
 */
void controlarValvulas() {
  // Línea 1
  if (promedio[0] < umbral_linea1 && isActiveLine1) {
    digitalWrite(VALV1, HIGH);
    Serial.println("💧 Válvula 1: ACTIVADA");
  } else {
    digitalWrite(VALV1, LOW);
    if (!isActiveLine1) Serial.println("🚫 Válvula 1: Desactivada (isActive=false)");
  }
  
  // Línea 2
  if (promedio[1] < umbral_linea2 && isActiveLine2) {
    digitalWrite(VALV2, HIGH);
    Serial.println("💧 Válvula 2: ACTIVADA");
  } else {
    digitalWrite(VALV2, LOW);
    if (!isActiveLine2) Serial.println("🚫 Válvula 2: Desactivada (isActive=false)");
  }
  
  // Línea 3
  if (promedio[2] < umbral_linea3 && isActiveLine3) {
    digitalWrite(VALV3, HIGH);
    Serial.println("💧 Válvula 3: ACTIVADA");
  } else {
    digitalWrite(VALV3, LOW);
    if (!isActiveLine3) Serial.println("🚫 Válvula 3: Desactivada (isActive=false)");
  }
}

// ============================================================================
// FUNCIONES DE CONECTIVIDAD - WiFi
// ============================================================================

/**
 * Configura e inicia la conexión WiFi
 * Intenta conectar con reintentos y feedback en Serial
 */
void setupWiFi() {
  Serial.println("─────────────────────────────────────────");
  Serial.println("📡 INICIANDO CONEXIÓN WiFi");
  Serial.printf("SSID: %s\n", WIFI_SSID);
  
  WiFi.mode(WIFI_STA); // Modo estación (cliente)
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(".");
    intentos++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n✅ WiFi conectado exitosamente");
    Serial.print("📶 IP asignada: ");
    Serial.println(WiFi.localIP());
    Serial.print("📊 Intensidad de señal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    wifiConnected = false;
    Serial.println("\n❌ Error: No se pudo conectar al WiFi");
    Serial.println("⚠️  Verifique las credenciales y la disponibilidad de la red");
  }
}

/**
 * Verifica el estado de la conexión WiFi y reconecta si es necesario
 * Debe llamarse periódicamente desde loop()
 */
void verificarConexionWiFi() {
  unsigned long tiempoActual = millis();
  
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    
    // Intentar reconexión cada intervaloReconexionWiFi
    if (tiempoActual - tiempoReconexionWiFi >= intervaloReconexionWiFi) {
      tiempoReconexionWiFi = tiempoActual;
      Serial.println("⚠️  WiFi desconectado. Intentando reconectar...");
      setupWiFi();
    }
  } else {
    if (!wifiConnected) {
      wifiConnected = true;
      Serial.println("✅ WiFi reconectado");
    }
  }
}

// ============================================================================
// FUNCIONES DE FIREBASE - AUTENTICACIÓN Y CONFIGURACIÓN
// ============================================================================

/**
 * Configura Firebase y realiza la autenticación inicial
 * Debe llamarse en setup() después de conectar al WiFi
 */
void setupFirebase() {
  Serial.println("─────────────────────────────────────────");
  Serial.println("🔥 CONFIGURANDO FIREBASE");
  
  // Asignar API Key
  config.api_key = FIREBASE_API_KEY;
  
  // Asignar credenciales de usuario
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  
  // Asignar información del proyecto
  config.database_url = FIREBASE_HOST;
  
  // Asignar la función de callback para el estado del token de larga duración
  config.token_status_callback = tokenStatusCallback; // Función incluida en TokenHelper.h
  
  // Configurar límites de reconexión WiFi para Firebase
  Firebase.reconnectWiFi(true);
  
  // Iniciar Firebase con la configuración y autenticación
  Firebase.begin(&config, &auth);
  
  Serial.println("⏳ Autenticando con Firebase...");
  
  // Esperar autenticación inicial (máximo 10 segundos)
  int intentos = 0;
  while (!Firebase.ready() && intentos < 20) {
    delay(500);
    Serial.print(".");
    intentos++;
  }
  
  if (Firebase.ready()) {
    firebaseReady = true;
    Serial.println("\n✅ Firebase autenticado exitosamente");
    Serial.printf("👤 Usuario: %s\n", USER_EMAIL);
  } else {
    firebaseReady = false;
    Serial.println("\n❌ Error: No se pudo autenticar con Firebase");
    Serial.println("⚠️  Verifique las credenciales y la configuración del proyecto");
  }
}

/**
 * Verifica el estado de Firebase y maneja la renovación de tokens
 */
bool verificarFirebase() {
  if (!wifiConnected) {
    return false;
  }
  
  if (!Firebase.ready()) {
    firebaseReady = false;
    Serial.println("⚠️  Firebase no está listo. Token podría haber expirado.");
    // La librería maneja automáticamente la renovación de tokens
    return false;
  }
  
  firebaseReady = true;
  return true;
}

// ============================================================================
// FUNCIONES DE FIREBASE - SINCRONIZACIÓN CON FIRESTORE
// ============================================================================

/**
 * Obtiene la configuración desde Firestore: /config/device_config
 * Actualiza: umbrales de líneas e intervalo de lectura
 */
void fetchConfigFromFirestore() {
  if (!verificarFirebase()) {
    Serial.println("⚠️  No se puede obtener configuración: Firebase no está listo");
    return;
  }
  
  Serial.println("─────────────────────────────────────────");
  Serial.println("⚙️  SINCRONIZANDO CONFIGURACIÓN DESDE FIRESTORE");
  
  String documentPath = "config/device_config";
  
  if (Firebase.Firestore.getDocument(&fbdo, FIREBASE_PROJECT_ID, "", documentPath.c_str())) {
    Serial.println("✅ Configuración obtenida exitosamente");
    
    // Parsear el JSON de respuesta
    FirebaseJson &json = fbdo.jsonObject();
    FirebaseJsonData result;
    
    // Leer umbrales
    if (json.get(result, "fields/thresholdLine1/doubleValue")) {
      umbral_linea1 = result.floatValue;
      Serial.printf("  • Umbral Línea 1: %.2f%%\n", umbral_linea1);
    }
    
    if (json.get(result, "fields/thresholdLine2/doubleValue")) {
      umbral_linea2 = result.floatValue;
      Serial.printf("  • Umbral Línea 2: %.2f%%\n", umbral_linea2);
    }
    
    if (json.get(result, "fields/thresholdLine3/doubleValue")) {
      umbral_linea3 = result.floatValue;
      Serial.printf("  • Umbral Línea 3: %.2f%%\n", umbral_linea3);
    }
    
    // Leer intervalo de lectura (en milisegundos)
    if (json.get(result, "fields/readingInterval/integerValue")) {
      intervaloLectura = result.intValue;
      Serial.printf("  • Intervalo de lectura: %lu ms (%.1f min)\n", 
                    intervaloLectura, intervaloLectura / 60000.0);
    }
    
  } else {
    Serial.println("❌ Error al obtener configuración");
    Serial.println(fbdo.errorReason());
  }
}

/**
 * Obtiene el estado isActive de las líneas desde Firestore: /irrigationLines/{lineId}
 */
void fetchLineStatesFromFirestore() {
  if (!verificarFirebase()) {
    Serial.println("⚠️  No se puede obtener estados: Firebase no está listo");
    return;
  }
  
  Serial.println("─────────────────────────────────────────");
  Serial.println("🔄 SINCRONIZANDO ESTADOS DE LÍNEAS DESDE FIRESTORE");
  
  // Obtener estado de cada línea
  for (int i = 0; i < 3; i++) {
    String documentPath = "irrigationLines/" + lineIds[i];
    
    if (Firebase.Firestore.getDocument(&fbdo, FIREBASE_PROJECT_ID, "", documentPath.c_str())) {
      FirebaseJson &json = fbdo.jsonObject();
      FirebaseJsonData result;
      
      if (json.get(result, "fields/isActive/booleanValue")) {
        bool isActive = result.boolValue;
        
        // Actualizar variable global correspondiente
        switch(i) {
          case 0: 
            isActiveLine1 = isActive;
            Serial.printf("  • Línea 1 (line-001): %s\n", isActive ? "ACTIVA" : "INACTIVA");
            break;
          case 1: 
            isActiveLine2 = isActive;
            Serial.printf("  • Línea 2 (line-002): %s\n", isActive ? "ACTIVA" : "INACTIVA");
            break;
          case 2: 
            isActiveLine3 = isActive;
            Serial.printf("  • Línea 3 (line-003): %s\n", isActive ? "ACTIVA" : "INACTIVA");
            break;
        }
      }
    } else {
      Serial.printf("❌ Error al obtener estado de %s\n", lineIds[i].c_str());
      Serial.println(fbdo.errorReason());
    }
  }
}

/**
 * Envía las lecturas individuales de cada sensor a Firestore
 * Cada lectura se guarda en: /sensors/{sensorId}/readings/{auto-id}
 * Incluye timestamp y valorVWC
 */
void sendReadingsToFirestore() {
  if (!verificarFirebase()) {
    Serial.println("⚠️  No se puede enviar lecturas: Firebase no está listo");
    return;
  }
  
  Serial.println("─────────────────────────────────────────");
  Serial.println("📤 ENVIANDO LECTURAS A FIRESTORE");
  
  // Obtener timestamp actual
  time_t now = time(nullptr);
  
  // Enviar lectura de cada sensor
  for (int i = 0; i < 18; i++) {
    String collectionPath = "sensors/" + sensorIds[i] + "/readings";
    
    // Crear documento con los campos en formato Firestore
    FirebaseJson content;
    
    // Timestamp - usar serverTimestamp para mejor precisión
    content.set("fields/timestamp/timestampValue", String(now) + ".000Z");
    
    // Valor VWC
    content.set("fields/valueVWC/doubleValue", vwc[i]);
    
    // Enviar a Firestore
    if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", 
                                          collectionPath.c_str(), content.raw())) {
      Serial.printf("  ✅ Sensor %s: %.2f%% enviado\n", sensorIds[i].c_str(), vwc[i]);
    } else {
      Serial.printf("  ❌ Error al enviar %s: %s\n", 
                    sensorIds[i].c_str(), fbdo.errorReason().c_str());
    }
    
    // Pequeña pausa entre envíos para no saturar
    delay(100);
  }
  
  Serial.println("✅ Envío de lecturas completado");
}

// ============================================================================
// FUNCIONES DE UTILIDAD - NTP Y TIEMPO
// ============================================================================

/**
 * Configura el cliente NTP para sincronización de hora
 * Debe llamarse en setup() después de conectar al WiFi
 */
void setupNTP() {
  Serial.println("─────────────────────────────────────────");
  Serial.println("🕐 SINCRONIZANDO HORA CON NTP");
  
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
  
  Serial.print("⏳ Esperando sincronización NTP");
  
  int intentos = 0;
  time_t now = time(nullptr);
  while (now < 24 * 3600 && intentos < 20) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
    intentos++;
  }
  
  if (now >= 24 * 3600) {
    Serial.println("\n✅ Hora sincronizada exitosamente");
    struct tm timeinfo;
    localtime_r(&now, &timeinfo);
    Serial.print("📅 Fecha y hora actual: ");
    Serial.println(asctime(&timeinfo));
  } else {
    Serial.println("\n⚠️  Advertencia: No se pudo sincronizar la hora con NTP");
    Serial.println("⚠️  Los timestamps podrían ser incorrectos");
  }
}

/**
 * Obtiene el timestamp actual en formato ISO8601 para Firestore
 */
String getCurrentTimestamp() {
  time_t now = time(nullptr);
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  
  return String(buffer) + "Z";
}

// ============================================================================
// SETUP - INICIALIZACIÓN DEL SISTEMA
// ============================================================================

void setup() {
  // Iniciar comunicación serial
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n");
  Serial.println("═════════════════════════════════════════");
  Serial.println("  SISTEMA DE RIEGO AUTOMATIZADO v3.0");
  Serial.println("  ESP32/ESP8266 + Firebase Firestore");
  Serial.println("═════════════════════════════════════════");
  Serial.println();
  
  // Configurar pines de hardware
  Serial.println("🔧 Configurando hardware...");
  pinMode(S0, OUTPUT);
  pinMode(S1, OUTPUT);
  pinMode(S2, OUTPUT);
  pinMode(S3, OUTPUT);
  
  pinMode(VALV1, OUTPUT);
  pinMode(VALV2, OUTPUT);
  pinMode(VALV3, OUTPUT);
  
  // Inicializar válvulas en estado cerrado
  digitalWrite(VALV1, LOW);
  digitalWrite(VALV2, LOW);
  digitalWrite(VALV3, LOW);
  
  Serial.println("✅ Hardware configurado");
  
  // Conectar al WiFi
  setupWiFi();
  
  if (!wifiConnected) {
    Serial.println("❌ ADVERTENCIA: Iniciando sin WiFi");
    Serial.println("   El sistema funcionará en modo local limitado");
    return;
  }
  
  // Sincronizar hora con NTP
  setupNTP();
  
  // Configurar y autenticar con Firebase
  setupFirebase();
  
  if (!firebaseReady) {
    Serial.println("❌ ADVERTENCIA: Iniciando sin Firebase");
    Serial.println("   No se podrán sincronizar datos con la nube");
    return;
  }
  
  // Obtener configuración inicial desde Firestore
  fetchConfigFromFirestore();
  
  // Obtener estados iniciales de las líneas
  fetchLineStatesFromFirestore();
  
  Serial.println();
  Serial.println("═════════════════════════════════════════");
  Serial.println("✅ INICIALIZACIÓN COMPLETADA");
  Serial.println("🚀 Sistema operativo");
  Serial.println("═════════════════════════════════════════");
  Serial.println();
}

// ============================================================================
// LOOP PRINCIPAL - EJECUCIÓN CONTINUA
// ============================================================================

void loop() {
  unsigned long tiempoActual = millis();
  
  // ────────────────────────────────────────────────────────────────────────
  // 1. VERIFICAR CONEXIÓN WiFi (continuo)
  // ────────────────────────────────────────────────────────────────────────
  verificarConexionWiFi();
  
  // ────────────────────────────────────────────────────────────────────────
  // 2. SINCRONIZAR CONFIGURACIÓN desde Firestore (cada 5 minutos)
  // ────────────────────────────────────────────────────────────────────────
  if (tiempoActual - tiempoAnteriorConfig >= intervaloConfig) {
    tiempoAnteriorConfig = tiempoActual;
    fetchConfigFromFirestore();
  }
  
  // ────────────────────────────────────────────────────────────────────────
  // 3. SINCRONIZAR ESTADOS DE LÍNEAS desde Firestore (cada 30 segundos)
  // ────────────────────────────────────────────────────────────────────────
  if (tiempoActual - tiempoAnteriorEstado >= intervaloEstado) {
    tiempoAnteriorEstado = tiempoActual;
    fetchLineStatesFromFirestore();
  }
  
  // ────────────────────────────────────────────────────────────────────────
  // 4. LECTURA DE SENSORES Y CONTROL (según intervaloLectura configurado)
  // ────────────────────────────────────────────────────────────────────────
  if (tiempoActual - tiempoAnteriorLectura >= intervaloLectura) {
    tiempoAnteriorLectura = tiempoActual;
    
    Serial.println("\n═════════════════════════════════════════");
    Serial.println("🔄 CICLO DE LECTURA Y CONTROL");
    Serial.println("═════════════════════════════════════════");
    
    // Leer todos los sensores
    leerSensores();
    
    // Enviar lecturas a Firestore
    if (firebaseReady) {
      sendReadingsToFirestore();
    } else {
      Serial.println("⚠️  Firebase no disponible - Lecturas no enviadas");
    }
    
    // Controlar válvulas según lecturas y estados remotos
    controlarValvulas();
    
    Serial.println("═════════════════════════════════════════");
    Serial.printf("⏱️  Próxima lectura en: %.1f minutos\n", intervaloLectura / 60000.0);
    Serial.println("═════════════════════════════════════════\n");
  }
  
  // ────────────────────────────────────────────────────────────────────────
  // 5. MANTENER CONEXIÓN FIREBASE (la librería maneja esto internamente)
  // ────────────────────────────────────────────────────────────────────────
  // No se requiere código explícito - Firebase ESP Client maneja
  // automáticamente la renovación de tokens y reconexiones
  
  // Pequeña pausa para evitar saturar el procesador
  // (no afecta significativamente el rendimiento)
  delay(10);
}

// ============================================================================
// FIN DEL CÓDIGO
// ============================================================================

/*
 * NOTAS DE IMPLEMENTACIÓN Y SEGURIDAD:
 * 
 * 1. CREDENCIALES:
 *    - Las credenciales están hardcodeadas para simplicidad
 *    - En producción, considerar:
 *      a) Portal cautivo para configuración WiFi
 *      b) Almacenar credenciales en EEPROM/SPIFFS encriptadas
 *      c) Usar Service Account con permisos limitados
 * 
 * 2. REGLAS DE SEGURIDAD FIRESTORE:
 *    - Configurar reglas estrictas en Firebase Console
 *    - El usuario del dispositivo debe tener solo permisos de:
 *      * Lectura: /config/*, /irrigationLines/*
 *      * Escritura: /sensors/*/readings/*
 * 
 * 3. ESTRUCTURA FIRESTORE ESPERADA:
 *    /config/device_config
 *      - thresholdLine1: double
 *      - thresholdLine2: double
 *      - thresholdLine3: double
 *      - readingInterval: integer (milisegundos)
 *    
 *    /irrigationLines/{lineId}
 *      - isActive: boolean
 *      - name: string
 *    
 *    /sensors/{sensorId}/readings/{auto-id}
 *      - timestamp: timestamp
 *      - valueVWC: double
 * 
 * 4. INSTALACIÓN DE LIBRERÍAS:
 *    Arduino IDE:
 *      - Tools > Manage Libraries
 *      - Buscar e instalar:
 *        * "Firebase ESP Client" por Mobizt
 *        * "ArduinoJson" por Benoit Blanchon
 *    
 *    PlatformIO (platformio.ini):
 *      lib_deps = 
 *        mobizt/Firebase Arduino Client Library for ESP8266 and ESP32
 *        bblanchon/ArduinoJson@^6.21.0
 * 
 * 5. CONFIGURACIÓN DE PLACA:
 *    - Para ESP32:
 *      * Board: "ESP32 Dev Module"
 *      * Upload Speed: 921600
 *      * Flash Frequency: 80MHz
 *    
 *    - Para ESP8266:
 *      * Cambiar #include <WiFi.h> por #include <ESP8266WiFi.h>
 *      * Ajustar pines ADC (ESP8266 solo tiene A0)
 *      * Board: "NodeMCU 1.0" o similar
 * 
 * 6. OPTIMIZACIONES FUTURAS:
 *    - Implementar modo deep sleep entre lecturas para ahorro de energía
 *    - Usar listeners de Firestore en lugar de polling para estados isActive
 *    - Implementar OTA (Over-The-Air) updates
 *    - Añadir watchdog timer para auto-reset en caso de cuelgue
 *    - Implementar buffer local en SPIFFS para lecturas cuando no hay conexión
 * 
 * 7. DEBUGGING:
 *    - Monitorear Serial a 115200 baud para ver logs detallados
 *    - Verificar conexión WiFi y señal (RSSI)
 *    - Verificar autenticación Firebase en consola
 *    - Revisar Firebase Console > Firestore para ver datos entrantes
 * 
 * 8. TROUBLESHOOTING COMÚN:
 *    - Error WiFi: Verificar SSID/password, canal WiFi compatible
 *    - Error Firebase Auth: Verificar API Key, email/password de usuario
 *    - Error Firestore: Verificar Project ID, reglas de seguridad
 *    - Timestamps incorrectos: Verificar servidor NTP y zona horaria
 */
