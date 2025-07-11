// Pin del sensor
const int sensorPin = A0;

// Variable para almacenar la lectura
int lecturaSensor = 0;

// Variable para almacenar el VWC calculado
float humedadVWC = 0.0;

void setup() {
  Serial.begin(9600);
}

void loop() {
  // Leer el valor analógico del sensor
  lecturaSensor = analogRead(sensorPin);

  // Calcular el % de humedad (VWC) usando la fórmula de calibración
  // y = 1196.1x² - 2216.6x + 1141.5
  float x = lecturaSensor;
  humedadVWC = 1196.1 * pow(x, 2) - 2216.6 * x + 1141.5;

  // Evitar valores negativos o excesivos
  if (humedadVWC < 0) {
    humedadVWC = 0;
  }
  if (humedadVWC > 100) {
    humedadVWC = 100;
  }

  // Mostrar los resultados por Serial
  Serial.print("Lectura analogica: ");
  Serial.print(lecturaSensor);
  Serial.print(" | Humedad estimada (VWC %): ");
  Serial.println(humedadVWC);

  // Esperar 4 segundos
  delay(4000);
}
