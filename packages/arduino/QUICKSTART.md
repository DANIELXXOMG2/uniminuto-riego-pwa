# Guía Rápida - Arduino UNO + ESP-12F

## 🚀 Setup Rápido (5 minutos)

### 1. Hardware Mínimo

```
Arduino UNO ──[USB]── PC
     │
     ├── Pin 2 (RX) ← ESP8266 TX
     ├── Pin 3 (TX) → [Divisor 5V→3.3V] → ESP8266 RX
     ├── Pin A0 ← Multiplexor 1 SIG
     ├── Pin A1 ← Multiplexor 2 SIG
     ├── Pins 4-7 → Multiplexores S0-S3
     └── Pins 8-10 → Relés (Válvulas)

ESP8266 (3.3V):
     ├── VCC → 3.3V (fuente externa)
     ├── GND → GND
     ├── CH_PD → 3.3V
     ├── GPIO0 → 3.3V
     └── GPIO15 → GND
```

### 2. Configuración Software

```bash
# 1. Copiar config
cd packages/arduino/src
cp config.example.h config.h

# 2. Editar config.h
nano config.h
# Cambiar:
# - WIFI_SSID
# - WIFI_PASSWORD
# - API_HOST
# - API_SECRET

# 3. Compilar y cargar
cd ..
pio run --target upload

# 4. Monitor
pio device monitor
```

### 3. Verificar Conexión

En el Monitor Serial (9600 baud) deberías ver:

```
✅ WiFi conectado exitosamente
✅ Envio completado!
```

## 🧪 Prueba Local (ngrok)

```bash
# Terminal 1: Iniciar Next.js
cd apps/web
npm run dev

# Terminal 2: Exponer con ngrok
ngrok http 3000
# Copiar URL: 1234-56-789.ngrok-free.app

# Terminal 3: Actualizar Arduino
cd packages/arduino/src
nano config.h
# Cambiar API_HOST a la URL de ngrok (sin https://)

# Recompilar y cargar
cd ..
pio run --target upload && pio device monitor
```

## 🔧 Comandos AT de Prueba

Abrir Monitor Serial (9600 baud) y probar:

```
AT                          → OK
AT+GMR                      → Versión firmware
AT+CWMODE=1                → Modo estación
AT+CWJAP="wifi","pass"     → Conectar WiFi
AT+CIFSR                   → Mostrar IP
```

## 🐛 Problemas Comunes

| Problema | Solución Rápida |
|----------|-----------------|
| ESP8266 no responde | Verificar conexiones RX/TX y divisor de voltaje |
| WiFi no conecta | Usar WiFi 2.4GHz, verificar SSID/password |
| Error 401 en servidor | Verificar API_SECRET coincide con Vercel |
| Sensores con valores raros | Ajustar calibración en `calcularVWC()` |

## 📊 Logs Esperados

```
========================================
SISTEMA DE RIEGO AUTOMATIZADO
Arduino UNO + ESP-12F (AT Commands)
========================================

[✓] Hardware configurado
[✓] WiFi conectado: 192.168.1.100
[✓] Sensores leídos: 18 valores
[✓] Datos enviados al servidor
[✓] Válvulas controladas

Proxima lectura en: 10 minutos
```

## 📚 Documentación Completa

Ver `README.md` para:
- Conexiones detalladas
- Troubleshooting avanzado
- Calibración de sensores
- Seguridad y optimizaciones
