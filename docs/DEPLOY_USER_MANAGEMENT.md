# 🚀 Guía de Despliegue - Funciones de Gestión de Usuarios

## Requisitos Previos

- Firebase CLI instalado: `npm install -g firebase-tools`
- Proyecto Firebase configurado
- Permisos de administrador en el proyecto Firebase

## 📦 Pasos de Despliegue

### 1. Compilar las Funciones

```bash
cd functions
bun install
bun run build
```

### 2. Desplegar las Nuevas Funciones

```bash
# Desplegar todas las funciones
firebase deploy --only functions

# O desplegar solo las funciones de gestión de usuarios
firebase deploy --only functions:updateUserRole,functions:deleteUser
```

### 3. Verificar el Despliegue

```bash
# Listar todas las funciones desplegadas
firebase functions:list

# Deberías ver:
# - updateUserRole
# - deleteUser
# (además de las funciones existentes)
```

### 4. Probar las Funciones

```bash
# Ver logs en tiempo real
firebase functions:log --only updateUserRole,deleteUser

# O ver logs en la consola de Firebase
# https://console.firebase.google.com/project/YOUR_PROJECT_ID/functions
```

## 🧪 Pruebas Locales (Opcional)

### Usando el Emulador de Functions

```bash
# En terminal 1: Iniciar emuladores
firebase emulators:start

# En terminal 2: Correr la app web
cd apps/web
bun run dev
```

**Configurar el emulador en la app:**

Agregar en `.env.local`:
```bash
NEXT_PUBLIC_USE_EMULATOR=true
```

## 🔐 Configurar Permisos

### Verificar Roles de Admin

Asegúrate de tener al menos un usuario con rol `admin` en Firestore:

```javascript
// Ejecutar en Firebase Console > Firestore
// Colección: users
// Documento: {userId}
{
  email: "admin@example.com",
  role: "admin",
  fcmTokens: [],
  createdAt: serverTimestamp()
}
```

### Establecer Custom Claims

Usar el script `setAdmin.js` en la raíz del proyecto:

```bash
# En la raíz del proyecto
node setAdmin.js usuario@ejemplo.com
```

## 📊 Monitoreo

### Ver Métricas de Uso

1. Firebase Console → Functions
2. Seleccionar función (updateUserRole o deleteUser)
3. Ver métricas:
   - Invocaciones
   - Tiempo de ejecución
   - Errores

### Configurar Alertas (Opcional)

Firebase Console → Functions → Alertas

Configurar alertas para:
- Alta tasa de errores (>5%)
- Tiempo de ejecución alto (>2s)
- Fallos de autenticación

## 🐛 Solución de Problemas

### Error: "Permission denied"

**Causa:** Usuario no tiene rol admin

**Solución:**
```bash
node setAdmin.js usuario@ejemplo.com
```

### Error: "Function not found"

**Causa:** Funciones no desplegadas correctamente

**Solución:**
```bash
firebase deploy --only functions --force
```

### Error: "CORS"

**Causa:** Problema de configuración de Firebase

**Solución:**
Las Cloud Functions Callable manejan CORS automáticamente.
Si persiste, verificar configuración de Firebase en `firebase.ts`.

## 📈 Costos Estimados

### Cloud Functions (Generation 2)

- **updateUserRole:**
  - ~500ms ejecución promedio
  - ~1MB memoria
  - Costo: ~$0.0000004 por invocación

- **deleteUser:**
  - ~800ms ejecución promedio
  - ~1MB memoria
  - Costo: ~$0.0000006 por invocación

**Ejemplo mensual:**
- 1000 actualizaciones de rol: ~$0.40 USD
- 100 eliminaciones: ~$0.06 USD
- **Total estimado: <$1 USD/mes**

## 🔄 Actualización de Funciones

Si necesitas hacer cambios en las funciones:

1. Modificar código en `functions/src/index.ts`
2. Compilar: `bun run build`
3. Desplegar: `firebase deploy --only functions`
4. Verificar: `firebase functions:log`

## 📝 Checklist de Despliegue

- [ ] Funciones compiladas sin errores
- [ ] Funciones desplegadas correctamente
- [ ] Al menos un usuario admin configurado
- [ ] Custom claims establecidos
- [ ] Pruebas de edición de rol funcionan
- [ ] Pruebas de eliminación de usuario funcionan
- [ ] Logs monitoreados
- [ ] Sin errores en consola de Firebase

## 🆘 Soporte

Si encuentras problemas:

1. Revisar logs: `firebase functions:log`
2. Verificar consola de Firebase
3. Revisar documentación: `docs/USER_MANAGEMENT_IMPLEMENTATION.md`
4. Contactar al equipo de desarrollo

---

**Última actualización:** 19 de Octubre, 2025
**Versión:** 1.0.0
