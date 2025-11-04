/*
  Sistema de Riego - Versión 1.3 (Wemos D1 R1 - 1 Sensor + Electroválvula)
  -----------------------------------------------------------------------
  - Lee UN SOLO sensor de humedad conectado directamente a A0.
  - Envía la lectura de ese sensor a Firebase Firestore (sensor-000).
  - Controla UNA electroválvula conectada a un relé en D5.
  - Lee el estado deseado desde irrigationLines/test-line-1 (campo isActive).
  - Verifica conexión WiFi y Firebase.
  - NO usa multiplexores.
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
// CONFIGURACIÓN DE HARDWARE - PINES
// ============================================================================
const int SENSOR_PIN = A0;    // Pin analógico para el sensor de humedad
const int VALVULA_PIN = D5;   // Pin digital para controlar el relé de la electroválvula

// ============================================================================
// VARIABLES GLOBALES
// ============================================================================
unsigned long intervaloLectura = 60000;  // Intervalo de lectura de sensor (1 minuto)
unsigned long intervaloControl = 10000;  // Intervalo de verificación de control (10 segundos)
float vwc_sensor_test = 0.0;             // Variable para la lectura del sensor
bool estadoActualValvula = false;        // Estado actual de la válvula

unsigned long tiempoAnteriorLectura = 0;
unsigned long tiempoAnteriorControl = 0;

FirebaseData fbdo;
FirebaseData fbdoControl;  // FirebaseData adicional para lectura de control
FirebaseAuth auth;
FirebaseConfig config;
bool wifiConnected = false;
bool firebaseReady = false;
unsigned long tiempoReconexionWiFi = 0;
const unsigned long intervaloReconexionWiFi = 30000;

// Path del documento de control en irrigationLines
const String controlPath = "irrigationLines/test-line-1";

// IDs de sensores - Formato con padding de 3 dígitos (sensor-000 a sensor-017)
const String sensorIds[18] = {
  "sensor-000", "sensor-001", "sensor-002", "sensor-003", "sensor-004", "sensor-005",
  "sensor-006", "sensor-007", "sensor-008", "sensor-009", "sensor-010", "sensor-011",
  "sensor-012", "sensor-013", "sensor-014", "sensor-015", "sensor-016", "sensor-017"
};

// Configuración de líneas (3 líneas de 6 sensores cada una)
const String lineIds[3] = { "linea-1", "linea-2", "linea-3" };

// Nombres de sensores (6 sensores por línea, 3 líneas = 18 sensores)
const String sensorTitles[18] = {
  // Línea 1 (sensores 0-5)
  "Sensor Pasillo 1", "Sensor Pasillo 2", "Sensor Pasillo 3",
  "Sensor Pasillo 4", "Sensor Pasillo 5", "Sensor Pasillo 6",
  // Línea 2 (sensores 6-11)
  "Sensor Área 2-1", "Sensor Área 2-2", "Sensor Área 2-3",
  "Sensor Área 2-4", "Sensor Área 2-5", "Sensor Área 2-6",
  // Línea 3 (sensores 12-17)
  "Sensor Área 3-1", "Sensor Área 3-2", "Sensor Área 3-3",
  "Sensor Área 3-4", "Sensor Área 3-5", "Sensor Área 3-6"
};

// Función para obtener el lineId de un sensor (0-5=linea-1, 6-11=linea-2, 12-17=linea-3)
String getLineIdForSensor(int sensorIndex) {
  if (sensorIndex < 6) return lineIds[0];  // linea-1
  if (sensorIndex < 12) return lineIds[1]; // linea-2
  return lineIds[2];                        // linea-3
}

// ============================================================================
// FUNCIONES DE HARDWARE
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

// Función para actualizar el estado de la electroválvula
void actualizarEstadoValvula(bool encender) {
  if (encender && !estadoActualValvula) {
    Serial.println("   ⚡️ ENCENDIENDO VÁLVULA (Relé Pin LOW)");
    digitalWrite(VALVULA_PIN, LOW);  // Relé se activa con LOW
    estadoActualValvula = true;
  } else if (!encender && estadoActualValvula) {
    Serial.println("   🛑 APAGANDO VÁLVULA (Relé Pin HIGH)");
    digitalWrite(VALVULA_PIN, HIGH);  // Relé se desactiva con HIGH
    estadoActualValvula = false;
  }
  // Si el estado deseado es igual al actual, no hacer nada
}

// ============================================================================
// FUNCIONES DE CONECTIVIDAD - WiFi
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
      setupWiFi(); // Reintentar conexión
    }
  } else {
    if (!wifiConnected) { // Si estaba desconectado pero ahora conecta
      wifiConnected = true;
      Serial.println("✅ WiFi reconectado");
      // Podrías forzar una resincronización con Firebase aquí si fuera necesario
      // setupFirebase(); // Ojo: Llamar setupFirebase de nuevo puede ser problemático
    }
  }
}

// ============================================================================
// FUNCIONES DE FIREBASE - AUTENTICACIÓN Y CONFIGURACIÓN
// ============================================================================
void setupFirebase() {
  Serial.println("─────────────────────────────────────────");
  Serial.println("🔥 CONFIGURANDO FIREBASE");

  config.api_key = FIREBASE_API_KEY;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.database_url = FIREBASE_HOST;
  config.token_status_callback = tokenStatusCallback; // Función de TokenHelper.h

  Firebase.reconnectWiFi(true);
  Firebase.begin(&config, &auth);

  Serial.println("⏳ Autenticando con Firebase...");
  int intentos = 0;
  while (!Firebase.ready() && intentos < 20) { // Firebase.ready() verifica la autenticación
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
    Serial.printf("   Error: %s\n", fbdo.errorReason().c_str()); // Mostrar razón del error
  }
}

// *** FUNCIÓN CORREGIDA ***
bool verificarFirebase() {
  if (!wifiConnected) {
    return false; // No hay WiFi, imposible verificar Firebase
  }

  if (!Firebase.ready()) {
    firebaseReady = false;
    Serial.println("⚠️  Firebase no está listo. Token podría haber expirado o reconectando...");
    // La librería intenta manejar la renovación automáticamente.
    // Si falla repetidamente, puede haber un problema de credenciales o red.
    return false; // <<< --- RETORNO FALTANTE AÑADIDO --- <<<
  } else {
    // Si estaba marcado como no listo pero ahora sí lo está
    if (!firebaseReady) {
        Serial.println("✅ Firebase reconectado/listo.");
    }
    firebaseReady = true;
    return true;
  }
}

// ============================================================================
// FUNCIONES DE FIREBASE - ENVÍO DE DATOS
// ============================================================================
void sendReadingsToFirestore() {
  if (!verificarFirebase()) {
    Serial.println("⚠️  No se puede enviar lecturas: Firebase no está listo");
    return;
  }

  Serial.println("─────────────────────────────────────────");
  Serial.println("📤 ENVIANDO LECTURA A FIRESTORE");

  time_t now = time(nullptr); // Obtener timestamp actual (requiere NTP)
  
  // Solo enviamos para sensor-000 en esta versión de prueba
  int sensorIndex = 0;
  String sensorId = sensorIds[sensorIndex];
  String lineId = getLineIdForSensor(sensorIndex);
  String title = sensorTitles[sensorIndex];

  // 1. Actualizar/crear el documento del sensor con metadata
  String sensorDocPath = "sensors/" + sensorId;
  
  FirebaseJson sensorDoc;
  sensorDoc.set("fields/lineId/stringValue", lineId);
  sensorDoc.set("fields/status/stringValue", "active");
  sensorDoc.set("fields/title/stringValue", title);
  
  Serial.printf("📝 Actualizando documento sensor: %s\n", sensorId.c_str());
  Serial.printf("   - lineId: %s\n", lineId.c_str());
  Serial.printf("   - status: active\n");
  Serial.printf("   - title: %s\n", title.c_str());
  
  // Usar patchDocument para actualizar solo estos campos sin borrar otros
  if (Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "",
                                       sensorDocPath.c_str(), sensorDoc.raw(),
                                       "lineId,status,title")) {
    Serial.printf("  ✅ Documento %s actualizado\n", sensorId.c_str());
  } else {
    Serial.printf("  ⚠️  Error al actualizar documento: %s\n", fbdo.errorReason().c_str());
    // Intentar crear el documento si no existe
    if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "",
                                          sensorDocPath.c_str(), sensorDoc.raw())) {
      Serial.printf("  ✅ Documento %s creado\n", sensorId.c_str());
    } else {
      Serial.printf("  ❌ Error al crear documento: %s\n", fbdo.errorReason().c_str());
    }
  }

  // 2. Crear la lectura en la subcolección readings
  String collectionPath = sensorDocPath + "/readings";
  
  FirebaseJson content;
  content.set("fields/timestamp/mapValue/fields/seconds/integerValue", String(now));
  content.set("fields/valueVWC/doubleValue", vwc_sensor_test);

  Serial.printf("📊 Creando lectura: %.2f%% VWC\n", vwc_sensor_test);
  
  if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "",
                                        collectionPath.c_str(), content.raw())) {
    Serial.printf("  ✅ Lectura enviada exitosamente\n");
  } else {
    Serial.printf("  ❌ Error al enviar lectura: %s\n", fbdo.errorReason().c_str());
  }
}

// ============================================================================
// FUNCIONES DE FIREBASE - LECTURA DE CONTROL (isActive)
// ============================================================================
void leerEstadoValvulaFirebase() {
  if (!verificarFirebase()) {
    Serial.println("⚠️  No se puede leer control: Firebase no está listo");
    return;
  }

  Serial.println("─────────────────────────────────────────");
  Serial.println("📥 LEYENDO ESTADO DE VÁLVULA (irrigationLines)");
  Serial.printf("   Documento: %s\n", controlPath.c_str());

  // Obtener el documento de control
  if (Firebase.Firestore.getDocument(&fbdoControl, FIREBASE_PROJECT_ID, "", 
                                     controlPath.c_str())) {
    Serial.printf("   Documento recibido. Payload: %s\n", fbdoControl.payload().c_str());

    // Parsear el JSON recibido
    FirebaseJson js;
    js.setJsonData(fbdoControl.payload());
    FirebaseJsonData result;

    // Buscar el campo 'isActive' de tipo booleano
    if (js.get(result, "fields/isActive/booleanValue")) {
      bool estadoDeseado = result.boolValue;
      Serial.printf("   Estado deseado (isActive): %s\n", 
                    estadoDeseado ? "true (ENCENDER)" : "false (APAGAR)");

      // Actualizar el estado de la válvula
      actualizarEstadoValvula(estadoDeseado);

    } else {
      Serial.println("   ⚠️  No se encontró el campo 'isActive' en el documento");
      // Por seguridad, apagar la válvula si no se puede leer el estado
      actualizarEstadoValvula(false);
    }
  } else {
    Serial.printf("   ❌ Error al leer documento: %s\n", 
                  fbdoControl.errorReason().c_str());
    // Por seguridad, apagar la válvula si hay error
    actualizarEstadoValvula(false);
  }
}

// ============================================================================
// FUNCIONES DE UTILIDAD - NTP Y TIEMPO
// ============================================================================
void setupNTP() {
  Serial.println("─────────────────────────────────────────");
  Serial.println("🕐 SINCRONIZANDO HORA CON NTP");

  // Configurar NTP (asegúrate que GMT_OFFSET_SEC, etc. estén en config.h)
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);

  Serial.print("⏳ Esperando sincronización NTP");
  time_t now = time(nullptr);
  int intentos = 0;
  // Esperar hasta que el tiempo sea válido (mayor que un timestamp de inicio conocido)
  while (now < 1000000000 && intentos < 20) { // Espera hasta aprox. 2001
    delay(500); Serial.print("."); now = time(nullptr); intentos++;
  }

  if (now >= 1000000000) {
    Serial.println("\n✅ Hora sincronizada exitosamente");
    struct tm timeinfo;
    localtime_r(&now, &timeinfo);
    Serial.print("📅 Fecha y hora actual: ");
    Serial.print(asctime(&timeinfo)); // Imprime la fecha y hora formateada
  } else {
    Serial.println("\n⚠️  Advertencia: No se pudo sincronizar la hora con NTP");
    Serial.println("⚠️  Los timestamps podrían ser incorrectos");
  }
}

// ============================================================================
// SETUP - INICIALIZACIÓN DEL SISTEMA
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n");
  Serial.println("═════════════════════════════════════════");
  Serial.println("  SISTEMA DE RIEGO - V1.3");
  Serial.println("  1 Sensor + Electroválvula Controlada");
  Serial.println("  Wemos D1 R1 + Firebase Firestore");
  Serial.println("═════════════════════════════════════════");
  Serial.println();

  Serial.println("🔧 Configurando hardware...");
  pinMode(SENSOR_PIN, INPUT);           // Configurar pin del sensor
  pinMode(VALVULA_PIN, OUTPUT);         // Configurar pin de la válvula
  digitalWrite(VALVULA_PIN, HIGH);      // Iniciar con válvula apagada (relé HIGH = OFF)
  estadoActualValvula = false;
  Serial.println("✅ Hardware configurado (Sensor + Válvula)");

  setupWiFi();
  if (!wifiConnected) { 
    Serial.println("❌ ADVERTENCIA: Iniciando sin WiFi. Deteniendo."); 
    while(1) delay(1000); 
  }

  setupNTP();

  setupFirebase();
  if (!firebaseReady) { 
    Serial.println("❌ ADVERTENCIA: Iniciando sin Firebase. Deteniendo."); 
    while(1) delay(1000); 
  }

  Serial.println();
  Serial.println("═════════════════════════════════════════");
  Serial.println("✅ INICIALIZACIÓN COMPLETADA");
  Serial.println("🚀 Sistema operativo");
  Serial.println("   - Leyendo sensor cada 60 seg");
  Serial.println("   - Verificando control cada 10 seg");
  Serial.println("═════════════════════════════════════════");
  Serial.println();
}

// ============================================================================
// LOOP PRINCIPAL
// ============================================================================
void loop() {
  unsigned long tiempoActual = millis();

  verificarConexionWiFi(); // Verificar y reconectar WiFi si es necesario

  // --- CICLO DE LECTURA Y ENVÍO DE SENSOR ---
  if (tiempoActual - tiempoAnteriorLectura >= intervaloLectura) {
    tiempoAnteriorLectura = tiempoActual;

    Serial.println("\n═════════════════════════════════════════");
    Serial.println("🔄 CICLO DE LECTURA SENSOR");
    Serial.println("═════════════════════════════════════════");

    leerSensores(); // Leer el sensor

    if (wifiConnected && firebaseReady) {
      sendReadingsToFirestore(); // Enviar la lectura a Firestore
    } else {
      Serial.println("⚠️  WiFi o Firebase no disponible - Lectura no enviada");
    }

    Serial.println("═════════════════════════════════════════");
    Serial.printf("⏱️  Próxima lectura en: %.1f segundos\n", intervaloLectura / 1000.0);
    Serial.println("═════════════════════════════════════════\n");
  }

  // --- CICLO DE VERIFICACIÓN DE CONTROL DE VÁLVULA ---
  if (tiempoActual - tiempoAnteriorControl >= intervaloControl) {
    tiempoAnteriorControl = tiempoActual;

    Serial.println("\n═════════════════════════════════════════");
    Serial.println("🔄 CICLO DE CONTROL VÁLVULA");
    Serial.println("═════════════════════════════════════════");

    if (wifiConnected && verificarFirebase()) {
      leerEstadoValvulaFirebase(); // Leer y aplicar estado desde Firebase
    } else {
      Serial.println("⚠️  WiFi/Firebase no disponible - No se puede verificar control");
    }

    Serial.println("═════════════════════════════════════════");
    Serial.printf("⏱️  Próxima verificación en: %.1f segundos\n", intervaloControl / 1000.0);
    Serial.println("═════════════════════════════════════════\n");
  }

  delay(10); // Pequeña pausa para estabilidad
}