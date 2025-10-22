#!/bin/bash

# Script de Verificación - Firmware Arduino UNO + ESP-12F
# Este script verifica que todos los archivos necesarios estén presentes

echo "=========================================="
echo "Verificación de Firmware Arduino"
echo "=========================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
ERRORS=0
WARNINGS=0
CHECKS=0

# Función para verificar archivo
check_file() {
    local file=$1
    local required=$2
    CHECKS=$((CHECKS + 1))
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file existe"
        return 0
    else
        if [ "$required" = "required" ]; then
            echo -e "${RED}✗${NC} $file NO EXISTE (requerido)"
            ERRORS=$((ERRORS + 1))
            return 1
        else
            echo -e "${YELLOW}⚠${NC} $file NO EXISTE (opcional)"
            WARNINGS=$((WARNINGS + 1))
            return 1
        fi
    fi
}

# Función para verificar directorio
check_dir() {
    local dir=$1
    CHECKS=$((CHECKS + 1))
    
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $dir existe"
        return 0
    else
        echo -e "${RED}✗${NC} $dir NO EXISTE"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

echo "1. Verificando estructura de directorios..."
echo "--------------------------------------------"
check_dir "packages/arduino"
check_dir "packages/arduino/src"
echo ""

echo "2. Verificando archivos de código..."
echo "--------------------------------------------"
check_file "packages/arduino/src/main.ino" "required"
check_file "packages/arduino/platformio.ini" "required"
echo ""

echo "3. Verificando archivos de configuración..."
echo "--------------------------------------------"
check_file "packages/arduino/src/config.example.h" "required"
if check_file "packages/arduino/src/config.h" "optional"; then
    echo -e "   ${GREEN}→${NC} config.h está listo para usar"
else
    echo -e "   ${YELLOW}→${NC} Debe copiar config.example.h a config.h"
    echo -e "   ${YELLOW}→${NC} Comando: cp packages/arduino/src/config.example.h packages/arduino/src/config.h"
fi
echo ""

echo "4. Verificando documentación..."
echo "--------------------------------------------"
check_file "packages/arduino/README.md" "required"
check_file "packages/arduino/QUICKSTART.md" "optional"
check_file "packages/arduino/IMPLEMENTATION_SUMMARY.md" "optional"
echo ""

echo "5. Verificando contenido de archivos clave..."
echo "--------------------------------------------"

# Verificar que main.ino tenga las librerías correctas
if [ -f "packages/arduino/src/main.ino" ]; then
    if grep -q "SoftwareSerial" packages/arduino/src/main.ino; then
        echo -e "${GREEN}✓${NC} main.ino incluye SoftwareSerial"
    else
        echo -e "${RED}✗${NC} main.ino NO incluye SoftwareSerial"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "ArduinoJson" packages/arduino/src/main.ino; then
        echo -e "${GREEN}✓${NC} main.ino incluye ArduinoJson"
    else
        echo -e "${RED}✗${NC} main.ino NO incluye ArduinoJson"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "enviarDatos" packages/arduino/src/main.ino; then
        echo -e "${GREEN}✓${NC} main.ino tiene función enviarDatos()"
    else
        echo -e "${RED}✗${NC} main.ino NO tiene función enviarDatos()"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "AT+CIPSTART" packages/arduino/src/main.ino; then
        echo -e "${GREEN}✓${NC} main.ino usa comandos AT"
    else
        echo -e "${RED}✗${NC} main.ino NO usa comandos AT"
        ERRORS=$((ERRORS + 1))
    fi
fi
echo ""

# Verificar platformio.ini
if [ -f "packages/arduino/platformio.ini" ]; then
    if grep -q "board = uno" packages/arduino/platformio.ini; then
        echo -e "${GREEN}✓${NC} platformio.ini configurado para Arduino UNO"
    else
        echo -e "${YELLOW}⚠${NC} platformio.ini podría no estar configurado para Arduino UNO"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    if grep -q "ArduinoJson" packages/arduino/platformio.ini; then
        echo -e "${GREEN}✓${NC} platformio.ini incluye librería ArduinoJson"
    else
        echo -e "${RED}✗${NC} platformio.ini NO incluye librería ArduinoJson"
        ERRORS=$((ERRORS + 1))
    fi
fi
echo ""

echo "6. Verificando config.example.h..."
echo "--------------------------------------------"
if [ -f "packages/arduino/src/config.example.h" ]; then
    if grep -q "WIFI_SSID" packages/arduino/src/config.example.h; then
        echo -e "${GREEN}✓${NC} config.example.h define WIFI_SSID"
    else
        echo -e "${RED}✗${NC} config.example.h NO define WIFI_SSID"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "API_HOST" packages/arduino/src/config.example.h; then
        echo -e "${GREEN}✓${NC} config.example.h define API_HOST"
    else
        echo -e "${RED}✗${NC} config.example.h NO define API_HOST"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "API_SECRET" packages/arduino/src/config.example.h; then
        echo -e "${GREEN}✓${NC} config.example.h define API_SECRET"
    else
        echo -e "${RED}✗${NC} config.example.h NO define API_SECRET"
        ERRORS=$((ERRORS + 1))
    fi
fi
echo ""

# Verificar si config.h está configurado
if [ -f "packages/arduino/src/config.h" ]; then
    echo "7. Verificando config.h (configuración real)..."
    echo "--------------------------------------------"
    
    if grep -q "TU_WIFI_SSID" packages/arduino/src/config.h; then
        echo -e "${YELLOW}⚠${NC} config.h aún tiene valores de ejemplo (TU_WIFI_SSID)"
        echo -e "   ${YELLOW}→${NC} Debe editar config.h con valores reales"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✓${NC} config.h parece estar configurado (no tiene valores de ejemplo)"
    fi
    
    if grep -q "tu-app.vercel.app" packages/arduino/src/config.h; then
        echo -e "${YELLOW}⚠${NC} config.h aún tiene API_HOST de ejemplo"
        echo -e "   ${YELLOW}→${NC} Debe configurar la URL de Vercel real"
        WARNINGS=$((WARNINGS + 1))
    fi
    echo ""
fi

# Resumen
echo "=========================================="
echo "RESUMEN DE VERIFICACIÓN"
echo "=========================================="
echo -e "Total de verificaciones: $CHECKS"
echo -e "${GREEN}Exitosas:${NC} $((CHECKS - ERRORS - WARNINGS))"
echo -e "${YELLOW}Advertencias:${NC} $WARNINGS"
echo -e "${RED}Errores:${NC} $ERRORS"
echo ""

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✓ Todos los archivos están presentes y configurados correctamente${NC}"
        echo ""
        echo "Próximos pasos:"
        echo "1. Compilar: cd packages/arduino && pio run"
        echo "2. Cargar: pio run --target upload"
        echo "3. Monitor: pio device monitor"
        exit 0
    else
        echo -e "${YELLOW}⚠ Verificación completada con advertencias${NC}"
        echo -e "${YELLOW}  Revise las advertencias anteriores antes de continuar${NC}"
        echo ""
        echo "Acciones recomendadas:"
        if [ ! -f "packages/arduino/src/config.h" ]; then
            echo "1. cp packages/arduino/src/config.example.h packages/arduino/src/config.h"
            echo "2. nano packages/arduino/src/config.h  # Editar configuración"
        else
            echo "1. nano packages/arduino/src/config.h  # Verificar configuración"
        fi
        exit 0
    fi
else
    echo -e "${RED}✗ Verificación FALLÓ${NC}"
    echo -e "${RED}  Hay errores críticos que deben corregirse${NC}"
    echo ""
    echo "Por favor, revise los errores anteriores."
    exit 1
fi
