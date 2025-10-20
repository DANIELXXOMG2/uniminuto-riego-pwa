#!/bin/bash

# Script de Testing de Notificaciones Push
# Sistema de Riego Inteligente - Uniminuto

set -e

echo "🧪 Testing de Notificaciones Push"
echo "=================================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar Firebase CLI
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI no está instalado${NC}"
    exit 1
fi

# Menú de opciones
echo -e "${BLUE}Selecciona el tipo de test:${NC}"
echo ""
echo "1) Test de notificación manual (sendTestNotification)"
echo "2) Simular humedad baja (crear documento de prueba)"
echo "3) Simular cambio de estado de riego (actualizar documento)"
echo "4) Ver logs de Functions"
echo "5) Ver tokens FCM de usuarios"
echo "6) Salir"
echo ""
read -p "Opción (1-6): " option

case $option in
    1)
        echo ""
        echo -e "${YELLOW}📤 Invocando función de test...${NC}"
        echo ""
        echo "Esta función se ejecuta automáticamente cada 24 horas."
        echo "Para probarla ahora, usa Firebase Console o espera al siguiente ciclo."
        echo ""
        echo -e "${BLUE}Ver logs:${NC}"
        firebase functions:log --only sendTestNotification
        ;;
    
    2)
        echo ""
        echo -e "${YELLOW}💧 Simulando humedad baja...${NC}"
        echo ""
        read -p "ID de línea de riego (ej: line-1): " lineId
        read -p "Valor de humedad (ej: 15): " humidity
        
        echo -e "${BLUE}Ejecutando script de prueba...${NC}"
        cd /home/danielxxomg/proyectos/uniminuto-riego-pwa
        node scripts/test-low-humidity.js "$lineId" "$humidity"
        ;;
    
    3)
        echo ""
        echo -e "${YELLOW}💧 Simulando cambio de estado...${NC}"
        echo ""
        read -p "ID de línea de riego (ej: line-1): " lineId
        read -p "Nuevo estado (true/false): " newState
        
        echo -e "${BLUE}Ejecutando script de prueba...${NC}"
        cd /home/danielxxomg/proyectos/uniminuto-riego-pwa
        node scripts/test-status-change.js "$lineId" "$newState"
        ;;
    
    4)
        echo ""
        echo -e "${YELLOW}📋 Logs de Functions:${NC}"
        echo ""
        echo "1) onLowHumidityAlert"
        echo "2) onIrrigationStatusChange"
        echo "3) onSensorFailureCheck"
        echo "4) sendTestNotification"
        echo "5) Todas"
        echo ""
        read -p "Ver logs de (1-5): " logOption
        
        case $logOption in
            1) firebase functions:log --only onLowHumidityAlert ;;
            2) firebase functions:log --only onIrrigationStatusChange ;;
            3) firebase functions:log --only onSensorFailureCheck ;;
            4) firebase functions:log --only sendTestNotification ;;
            5) firebase functions:log ;;
            *) echo -e "${RED}❌ Opción inválida${NC}" ;;
        esac
        ;;
    
    5)
        echo ""
        echo -e "${YELLOW}🔑 Tokens FCM de usuarios:${NC}"
        echo ""
        
        cd /home/danielxxomg/proyectos/uniminuto-riego-pwa
        node scripts/get-fcm-tokens.js
        ;;
    
    6)
        echo -e "${YELLOW}👋 Saliendo...${NC}"
        exit 0
        ;;
    
    *)
        echo -e "${RED}❌ Opción inválida${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Test completado${NC}"
