// Variante 3: 18 Sensores (3 Líneas) + 3 Válvulas
// - 2 Multiplexores (asumidos compartiendo líneas S0-S3, diferenciados por pin EN)
// - 18 sensores -> 3 líneas de 6 sensores (linea-1, linea-2, linea-3)
// - Control individual remoto (isActive) + decisión local por umbral opcional
// - Actualiza documents de líneas: humidity (promedio) + lastUpdated
// - Envía lecturas individuales + metadata sensores
// Ajusta pines EN según tu hardware real.

#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ArduinoJson.h>
#include <time.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include "config.h"

// Pines multiplexores (compartidos)
const int S0=4, S1=5, S2=14, S3=13; // D2,D1,D5,D7
// Pin analógico común
const int SIG_PIN=A0; // A0
// Pines enable para cada MUX (LOW = activo) - AJUSTAR según cableado real
const int MUX1_EN=16; // D0 -> sensores 0-15 (primer mux) *si realmente tienes 16 entradas, usarás sólo las 0-11 y 12-17 parcial
const int MUX2_EN=0;  // D3 -> sensores adicionales (ej. 12-17) si está en segundo mux

// Válvulas
const int VALV1=15; // D8
const int VALV2=2;  // D4
const int VALV3=12; // D6

// (Sprint 16) Configuración de intervalos dinámicos
unsigned long defaultReadingIntervalMs = 300000; // 5 min (Valor por defecto)
unsigned long activeIrrigationIntervalMs = 5000;  // 5 seg (Valor por defecto)
unsigned long currentReadingIntervalMs = defaultReadingIntervalMs; // Intervalo actual en uso

// Intervalo para verificar cambios en la configuración remota
unsigned long configCheckIntervalMs = 300000; // Re-lee config cada 5 min
unsigned long lastConfigCheckMs = 0;

// (Sprint 16) Mantener los timers del loop
unsigned long tLectura = 0;
unsigned long tControl = 0;
unsigned long intervaloControl=10000; // El control de válvulas sigue siendo cada 10s

// Datos sensores
float vwc[18];
float promedioLinea[3];
bool estadoValvula[3] = {false,false,false};

// Umbrales locales (opcional)
float umbral[3] = {30.0,30.0,30.0};

FirebaseData fbdo; FirebaseData fbdoControl; FirebaseAuth auth; FirebaseConfig config;
bool wifiConnected=false; bool firebaseReady=false;

const String lineIds[3] = {"linea-1","linea-2","linea-3"};
const String sensorIds[18] = {
  "sensor-000","sensor-001","sensor-002","sensor-003","sensor-004","sensor-005",
  "sensor-006","sensor-007","sensor-008","sensor-009","sensor-010","sensor-011",
  "sensor-012","sensor-013","sensor-014","sensor-015","sensor-016","sensor-017"};
const String sensorTitles[18] = {
  "Sensor Pasillo 1","Sensor Pasillo 2","Sensor Pasillo 3","Sensor Pasillo 4","Sensor Pasillo 5","Sensor Pasillo 6",
  "Sensor Área 2-1","Sensor Área 2-2","Sensor Área 2-3","Sensor Área 2-4","Sensor Área 2-5","Sensor Área 2-6",
  "Sensor Área 3-1","Sensor Área 3-2","Sensor Área 3-3","Sensor Área 3-4","Sensor Área 3-5","Sensor Área 3-6"};

String lineDocPath(int idx){ return String("irrigationLines/")+lineIds[idx]; }

void setChannel(int ch){ digitalWrite(S0,ch&1); digitalWrite(S1,(ch>>1)&1); digitalWrite(S2,(ch>>2)&1); digitalWrite(S3,(ch>>3)&1); }
float calcularVWC(int r){ float V=-0.000049*pow(r,2)-0.0016*r+47.9; if(V<0)V=0; if(V>100)V=100; return V; }

void enableMux(int mux){
  // mux 0 -> activar MUX1_EN, desactivar MUX2_EN
  if(mux==0){ digitalWrite(MUX1_EN, LOW); digitalWrite(MUX2_EN, HIGH); }
  else { digitalWrite(MUX1_EN, HIGH); digitalWrite(MUX2_EN, LOW); }
}

void setupWiFi(){ WiFi.mode(WIFI_STA); WiFi.begin(WIFI_SSID,WIFI_PASSWORD); for(int i=0;i<40 && WiFi.status()!=WL_CONNECTED;i++){ delay(250);} wifiConnected=WiFi.status()==WL_CONNECTED; }
void setupFirebase(){ config.api_key=FIREBASE_API_KEY; config.database_url=FIREBASE_HOST; auth.user.email=USER_EMAIL; auth.user.password=USER_PASSWORD; config.token_status_callback=tokenStatusCallback; Firebase.reconnectWiFi(true); Firebase.begin(&config,&auth); for(int i=0;i<40 && !Firebase.ready(); i++){ delay(250);} firebaseReady=Firebase.ready(); }
bool verificarFirebase(){ if(!wifiConnected) return false; if(!Firebase.ready()){ firebaseReady=false; return false;} firebaseReady=true; return true; }

void fetchSystemConfig(){
  if(!verificarFirebase()) return;

  Serial.println(F("🔄 Leyendo system/config desde Firestore..."));
  String docPath = "system/config";

  if(Firebase.Firestore.getDocument(&fbdo, FIREBASE_PROJECT_ID, "", docPath.c_str())){
    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, fbdo.payload());
    if(err){
      Serial.print(F("❌ Error parseando system/config: "));
      Serial.println(err.c_str());
      return;
    }

    long defaultSec = doc["fields"]["defaultReadingIntervalSeconds"]["integerValue"] | 0;
    long activeSec = doc["fields"]["activeIrrigationIntervalSeconds"]["integerValue"] | 0;

    if(defaultSec > 0){
      defaultReadingIntervalMs = (unsigned long)defaultSec * 1000UL;
      Serial.print(F("✅ Intervalo Reposo (Default) actualizado: "));
      Serial.println(defaultSec);
    }
    if(activeSec > 0){
      activeIrrigationIntervalMs = (unsigned long)activeSec * 1000UL;
      Serial.print(F("✅ Intervalo Activo actualizado: "));
      Serial.println(activeSec);
    }
  } else {
    Serial.print(F("❌ Error leyendo system/config: "));
    Serial.println(fbdo.errorReason());
  }
}

void leerSensores(){
  Serial.println("📊 Leyendo 18 sensores (3 líneas)");
  for(int linea=0; linea<3; linea++){
    float suma=0;
    for(int offset=0; offset<6; offset++){
      int sensorGlobal = linea*6 + offset; // 0..17
      int muxIndex = (sensorGlobal < 12) ? 0 : 1; // asumiendo que los 12 primeros en MUX1 y ultimos 6 en MUX2
      int canal = (sensorGlobal < 12) ? sensorGlobal : (sensorGlobal - 12); // canal relativo 0..11 ó 0..5
      enableMux(muxIndex);
      setChannel(canal); delayMicroseconds(120);
      int raw = analogRead(SIG_PIN);
      vwc[sensorGlobal] = calcularVWC(raw);
      suma += vwc[sensorGlobal];
      Serial.printf("  L%d S%03d (mux%d ch%d): %d -> %.2f%%\n", linea+1, sensorGlobal, muxIndex, canal, raw, vwc[sensorGlobal]);
    }
    promedioLinea[linea] = suma / 6.0;
    Serial.printf("  >> Promedio linea-%d: %.2f%% (umbral %.1f)\n", linea+1, promedioLinea[linea], umbral[linea]);
  }
}

void actualizarEstadoValvula(int linea, bool on){
  int pin = (linea==0?VALV1:(linea==1?VALV2:VALV3));
  if(on && !estadoValvula[linea]){ digitalWrite(pin, LOW); estadoValvula[linea]=true; Serial.printf("⚡️ Válvula L%d ON\n", linea+1); }
  else if(!on && estadoValvula[linea]){ digitalWrite(pin, HIGH); estadoValvula[linea]=false; Serial.printf("🛑 Válvula L%d OFF\n", linea+1); }
}

void leerControlLineas(){
  if(!verificarFirebase()) return;

  for(int l=0;l<3;l++){
    String path=lineDocPath(l);
    if(Firebase.Firestore.getDocument(&fbdoControl,FIREBASE_PROJECT_ID,"",path.c_str())){
      FirebaseJson js; js.setJsonData(fbdoControl.payload()); FirebaseJsonData r;
      if(js.get(r,"fields/isActive/booleanValue")){
        bool remoto=r.boolValue; // remoto domina; se puede combinar con umbral según demanda
        bool activar = remoto && (promedioLinea[l] < umbral[l]);
        actualizarEstadoValvula(l, activar);
      }
    }
  }

  // (Sprint 16) Selección dinámica del intervalo de lectura según estado de válvulas
  bool anyValveActive = estadoValvula[0] || estadoValvula[1] || estadoValvula[2];
  if(anyValveActive){
    if(currentReadingIntervalMs != activeIrrigationIntervalMs){
      Serial.println(F("💧 RIEGO ACTIVO. Cambiando a intervalo rápido (5s)."));
      currentReadingIntervalMs = activeIrrigationIntervalMs;
      tLectura = millis(); // Forzar actualización inmediata
    }
  } else {
    if(currentReadingIntervalMs != defaultReadingIntervalMs){
      Serial.println(F("☀️ RIEGO DETENIDO. Cambiando a intervalo normal (5min)."));
      currentReadingIntervalMs = defaultReadingIntervalMs;
    }
  }
}

void patchSensorMeta(int idx){ String doc="sensors/"+sensorIds[idx]; FirebaseJson meta; meta.set("fields/lineId/stringValue", lineIds[idx/6]); meta.set("fields/status/stringValue","active"); meta.set("fields/title/stringValue", sensorTitles[idx]); if(!Firebase.Firestore.patchDocument(&fbdo,FIREBASE_PROJECT_ID,"",doc.c_str(),meta.raw(),"lineId,status,title")){ Firebase.Firestore.createDocument(&fbdo,FIREBASE_PROJECT_ID,"",doc.c_str(),meta.raw()); } }

void actualizarLineasFirestore(){ if(!verificarFirebase()) return; time_t now=time(nullptr); for(int l=0;l<3;l++){ String path=lineDocPath(l); FirebaseJson line; line.set("fields/humidity/doubleValue", promedioLinea[l]); line.set("fields/title/stringValue", String("Línea ")+ (l+1)); line.set("fields/lastUpdated/timestampValue", String((long long)now*1000)); if(!Firebase.Firestore.patchDocument(&fbdo,FIREBASE_PROJECT_ID,"",path.c_str(),line.raw(),"humidity,title,lastUpdated")){ Firebase.Firestore.createDocument(&fbdo,FIREBASE_PROJECT_ID,"",path.c_str(),line.raw()); } }}

void enviarLecturas(){ if(!verificarFirebase()) return; time_t now=time(nullptr);
  const long RAW_DATA_TTL_SECONDS = 5L * 24L * 60L * 60L; // (Sprint 17) TTL de 5 días para lecturas crudas
  for(int i=0;i<18;i++){
    patchSensorMeta(i);
    String readings="sensors/"+sensorIds[i]+"/readings";
    FirebaseJson c;
    c.set("fields/timestamp/mapValue/fields/seconds/integerValue", String(now));
    c.set("fields/valueVWC/doubleValue", vwc[i]);
    time_t expireAtTimestamp = now + RAW_DATA_TTL_SECONDS;
    c.set("fields/expireAt/mapValue/fields/seconds/integerValue", String(expireAtTimestamp));
    Firebase.Firestore.createDocument(&fbdo,FIREBASE_PROJECT_ID,"",readings.c_str(),c.raw());
    delay(20);
  }
}

void setup(){ Serial.begin(115200); delay(400); Serial.println("== Variante: 18 Sensores / 3 Válvulas ==");
  pinMode(S0,OUTPUT); pinMode(S1,OUTPUT); pinMode(S2,OUTPUT); pinMode(S3,OUTPUT); pinMode(SIG_PIN,INPUT);
  pinMode(MUX1_EN,OUTPUT); pinMode(MUX2_EN,OUTPUT); digitalWrite(MUX1_EN,HIGH); digitalWrite(MUX2_EN,HIGH);
  pinMode(VALV1,OUTPUT); pinMode(VALV2,OUTPUT); pinMode(VALV3,OUTPUT); digitalWrite(VALV1,HIGH); digitalWrite(VALV2,HIGH); digitalWrite(VALV3,HIGH);
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER); setupWiFi(); if(!wifiConnected){ while(1) delay(1000);} setupFirebase(); if(!firebaseReady){ while(1) delay(1000);} fetchSystemConfig(); }

void loop(){
  unsigned long ms=millis();

  // (Sprint 16) Verificar configuración remota periódicamente
  if(ms - lastConfigCheckMs >= configCheckIntervalMs){
    lastConfigCheckMs = ms;
    fetchSystemConfig();
  }

  if(ms - tLectura >= currentReadingIntervalMs){
    tLectura=ms;
    leerSensores();
    actualizarLineasFirestore();
    enviarLecturas();
  }

  if(ms - tControl >= intervaloControl){
    tControl=ms;
    leerControlLineas();
  }

  delay(10);
}