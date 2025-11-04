/*
  Sistema de Riego - Versión 1.2 (Wemos D1 R1 - 1 Sensor + 1 Válvula Controlada por irrigationLines)
  -------------------------------------------------------------------------------------------------
  - Lee UN SOLO sensor de humedad conectado directamente a A0.
  - Envía la lectura de ese sensor a Firebase Firestore (usando formato sensor-000).
  - Controla UNA electroválvula (conectada a un relé en D5).
  - <<< MODIFICADO: Lee el estado deseado desde un documento en la colección 'irrigationLines', campo 'isActive'.
  - Verifica conexión WiFi y Firebase.
  - NO usa multiplexores.
*/

// ============================================================================
// LIBRERÍAS (Sin cambios)
// ============================================================================
#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ArduinoJson.h>
#include <time.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// ============================================================================
// CONFIGURACIÓN (Sin cambios)
// ============================================================================
#include "config.h"

// ============================================================================
// CONFIGURACIÓN DE HARDWARE - PINES (Sin cambios)
// ============================================================================
const int SENSOR_PIN = A0;
const int VALVULA_PIN = D5;

// ============================================================================
// VARIABLES GLOBALES (Path Modificado)
// ============================================================================
unsigned long intervaloLectura = 60000;
unsigned long intervaloControl = 10000;
float vwc_sensor_test = 0.0;
bool estadoActualValvula = false;

unsigned long tiempoAnteriorLectura = 0;
unsigned long tiempoAnteriorControl = 0;

FirebaseData fbdo;
FirebaseData fbdoControl;
FirebaseAuth auth;
FirebaseConfig config;
bool wifiConnected = false;
bool firebaseReady = false;
unsigned long tiempoReconexionWiFi = 0;
const unsigned long intervaloReconexionWiFi = 30000;

const String sensorIds[18] = {
  "sensor-000", "sensor-001", "sensor-002", "sensor-003", "sensor-004", "sensor-005",
  "sensor-006", "sensor-007", "sensor-008", "sensor-009", "sensor-010", "sensor-011",
  "sensor-012", "sensor-013", "sensor-014", "sensor-015", "sensor-016", "sensor-017"
};

// <<< MODIFICADO: Path apunta al documento específico de la línea de riego
//     DEBES REEMPLAZAR "YOUR_LINE_DOCUMENT_ID" con el ID real del documento
//     que controla esta válvula (ej: "2toMnCDbtYFDcxGVhSwX")
const String controlPath = "irrigationLines/test-line-1";

// ============================================================================
// FUNCIONES DE HARDWARE (Sin cambios)
// ============================================================================
float calcularVWC(int lectura) {
  float VWC = -0.000049 * pow(lectura, 2) - 0.0016 * lectura + 47.9;
  if (VWC < 0) VWC = 0; if (VWC > 100) VWC = 100;
  return VWC;
}

void leerSensores() {
  int lectura = analogRead(SENSOR_PIN);
  vwc_sensor_test = calcularVWC(lectura);
  Serial.println("─────────────────────────────────────────");
  Serial.println("📊 LECTURA SENSOR DE PRUEBA");
  Serial.printf("Sensor en A0: %d -> %.2f%%\n", lectura, vwc_sensor_test);
}

void actualizarEstadoValvula(bool encender) {
  if (encender && !estadoActualValvula) {
    Serial.println("   ⚡️ ENCENDIENDO VÁLVULA (Pin LOW)");
    digitalWrite(VALVULA_PIN, LOW);
    estadoActualValvula = true;
  } else if (!encender && estadoActualValvula) {
    Serial.println("   🛑 APAGANDO VÁLVULA (Pin HIGH)");
    digitalWrite(VALVULA_PIN, HIGH);
    estadoActualValvula = false;
  }
}

// ============================================================================
// FUNCIONES DE CONECTIVIDAD - WiFi (Sin cambios)
// ============================================================================
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
// FUNCIONES DE FIREBASE - AUTENTICACIÓN Y CONFIGURACIÓN (Sin cambios)
// ============================================================================
void setupFirebase() {
  Serial.println("─────────────────────────────────────────");
  Serial.println("🔥 CONFIGURANDO FIREBASE");

  config.api_key = FIREBASE_API_KEY;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.database_url = FIREBASE_HOST;
  config.token_status_callback = tokenStatusCallback;

  Firebase.reconnectWiFi(true);
  Firebase.begin(&config, &auth);

  Serial.println("⏳ Autenticando con Firebase...");
  int intentos = 0;
  while (!Firebase.ready() && intentos < 20) {
    delay(500); Serial.print("."); intentos++;
  }

  if (Firebase.ready()) {
    firebaseReady = true;
    Serial.println("\n✅ Firebase autenticado exitosamente");
    Serial.printf("👤 Usuario: %s\n", USER_EMAIL);
  } else {
    firebaseReady = false;
    Serial.println("\n❌ Error: No se pudo autenticar con Firebase");
    Serial.println("⚠️  Verifique las credenciales y la configuración del proyecto");
    Serial.printf("   Error: %s\n", fbdo.errorReason().c_str());
  }
}

bool verificarFirebase() {
  if (!wifiConnected) return false;
  if (!Firebase.ready()) {
    firebaseReady = false;
    Serial.println("⚠️  Firebase no está listo.");
    return false;
  } else {
    if (!firebaseReady) Serial.println("✅ Firebase reconectado/listo.");
    firebaseReady = true;
    return true;
  }
}

// ============================================================================
// FUNCIONES DE FIREBASE - ENVÍO DE DATOS (Sin cambios)
// ============================================================================
void sendReadingsToFirestore() {
  if (!verificarFirebase()) {
    Serial.println("⚠️  No se puede enviar lecturas: Firebase no está listo");
    return;
  }

  Serial.println("─────────────────────────────────────────");
  Serial.println("📤 ENVIANDO LECTURA DE SENSOR A FIRESTORE");

  time_t now = time(nullptr);
  String collectionPath = "sensors/" + sensorIds[0] + "/readings"; // Usa sensor-000

  FirebaseJson content;
  content.set("fields/timestamp/mapValue/fields/seconds/integerValue", String(now));
  content.set("fields/valueVWC/doubleValue", vwc_sensor_test);

  if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "",
                                        collectionPath.c_str(), content.raw())) {
    Serial.printf("  ✅ Sensor %s: %.2f%% enviado\n", sensorIds[0].c_str(), vwc_sensor_test);
  } else {
    Serial.printf("  ❌ Error al enviar %s: %s\n",
                  sensorIds[0].c_str(), fbdo.errorReason().c_str());
  }
}

// ============================================================================
// <<< MODIFICADO: FUNCIONES DE FIREBASE - LECTURA DE CONTROL (isActive)
// ============================================================================
void leerEstadoValvulaFirebase() {
  if (!verificarFirebase()) {
    Serial.println("⚠️  No se puede leer control: Firebase no está listo");
    return;
  }

  Serial.println("─────────────────────────────────────────");
  Serial.println("📥 LEYENDO ESTADO DESEADO DE VÁLVULA (irrigationLines)");
  Serial.printf("   Consultando Documento: %s\n", controlPath.c_str());

  // Intentar obtener el documento
  if (Firebase.Firestore.getDocument(&fbdoControl, FIREBASE_PROJECT_ID, "", controlPath.c_str())) {
    Serial.printf("   Documento recibido. Payload: %s\n", fbdoControl.payload().c_str());

    // Parsear el JSON recibido
    FirebaseJson js;
    js.setJsonData(fbdoControl.payload());
    FirebaseJsonData result;

    // <<< MODIFICADO: Buscar el campo 'isActive' de tipo booleano
    if (js.get(result, "fields/isActive/booleanValue")) {
      bool estadoDeseadoBool = result.boolValue; // Obtener el valor booleano
      Serial.printf("   Estado deseado leído (isActive): %s\n", estadoDeseadoBool ? "true (ENCENDER)" : "false (APAGAR)");

      // Actuar directamente con el booleano
      actualizarEstadoValvula(estadoDeseadoBool); // true -> encender, false -> apagar

    } else {
      Serial.println("   ⚠️  No se encontró el campo 'isActive' (tipo booleanValue) en el documento.");
      // Considera apagar por seguridad si el campo no existe
      // actualizarEstadoValvula(false);
    }
  } else {
    Serial.printf("   ❌ Error al leer documento de control: %s\n", fbdoControl.errorReason().c_str());
    // Considera apagar por seguridad si no puedes leer el estado
    // actualizarEstadoValvula(false);
  }
}


// ============================================================================
// FUNCIONES DE UTILIDAD - NTP Y TIEMPO (Sin cambios)
// ============================================================================
void setupNTP() {
  Serial.println("─────────────────────────────────────────");
  Serial.println("🕐 SINCRONIZANDO HORA CON NTP");
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);

  Serial.print("⏳ Esperando sincronización NTP");
  time_t now = time(nullptr);
  int intentos = 0;
  while (now < 1000000000 && intentos < 20) {
    delay(500); Serial.print("."); now = time(nullptr); intentos++;
  }

  if (now >= 1000000000) {
    Serial.println("\n✅ Hora sincronizada exitosamente");
    struct tm timeinfo;
    localtime_r(&now, &timeinfo);
    Serial.print("📅 Fecha y hora actual: ");
    Serial.print(asctime(&timeinfo));
  } else {
    Serial.println("\n⚠️  Advertencia: No se pudo sincronizar la hora con NTP");
    Serial.println("⚠️  Los timestamps podrían ser incorrectos");
  }
}

// ============================================================================
// SETUP - INICIALIZACIÓN DEL SISTEMA (Sin cambios)
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n");
  Serial.println("═════════════════════════════════════════");
  Serial.println("  SISTEMA DE RIEGO - V1.2 (Sensor + Control irrigationLines)"); // <<< MODIFICADO
  Serial.println("  Wemos D1 R1 + Firebase Firestore");
  Serial.println("═════════════════════════════════════════");
  Serial.println();

  Serial.println("🔧 Configurando hardware...");
  pinMode(SENSOR_PIN, INPUT);
  pinMode(VALVULA_PIN, OUTPUT);
  digitalWrite(VALVULA_PIN, HIGH);
  estadoActualValvula = false;
  Serial.println("✅ Hardware configurado");

  setupWiFi();
  if (!wifiConnected) { Serial.println("❌ ADVERTENCIA: Iniciando sin WiFi. Deteniendo."); while(1) delay(1000); }

  setupNTP();
  setupFirebase();
  if (!firebaseReady) { Serial.println("❌ ADVERTENCIA: Iniciando sin Firebase. Deteniendo."); while(1) delay(1000); }

  Serial.println();
  Serial.println("═════════════════════════════════════════");
  Serial.println("✅ INICIALIZACIÓN COMPLETADA");
  Serial.println("🚀 Sistema operativo");
  Serial.println("═════════════════════════════════════════");
  Serial.println();
}

// ============================================================================
// LOOP PRINCIPAL (Sin cambios)
// ============================================================================
void loop() {
  unsigned long tiempoActual = millis();

  verificarConexionWiFi();

  // --- Ciclo de Lectura y Envío de Sensor ---
  if (tiempoActual - tiempoAnteriorLectura >= intervaloLectura) {
    tiempoAnteriorLectura = tiempoActual;
    Serial.println("\n===== CICLO LECTURA SENSOR =====");

    leerSensores();

    if (wifiConnected && verificarFirebase()) {
      sendReadingsToFirestore();
    } else {
      Serial.println("⚠️  WiFi/Firebase no disponible - Lectura no enviada");
    }
    Serial.printf("⏱️  Próxima lectura sensor en: %.1f seg\n", intervaloLectura / 1000.0);
    Serial.println("==============================\n");
  }

  // --- Ciclo de Verificación de Control de Válvula ---
  if (tiempoActual - tiempoAnteriorControl >= intervaloControl) {
    tiempoAnteriorControl = tiempoActual;
    Serial.println("\n===== CICLO CONTROL VÁLVULA =====");

    if (wifiConnected && verificarFirebase()) {
      leerEstadoValvulaFirebase(); // <<< Usa la versión modificada
    } else {
      Serial.println("⚠️  WiFi/Firebase no disponible - No se puede verificar control");
    }
     Serial.printf("⏱️  Próxima verificación control en: %.1f seg\n", intervaloControl / 1000.0);
     Serial.println("===============================\n");
  }

  delay(10);
}