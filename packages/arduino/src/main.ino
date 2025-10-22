/*
  Sistema de Riego Automatizado - Arduino UNO + ESP-12F (ESP8266)
  ---------------------------------------------------------------
  - Plataforma: Arduino UNO + módulo ESP-12F vía comandos AT
  - Lee 18 sensores de humedad usando 2 multiplexores 16:1
  - Envía datos al endpoint /api/ingest (Vercel/Next.js)
  - Control local de válvulas basado en umbrales
  - Usa temporizadores no bloqueantes (millis())
  ---------------------------------------------------------------
  HARDWARE REQUERIDO:
  - Arduino UNO
  - Módulo ESP-12F (ESP8266) con firmware AT
  - 2 Multiplexores CD74HC4067 (16:1)
  - 18 Sensores de humedad capacitivos
  - 3 Electroválvulas con relés
  
  LIBRERÍAS REQUERIDAS:
  - SoftwareSerial (incluida en Arduino IDE)
  - ArduinoJson (instalar desde Library Manager)
  
  CONEXIONES:
  - ESP8266 RX -> Arduino Pin 3 (TX)
  - ESP8266 TX -> Arduino Pin 2 (RX)
  - Multiplexores S0-S3 -> Arduino Pins 4-7
  - MUX1 SIG -> Arduino Pin A0
  - MUX2 SIG -> Arduino Pin A1
  - Válvulas -> Arduino Pins 8, 9, 10
*/

// ============================================================================
// LIBRERÍAS
// ============================================================================
#include <SoftwareSerial.h>
#include <ArduinoJson.h>

// ============================================================================
// CONFIGURACIÓN - Archivo Separado (Credenciales)
// ============================================================================
#include "config.h"

// ============================================================================
// CONFIGURACIÓN DE HARDWARE - PINES
// ============================================================================
// ESP8266 - Comunicación Serial
#define ESP_RX 2
#define ESP_TX 3

// Multiplexores - Pines de control compartidos (S0-S3)
const int S0 = 4;
const int S1 = 5;
const int S2 = 6;
const int S3 = 7;

// Multiplexores - Pines de señal analógica
const int SIG1 = A0; // MUX1 (sensores 0-15)
const int SIG2 = A1; // MUX2 (sensores 16-17)

// Electroválvulas - Pines de salida digital
const int VALV1 = 8;  // Electroválvula línea 1
const int VALV2 = 9;  // Electroválvula línea 2
const int VALV3 = 10; // Electroválvula línea 3

// ============================================================================
// OBJETOS GLOBALES
// ============================================================================
SoftwareSerial esp8266(ESP_RX, ESP_TX); // RX, TX

// ============================================================================
// VARIABLES GLOBALES
// ============================================================================
// Arrays para almacenar lecturas de sensores
float vwc[18];        // Valores de %VWC de cada sensor (0-17)
float promedio[3];    // Promedios de cada línea de riego

// IDs de sensores (coinciden con Firestore)
String sensorIds[18] = {
  "sensor-0", "sensor-1", "sensor-2", "sensor-3", "sensor-4", "sensor-5",
  "sensor-6", "sensor-7", "sensor-8", "sensor-9", "sensor-10", "sensor-11",
  "sensor-12", "sensor-13", "sensor-14", "sensor-15", "sensor-16", "sensor-17"
};

// Configuración de umbrales (pueden ser actualizados desde el servidor)
float umbral_linea1 = 30.0;
float umbral_linea2 = 30.0;
float umbral_linea3 = 30.0;

// Temporizadores no bloqueantes
unsigned long tiempoAnteriorLectura = 0;
unsigned long intervaloLectura = READING_INTERVAL;

// Estado de conexión WiFi
bool wifiConnected = false;

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
 * @param lectura: Valor ADC del sensor (0-1023 en Arduino UNO)
 * @return: Porcentaje de VWC (0-100%)
 */
float calcularVWC(int lectura) {
  // Fórmula de calibración cuadrática
  float VWC = -0.00019 * (float)(lectura * lectura) - 0.0064 * (float)lectura + 191.6;
  
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
  Serial.println(F(""));
  Serial.println(F("========================================"));
  Serial.println(F("LECTURA DE SENSORES"));
  Serial.println(F("========================================"));
  
  int index = 0;
  
  // Leer los primeros 16 sensores del MUX1
  for (int canal = 0; canal < 16; canal++) {
    setChannel(canal);
    delay(10); // Pequeña pausa para estabilización
    int lectura = analogRead(SIG1);
    vwc[index] = calcularVWC(lectura);
    Serial.print(sensorIds[index]);
    Serial.print(F(": "));
    Serial.print(vwc[index], 2);
    Serial.println(F("%"));
    index++;
  }
  
  // Leer los últimos 2 sensores del MUX2 (canales 0 y 1)
  for (int canal = 0; canal < 2; canal++) {
    setChannel(canal);
    delay(10);
    int lectura = analogRead(SIG2);
    vwc[index] = calcularVWC(lectura);
    Serial.print(sensorIds[index]);
    Serial.print(F(": "));
    Serial.print(vwc[index], 2);
    Serial.println(F("%"));
    index++;
  }
  
  // Calcular promedios por línea de riego
  promedio[0] = (vwc[0] + vwc[1] + vwc[2] + vwc[3] + vwc[4] + vwc[5]) / 6.0;
  promedio[1] = (vwc[6] + vwc[7] + vwc[8] + vwc[9] + vwc[10] + vwc[11]) / 6.0;
  promedio[2] = (vwc[12] + vwc[13] + vwc[14] + vwc[15] + vwc[16] + vwc[17]) / 6.0;
  
  Serial.println(F("----------------------------------------"));
  Serial.print(F("Linea 1 promedio: "));
  Serial.print(promedio[0], 2);
  Serial.print(F("% (Umbral: "));
  Serial.print(umbral_linea1, 2);
  Serial.println(F("%)"));
  
  Serial.print(F("Linea 2 promedio: "));
  Serial.print(promedio[1], 2);
  Serial.print(F("% (Umbral: "));
  Serial.print(umbral_linea2, 2);
  Serial.println(F("%)"));
  
  Serial.print(F("Linea 3 promedio: "));
  Serial.print(promedio[2], 2);
  Serial.print(F("% (Umbral: "));
  Serial.print(umbral_linea3, 2);
  Serial.println(F("%)"));
  Serial.println(F("========================================"));
}

/**
 * Controla las electroválvulas basándose en promedios de humedad
 * La válvula se activa si el promedio está por debajo del umbral
 */
void controlarValvulas() {
  Serial.println(F(""));
  Serial.println(F("CONTROL DE VALVULAS"));
  Serial.println(F("----------------------------------------"));
  
  // Línea 1
  if (promedio[0] < umbral_linea1) {
    digitalWrite(VALV1, HIGH);
    Serial.println(F("Valvula 1: ACTIVADA"));
  } else {
    digitalWrite(VALV1, LOW);
    Serial.println(F("Valvula 1: Desactivada"));
  }
  
  // Línea 2
  if (promedio[1] < umbral_linea2) {
    digitalWrite(VALV2, HIGH);
    Serial.println(F("Valvula 2: ACTIVADA"));
  } else {
    digitalWrite(VALV2, LOW);
    Serial.println(F("Valvula 2: Desactivada"));
  }
  
  // Línea 3
  if (promedio[2] < umbral_linea3) {
    digitalWrite(VALV3, HIGH);
    Serial.println(F("Valvula 3: ACTIVADA"));
  } else {
    digitalWrite(VALV3, LOW);
    Serial.println(F("Valvula 3: Desactivada"));
  }
  
  Serial.println(F("========================================"));
}

// ============================================================================
// FUNCIONES ESP8266 - COMANDOS AT
// ============================================================================

/**
 * Envía un comando AT al ESP8266 y espera respuesta
 * @param comando: Comando AT a enviar
 * @param timeout: Tiempo de espera en milisegundos
 * @return: true si recibe "OK", false en caso contrario
 */
bool sendATCommand(String comando, unsigned long timeout) {
  Serial.print(F("AT CMD: "));
  Serial.println(comando);
  
  esp8266.println(comando);
  
  unsigned long startTime = millis();
  String response = "";
  
  while (millis() - startTime < timeout) {
    while (esp8266.available()) {
      char c = esp8266.read();
      response += c;
      Serial.print(c); // Echo de la respuesta
    }
    
    if (response.indexOf("OK") != -1) {
      Serial.println(F("-> OK"));
      return true;
    }
    
    if (response.indexOf("ERROR") != -1) {
      Serial.println(F("-> ERROR"));
      return false;
    }
  }
  
  Serial.println(F("-> TIMEOUT"));
  return false;
}

/**
 * Espera por un prompt específico del ESP8266
 * @param prompt: String a esperar (ej: ">")
 * @param timeout: Tiempo de espera en milisegundos
 * @return: true si encuentra el prompt, false en caso contrario
 */
bool waitForPrompt(String prompt, unsigned long timeout) {
  Serial.print(F("Esperando: "));
  Serial.println(prompt);
  
  unsigned long startTime = millis();
  String response = "";
  
  while (millis() - startTime < timeout) {
    while (esp8266.available()) {
      char c = esp8266.read();
      response += c;
      Serial.print(c);
    }
    
    if (response.indexOf(prompt) != -1) {
      Serial.println(F("-> ENCONTRADO"));
      return true;
    }
  }
  
  Serial.println(F("-> TIMEOUT"));
  return false;
}

/**
 * Lee y muestra la respuesta del ESP8266
 * @param timeout: Tiempo de espera en milisegundos
 */
void readESP8266Response(unsigned long timeout) {
  unsigned long startTime = millis();
  
  Serial.println(F("ESP8266 Response:"));
  Serial.println(F("----------------------------------------"));
  
  while (millis() - startTime < timeout) {
    while (esp8266.available()) {
      char c = esp8266.read();
      Serial.print(c);
    }
  }
  
  Serial.println(F(""));
  Serial.println(F("----------------------------------------"));
}

/**
 * Configura la conexión WiFi del ESP8266
 * Usa comandos AT para configurar modo estación y conectar
 */
void setupWiFi() {
  Serial.println(F(""));
  Serial.println(F("========================================"));
  Serial.println(F("CONFIGURANDO WiFi (ESP8266)"));
  Serial.println(F("========================================"));
  
  // Test de comunicación
  Serial.println(F("Test de comunicacion..."));
  if (!sendATCommand(F("AT"), 2000)) {
    Serial.println(F("ERROR: No se puede comunicar con ESP8266"));
    Serial.println(F("Verifique conexiones y baudrate"));
    wifiConnected = false;
    return;
  }
  
  // Configurar modo estación (1 = Station)
  Serial.println(F("Configurando modo estacion..."));
  if (!sendATCommand(F("AT+CWMODE=1"), 2000)) {
    Serial.println(F("ERROR: No se pudo configurar modo"));
    wifiConnected = false;
    return;
  }
  
  // Conectar a WiFi
  Serial.println(F("Conectando a WiFi..."));
  Serial.print(F("SSID: "));
  Serial.println(WIFI_SSID);
  
  String conectCmd = "AT+CWJAP=\"";
  conectCmd += WIFI_SSID;
  conectCmd += "\",\"";
  conectCmd += WIFI_PASSWORD;
  conectCmd += "\"";
  
  if (!sendATCommand(conectCmd, 15000)) { // Timeout largo para conexión
    Serial.println(F("ERROR: No se pudo conectar a WiFi"));
    Serial.println(F("Verifique SSID, password y cobertura"));
    wifiConnected = false;
    return;
  }
  
  // Verificar IP asignada
  Serial.println(F("Obteniendo IP..."));
  sendATCommand(F("AT+CIFSR"), 2000);
  
  wifiConnected = true;
  Serial.println(F(""));
  Serial.println(F("WiFi conectado exitosamente!"));
  Serial.println(F("========================================"));
}

/**
 * Crea el payload JSON con las lecturas de todos los sensores
 * @return: String con el JSON serializado
 */
String crearPayloadJSON() {
  // Usar StaticJsonDocument con capacidad suficiente
  // Calculado: ~50 bytes por sensor * 18 + overhead = ~1200 bytes
  StaticJsonDocument<1536> doc;
  
  // Crear array de readings
  JsonArray readings = doc.createNestedArray("readings");
  
  // Agregar cada sensor
  for (int i = 0; i < 18; i++) {
    JsonObject reading = readings.createNestedObject();
    reading["sensorId"] = sensorIds[i];
    reading["valueVWC"] = vwc[i];
  }
  
  // Serializar a String
  String payload;
  serializeJson(doc, payload);
  
  return payload;
}

/**
 * Envía los datos de sensores al endpoint /api/ingest
 * Usa comandos AT para establecer conexión TCP y enviar HTTP POST
 */
void enviarDatos() {
  if (!wifiConnected) {
    Serial.println(F("ERROR: WiFi no conectado, no se pueden enviar datos"));
    return;
  }
  
  Serial.println(F(""));
  Serial.println(F("========================================"));
  Serial.println(F("ENVIANDO DATOS AL SERVIDOR"));
  Serial.println(F("========================================"));
  
  // ──────────────────────────────────────────────────────────────────────
  // PASO A: Crear Payload JSON
  // ──────────────────────────────────────────────────────────────────────
  Serial.println(F("Creando payload JSON..."));
  String payload = crearPayloadJSON();
  
  Serial.println(F("Payload:"));
  Serial.println(payload);
  Serial.print(F("Tamano: "));
  Serial.print(payload.length());
  Serial.println(F(" bytes"));
  
  // ──────────────────────────────────────────────────────────────────────
  // PASO B: Construir Petición HTTP
  // ──────────────────────────────────────────────────────────────────────
  Serial.println(F(""));
  Serial.println(F("Construyendo peticion HTTP..."));
  
  String httpPacket = "POST ";
  httpPacket += API_ENDPOINT;
  httpPacket += " HTTP/1.1\r\n";
  httpPacket += "Host: ";
  httpPacket += API_HOST;
  httpPacket += "\r\n";
  httpPacket += "Authorization: Bearer ";
  httpPacket += API_SECRET;
  httpPacket += "\r\n";
  httpPacket += "Content-Type: application/json\r\n";
  httpPacket += "Content-Length: ";
  httpPacket += String(payload.length());
  httpPacket += "\r\n";
  httpPacket += "Connection: close\r\n";
  httpPacket += "\r\n"; // Separador headers/body
  httpPacket += payload;
  httpPacket += "\r\n\r\n";
  
  Serial.println(F("HTTP Packet:"));
  Serial.println(F("----------------------------------------"));
  Serial.println(httpPacket);
  Serial.println(F("----------------------------------------"));
  Serial.print(F("Tamano total: "));
  Serial.print(httpPacket.length());
  Serial.println(F(" bytes"));
  
  // ──────────────────────────────────────────────────────────────────────
  // PASO C: Conectar al Servidor (TCP)
  // ──────────────────────────────────────────────────────────────────────
  Serial.println(F(""));
  Serial.println(F("Conectando al servidor..."));
  
  String conectCmd = "AT+CIPSTART=\"TCP\",\"";
  conectCmd += API_HOST;
  conectCmd += "\",80";
  
  if (!sendATCommand(conectCmd, 10000)) {
    Serial.println(F("ERROR: No se pudo conectar al servidor"));
    return;
  }
  
  // ──────────────────────────────────────────────────────────────────────
  // PASO D: Enviar Petición HTTP
  // ──────────────────────────────────────────────────────────────────────
  Serial.println(F(""));
  Serial.println(F("Enviando peticion HTTP..."));
  
  // Iniciar modo de envío
  String cipsendCmd = "AT+CIPSEND=";
  cipsendCmd += String(httpPacket.length());
  
  esp8266.println(cipsendCmd);
  Serial.print(F("AT CMD: "));
  Serial.println(cipsendCmd);
  
  // Esperar el prompt ">"
  if (!waitForPrompt(">", 5000)) {
    Serial.println(F("ERROR: No se recibio prompt de envio"));
    // Cerrar conexión
    sendATCommand(F("AT+CIPCLOSE"), 2000);
    return;
  }
  
  // Enviar el paquete HTTP completo
  Serial.println(F(""));
  Serial.println(F("Enviando paquete..."));
  esp8266.print(httpPacket);
  
  // Esperar respuesta del servidor
  Serial.println(F(""));
  Serial.println(F("Esperando respuesta del servidor..."));
  readESP8266Response(5000);
  
  // Cerrar conexión
  Serial.println(F(""));
  Serial.println(F("Cerrando conexion..."));
  sendATCommand(F("AT+CIPCLOSE"), 2000);
  
  Serial.println(F(""));
  Serial.println(F("Envio completado!"));
  Serial.println(F("========================================"));
}

// ============================================================================
// SETUP - INICIALIZACIÓN DEL SISTEMA
// ============================================================================

void setup() {
  // Iniciar comunicación serial (Monitor Serial)
  Serial.begin(9600);
  delay(1000);
  
  Serial.println(F(""));
  Serial.println(F(""));
  Serial.println(F("========================================"));
  Serial.println(F("SISTEMA DE RIEGO AUTOMATIZADO"));
  Serial.println(F("Arduino UNO + ESP-12F (AT Commands)"));
  Serial.println(F("========================================"));
  Serial.println(F(""));
  
  // Iniciar comunicación con ESP8266
  Serial.println(F("Iniciando comunicacion con ESP8266..."));
  esp8266.begin(9600);
  delay(1000);
  
  // Configurar pines de hardware
  Serial.println(F("Configurando hardware..."));
  
  // Multiplexores
  pinMode(S0, OUTPUT);
  pinMode(S1, OUTPUT);
  pinMode(S2, OUTPUT);
  pinMode(S3, OUTPUT);
  
  // Válvulas
  pinMode(VALV1, OUTPUT);
  pinMode(VALV2, OUTPUT);
  pinMode(VALV3, OUTPUT);
  
  // Inicializar válvulas cerradas
  digitalWrite(VALV1, LOW);
  digitalWrite(VALV2, LOW);
  digitalWrite(VALV3, LOW);
  
  Serial.println(F("Hardware configurado!"));
  
  // Configurar WiFi
  setupWiFi();
  
  if (!wifiConnected) {
    Serial.println(F(""));
    Serial.println(F("ADVERTENCIA: Sistema iniciado sin WiFi"));
    Serial.println(F("Solo funcionara control local de valvulas"));
    Serial.println(F("Verifique configuracion y reinicie"));
  }
  
  Serial.println(F(""));
  Serial.println(F("========================================"));
  Serial.println(F("INICIALIZACION COMPLETADA"));
  Serial.println(F("Sistema operativo"));
  Serial.println(F("========================================"));
  Serial.println(F(""));
  
  // Primera lectura inmediata
  tiempoAnteriorLectura = millis() - intervaloLectura;
}

// ============================================================================
// LOOP PRINCIPAL - EJECUCIÓN CONTINUA
// ============================================================================

void loop() {
  unsigned long tiempoActual = millis();
  
  // Verificar si es tiempo de hacer lectura y envío
  if (tiempoActual - tiempoAnteriorLectura >= intervaloLectura) {
    tiempoAnteriorLectura = tiempoActual;
    
    Serial.println(F(""));
    Serial.println(F(""));
    Serial.println(F("****************************************"));
    Serial.println(F("CICLO DE LECTURA Y ENVIO"));
    Serial.println(F("****************************************"));
    
    // 1. Leer todos los sensores
    leerSensores();
    
    // 2. Enviar datos al servidor (si WiFi está conectado)
    if (wifiConnected) {
      enviarDatos();
    } else {
      Serial.println(F(""));
      Serial.println(F("WiFi desconectado - Datos no enviados"));
      Serial.println(F("Intente reiniciar el sistema"));
    }
    
    // 3. Controlar válvulas basándose en lecturas
    controlarValvulas();
    
    Serial.println(F(""));
    Serial.println(F("****************************************"));
    Serial.print(F("Proxima lectura en: "));
    Serial.print(intervaloLectura / 60000);
    Serial.println(F(" minutos"));
    Serial.println(F("****************************************"));
    Serial.println(F(""));
  }
  
  // Pequeña pausa para no saturar el procesador
  delay(100);
}

// ============================================================================
// FIN DEL CÓDIGO
// ============================================================================

/*
 * NOTAS DE IMPLEMENTACIÓN:
 * 
 * 1. CONEXIONES HARDWARE:
 *    Arduino -> ESP-12F:
 *      - Arduino Pin 3 (TX) -> ESP8266 RX (usar divisor de voltaje 5V -> 3.3V)
 *      - Arduino Pin 2 (RX) -> ESP8266 TX (directo, 3.3V es suficiente)
 *      - GND común
 *      - ESP8266 VCC -> 3.3V (usar fuente externa, no del Arduino)
 *      - ESP8266 CH_PD -> 3.3V (pull-up)
 *    
 *    IMPORTANTE: ESP8266 opera a 3.3V, usar divisor de voltaje en TX del Arduino
 *    
 * 2. FIRMWARE ESP8266:
 *    - Debe tener firmware AT actualizado (versión 1.7+)
 *    - Verificar con comando: AT+GMR
 *    - Si no responde, actualizar firmware desde:
 *      https://www.espressif.com/en/support/download/at
 *    
 * 3. BAUDRATE:
 *    - Configurado a 9600 para estabilidad con SoftwareSerial
 *    - Si tu ESP8266 usa otro baudrate, ajustarlo con:
 *      AT+UART_DEF=9600,8,1,0,0
 *    
 * 4. CONFIGURACIÓN:
 *    - Editar config.h con tus credenciales WiFi
 *    - Configurar API_HOST con tu URL de Vercel
 *    - Verificar que API_SECRET coincida con el servidor
 *    
 * 5. PRUEBAS:
 *    - Usar Monitor Serial a 9600 baud
 *    - Verificar respuestas del ESP8266 (AT commands)
 *    - Para pruebas locales, usar ngrok:
 *      ngrok http 3000
 *      Copiar URL a API_HOST en config.h
 *    
 * 6. DEBUGGING:
 *    - El Monitor Serial muestra todos los comandos AT
 *    - Verificar respuestas "OK" en cada paso
 *    - Si falla WiFi, verificar SSID/password y cobertura
 *    - Si falla envío, verificar API_HOST y API_SECRET
 *    
 * 7. LIMITACIONES:
 *    - No usa HTTPS (Arduino UNO no puede manejar SSL)
 *    - Seguridad se basa en el token de autorización (API_SECRET)
 *    - SoftwareSerial puede perder datos a altos baudrates
 *    - Máximo ~1500 bytes por payload (límite de ArduinoJson)
 *    
 * 8. OPTIMIZACIONES FUTURAS:
 *    - Implementar reintentos en caso de falla
 *    - Guardar lecturas en EEPROM si falla el envío
 *    - Implementar watchdog timer
 *    - Agregar LED de estado de conexión
 *    - Implementar modo de configuración (sin recompilar)
 * 
 * 9. CALIBRACIÓN DE SENSORES:
 *    - La fórmula calcularVWC() está calibrada para sensores capacitivos
 *    - Ajustar coeficientes según tu modelo de sensor
 *    - Probar en suelo seco y saturado para validar
 *    
 * 10. SEGURIDAD:
 *     - El token API_SECRET debe mantenerse confidencial
 *     - WiFi debe usar WPA2/WPA3
 *     - Cambiar API_SECRET periódicamente
 *     - No compartir config.h en repositorios públicos
 */
