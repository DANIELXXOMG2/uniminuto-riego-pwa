void setup() {
  Serial.begin(9600); // Inicia la comunicación serial
}

void loop() {
  int lectura = analogRead(A0); // Lee el valor del sensor en el pin A0 (o el pin donde esté conectado tu sensor)

  // Calibración usando la fórmula de segundo grado para lecturas >= 157.6
  // VWC (%) = -0.000049 * (x)^2 - 0.0016 * (x) + 47.9
  // Usamos 'lectura' como 'x' en la fórmula

  // Es importante usar 'float' para los cálculos para mantener la precisión
  float VWC_calculado = -0.000049 * pow(lectura, 2) - 0.0016 * lectura + 47.9;

  // Interpretar valores negativos como 0% VWC
  if (VWC_calculado < 0) {
    VWC_calculado = 0;
  }

  // Muestra en el Monitor Serial
  Serial.print("Lectura (0-1023): ");
  Serial.print(lectura);
  Serial.print(" -> %VWC: ");
  Serial.println(VWC_calculado, 2); // Muestra con 2 decimales

  delay(1000); // Espera 1 segundo antes de la siguiente lectura
}