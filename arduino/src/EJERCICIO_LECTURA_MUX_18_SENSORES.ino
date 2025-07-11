// Pines selectores del CD74HC4067
const int S0 = 2;
const int S1 = 3;
const int S2 = 4;
const int S3 = 5;

// Pin analógico de lectura
const int analogPin = A0;

// Pines de control de habilitación de cada multiplexor
const int mux1Enable = 6; // Controla primer multiplexor
const int mux2Enable = 7; // Controla segundo multiplexor

// Total de sensores
const int totalSensores = 18;

// Arreglo para almacenar lecturas
int lecturas[totalSensores];

void setup() {
  Serial.begin(9600);

  // Configurar pines de selección
  pinMode(S0, OUTPUT);
  pinMode(S1, OUTPUT);
  pinMode(S2, OUTPUT);
  pinMode(S3, OUTPUT);

  // Configurar pines de habilitación de multiplexores
  pinMode(mux1Enable, OUTPUT);
  pinMode(mux2Enable, OUTPUT);

  digitalWrite(mux1Enable, LOW);
  digitalWrite(mux2Enable, LOW);
}

// Función para seleccionar el canal del multiplexor
void seleccionarCanal(int canal) {
  digitalWrite(S0, canal & 0x01);
  digitalWrite(S1, (canal >> 1) & 0x01);
  digitalWrite(S2, (canal >> 2) & 0x01);
  digitalWrite(S3, (canal >> 3) & 0x01);
}

// Función para leer un sensor específico
int leerSensor(int sensorIndex) {
  int canal = sensorIndex % 9; // canal 0 a 8
  bool usarMux1 = (sensorIndex < 9);

  // Activar solo el multiplexor correspondiente
  digitalWrite(mux1Enable, usarMux1 ? LOW : HIGH);
  digitalWrite(mux2Enable, usarMux1 ? HIGH : LOW);

  seleccionarCanal(canal);
  delay(10); // pequeña espera para estabilizar señal

  return analogRead(analogPin);
}

// Función para convertir lectura analógica en VWC
float calcularVWC(int lectura) {
  float x = lectura;
  float vwc = 1196.1 * pow(x, 2) - 2216.6 * x + 1141.5;

  if (vwc < 0) vwc = 0;
  if (vwc > 100) vwc = 100;

  return vwc;
}

void loop() {
  float sumaSys1 = 0;
  float sumaSys2 = 0;
  float sumaSys3 = 0;

  for (int i = 0; i < totalSensores; i++) {
    int lectura = leerSensor(i);
    float humedad = calcularVWC(lectura);

    // Guardar la lectura en el arreglo (opcional si quieres verlas después)
    lecturas[i] = lectura;

    // Sumar en el grupo correspondiente
    if (i < 6) {
      sumaSys1 += humedad;
    } else if (i < 12) {
      sumaSys2 += humedad;
    } else {
      sumaSys3 += humedad;
    }
  }

  // Calcular promedios
  float AvgSys1 = sumaSys1 / 6.0;
  float AvgSys2 = sumaSys2 / 6.0;
  float AvgSys3 = sumaSys3 / 6.0;

  // Mostrar resultados
  Serial.println("----- PROMEDIOS DE SISTEMAS -----");
  Serial.print("AvgSys1 (Sensores 1-6): ");
  Serial.println(AvgSys1);
  Serial.print("AvgSys2 (Sensores 7-12): ");
  Serial.println(AvgSys2);
  Serial.print("AvgSys3 (Sensores 13-18): ");
  Serial.println(AvgSys3);
  Serial.println("---------------------------------");

  delay(5000); // Espera 5 segundos antes de la próxima lectura
}
