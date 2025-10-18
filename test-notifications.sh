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
        firebase functions:shell << EOF
sendTestNotification()
EOF
        ;;
    
    2)
        echo ""
        echo -e "${YELLOW}💧 Simulando humedad baja...${NC}"
        echo ""
        read -p "ID de línea de riego (ej: line-1): " lineId
        read -p "Valor de humedad (ej: 15): " humidity
        
        # Crear script Node.js temporal
        cat > /tmp/test-humidity.js << SCRIPT
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function testLowHumidity() {
  try {
    await db.collection('irrigationLines').doc('$lineId').set({
      nombre: 'Línea de Test',
      humidity: parseFloat('$humidity'),
      isActive: false,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log('✅ Documento actualizado. Espera a que se dispare la Function...');
    console.log('Revisa los logs con: firebase functions:log --only onLowHumidityAlert');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testLowHumidity();
SCRIPT
        
        echo -e "${BLUE}Ejecutando en Firebase...${NC}"
        cd /home/danielxxomg/proyectos/uniminuto-riego-pwa/functions
        node /tmp/test-humidity.js
        rm /tmp/test-humidity.js
        ;;
    
    3)
        echo ""
        echo -e "${YELLOW}💧 Simulando cambio de estado...${NC}"
        echo ""
        read -p "ID de línea de riego (ej: line-1): " lineId
        read -p "Nuevo estado (true/false): " newState
        
        # Crear script Node.js temporal
        cat > /tmp/test-status.js << SCRIPT
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function testStatusChange() {
  try {
    const isActive = '$newState' === 'true';
    
    await db.collection('irrigationLines').doc('$lineId').update({
      isActive: isActive,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Estado actualizado. Espera a que se dispare la Function...');
    console.log('Revisa los logs con: firebase functions:log --only onIrrigationStatusChange');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testStatusChange();
SCRIPT
        
        echo -e "${BLUE}Ejecutando en Firebase...${NC}"
        cd /home/danielxxomg/proyectos/uniminuto-riego-pwa/functions
        node /tmp/test-status.js
        rm /tmp/test-status.js
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
        
        # Crear script Node.js temporal
        cat > /tmp/get-tokens.js << 'SCRIPT'
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function getTokens() {
  try {
    const usersSnapshot = await db.collection('users').get();
    
    console.log(`\n📊 Total usuarios: ${usersSnapshot.size}\n`);
    
    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      const tokens = data.fcmTokens || [];
      const role = data.role || 'user';
      
      console.log(`👤 ${doc.id} (${role})`);
      console.log(`   Email: ${data.email || 'N/A'}`);
      console.log(`   Tokens: ${tokens.length}`);
      
      if (tokens.length > 0) {
        tokens.forEach((token, idx) => {
          console.log(`   ${idx + 1}. ${token.substring(0, 20)}...`);
        });
      }
      console.log('');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

getTokens();
SCRIPT
        
        cd /home/danielxxomg/proyectos/uniminuto-riego-pwa/functions
        node /tmp/get-tokens.js
        rm /tmp/get-tokens.js
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
