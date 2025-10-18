# 🔔 Checklist de Configuración FCM

## ⚠️ PASOS OBLIGATORIOS ANTES DE USAR

### 1️⃣ Configurar Firebase Cloud Messaging

- [ ] **Habilitar Cloud Messaging en Firebase Console**
  - Ve a: https://console.firebase.google.com/
  - Selecciona tu proyecto
  - Configuración del proyecto → Cloud Messaging
  - Habilítalo si no está activo

### 2️⃣ Obtener Credenciales

- [ ] **Copiar configuración de Firebase**
  - Firebase Console → Configuración del proyecto → General
  - Scroll hasta "Tus aplicaciones"
  - Copia: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`

- [ ] **Generar VAPID Key**
  - Firebase Console → Configuración del proyecto → Cloud Messaging
  - Sección: "Certificados de clave web"
  - Haz clic en "Generar par de claves" si no existe
  - Copia la clave pública (VAPID Key)

### 3️⃣ Actualizar Código

- [ ] **Editar `/public/firebase-messaging-sw.js`**
  ```javascript
  // Líneas 11-17: Reemplazar placeholders
  const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "TU_AUTH_DOMAIN_AQUI",
    projectId: "TU_PROJECT_ID_AQUI",
    storageBucket: "TU_STORAGE_BUCKET_AQUI",
    messagingSenderId: "TU_MESSAGING_SENDER_ID_AQUI",
    appId: "TU_APP_ID_AQUI"
  };
  ```

- [ ] **Editar `/lib/useFCM.ts`**
  ```typescript
  // Línea 10: Reemplazar placeholder
  const VAPID_KEY = 'TU_VAPID_KEY_AQUI';
  ```

### 4️⃣ Configurar Firestore Security Rules

- [ ] **Actualizar reglas de seguridad**
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /users/{userId} {
        allow read, write: if request.auth != null 
                           && request.auth.uid == userId;
      }
    }
  }
  ```

### 5️⃣ Probar Configuración

- [ ] **Compilar proyecto**
  ```bash
  cd apps/web
  bun run build
  ```

- [ ] **Ejecutar en modo producción**
  ```bash
  bun run start
  ```

- [ ] **Abrir navegador**
  - Ir a: http://localhost:3000
  - Iniciar sesión

- [ ] **Activar notificaciones**
  - Deberías ver el banner de notificaciones
  - Clic en "Activar"
  - Aceptar permiso del navegador

- [ ] **Verificar en consola**
  - Abrir DevTools (F12) → Console
  - Buscar estos logs:
    ```
    ✅ Permiso de notificaciones concedido
    ✅ Service Worker de FCM registrado
    ✅ Token FCM obtenido: ...
    ✅ Token FCM guardado en Firestore
    ```

### 6️⃣ Enviar Notificación de Prueba

- [ ] **Opción A: Desde Firebase Console**
  1. Cloud Messaging → "Enviar tu primer mensaje"
  2. Título: "Prueba"
  3. Mensaje: "Notificación de prueba"
  4. Clic en "Enviar mensaje de prueba"
  5. Pegar token FCM (desde consola del navegador)
  6. Enviar

- [ ] **Opción B: Desde código backend**
  - Ver: `docs/send-notification-example.js`
  - Configurar Firebase Admin SDK
  - Ejecutar función de prueba

### 7️⃣ Verificación Final

- [ ] **Notificación recibida en primer plano**
  - La app está abierta y enfocada
  - Debe aparecer un toast en la esquina superior derecha

- [ ] **Notificación recibida en segundo plano**
  - La app está cerrada o en otra pestaña
  - Debe aparecer notificación del sistema operativo

- [ ] **Click en notificación**
  - Al hacer clic, debe abrir/enfocar la aplicación

- [ ] **Token guardado en Firestore**
  - Firebase Console → Firestore Database
  - Navegar a: `users/{tu-user-id}`
  - Verificar campo `fcmTokens` con array de tokens

## 📊 Verificación de Estado

### DevTools - Application Tab

```
✓ Service Workers
  ✓ /firebase-messaging-sw.js - activated and running

✓ Manifest
  ✓ /manifest.json - valid

✓ Storage → IndexedDB
  ✓ firestore - contiene datos cacheados
```

### Consola del Navegador

```javascript
// Verificar permiso de notificaciones
console.log(Notification.permission); // "granted"

// Verificar si FCM está funcionando
console.log("Token FCM:", token); // "eyJhbG..."
```

### Firebase Console

```
✓ Cloud Messaging habilitado
✓ VAPID Key generada
✓ Tokens registrados en Firestore
✓ Estadísticas de mensajes (si se enviaron)
```

## 🐛 Troubleshooting

### ❌ "Service Worker registration failed"

**Causa:** Credenciales incorrectas en `firebase-messaging-sw.js`

**Solución:**
1. Verificar que los valores sean exactos (sin espacios extra)
2. Verificar que `projectId` coincida con tu proyecto
3. Abrir DevTools → Console para ver error específico

### ❌ "Token generation failed"

**Causa:** VAPID Key incorrecta

**Solución:**
1. Verificar que la VAPID Key en `useFCM.ts` sea correcta
2. Generar nueva VAPID Key si es necesario
3. Limpiar caché y service workers

### ❌ "Permission denied"

**Causa:** Usuario rechazó el permiso

**Solución:**
1. Chrome: Configuración → Privacidad y seguridad → Configuración de sitios → Notificaciones
2. Eliminar el sitio de la lista de bloqueados
3. Recargar la página

### ❌ "Notifications not received"

**Causa:** Token inválido o expirado

**Solución:**
1. Verificar que el token en Firestore esté actualizado
2. Regenerar token: desactivar y volver a activar notificaciones
3. Verificar que el mensaje se envíe al token correcto

## ✅ Lista de Verificación Rápida

```bash
# 1. Credenciales configuradas
grep "YOUR_" public/firebase-messaging-sw.js
grep "YOUR_" lib/useFCM.ts
# Debe retornar 0 resultados

# 2. Proyecto compila
bun run build
# Debe completar sin errores

# 3. Service Worker registrado
curl http://localhost:3000/firebase-messaging-sw.js
# Debe retornar el contenido del archivo

# 4. Token guardado en Firestore (requiere autenticación)
# Verificar manualmente en Firebase Console
```

## 📚 Documentación Relacionada

- 📄 **Configuración detallada:** `FCM_SETUP.md`
- 🎯 **Resumen de implementación:** `FCM_IMPLEMENTATION.md`
- 💻 **Ejemplo de backend:** `docs/send-notification-example.js`
- 🌐 **Configuración PWA:** `PWA_README.md`

## 🎉 ¡Listo!

Si completaste todos los checkboxes, tu sistema de notificaciones está **100% funcional** 🚀

**Próximos pasos:**
1. Integrar notificaciones automáticas cuando cambie el estado de las líneas de riego
2. Enviar alertas de humedad baja
3. Notificaciones de mantenimiento programado
4. Dashboard de estadísticas de notificaciones enviadas

---

**¿Necesitas ayuda?** Revisa la documentación completa en:
- `FCM_SETUP.md` - Guía paso a paso
- `FCM_IMPLEMENTATION.md` - Detalles técnicos
