# 🔧 Scripts de Testing - Guía de Uso

## ✅ **PROBLEMA RESUELTO**

Los scripts ahora funcionan correctamente con el `serviceAccountKey.json` que ya tienes en `functions/`.

---

## 🧪 Scripts Disponibles

### 1. **test-low-humidity.js** - Simular Alerta de Humedad Baja

```bash
# Uso básico (humedad 15%, line test-line-1)
node test-low-humidity.js

# Personalizado
node test-low-humidity.js test-line-2 25
#                        ↑            ↑
#                        lineId      humedad%
```

**Qué hace:**
1. Establece humedad alta (30%)
2. Espera 2 segundos
3. Baja la humedad al valor especificado
4. ⚡ Dispara `onLowHumidityAlert` si < 35%

**Output esperado:**
```
✅ Autenticado con Firebase Admin SDK

💧 Simulando humedad baja:
   Línea: test-line-1
   Humedad: 15%

1️⃣  Estableciendo humedad alta (30%)...
⏳ Esperando 2 segundos...
2️⃣  Bajando humedad a 15%...

✅ Documento actualizado exitosamente
🔔 La Cloud Function debería dispararse en unos segundos
```

---

### 2. **test-status-change.js** - Simular Cambio de Estado

```bash
# Uso básico (activa la línea test-line-1)
node test-status-change.js

# Desactivar línea
node test-status-change.js test-line-1 false

# Activar línea específica
node test-status-change.js line-2 true
```

**Qué hace:**
1. Verifica si existe el documento
2. Lo crea si no existe
3. Cambia el estado (isActive)
4. ⚡ Dispara `onIrrigationStatusChange`

**Output esperado:**
```
✅ Autenticado con Firebase Admin SDK

💧 Simulando cambio de estado:
   Línea: test-line-1
   Nuevo estado: ACTIVO

Cambiando estado a: ACTIVO ✅

✅ Estado actualizado exitosamente
🔔 La Cloud Function debería dispararse en unos segundos
```

---

### 3. **get-fcm-tokens.js** - Ver Tokens FCM de Usuarios

```bash
# Listar todos los tokens
node get-fcm-tokens.js
```

**Qué hace:**
1. Lee la colección `users`
2. Extrae los FCM tokens
3. Muestra resumen por rol (admin/user)

**Output esperado:**
```
✅ Autenticado con Firebase Admin SDK

🔑 Obteniendo tokens FCM de usuarios...

📊 Total de usuarios: 1

════════════════════════════════════════════════════════════

👤 Usuario: uqphMNbwyCUUwtSPkuzVapbEccS2
   Email: danielbello.dev@gmail.com
   Rol: USER
   Tokens: 1
   1. f7xN2mIE_r66LU7ufocLge:APA91bFFu1Pz36DPY...

════════════════════════════════════════════════════════════

📊 Resumen:
   Total de tokens: 1
   Tokens de admins: 0
   Tokens de usuarios: 1
```

---

## 📋 Verificar que las Functions se Ejecutaron

### Ver logs en tiempo real:

```bash
# Volver a la raíz
cd ..

# Ver logs de todas las funciones
firebase functions:log

# Filtrar solo onLowHumidityAlert
firebase functions:log | grep onlowhumidityalert

# Ver últimas 20 líneas
firebase functions:log | tail -20
```

**Logs que confirman ejecución exitosa:**

```
✅ HUMEDAD BAJA:
I onlowhumidityalert: Humidity changed for Línea de Prueba test-line-1: 50% → 30%

✅ CAMBIO DE ESTADO:
I onirrigationstatuschange: Irrigation status changed for Línea de Prueba test-line-1: false → true
I onirrigationstatuschange: Found 0 admin tokens
W onirrigationstatuschange: No admin tokens found
```

⚠️ **Nota:** "No admin tokens found" es normal si no tienes usuarios con rol `admin`.

---

## 🎯 Flujo de Testing Completo

### Escenario 1: Probar Sistema de Riego Completo

```bash
cd scripts

# 1. Ver tokens disponibles
node get-fcm-tokens.js

# 2. Simular humedad baja (dispara alerta)
node test-low-humidity.js test-line-1 20

# 3. Activar riego manualmente
node test-status-change.js test-line-1 true

# 4. Esperar 5 minutos y desactivar
sleep 300
node test-status-change.js test-line-1 false

# 5. Ver logs
cd .. && firebase functions:log | tail -30
```

---

## 🔍 Troubleshooting

### Error: "Unable to detect a Project Id"

✅ **Ya resuelto** - Los scripts ahora usan `functions/serviceAccountKey.json`

### Error: "ENOENT: no such file or directory"

```bash
# Verificar que el archivo existe
ls -la ../functions/serviceAccountKey.json

# Si no existe, descárgalo desde:
# https://console.firebase.google.com/project/uniminuto-riego-pwa/settings/serviceaccounts/adminsdk
```

### Error: "Cannot find module 'firebase-admin'"

```bash
# Instalar dependencias
cd scripts
npm install firebase-admin
```

### Las notificaciones no llegan

1. **Verificar tokens FCM:**
   ```bash
   node get-fcm-tokens.js
   ```

2. **Verificar que el usuario tiene rol admin (opcional):**
   - Solo si quieres notificaciones de cambio de estado
   - Los usuarios regulares reciben notificaciones de humedad baja

3. **Verificar permisos de notificaciones en el navegador:**
   - Abre la PWA
   - Settings → Notificaciones → Permitir

---

## 🔐 Seguridad

### ⚠️ IMPORTANTE: Service Account Key

```bash
# Este archivo YA ESTÁ en .gitignore
# NUNCA lo commits a GitHub

# Verificar:
cat .gitignore | grep serviceAccountKey
# Debería mostrar: **/serviceAccountKey.json
```

### Regenerar Key (si se comprometió)

1. Ve a [Firebase Console → Service Accounts](https://console.firebase.google.com/project/uniminuto-riego-pwa/settings/serviceaccounts/adminsdk)
2. Click en los 3 puntos → **Delete key**
3. **Generate new private key**
4. Reemplaza `functions/serviceAccountKey.json`

---

## 📚 Recursos

- **Firebase Admin SDK:** https://firebase.google.com/docs/admin/setup
- **Firestore SDK:** https://firebase.google.com/docs/firestore
- **FCM (Cloud Messaging):** https://firebase.google.com/docs/cloud-messaging

---

**Última actualización:** 19 de Octubre, 2025  
**Estado:** ✅ Todos los scripts funcionando correctamente
