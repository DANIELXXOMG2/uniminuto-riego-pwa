/*
  Sistema de Riego - Versión TEST Avanzado (Wemos D1 R1 + 1 MUX + 1 Válvula)
  ---------------------------------------------------------------
  - Lee 6 sensores de humedad (Línea 1) usando UN multiplexor en A0.
  - Calcula el promedio de la línea.
  - Envía las 6 lecturas individuales a Firebase Firestore (sensor-0 a sensor-5).
  - Controla UNA electroválvula (VALV1) basada en el promedio y umbral local.
  - Verifica conexión WiFi y Firebase.
*/

// ============================================================================
// LIBRERÍAS
// ============================================================================
#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ArduinoJson.h>
#include <time.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
#include "config.h" // Incluir tu archivo config.h con credenciales

// ============================================================================
// CONFIGURACIÓN DE HARDWARE - PINES (WEMOS D1 R1)
// ============================================================================
// Multiplexor - Pines de control (S0-S3)
const int S0 = 4;  // Wemos D1 R1 -> D2
const int S1 = 5;  // Wemos D1 R1 -> D1
const int S2 = 14; // Wemos D1 R1 -> D5
const int S3 = 13; // Wemos D1 R1 -> D7

// Multiplexor - Pin de señal analógica
const int SIG_PIN = A0; // Wemos D1 R1 -> A0

// Multiplexor - Pin Enable (Conectado a GND, no se controla por pin)
// const int MUX1_EN = 16; // No necesario si EN está a GND

// Electroválvula - Pin de salida digital
const int VALV1 = 15; // Wemos D1 R1 -> D8 (GPIO15) - Controla Válvula 1
// const int VALV2 = 2; // D4
// const int VALV3 = 12; // D6

// ============================================================================
// VARIABLES GLOBALES
// ============================================================================
// Configuración local (eventualmente leer de Firebase)
float umbral_linea1 = 30.0; // Umbral de humedad línea 1 (%)
unsigned long intervaloLectura = 60000; // Intervalo reducido a 1 minuto para pruebas

// Arrays para almacenar lecturas (solo 6 sensores)
float vwc[6];       // Valores de %VWC de los 6 sensores
float promedio_l1 = 0.0; // Promedio solo para la línea 1

unsigned long tiempoAnteriorLectura = 0;

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
bool wifiConnected = false;
bool firebaseReady = false;
unsigned long tiempoReconexionWiFi = 0;
const unsigned long intervaloReconexionWiFi = 30000;

// IDs de sensores - Solo usaremos los primeros 6 para la prueba
const String sensorIds[18] = {
  "sensor-000", "sensor-001", "sensor-002", "sensor-003", "sensor-004", "sensor-005",
  "sensor-006", "sensor-007", "sensor-008", "sensor-009", "sensor-010", "sensor-011",
  "sensor-012", "sensor-013", "sensor-014", "sensor-015", "sensor-016", "sensor-017"
};
// const String lineIds[3] = { "linea-1", "linea-2", "linea-3" };

// ============================================================================
// FUNCIONES DE HARDWARE (REACTIVADAS PARCIALMENTE)
// ============================================================================

// setChannel: Reactivado
void setChannel(int channel) {
  digitalWrite(S0, channel & 0x01);
  digitalWrite(S1, (channel >> 1) & 0x01);
  digitalWrite(S2, (channel >> 2) & 0x01);
  digitalWrite(S3, (channel >> 3) & 0x01);
}

// calcularVWC: Sin cambios
float calcularVWC(int lectura) {
  float VWC = -0.000049 * pow(lectura, 2) - 0.0016 * lectura + 47.9;
  if (VWC < 0) VWC = 0; if (VWC > 100) VWC = 100;
  return VWC;
}

// ****** ¡FUNCIÓN MODIFICADA PARA 6 SENSORES CON 1 MUX! ******
void leerSensores() {
  float suma_l1 = 0.0;

  Serial.println("─────────────────────────────────────────");
  Serial.println("📊 LEYENDO SENSORES LÍNEA 1 (0-5)");

  // Asumimos que MUX EN está conectado a GND (siempre habilitado)
  // digitalWrite(MUX1_EN, LOW); // No necesario si está cableado a GND

  for (int canal = 0; canal < 6; canal++) { // Leer solo los primeros 6 canales
    setChannel(canal);
    delayMicroseconds(100); // Pausa para estabilización
    int lectura = analogRead(SIG_PIN);
    vwc[canal] = calcularVWC(lectura); // Guardar en el array vwc
    suma_l1 += vwc[canal];
    Serial.printf("  Sensor %d (Canal %d): %d -> %.2f%%\n", canal, canal, lectura, vwc[canal]);
  }

  // digitalWrite(MUX1_EN, HIGH); // No necesario si está cableado a GND

  // Calcular promedio
  promedio_l1 = suma_l1 / 6.0;

  Serial.printf("Línea 1 promedio: %.2f%% (Umbral: %.2f%%)\n", promedio_l1, umbral_linea1);
}
// ****** FIN DE LA FUNCIÓN MODIFICADA ******

// ****** ¡FUNCIÓN REACTIVADA PARA 1 VÁLVULA! ******
void controlarValvulas() {
  // Solo controla la Válvula 1 basada en el promedio de la Línea 1
  // Asumimos isActive = true para esta prueba (no se lee de Firebase)
  if (promedio_l1 < umbral_linea1) {
    digitalWrite(VALV1, HIGH);
    Serial.println("💧 Válvula 1: ACTIVADA (Humedad baja)");
  } else {
    digitalWrite(VALV1, LOW);
    Serial.println("🚫 Válvula 1: DESACTIVADA (Humedad OK)");
  }
  // Lógica para Válvulas 2 y 3 no aplica en esta prueba
}
// ****** FIN DE LA FUNCIÓN REACTIVADA ******


// ============================================================================
// FUNCIONES DE CONECTIVIDAD - WiFi (Sin cambios)
// ============================================================================
void setupWiFi() { /* ... (código anterior sin cambios) ... */ }
void verificarConexionWiFi() { /* ... (código anterior sin cambios) ... */ }

// ============================================================================
// FUNCIONES DE FIREBASE - AUTENTICACIÓN Y CONFIGURACIÓN (Sin cambios)
// ============================================================================
void setupFirebase() { /* ... (código anterior sin cambios) ... */ }
bool verificarFirebase() { /* ... (código anterior sin cambios) ... */ }

// ============================================================================
// FUNCIONES DE FIREBASE - ENVÍO DE DATOS (MODIFICADA PARA 6 SENSORES)
// ============================================================================
// ****** ¡FUNCIÓN MODIFICADA PARA ENVIAR 6 SENSORES! ******
void sendReadingsToFirestore() {
  if (!verificarFirebase()) {
    Serial.println("⚠️  No se puede enviar lecturas: Firebase no está listo");
    return;
  }

  Serial.println("─────────────────────────────────────────");
  Serial.println("📤 ENVIANDO LECTURAS (SENSORES 0-5) A FIRESTORE");

  time_t now = time(nullptr); // Obtener timestamp actual

  // Enviar lectura de cada uno de los 6 sensores leídos
  for (int i = 0; i < 6; i++) {
    String collectionPath = "sensors/" + sensorIds[i] + "/readings";

    FirebaseJson content;
    content.set("fields/timestamp/mapValue/fields/seconds/integerValue", String(now));
    content.set("fields/valueVWC/doubleValue", vwc[i]); // Usar el valor del array vwc

    // Enviar a Firestore
    if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "",
                                          collectionPath.c_str(), content.raw())) {
      Serial.printf("  ✅ Sensor %s: %.2f%% enviado\n", sensorIds[i].c_str(), vwc[i]);
    } else {
      Serial.printf("  ❌ Error al enviar %s: %s\n",
                    sensorIds[i].c_str(), fbdo.errorReason().c_str());
    }
    delay(50); // Pequeña pausa entre envíos
  }
   Serial.println("✅ Envío de 6 lecturas completado");
}
// ****** FIN DE LA FUNCIÓN MODIFICADA ******

// ============================================================================
// FUNCIONES DE UTILIDAD - NTP Y TIEMPO (Sin cambios)
// ============================================================================
void setupNTP() { /* ... (código anterior sin cambios) ... */ }

// ============================================================================
// SETUP - INICIALIZACIÓN DEL SISTEMA (MODIFICADO)
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n");
  Serial.println("═════════════════════════════════════════");
  Serial.println("  SISTEMA DE RIEGO - TEST (1 MUX + 1 Válvula)");
  Serial.println("  Wemos D1 R1 + Firebase Firestore");
  Serial.println("═════════════════════════════════════════");
  Serial.println();

  Serial.println("🔧 Configurando hardware...");
  // Pines de control MUX
  pinMode(S0, OUTPUT); pinMode(S1, OUTPUT); pinMode(S2, OUTPUT); pinMode(S3, OUTPUT);
  // Pin Analógico MUX
  pinMode(SIG_PIN, INPUT);
  // Pin Válvula 1
  pinMode(VALV1, OUTPUT);
  digitalWrite(VALV1, LOW); // Asegurar que la válvula empiece cerrada
  Serial.println("✅ Hardware configurado");

  // El resto del setup sin cambios
  setupWiFi();
  if (!wifiConnected) { Serial.println("❌ ADVERTENCIA: Iniciando sin WiFi. Deteniendo."); while(1) delay(1000); }
  setupNTP();
  setupFirebase();
  if (!firebaseReady) { Serial.println("❌ ADVERTENCIA: Iniciando sin Firebase. Deteniendo."); while(1) delay(1000); }

  Serial.println();
  Serial.println("═════════════════════════════════════════");
  Serial.println("✅ INICIALIZACIÓN COMPLETADA (TEST 1 MUX)");
  Serial.println("🚀 Sistema operativo");
  Serial.println("═════════════════════════════════════════");
  Serial.println();
}

// ============================================================================
// LOOP PRINCIPAL (MODIFICADO)
// ============================================================================
void loop() {
  unsigned long tiempoActual = millis();

  verificarConexionWiFi(); // Siempre verificar WiFi

  // LECTURA, CONTROL Y ENVÍO según intervalo
  if (tiempoActual - tiempoAnteriorLectura >= intervaloLectura) {
    tiempoAnteriorLectura = tiempoActual;

    Serial.println("\n═════════════════════════════════════════");
    Serial.println("🔄 CICLO LECTURA/CONTROL/ENVÍO (TEST 1 MUX)");
    Serial.println("═════════════════════════════════════════");

    leerSensores();       // Leer los 6 sensores
    controlarValvulas(); // Controlar la Válvula 1

    if (wifiConnected && firebaseReady) {
      sendReadingsToFirestore(); // Enviar las 6 lecturas a Firestore
    } else {
      Serial.println("⚠️  WiFi o Firebase no disponible - Lecturas no enviadas");
    }

    Serial.println("═════════════════════════════════════════");
    Serial.printf("⏱️  Próxima lectura en: %.1f segundos\n", intervaloLectura / 1000.0);
    Serial.println("═════════════════════════════════════════\n");
  }

  delay(10); // Pequeña pausa
}