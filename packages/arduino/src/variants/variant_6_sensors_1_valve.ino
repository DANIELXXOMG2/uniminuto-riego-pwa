// Variante 2: 6 Sensores (1 Línea) + 1 Válvula
// Basado en New folder/1_LINE_READ_UPDATE_VALVE.ino con mejoras:
// - Envío de 6 lecturas
// - Actualización de metadata de sensores
// - Control remoto de válvula via irrigationLines/linea-1 (isActive)
// - Actualización de irrigationLines/linea-1: humidity y lastUpdated

#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ArduinoJson.h>
#include <time.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include "config.h"

// MUX control pins
const int S0=4, S1=5, S2=14, S3=13; // D2,D1,D5,D7
const int SIG_PIN=A0;                // A0
const int VALV1=15;                  // D8

unsigned long intervaloLectura=60000; // 1 min
unsigned long intervaloControl=10000; // 10s
unsigned long tLectura=0, tControl=0;
float vwc[6]; float promedio_l1=0.0; bool estadoValvula=false;

FirebaseData fbdo; FirebaseData fbdoControl; FirebaseAuth auth; FirebaseConfig config;
bool wifiConnected=false; bool firebaseReady=false;

const String lineId="linea-1"; const String controlPath="irrigationLines/linea-1";
const String sensorIds[6] = {"sensor-000","sensor-001","sensor-002","sensor-003","sensor-004","sensor-005"};
const String sensorTitles[6] = {"Sensor Pasillo 1","Sensor Pasillo 2","Sensor Pasillo 3","Sensor Pasillo 4","Sensor Pasillo 5","Sensor Pasillo 6"};

void setChannel(int ch){ digitalWrite(S0,ch&1); digitalWrite(S1,(ch>>1)&1); digitalWrite(S2,(ch>>2)&1); digitalWrite(S3,(ch>>3)&1); }
float calcularVWC(int r){ float V=-0.000049*pow(r,2)-0.0016*r+47.9; if(V<0)V=0; if(V>100)V=100; return V; }

void setupWiFi(){ WiFi.mode(WIFI_STA); WiFi.begin(WIFI_SSID,WIFI_PASSWORD); for(int i=0;i<40 && WiFi.status()!=WL_CONNECTED;i++){ delay(250);} wifiConnected=WiFi.status()==WL_CONNECTED; }
void setupFirebase(){ config.api_key=FIREBASE_API_KEY; config.database_url=FIREBASE_HOST; auth.user.email=USER_EMAIL; auth.user.password=USER_PASSWORD; config.token_status_callback=tokenStatusCallback; Firebase.reconnectWiFi(true); Firebase.begin(&config,&auth); for(int i=0;i<40 && !Firebase.ready(); i++){ delay(250);} firebaseReady=Firebase.ready(); }
bool verificarFirebase(){ if(!wifiConnected) return false; if(!Firebase.ready()){ firebaseReady=false; return false;} firebaseReady=true; return true; }

void leerSensores(){ float suma=0; Serial.println("📊 Leyendo 6 sensores (línea-1)"); for(int ch=0; ch<6; ch++){ setChannel(ch); delayMicroseconds(100); int raw=analogRead(SIG_PIN); vwc[ch]=calcularVWC(raw); suma+=vwc[ch]; Serial.printf("  s%03d (ch%d): %d -> %.2f%%\n", ch, ch, raw, vwc[ch]); } promedio_l1=suma/6.0; Serial.printf("Promedio linea-1: %.2f%%\n", promedio_l1); }

void actualizarEstadoValvula(bool on){ if(on && !estadoValvula){ digitalWrite(VALV1, LOW); estadoValvula=true; Serial.println("⚡️ Válvula1 ON"); } else if(!on && estadoValvula){ digitalWrite(VALV1, HIGH); estadoValvula=false; Serial.println("🛑 Válvula1 OFF"); } }

void leerControlFirebase(){ if(!verificarFirebase()) return; if(Firebase.Firestore.getDocument(&fbdoControl, FIREBASE_PROJECT_ID, "", controlPath.c_str())){ FirebaseJson js; js.setJsonData(fbdoControl.payload()); FirebaseJsonData r; if(js.get(r,"fields/isActive/booleanValue")) actualizarEstadoValvula(r.boolValue); }}

void patchSensorMeta(int i){ String sensorDoc="sensors/"+sensorIds[i]; FirebaseJson meta; meta.set("fields/lineId/stringValue", lineId); meta.set("fields/status/stringValue","active"); meta.set("fields/title/stringValue", sensorTitles[i]); if(!Firebase.Firestore.patchDocument(&fbdo,FIREBASE_PROJECT_ID,"",sensorDoc.c_str(),meta.raw(),"lineId,status,title")){ Firebase.Firestore.createDocument(&fbdo,FIREBASE_PROJECT_ID,"",sensorDoc.c_str(),meta.raw()); } }

void enviarLecturas(){ if(!verificarFirebase()) return; time_t now=time(nullptr);
  // Actualizar doc de línea con promedio y lastUpdated
  FirebaseJson line; line.set("fields/humidity/doubleValue", promedio_l1); line.set("fields/title/stringValue","Línea 1 (6 sensores)"); line.set("fields/lastUpdated/timestampValue", String((long long)now*1000));
  if(!Firebase.Firestore.patchDocument(&fbdo,FIREBASE_PROJECT_ID,"",controlPath.c_str(),line.raw(),"humidity,title,lastUpdated")){
    Firebase.Firestore.createDocument(&fbdo,FIREBASE_PROJECT_ID,"",controlPath.c_str(),line.raw());
  }
  // Enviar 6 lecturas + metadata de sensor
  for(int i=0;i<6;i++){
    patchSensorMeta(i);
    String readings="sensors/"+sensorIds[i]+"/readings"; FirebaseJson c; c.set("fields/timestamp/mapValue/fields/seconds/integerValue", String(now)); c.set("fields/valueVWC/doubleValue", vwc[i]); Firebase.Firestore.createDocument(&fbdo,FIREBASE_PROJECT_ID,"",readings.c_str(),c.raw()); delay(30);
  }
}

void setup(){ Serial.begin(115200); delay(300); Serial.println("== Variante: 6 Sensores / 1 Válvula =="); pinMode(S0,OUTPUT); pinMode(S1,OUTPUT); pinMode(S2,OUTPUT); pinMode(S3,OUTPUT); pinMode(SIG_PIN,INPUT); pinMode(VALV1,OUTPUT); digitalWrite(VALV1,HIGH);
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER); setupWiFi(); if(!wifiConnected){ while(1) delay(1000);} setupFirebase(); if(!firebaseReady){ while(1) delay(1000);} }

void loop(){ unsigned long ms=millis(); if(ms - tLectura >= intervaloLectura){ tLectura=ms; leerSensores(); enviarLecturas(); } if(ms - tControl >= intervaloControl){ tControl=ms; leerControlFirebase(); } delay(10);}