# 🔐 Gestión Centralizada de Credenciales Firebase

## 📍 Ubicación de Credenciales

El archivo de credenciales de Firebase Admin SDK está centralizado en:

```
/functions/serviceAccountKey.json
```

Este archivo contiene las credenciales del Service Account y es utilizado por:
- ✅ Cloud Functions (backend)
- ✅ Script `setAdmin.js` (administración)
- ✅ Otros scripts de administración

## 🚫 Seguridad

### Archivo Protegido en `.gitignore`

El archivo está excluido del control de versiones mediante:

```gitignore
# Firebase secrets
**/serviceAccountKey.json
**/service-account-key.json
firebase-adminsdk-*.json
```

**⚠️ NUNCA subas este archivo a GitHub o repositorios públicos**

### ¿Cómo Obtener el Archivo?

Si necesitas regenerar o descargar el archivo:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `uniminuto-riego-pwa`
3. Ve a **Configuración del proyecto** (⚙️)
4. Pestaña **Cuentas de servicio**
5. Click en **Generar nueva clave privada**
6. Guarda el archivo como `/functions/serviceAccountKey.json`

## 📝 Uso del Script `setAdmin.js`

### Propósito

Asigna el rol de `admin` a un usuario existente en Firebase Authentication.

### Ubicación

```
/setAdmin.js  (raíz del proyecto)
```

### Uso

```bash
# Desde la raíz del proyecto
node setAdmin.js usuario@ejemplo.com
```

### Proceso Automático

El script realiza las siguientes operaciones:

1. ✅ Busca al usuario por email en Firebase Auth
2. ✅ Establece Custom Claim `{ role: "admin" }`
3. ✅ Actualiza documento en Firestore `/users/{uid}`
4. ✅ Revoca tokens de refresco (fuerza re-login)

### Salida Esperada

```
✓ Usuario encontrado: usuario@ejemplo.com (UID: abc123...)
✓ Rol 'admin' asignado exitosamente a usuario@ejemplo.com
✓ Actualizando documento en Firestore...
✓ Documento actualizado en Firestore
✓ Revocando tokens de refresco...

✅ ¡Proceso completado exitosamente!

📝 Instrucciones para el usuario:
   1. Cerrar sesión en la aplicación
   2. Volver a iniciar sesión
   3. Ahora tendrá acceso a /admin
```

### Manejo de Errores

**Error: Usuario no encontrado**
```
❌ Error: auth/user-not-found

💡 El usuario no existe en Firebase Authentication
   Asegúrate de que el usuario se haya registrado primero
```

**Solución:** El usuario debe registrarse primero en `/login`

## 🔄 Estructura de Archivos

```
uniminuto-riego-pwa/
│
├── functions/
│   ├── serviceAccountKey.json    ← Credenciales centralizadas
│   └── src/
│       └── index.ts              ← Usa admin.initializeApp()
│
├── setAdmin.js                   ← Usa ./functions/serviceAccountKey.json
│
└── .gitignore                    ← Protege serviceAccountKey.json
```

## 🛠️ Scripts de Administración

### Script Actual: `setAdmin.js`

**Funcionalidad:**
- Asigna rol de admin a un usuario por email
- Actualiza Custom Claims y Firestore
- Revoca tokens para forzar actualización

**Uso:**
```bash
node setAdmin.js usuario@ejemplo.com
```

### Posibles Scripts Futuros

Puedes crear scripts similares para otras tareas administrativas:

#### `setRole.js` - Cambiar rol de cualquier usuario
```bash
node setRole.js usuario@ejemplo.com supervisor
```

#### `listUsers.js` - Listar todos los usuarios
```bash
node listUsers.js
```

#### `deleteUser.js` - Eliminar usuario
```bash
node deleteUser.js usuario@ejemplo.com
```

#### `bulkImport.js` - Importar usuarios en masa
```bash
node bulkImport.js usuarios.csv
```

## 📦 Dependencias Necesarias

Para que los scripts funcionen, necesitas:

```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0"
  }
}
```

Ya instaladas en `/functions/package.json`.

Para ejecutar scripts desde la raíz:

```bash
# Opción 1: Usar las dependencias de functions
cd functions && node ../setAdmin.js email@ejemplo.com

# Opción 2: Instalar en raíz (recomendado)
npm install firebase-admin
node setAdmin.js email@ejemplo.com
```

## 🔐 Variables de Entorno (Alternativa)

Para mayor seguridad en producción, considera usar variables de entorno en lugar del archivo JSON:

### En Cloud Functions (Producción)

Las Cloud Functions automáticamente tienen acceso al Service Account sin necesidad del archivo JSON:

```typescript
// En functions/src/index.ts
admin.initializeApp(); // Sin parámetros, usa credenciales de entorno
```

### En Scripts Locales (Desarrollo)

Usar el archivo JSON está bien para desarrollo local:

```javascript
const serviceAccount = require("./functions/serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
```

## ⚠️ Mejores Prácticas

### DO ✅

- ✅ Mantener el archivo en `/functions/serviceAccountKey.json`
- ✅ Verificar que está en `.gitignore`
- ✅ Usar permisos mínimos necesarios
- ✅ Rotar credenciales periódicamente
- ✅ Compartir credenciales solo con el equipo (de forma segura)

### DON'T ❌

- ❌ Subir el archivo a GitHub
- ❌ Compartir en canales públicos (Discord, Slack público)
- ❌ Hardcodear credenciales en el código
- ❌ Usar en código cliente (solo backend/scripts)
- ❌ Dar acceso innecesario

## 📊 Resumen

| Aspecto | Detalles |
|---------|----------|
| **Ubicación** | `/functions/serviceAccountKey.json` |
| **Usado por** | Cloud Functions, setAdmin.js, scripts admin |
| **Protección** | `.gitignore` |
| **Tipo** | Service Account credentials |
| **Permisos** | Firebase Admin (todos) |
| **Rotación** | Cada 90 días (recomendado) |

## 🆘 Troubleshooting

### Error: "Cannot find module './functions/serviceAccountKey.json'"

**Causa:** El archivo no existe

**Solución:**
1. Descarga desde Firebase Console
2. Guarda en `/functions/serviceAccountKey.json`
3. Verifica la ruta es correcta

### Error: "credential-internal-error"

**Causa:** Archivo JSON corrupto o incompleto

**Solución:**
1. Elimina el archivo actual
2. Descarga uno nuevo desde Firebase Console
3. Verifica que el JSON es válido

### Error: "insufficient permissions"

**Causa:** El Service Account no tiene permisos suficientes

**Solución:**
1. Ve a Firebase Console → IAM
2. Verifica que el Service Account tiene rol de "Editor" o "Owner"

---

**Última actualización:** 20 de Octubre, 2025
**Autor:** Documentación de seguridad y credenciales
