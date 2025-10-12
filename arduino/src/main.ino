/*
  Sistema de Riego Automatizado con Conectividad WiFi - Versión 2.0
  ---------------------------------------------------------------
  - Se conecta a una red WiFi usando un Shield ESP8266.
  - Lee 18 sensores de humedad usando 2 multiplexores.
  - Envía los promedios de humedad de 3 líneas de riego a un backend.
  - Recibe comandos del backend para control manual y configuración remota.
  - Utiliza un temporizador no bloqueante en lugar de delay().
  ---------------------------------------------------------------
  REQUIERE:
  - Arduino UNO con Shield WiFi ESP8266.
  - Librerías: ArduinoJson.
*/

#include <SoftwareSerial.h> // Para la comunicación con el ESP8266
#include <ArduinoJson.h>    // Para manejar datos en formato JSON

// --- Configuración de Red y API ---
const char* WIFI_SSID = "NOMBRE_DE_TU_WIFI";
const char* WIFI_PASS = "CONTRASENA_DE_TU_WIFI";
const char* API_HOST = "tu-webapp.vercel.app"; // Reemplaza con tu URL de Vercel
const int API_PORT = 80; // Puerto estándar para HTTP

// --- Pines de comunicación con el Shield ESP8266 ---
SoftwareSerial esp8266(2, 3); // RX, TX

// --- Pines de control compartidos para los dos multiplexores ---
const int S0 = 4;
const int S1 = 5;
const int S2 = 6;
const int S3 = 7;

// --- Pines de señal analógica de cada multiplexor ---
const int SIG1 = A0; // Señal del MUX1 (sensores 1–16)
const int SIG2 = A1; // Señal del MUX2 (sensores 17–18)

// --- Pines de salida para controlar las electroválvulas ---
const int VALV1 = 8;  // Electroválvula línea 1
const int VALV2 = 9;  // Electroválvula línea 2
const int VALV3 = 10; // Electroválvula línea 3

// --- Variables de configuración (se obtendrán del backend) ---
float umbral_linea1 = 30.0;
float umbral_linea2 = 30.0;
float umbral_linea3 = 30.0;
unsigned long intervaloLectura = 600000; // 10 minutos por defecto

// --- Variables para el temporizador no bloqueante ---
unsigned long tiempoAnterior = 0;

// --- Arrays para almacenar las lecturas ---
float vwc[18];     // Valores de %VWC de cada sensor
float promedio[3]; // Promedios de cada línea

// ---------- Funciones de Hardware ----------

void setChannel(int channel) {
  digitalWrite(S0, channel & 0x01);
  digitalWrite(S1, (channel >> 1) & 0x01);
  digitalWrite(S2, (channel >> 2) & 0x01);
  digitalWrite(S3, (channel >> 3) & 0x01);
}

float calcularVWC(int lectura) {
  float VWC = -0.000049 * pow(lectura, 2) - 0.0016 * lectura + 47.9;
  if (VWC < 0) VWC = 0;
  if (VWC > 100) VWC = 100;
  return VWC;
}

void leerSensores() {
  int index = 0;
  for (int canal = 0; canal < 16; canal++) {
    setChannel(canal);
    delay(5);
    if (index < 16) {
      vwc[index++] = calcularVWC(analogRead(SIG1));
    }
    if (canal < 2 && index < 18) {
      vwc[index++] = calcularVWC(analogRead(SIG2));
    }
  }
  // Calcular promedios
  promedio[0] = (vwc[0] + vwc[1] + vwc[2] + vwc[3] + vwc[4] + vwc[5]) / 6.0;
  promedio[1] = (vwc[6] + vwc[7] + vwc[8] + vwc[9] + vwc[10] + vwc[11]) / 6.0;
  promedio[2] = (vwc[12] + vwc[13] + vwc[14] + vwc[15] + vwc[16] + vwc[17]) / 6.0;
}

void controlarValvulas() {
  if (promedio[0] < umbral_linea1) digitalWrite(VALV1, HIGH);
  else digitalWrite(VALV1, LOW);
  if (promedio[1] < umbral_linea2) digitalWrite(VALV2, HIGH);
  else digitalWrite(VALV2, LOW);
  if (promedio[2] < umbral_linea3) digitalWrite(VALV3, HIGH);
  else digitalWrite(VALV3, LOW);
}

// ---------- Funciones de Comunicación (NUEVAS) ----------

void conectarWiFi() {
  Serial.println("Conectando a WiFi...");
  esp8266.println("AT+RST"); // Reiniciar el módulo
  delay(1000);
  esp8266.println("AT+CWMODE=1"); // Configurar como modo cliente
  delay(1000);
  String cmd = "AT+CWJAP=\"" + String(WIFI_SSID) + "\",\"" + String(WIFI_PASS) + "\"";
  esp8266.println(cmd);
  delay(5000); // Esperar a la conexión
  if (esp8266.find("OK")) {
    Serial.println("Conectado a WiFi!");
  } else {
    Serial.println("Error al conectar a WiFi");
  }
}

void enviarDatos() {
  String json;
  StaticJsonDocument<200> doc;
  doc["linea1"] = promedio[0];
  doc["linea2"] = promedio[1];
  doc["linea3"] = promedio[2];
  serializeJson(doc, json);

  String peticion = "POST /api/lecturas HTTP/1.1\r\n";
  peticion += "Host: " + String(API_HOST) + "\r\n";
  peticion += "Content-Type: application/json\r\n";
  peticion += "Content-Length: " + String(json.length()) + "\r\n";
  peticion += "Connection: close\r\n\r\n";
  peticion += json;

  esp8266.println("AT+CIPSTART=\"TCP\",\"" + String(API_HOST) + "\"," + API_PORT);
  delay(100);
  if (esp8266.find("OK")) {
    Serial.println("Enviando datos al servidor...");
    esp8266.println("AT+CIPSEND=" + String(peticion.length()));
    delay(100);
    esp8266.println(peticion);
  }
}

// Aquí se podría añadir la función para recibir comandos (ej. escuchar un endpoint /api/comandos)

// ---------- Setup ----------
void setup() {
  Serial.begin(9600);
  esp8266.begin(9600);

  // Configurar pines de hardware
  pinMode(S0, OUTPUT); pinMode(S1, OUTPUT); pinMode(S2, OUTPUT); pinMode(S3, OUTPUT);
  pinMode(VALV1, OUTPUT); pinMode(VALV2, OUTPUT); pinMode(VALV3, OUTPUT);
  digitalWrite(VALV1, LOW); digitalWrite(VALV2, LOW); digitalWrite(VALV3, LOW);

  conectarWiFi();
  
  // Aquí iría la llamada para obtener la configuración inicial del servidor
  // ej: obtenerConfiguracion();
}

// ---------- Loop Principal ----------
void loop() {
  unsigned long tiempoActual = millis();

  // Esta estructura revisa si ha pasado el tiempo definido en 'intervaloLectura'
  if (tiempoActual - tiempoAnterior >= intervaloLectura) {
    tiempoAnterior = tiempoActual; // Reinicia el temporizador

    Serial.println("Realizando nueva lectura...");
    leerSensores();
    enviarDatos();
    controlarValvulas(); // El control automático se basa en la última lectura
  }
  
  // Aquí se añadiría la lógica para escuchar comandos del backend continuamente
  // ej: escucharComandos();
}