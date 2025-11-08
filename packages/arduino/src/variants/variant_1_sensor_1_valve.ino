// Variante 1: 1 Sensor + 1 Válvula (control remoto por isActive)
// Basado en packages/arduino/src/main/main.ino v1.3

#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ArduinoJson.h>
#include <time.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include "config.h"

const int SENSOR_PIN = A0;
const int VALVULA_PIN = D5;

unsigned long intervaloLectura = 60000;
unsigned long intervaloControl = 10000;
float vwc_sensor = 0.0;
bool estadoActualValvula = false;

unsigned long tLectura = 0;
unsigned long tControl = 0;

FirebaseData fbdo;
FirebaseData fbdoControl;
FirebaseAuth auth;
FirebaseConfig config;
bool wifiConnected = false;
bool firebaseReady = false;

const String controlPath = "irrigationLines/test-line-1";
const String sensorIds[18] = {
  "sensor-000","sensor-001","sensor-002","sensor-003","sensor-004","sensor-005",
  "sensor-006","sensor-007","sensor-008","sensor-009","sensor-010","sensor-011",
  "sensor-012","sensor-013","sensor-014","sensor-015","sensor-016","sensor-017"
};
const String lineIds[3] = {"linea-1","linea-2","linea-3"};
const String sensorTitles[18] = {
  "Sensor Pasillo 1","Sensor Pasillo 2","Sensor Pasillo 3",
  "Sensor Pasillo 4","Sensor Pasillo 5","Sensor Pasillo 6",
  "Sensor Área 2-1","Sensor Área 2-2","Sensor Área 2-3",
  "Sensor Área 2-4","Sensor Área 2-5","Sensor Área 2-6",
  "Sensor Área 3-1","Sensor Área 3-2","Sensor Área 3-3",
  "Sensor Área 3-4","Sensor Área 3-5","Sensor Área 3-6"
};

String getLineIdForSensor(int i){ if(i<6) return lineIds[0]; if(i<12) return lineIds[1]; return lineIds[2]; }

float calcularVWC(int lectura){ float V=-0.000049*pow(lectura,2)-0.0016*lectura+47.9; if(V<0)V=0; if(V>100)V=100; return V; }

void setupWiFi(){
  Serial.println("📡 WiFi...");
  WiFi.mode(WIFI_STA); WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  for(int i=0;i<40 && WiFi.status()!=WL_CONNECTED;i++){ delay(250); Serial.print("."); }
  wifiConnected = WiFi.status()==WL_CONNECTED; Serial.println(wifiConnected?"\n✅ WiFi OK":"\n❌ WiFi FAIL");
}

void setupFirebase(){
  config.api_key = FIREBASE_API_KEY; config.database_url = FIREBASE_HOST; 
  auth.user.email = USER_EMAIL; auth.user.password = USER_PASSWORD; 
  config.token_status_callback = tokenStatusCallback; Firebase.reconnectWiFi(true); Firebase.begin(&config,&auth);
  for(int i=0;i<40 && !Firebase.ready(); i++){ delay(250); Serial.print("."); }
  firebaseReady = Firebase.ready(); Serial.println(firebaseReady?"\n✅ Firebase OK":"\n❌ Firebase FAIL");
}

bool verificarFirebase(){ if(!wifiConnected) return false; if(!Firebase.ready()){ firebaseReady=false; return false;} firebaseReady=true; return true; }

void leerSensor(){ int raw=analogRead(SENSOR_PIN); vwc_sensor=calcularVWC(raw); Serial.printf("📊 A0: %d -> %.2f%%\n", raw, vwc_sensor); }

void actualizarEstadoValvula(bool on){ if(on && !estadoActualValvula){ digitalWrite(VALVULA_PIN, LOW); estadoActualValvula=true; Serial.println("⚡️ Válvula ON"); } else if(!on && estadoActualValvula){ digitalWrite(VALVULA_PIN, HIGH); estadoActualValvula=false; Serial.println("🛑 Válvula OFF"); } }

void leerEstadoValvulaFirebase(){ if(!verificarFirebase()) return; if(Firebase.Firestore.getDocument(&fbdoControl, FIREBASE_PROJECT_ID, "", controlPath.c_str())){
  FirebaseJson js; js.setJsonData(fbdoControl.payload()); FirebaseJsonData r; if(js.get(r,"fields/isActive/booleanValue")) actualizarEstadoValvula(r.boolValue);
}}

void enviarLectura(){ if(!verificarFirebase()) return; time_t now=time(nullptr);
  int i=0; String sensorId=sensorIds[i]; String sensorDoc="sensors/"+sensorId; String title=sensorTitles[i]; String lineId=getLineIdForSensor(i);
  FirebaseJson meta; meta.set("fields/lineId/stringValue",lineId); meta.set("fields/status/stringValue","active"); meta.set("fields/title/stringValue",title);
  if(!Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", sensorDoc.c_str(), meta.raw(), "lineId,status,title")){
    Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", sensorDoc.c_str(), meta.raw());
  }
  String readings=sensorDoc+"/readings"; FirebaseJson content; content.set("fields/timestamp/mapValue/fields/seconds/integerValue",String(now)); content.set("fields/valueVWC/doubleValue",vwc_sensor);
  Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", readings.c_str(), content.raw());
}

void setup(){
  Serial.begin(115200); delay(500); Serial.println("\n== Variante: 1 Sensor / 1 Válvula ==");
  pinMode(SENSOR_PIN, INPUT); pinMode(VALVULA_PIN, OUTPUT); digitalWrite(VALVULA_PIN, HIGH);
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
  setupWiFi(); if(!wifiConnected){ while(1){ delay(1000);} }
  setupFirebase(); if(!firebaseReady){ while(1){ delay(1000);} }
}

void loop(){ unsigned long nowMs=millis();
  if(nowMs - tLectura >= intervaloLectura){ tLectura = nowMs; leerSensor(); enviarLectura(); }
  if(nowMs - tControl >= intervaloControl){ tControl = nowMs; leerEstadoValvulaFirebase(); }
  delay(10);
}
