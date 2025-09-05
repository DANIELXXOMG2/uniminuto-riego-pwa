/*
  Sistema de riego automatizado - Versión preliminar basada en codigo brindado por LLM (Prueba técnica)
  ---------------------------------------------------------------
  - Lee 18 sensores de humedad YL-100 usando 2 multiplexores CD74HC4067
  - Divide los sensores en 3 líneas de riego, con 6 sensores cada una
  - Calcula el promedio de humedad de cada línea (%VWC)
  - Compara el promedio con un umbral establecido (ajustable en el código)
  - Si el promedio está por debajo del umbral, activa la electroválvula de esa línea
  - Este código realiza una verificación cada 10 segundos
  ---------------------------------------------------------------
  NOTA: Este programa es una primera versión de prueba técnica.
        La lógica puede ajustarse más adelante para tiempos de riego,
        integración con app, almacenamiento de datos, etc.
*/

// --- Pines de control compartidos para los dos multiplexores ---
const int S0 = 2;
const int S1 = 3;
const int S2 = 4;
const int S3 = 5;

// --- Pines de señal analógica de cada multiplexor ---
const int SIG1 = A0;  // Señal del MUX1 (sensores 1–16)
const int SIG2 = A1;  // Señal del MUX2 (sensores 17–18)

// --- Pines de salida para controlar las electroválvulas ---
const int VALV1 = 8;  // Electroválvula línea 1
const int VALV2 = 9;  // Electroválvula línea 2
const int VALV3 = 10; // Electroválvula línea 3

// --- Umbrales configurables (%VWC) ---
// Si el promedio de humedad de una línea está por debajo del umbral, la válvula se activa
float UMBRAL1 = 30.0; // Umbral Línea 1
float UMBRAL2 = 30.0; // Umbral Línea 2
float UMBRAL3 = 30.0; // Umbral Línea 3

// --- Arrays para almacenar las lecturas ---
float vwc[18];     // Valores de %VWC de cada uno de los 18 sensores
float promedio[3]; // Promedios de cada línea (3 líneas)

// ---------- Funciones auxiliares ----------

// Selecciona el canal del multiplexor (0–15)
// Según el número, ajusta las 4 líneas de selección S0–S3
void setChannel(int channel) {
  digitalWrite(S0, channel & 0x01);
  digitalWrite(S1, (channel >> 1) & 0x01);
  digitalWrite(S2, (channel >> 2) & 0x01);
  digitalWrite(S3, (channel >> 3) & 0x01);
}

// Convierte la lectura analógica cruda (0–1023) a %VWC usando fórmula de calibración
float calcularVWC(int lectura) {
  float VWC = -0.000049 * pow(lectura, 2) - 0.0016 * lectura + 47.9;
  if (VWC < 0) VWC = 0;     // No permitir valores negativos
  if (VWC > 100) VWC = 100; // Saturar a 100% si se pasa
  return VWC;
}

// ---------- Setup ----------
void setup() {
  Serial.begin(9600); // Inicia comunicación serial a 9600 baudios

  // Configura pines de control de multiplexores como salidas
  pinMode(S0, OUTPUT);
  pinMode(S1, OUTPUT);
  pinMode(S2, OUTPUT);
  pinMode(S3, OUTPUT);

  // Configura los pines de válvulas como salidas
  pinMode(VALV1, OUTPUT);
  pinMode(VALV2, OUTPUT);
  pinMode(VALV3, OUTPUT);

  // Asegura que las electroválvulas estén cerradas al inicio
  digitalWrite(VALV1, LOW);
  digitalWrite(VALV2, LOW);
  digitalWrite(VALV3, LOW);
}

// ---------- Loop principal ----------
void loop() {
  int index = 0; // Contador para recorrer los 18 sensores

  // Recorrer todos los canales de los multiplexores
  for (int canal = 0; canal < 16; canal++) {
    setChannel(canal); // Selecciona el canal actual en ambos MUX
    delay(5);          // Pequeño tiempo de estabilización

    // --- Lectura desde el MUX1 (sensores 1–16) ---
    if (index < 16) { // Asegura no pasar del arreglo
      int lectura = analogRead(SIG1);      // Lee el canal en A0
      vwc[index] = calcularVWC(lectura);   // Convierte a %VWC
      index++;                             // Avanza al siguiente sensor
    }

    // --- Lectura desde el MUX2 (sensores 17–18) ---
    if (canal < 2 && index < 18) {         // Solo hay 2 sensores en este MUX
      int lectura = analogRead(SIG2);      // Lee el canal en A1
      vwc[index] = calcularVWC(lectura);   // Convierte a %VWC
      index++;                             // Avanza al siguiente sensor
    }
  }

  // --- Calcular promedio de cada línea ---
  // Línea 1 → sensores 1–6 (índices 0–5)
  promedio[0] = (vwc[0] + vwc[1] + vwc[2] + vwc[3] + vwc[4] + vwc[5]) / 6.0;

  // Línea 2 → sensores 7–12 (índices 6–11)
  promedio[1] = (vwc[6] + vwc[7] + vwc[8] + vwc[9] + vwc[10] + vwc[11]) / 6.0;

  // Línea 3 → sensores 13–18 (índices 12–17)
  promedio[2] = (vwc[12] + vwc[13] + vwc[14] + vwc[15] + vwc[16] + vwc[17]) / 6.0;

  // --- Mostrar resultados en Monitor Serial ---
  Serial.println("----- Lecturas de lineas -----");
  for (int i = 0; i < 3; i++) {
    Serial.print("Linea ");
    Serial.print(i + 1);
    Serial.print(" Promedio: ");
    Serial.print(promedio[i], 2); // Mostrar con 2 decimales
    Serial.println("%");
  }

  // --- Control de válvulas ---
  // Si el promedio de la línea está POR DEBAJO del umbral → activa válvula
  if (promedio[0] < UMBRAL1) digitalWrite(VALV1, HIGH);
  else digitalWrite(VALV1, LOW);

  if (promedio[1] < UMBRAL2) digitalWrite(VALV2, HIGH);
  else digitalWrite(VALV2, LOW);

  if (promedio[2] < UMBRAL3) digitalWrite(VALV3, HIGH);
  else digitalWrite(VALV3, LOW);

  // Espera 10 segundos antes de hacer otra verificación
  delay(10000);
}
