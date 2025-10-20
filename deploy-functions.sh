#!/bin/bash

# Script de Despliegue de Firebase Functions
# Sistema de Riego Inteligente - Uniminuto

set -e  # Salir si hay algún error

echo "🚀 Iniciando despliegue de Firebase Functions..."
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "firebase.json" ]; then
    echo -e "${RED}❌ Error: firebase.json no encontrado${NC}"
    echo "Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Verificar que Firebase CLI esté instalado
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI no está instalado${NC}"
    echo "Instálalo con: npm install -g firebase-tools"
    exit 1
fi

# Verificar autenticación
echo -e "${YELLOW}🔐 Verificando autenticación...${NC}"
if ! firebase projects:list &> /dev/null; then
    echo -e "${RED}❌ No estás autenticado en Firebase${NC}"
    echo "Ejecuta: firebase login"
    exit 1
fi

# Mostrar proyecto actual
PROJECT=$(firebase use)
echo -e "${GREEN}✅ Proyecto: $PROJECT${NC}"
echo ""

# Compilar Functions
echo -e "${YELLOW}🔨 Compilando Functions...${NC}"
cd functions
bun run lint
bun run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Compilación exitosa${NC}"
else
    echo -e "${RED}❌ Error en la compilación${NC}"
    exit 1
fi

cd ..

# Preguntar qué desplegar
echo ""
echo -e "${YELLOW}📦 ¿Qué deseas desplegar?${NC}"
echo "1) Todas las funciones"
echo "2) Solo onLowHumidityAlert"
echo "3) Solo onIrrigationStatusChange"
echo "4) Solo onSensorFailureCheck"
echo "5) Solo sendTestNotification"
echo "6) Cancelar"
echo ""
read -p "Selecciona una opción (1-6): " option

case $option in
    1)
        echo -e "${YELLOW}🚀 Desplegando todas las funciones...${NC}"
        firebase deploy --only functions
        ;;
    2)
        echo -e "${YELLOW}🚀 Desplegando onLowHumidityAlert...${NC}"
        firebase deploy --only functions:onLowHumidityAlert
        ;;
    3)
        echo -e "${YELLOW}🚀 Desplegando onIrrigationStatusChange...${NC}"
        firebase deploy --only functions:onIrrigationStatusChange
        ;;
    4)
        echo -e "${YELLOW}🚀 Desplegando onSensorFailureCheck...${NC}"
        firebase deploy --only functions:onSensorFailureCheck
        ;;
    5)
        echo -e "${YELLOW}🚀 Desplegando sendTestNotification...${NC}"
        firebase deploy --only functions:sendTestNotification
        ;;
    6)
        echo -e "${YELLOW}❌ Cancelado${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Opción inválida${NC}"
        exit 1
        ;;
esac

# Verificar resultado
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Despliegue exitoso!${NC}"
    echo ""
    echo -e "${YELLOW}📊 Para ver los logs:${NC}"
    echo "firebase functions:log"
    echo ""
    echo -e "${YELLOW}🔍 Para ver el estado:${NC}"
    echo "firebase functions:list"
    echo ""
else
    echo -e "${RED}❌ Error en el despliegue${NC}"
    exit 1
fi
