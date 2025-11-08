/*
  Sistema de Riego Automatizado con Firebase Firestore - Versión 3.2 (Wemos D1 R1)
  ---------------------------------------------------------------
  - Plataforma: Wemos D1 R1 (ESP8266 con WiFi nativo)
  - Lee 18 sensores de humedad usando 2 multiplexores 16:1 en UN SOLO pin analógico (A0)
  - Envía lecturas individuales a Firebase Firestore
  - Lee configuración y estado de líneas desde Firestore
  - Control automático basado en umbrales y estado isActive remoto
  - Usa temporizadores no bloqueantes (millis())
  - Autenticación segura con Firebase
  - Sincronización de hora con NTP para timestamps precisos
  ---------------------------------------------------------------
  REQUIERE:
  - Wemos D1 R1 (o placa similar basada en ESP8266)
  - Librerías:
    * ESP8266WiFi.h (incluida en ESP8266 core)
    * Firebase ESP Client (Mobizt) - https://github.com/mobizt/Firebase-ESP-Client
    * ArduinoJson v6+
    * time.h (para NTP)
*/

// ============================================================================
// LIBRERÍAS
// ============================================================================
#include <ESP8266WiFi.h>       // *** CAMBIO: Librería WiFi para ESP8266 ***
#include <Firebase_ESP_Client.h> // Firebase ESP Client de Mobizt
#include <ArduinoJson.h>       // Para manejo de JSON
#include <time.h>              // Para sincronización NTP

// Provee las definiciones de payload y autenticación de Firebase
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// ============================================================================
// CONFIGURACIÓN - Archivo Separado (Credenciales)
// ============================================================================
#include "config.h" // Incluir tu archivo config.h con credenciales

// ============================================================================
// CONFIGURACIÓN DE HARDWARE - PINES (AJUSTADOS PARA WEMOS D1 R1)
// ============================================================================
// Multiplexores - Pines de control compartidos (S0-S3)
const int S0 = 4;  // Wemos D1 R1 -> D2
const int S1 = 5;  // Wemos D1 R1 -> D1
const int S2 = 14; // Wemos D1 R1 -> D5
const int S3 = 13; // Wemos D1 R1 -> D7

// *** CAMBIO: Un solo pin analógico para ambos MUX ***
const int SIG_PIN = A0; // Wemos D1 R1 -> A0 (Único pin analógico)

// *** CAMBIO: Pines para HABILITAR/DESHABILITAR cada MUX (LOW = Habilitado) ***
const int MUX1_EN = 16; // Wemos D1 R1 -> D0 (GPIO16) - Controla MUX1 (sensores 1-16)
const int MUX2_EN = 0;  // Wemos D1 R1 -> D3 (GPIO0) - Controla MUX2 (sensores 17-18)

// Electroválvulas - Pines de salida digital
const int VALV1 = 15; // Wemos D1 R1 -> D8 (GPIO15)
const int VALV2 = 2;  // Wemos D1 R1 -> D4 (GPIO2)
const int VALV3 = 12; // Wemos D1 R1 -> D6 (GPIO12)

// ============================================================================
// VARIABLES GLOBALES (Sin cambios significativos)
// ============================================================================
float umbral_linea1 = 30.0;
float umbral_linea2 = 30.0;
float umbral_linea3 = 30.0;
unsigned long intervaloLectura = 600000;
bool isActiveLine1 = true;
bool isActiveLine2 = true;
bool isActiveLine3 = true;
float vwc[18];
float promedio[3];
unsigned long tiempoAnteriorLectura = 0;
unsigned long tiempoAnteriorConfig = 0;
unsigned long tiempoAnteriorEstado = 0;
const unsigned long intervaloConfig = 300000;
const unsigned long intervaloEstado = 30000;
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
bool wifiConnected = false;
bool firebaseReady = false;
unsigned long tiempoReconexionWiFi = 0;
const unsigned long intervaloReconexionWiFi = 30000;
const String sensorIds[18] = {
  "sensor-0", "sensor-1", "sensor-2", "sensor-3", "sensor-4", "sensor-5",
  "sensor-6", "sensor-7", "sensor-8", "sensor-9", "sensor-10", "sensor-11",
  "sensor-12", "sensor-13", "sensor-14", "sensor-15", "sensor-16", "sensor-17"
};
const String lineIds[3] = { "linea-1", "linea-2", "linea-3" };

// ============================================================================
// FUNCIONES DE HARDWARE - SENSORES Y VÁLVULAS (MODIFICADAS)
// ============================================================================

// setChannel: Sin cambios
void setChannel(int channel) {
  digitalWrite(S0, channel & 0x01);
  digitalWrite(S1, (channel >> 1) & 0x01);
  digitalWrite(S2, (channel >> 2) & 0x01);
  digitalWrite(S3, (channel >> 3) & 0x01);
}

// calcularVWC: Sin cambios (asumiendo fórmula para 0-1023)
float calcularVWC(int lectura) {
  float VWC = -0.000049 * pow(lectura, 2) - 0.0016 * lectura + 47.9;
  if (VWC < 0) VWC = 0;
  if (VWC > 100) VWC = 100;
  return VWC;
}

// ****** ¡FUNCIÓN MODIFICADA PARA UN SOLO PIN ANALÓGICO! ******
void leerSensores() {
  int index = 0;

  // --- Leer MUX 1 (Sensores 1-16) ---
  digitalWrite(MUX2_EN, HIGH); // Deshabilitar MUX2
  digitalWrite(MUX1_EN, LOW);  // Habilitar MUX1
  delayMicroseconds(50);      // Tiempo para que se estabilice el enable

  for (int canal = 0; canal < 16; canal++) {
    setChannel(canal);
    delayMicroseconds(50); // Pausa para estabilización del canal
    vwc[index++] = calcularVWC(analogRead(SIG_PIN)); // Leer siempre de A0
  }
  digitalWrite(MUX1_EN, HIGH); // Deshabilitar MUX1 al terminar

  // --- Leer MUX 2 (Sensores 17-18) ---
  digitalWrite(MUX1_EN, HIGH); // Asegurarse que MUX1 esté deshabilitado
  digitalWrite(MUX2_EN, LOW);  // Habilitar MUX2
  delayMicroseconds(50);      // Tiempo para que se estabilice el enable

  for (int canal = 0; canal < 2; canal++) {
    setChannel(canal);
    delayMicroseconds(50);
    vwc[index++] = calcularVWC(analogRead(SIG_PIN)); // Leer siempre de A0
  }
  digitalWrite(MUX2_EN, HIGH); // Deshabilitar MUX2 al terminar

  // Calcular promedios (sin cambios)
  promedio[0] = (vwc[0] + vwc[1] + vwc[2] + vwc[3] + vwc[4] + vwc[5]) / 6.0;
  promedio[1] = (vwc[6] + vwc[7] + vwc[8] + vwc[9] + vwc[10] + vwc[11]) / 6.0;
  promedio[2] = (vwc[12] + vwc[13] + vwc[14] + vwc[15] + vwc[16] + vwc[17]) / 6.0;

  // Log de lecturas (sin cambios)
  Serial.println("─────────────────────────────────────────");
  Serial.println("📊 LECTURAS DE SENSORES");
  Serial.printf("Línea 1 promedio: %.2f%% (Umbral: %.2f%%)\n", promedio[0], umbral_linea1);
  Serial.printf("Línea 2 promedio: %.2f%% (Umbral: %.2f%%)\n", promedio[1], umbral_linea2);
  Serial.printf("Línea 3 promedio: %.2f%% (Umbral: %.2f%%)\n", promedio[2], umbral_linea3);
}
// ****** FIN DE LA FUNCIÓN MODIFICADA ******

// controlarValvulas: Sin cambios
void controlarValvulas() {
  if (promedio[0] < umbral_linea1 && isActiveLine1) {
    digitalWrite(VALV1, HIGH); Serial.println("💧 Válvula 1: ACTIVADA");
  } else {
    digitalWrite(VALV1, LOW);
    if (!isActiveLine1) Serial.println("🚫 Válvula 1: Desactivada (isActive=false)");
  }
  if (promedio[1] < umbral_linea2 && isActiveLine2) {
    digitalWrite(VALV2, HIGH); Serial.println("💧 Válvula 2: ACTIVADA");
  } else {
    digitalWrite(VALV2, LOW);
    if (!isActiveLine2) Serial.println("🚫 Válvula 2: Desactivada (isActive=false)");
  }
  if (promedio[2] < umbral_linea3 && isActiveLine3) {
    digitalWrite(VALV3, HIGH); Serial.println("💧 Válvula 3: ACTIVADA");
  } else {
    digitalWrite(VALV3, LOW);
    if (!isActiveLine3) Serial.println("🚫 Válvula 3: Desactivada (isActive=false)");
  }
}

// ============================================================================
// FUNCIONES DE CONECTIVIDAD - WiFi (Usa ESP8266WiFi.h)
// ============================================================================

// setupWiFi: Sin cambios conceptuales, usa ESP8266WiFi
void setupWiFi() {
  Serial.println("─────────────────────────────────────────");
  Serial.println("📡 INICIANDO CONEXIÓN WiFi (ESP8266)");
  Serial.printf("SSID: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500); Serial.print("."); intentos++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n✅ WiFi conectado exitosamente");
    Serial.print("📶 IP asignada: "); Serial.println(WiFi.localIP());
    Serial.print("📊 Intensidad de señal: "); Serial.print(WiFi.RSSI()); Serial.println(" dBm");
  } else {
    wifiConnected = false;
    Serial.println("\n❌ Error: No se pudo conectar al WiFi");
    Serial.println("⚠️  Verifique las credenciales y la disponibilidad de la red");
  }
}

// verificarConexionWiFi: Sin cambios conceptuales
void verificarConexionWiFi() {
  unsigned long tiempoActual = millis();
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
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
// FUNCIONES DE FIREBASE (Sin cambios conceptuales)
// ============================================================================
void setupFirebase() { /* ... (código original sin cambios) ... */ }
bool verificarFirebase() { /* ... (código original sin cambios) ... */ }
void fetchConfigFromFirestore() { /* ... (código original sin cambios) ... */ }
void fetchLineStatesFromFirestore() { /* ... (código original sin cambios) ... */ }
void sendReadingsToFirestore() { /* ... (código original sin cambios) ... */ }

// ============================================================================
// FUNCIONES DE UTILIDAD - NTP Y TIEMPO (Sin cambios conceptuales)
// ============================================================================
void setupNTP() { /* ... (código original sin cambios) ... */ }
String getCurrentTimestamp() { /* ... (código original sin cambios) ... */ }

// ============================================================================
// SETUP - INICIALIZACIÓN DEL SISTEMA (MODIFICADO)
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n");
  Serial.println("═════════════════════════════════════════");
  Serial.println("  SISTEMA DE RIEGO AUTOMATIZADO v3.2");
  Serial.println("  Wemos D1 R1 + Firebase Firestore");
  Serial.println("═════════════════════════════════════════");
  Serial.println();

  Serial.println("🔧 Configurando hardware...");
  // Pines de control MUX
  pinMode(S0, OUTPUT); pinMode(S1, OUTPUT); pinMode(S2, OUTPUT); pinMode(S3, OUTPUT);
  // *** CAMBIO: Pines Enable MUX ***
  pinMode(MUX1_EN, OUTPUT); pinMode(MUX2_EN, OUTPUT);
  digitalWrite(MUX1_EN, HIGH); // Deshabilitar MUX1 inicialmente
  digitalWrite(MUX2_EN, HIGH); // Deshabilitar MUX2 initially
  // Nota: GPIO16 (D0) necesita HIGH inicial en setup
  pinMode(16, OUTPUT); digitalWrite(16, HIGH);

  // Pin Analógico
  pinMode(SIG_PIN, INPUT); // Configurar A0 como entrada
  // Pines de Válvulas
  pinMode(VALV1, OUTPUT); pinMode(VALV2, OUTPUT); pinMode(VALV3, OUTPUT);
  digitalWrite(VALV1, LOW); digitalWrite(VALV2, LOW); digitalWrite(VALV3, LOW);
  Serial.println("✅ Hardware configurado");

  // El resto del setup sin cambios
  setupWiFi();
  if (!wifiConnected) { /* ... */ return; }
  setupNTP();
  setupFirebase();
  if (!firebaseReady) { /* ... */ return; }
  fetchConfigFromFirestore();
  fetchLineStatesFromFirestore();
  Serial.println();
  Serial.println("═════════════════════════════════════════");
  Serial.println("✅ INICIALIZACIÓN COMPLETADA");
  Serial.println("🚀 Sistema operativo");
  Serial.println("═════════════════════════════════════════");
  Serial.println();
}

// ============================================================================
// LOOP PRINCIPAL (Sin cambios conceptuales)
// ============================================================================
void loop() { /* ... (código original sin cambios) ... */ }

// ============================================================================
// FIN DEL CÓDIGO Y NOTAS
// ============================================================================
/* ... (Notas originales sin cambios significativos, excepto ajustar la placa en punto 5) ... */