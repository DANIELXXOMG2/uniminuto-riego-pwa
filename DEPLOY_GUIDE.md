# 🚀 Guía de Despliegue y Testing - Sistema de Notificaciones Push

## 📋 Estado del Proyecto

✅ **COMPLETADO:**
- Persistencia offline de Firestore
- PWA configurada con Service Workers
- Firebase Cloud Messaging (FCM) configurado
- 4 Cloud Functions creadas y compiladas
- Sistema de notificaciones automáticas

## 🎯 Próximos Pasos

### 1. Despliegue de Cloud Functions

#### Opción A: Script Automatizado (Recomendado)
```bash
./deploy-functions.sh
```

Este script interactivo te permitirá:
- Verificar autenticación
- Compilar las Functions
- Elegir qué funciones desplegar
- Ver el resultado del despliegue

#### Opción B: Manual
```bash
# Compilar
cd functions
npm run build
cd ..

# Desplegar todas las funciones
firebase deploy --only functions

# O desplegar una función específica
firebase deploy --only functions:onLowHumidityAlert
firebase deploy --only functions:onIrrigationStatusChange
firebase deploy --only functions:onSensorFailureCheck
firebase deploy --only functions:sendTestNotification
```

### 2. Verificar Despliegue

```bash
# Ver lista de funciones desplegadas
firebase functions:list

# Ver logs de funciones
firebase functions:log
```

También puedes verificar en:
- Firebase Console → Functions
- https://console.firebase.google.com/project/uniminuto-riego-pwa/functions

### 3. Testing de Notificaciones

#### Opción A: Script de Testing (Recomendado)
```bash
./test-notifications.sh
```

Este script te permite:
1. Enviar notificación de prueba manual
2. Simular humedad baja
3. Simular cambio de estado de riego
4. Ver logs de las funciones
5. Ver tokens FCM de usuarios registrados

#### Opción B: Testing Manual

**Test 1: Notificación Manual**
```bash
firebase functions:shell
> sendTestNotification()
```

**Test 2: Simular Humedad Baja**
- Ve a Firebase Console → Firestore
- Edita un documento en `irrigationLines`
- Cambia `humidity` a un valor < 20
- Espera la notificación

**Test 3: Cambio de Estado**
- En Firestore, edita un documento de `irrigationLines`
- Cambia `isActive` de `false` a `true` (o viceversa)
- Espera la notificación

### 4. Configurar lastUpdated para Sensor Failure

Para que la función `onSensorFailureCheck` funcione correctamente, asegúrate de que:

1. Tus documentos en `irrigationLines` tengan el campo `lastUpdated`:
```javascript
// En tu código de actualización de sensores
await db.collection('irrigationLines').doc(lineId).update({
  humidity: newHumidity,
  lastUpdated: admin.firestore.FieldValue.serverTimestamp()
});
```

2. O actualízalos manualmente en Firestore:
- Ve a cada documento en `irrigationLines`
- Añade campo `lastUpdated` de tipo `timestamp`
- Establece la fecha actual

### 5. Habilitar Cloud Scheduler (Importante)

La función `onSensorFailureCheck` usa Cloud Scheduler. Debes habilitarlo:

1. Ve a: https://console.cloud.google.com/cloudscheduler
2. Selecciona proyecto: `uniminuto-riego-pwa`
3. Si es la primera vez, haz clic en "Enable API"
4. El scheduler se creará automáticamente al desplegar la función

## 🔍 Monitoreo y Debugging

### Ver Logs en Tiempo Real
```bash
# Todos los logs
firebase functions:log

# Logs de una función específica
firebase functions:log --only onLowHumidityAlert

# Logs con filtro de error
firebase functions:log --only onLowHumidityAlert --level ERROR
```

### Consola de Firebase
- **Functions**: https://console.firebase.google.com/project/uniminuto-riego-pwa/functions
- **Logs**: https://console.firebase.google.com/project/uniminuto-riego-pwa/functions/logs
- **Cloud Scheduler**: https://console.cloud.google.com/cloudscheduler?project=uniminuto-riego-pwa

### Métricas Importantes
- Invocaciones por función
- Errores y fallos
- Tiempo de ejecución
- Uso de memoria

## 📱 Testing en Cliente (PWA)

### Verificar Permisos
1. Abre la aplicación web: http://localhost:3000 (desarrollo) o tu URL de producción
2. Ve al Dashboard
3. Deberías ver un banner solicitando permisos de notificación
4. Haz clic en "Permitir notificaciones"
5. Verifica que aparezca el mensaje de confirmación

### Verificar Token FCM
```bash
# Ejecuta el script de testing
./test-notifications.sh
# Selecciona opción 5: "Ver tokens FCM de usuarios"
```

O directamente en Firestore:
- Ve a la colección `users`
- Busca tu usuario
- Verifica que tenga el array `fcmTokens` con al menos un token

### Verificar Service Worker
1. Abre DevTools (F12)
2. Ve a la pestaña "Application"
3. En el menú lateral, busca "Service Workers"
4. Deberías ver `firebase-messaging-sw.js` registrado

## 🐛 Troubleshooting

### Las notificaciones no llegan

**Check 1: Tokens FCM**
```bash
./test-notifications.sh
# Opción 5: Ver tokens FCM
```
- Verifica que los usuarios tengan tokens
- Los usuarios admin son los únicos que reciben notificaciones

**Check 2: Service Worker**
- Abre DevTools → Application → Service Workers
- Verifica que `firebase-messaging-sw.js` esté activo
- Si no está, recarga la página

**Check 3: Permisos del Navegador**
- Chrome: chrome://settings/content/notifications
- Verifica que tu sitio tenga permisos

**Check 4: Logs de Functions**
```bash
firebase functions:log
```
- Busca errores como "Invalid token" o "Send failed"

### Las Functions no se disparan

**Check 1: Verifica el despliegue**
```bash
firebase functions:list
```
- Todas las funciones deben aparecer como "deployed"

**Check 2: Verifica los triggers**
- `onLowHumidityAlert`: Se dispara al actualizar `humidity` en `irrigationLines`
- `onIrrigationStatusChange`: Se dispara al cambiar `isActive` en `irrigationLines`
- `onSensorFailureCheck`: Se ejecuta cada hora automáticamente

**Check 3: Revisa los logs**
```bash
firebase functions:log --level ERROR
```

### Cloud Scheduler no funciona

1. Verifica que está habilitado:
   - https://console.cloud.google.com/cloudscheduler
   
2. Verifica la región:
   - El proyecto debe estar en `us-central1`
   
3. Verifica el job:
   - Debe aparecer como `firebase-schedule-onSensorFailureCheck-us-central1`
   - Estado debe ser "Enabled"

## 💰 Costos Esperados

Con el uso estimado del proyecto:

| Recurso | Uso Mensual | Costo |
|---------|-------------|-------|
| Invocaciones | ~1,500 | **GRATIS** (bajo el límite) |
| Tiempo de CPU | <10K GB-seg | **GRATIS** (bajo el límite) |
| Tiempo de red | <5K GB-seg | **GRATIS** (bajo el límite) |
| **TOTAL** | - | **$0.00 USD/mes** |

⚠️ **Nota**: Estos costos son estimados. Monitorea tu uso en:
https://console.firebase.google.com/project/uniminuto-riego-pwa/usage

## 📚 Documentación Adicional

- **Cloud Functions**: `/functions/FUNCTIONS_README.md`
- **Variables de entorno**: `/functions/.env.example`
- **Estructura del proyecto**: `/apps/web/ESTRUCTURA.md`
- **Rutas de la app**: `/apps/web/RUTAS.md`

## 🎉 Checklist de Despliegue

Antes de marcar como completado, verifica:

- [ ] Cloud Functions desplegadas exitosamente
- [ ] Cloud Scheduler habilitado y funcionando
- [ ] Al menos un usuario admin con token FCM registrado
- [ ] Service Worker activo en el navegador
- [ ] Permisos de notificación otorgados
- [ ] Test de notificación manual exitoso
- [ ] Test de humedad baja exitoso
- [ ] Test de cambio de estado exitoso
- [ ] Campo `lastUpdated` presente en documentos
- [ ] Logs sin errores críticos

## 🚀 Comando Rápido para Deploy

```bash
# Deploy completo
./deploy-functions.sh

# Selecciona opción 1 (Todas las funciones)
```

## 🧪 Comando Rápido para Testing

```bash
# Test completo
./test-notifications.sh

# Prueba cada opción del 1 al 5
```

---

**Última actualización**: ${new Date().toISOString()}
**Proyecto**: uniminuto-riego-pwa
**Región**: us-central1
