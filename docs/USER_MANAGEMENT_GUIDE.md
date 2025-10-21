# Guía de Gestión de Usuarios - Sistema de Riego Inteligente

## 📋 Tabla de Contenidos
1. [Descripción General](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Funcionalidades Implementadas](#funcionalidades-implementadas)
4. [Guía de Uso](#guía-de-uso)
5. [Despliegue de Cloud Functions](#despliegue-de-cloud-functions)
6. [Pruebas](#pruebas)
7. [Troubleshooting](#troubleshooting)

---

## Descripción General

El módulo de gestión de usuarios permite a los administradores:
- ✏️ **Editar roles** de usuarios (admin o supervisor)
- 🗑️ **Eliminar usuarios** del sistema
- 🔍 **Buscar y filtrar** usuarios por email o rol
- 📊 **Ver en tiempo real** la lista de usuarios

## Arquitectura

### Componentes Principales

```
┌─────────────────────────────────────────────────────┐
│               Frontend (Next.js)                    │
│  ┌───────────────────────────────────────────────┐  │
│  │  app/(dashboard)/admin/page.tsx               │  │
│  │  - UI de gestión de usuarios                 │  │
│  │  - Diálogos de edición/eliminación           │  │
│  └───────────────────────────────────────────────┘  │
│                        ↓                            │
│  ┌───────────────────────────────────────────────┐  │
│  │  lib/useUserAdmin.ts                          │  │
│  │  - Hook personalizado                         │  │
│  │  - Invoca Cloud Functions                     │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│          Firebase Cloud Functions                   │
│  ┌───────────────────────────────────────────────┐  │
│  │  updateUserRole(userId, newRole)              │  │
│  │  - Verifica permisos de admin                 │  │
│  │  - Actualiza custom claims                    │  │
│  │  - Actualiza documento Firestore              │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  deleteUser(userId)                           │  │
│  │  - Verifica permisos de admin                 │  │
│  │  - Elimina de Firestore                       │  │
│  │  - Elimina de Authentication                  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│              Firebase Services                      │
│  • Authentication (custom claims)                   │
│  • Firestore (documentos de usuarios)              │
└─────────────────────────────────────────────────────┘
```

### Flujo de Datos

1. **Usuario administrador** accede a `/admin`
2. **AdminRoute** verifica que el usuario tiene rol `admin`
3. **useUsers** hook carga usuarios en tiempo real desde Firestore
4. Al hacer clic en **Editar**:
   - Se abre Dialog con Select de roles
   - Al guardar → `useUserAdmin.updateUserRole()`
   - Invoca Cloud Function `updateUserRole`
   - Actualiza custom claims y Firestore
   - Muestra Toast de éxito/error
5. Al hacer clic en **Eliminar**:
   - Se abre AlertDialog de confirmación
   - Al confirmar → `useUserAdmin.deleteUserAccount()`
   - Invoca Cloud Function `deleteUser`
   - Elimina de Auth y Firestore
   - Muestra Toast de éxito/error

---

## Funcionalidades Implementadas

### ✏️ Edición de Roles

**Componente**: `Dialog` de shadcn/ui

**Características**:
- Muestra email del usuario
- Muestra rol actual
- Select para elegir nuevo rol (admin/supervisor)
- Botón de guardar con estado de carga
- Deshabilita controles durante la operación
- Toast de confirmación/error
- Cierre automático al éxito

**Código**:
```tsx
const handleConfirmEdit = async () => {
  if (!editingUser) return;
  
  try {
    await updateUserRole(editingUser.id, selectedRole);
    toast.success("Rol actualizado exitosamente");
    setEditDialogOpen(false);
  } catch (err) {
    toast.error("Error al actualizar rol");
  }
};
```

### 🗑️ Eliminación de Usuarios

**Componente**: `AlertDialog` de shadcn/ui

**Características**:
- Confirmación antes de eliminar
- Muestra email del usuario a eliminar
- Mensaje de advertencia claro
- Botón destructivo (rojo)
- Estado de carga durante la operación
- Toast de confirmación/error

**Código**:
```tsx
const handleConfirmDelete = async () => {
  if (!deletingUserId) return;
  
  try {
    await deleteUserAccount(deletingUserId);
    toast.success("Usuario eliminado exitosamente");
    setDeleteDialogOpen(false);
  } catch (err) {
    toast.error("Error al eliminar usuario");
  }
};
```

### 🔍 Búsqueda y Filtrado

**Características**:
- Búsqueda en tiempo real
- Filtra por email o rol
- Case-insensitive
- Actualización inmediata de resultados

**Código**:
```tsx
const filteredUsers = users.filter(
  (user) =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase())
);
```

### 📊 Estados de Carga y Error

**Skeleton Loading**:
- Se muestra mientras se cargan usuarios
- 4 placeholders animados

**Error Handling**:
- Card roja con mensaje de error
- Icono de alerta
- Descripción del error

---

## Guía de Uso

### Para Administradores

#### 1. Acceder al Panel de Admin

```
1. Inicia sesión con una cuenta de administrador
2. Navega a /admin en el menú lateral
3. Verás la lista de todos los usuarios
```

#### 2. Buscar un Usuario

```
1. Usa la barra de búsqueda en la parte superior
2. Escribe el email o rol del usuario
3. La lista se filtrará automáticamente
```

#### 3. Editar Rol de Usuario

```
1. Haz clic en el icono de lápiz (✏️) junto al usuario
2. Se abrirá un diálogo mostrando:
   - Email del usuario
   - Rol actual
   - Selector de nuevo rol
3. Selecciona el nuevo rol (admin o supervisor)
4. Haz clic en "Guardar Cambios"
5. Espera la confirmación
6. El usuario recibirá los nuevos permisos inmediatamente
```

#### 4. Eliminar Usuario

```
1. Haz clic en el icono de basura (🗑️) junto al usuario
2. Se abrirá un diálogo de confirmación
3. Lee cuidadosamente la advertencia
4. Si estás seguro, haz clic en "Eliminar Usuario"
5. La eliminación es permanente e irreversible
```

### Restricciones de Seguridad

❌ **No puedes**:
- Cambiar tu propio rol
- Eliminarte a ti mismo
- Realizar estas acciones si no eres admin

✅ **Puedes**:
- Ver todos los usuarios
- Buscar y filtrar usuarios
- Editar roles de otros usuarios
- Eliminar otros usuarios

---

## Despliegue de Cloud Functions

### Opción 1: Desplegar Todas las Funciones

```bash
# Desde la raíz del proyecto
./deploy-functions.sh
```

### Opción 2: Desplegar Solo Funciones de Gestión de Usuarios

```bash
# Navegar a la carpeta de funciones
cd functions

# Desplegar funciones específicas
firebase deploy --only functions:updateUserRole,functions:deleteUser
```

### Verificar Despliegue

```bash
# Listar funciones desplegadas
firebase functions:list

# Deberías ver:
# ✓ updateUserRole(us-central1)
# ✓ deleteUser(us-central1)
```

### Configurar Permisos IAM (Si es necesario)

Si obtienes errores de permisos, asegúrate de que tu cuenta de servicio tenga:

```bash
# En Google Cloud Console, añade estos roles:
- Firebase Admin SDK Administrator Service Agent
- Cloud Functions Service Agent
```

---

## Pruebas

### 1. Prueba Local con Script

```bash
# Ejecutar script de prueba
cd scripts
node test-user-management.js

# El script:
# - Lista todos los usuarios
# - Permite probar actualizaciones de rol
# - Permite probar eliminaciones
# - Incluye verificaciones
```

### 2. Prueba en Desarrollo (Emulador)

```bash
# 1. Iniciar emuladores
firebase emulators:start

# 2. En .env.local del frontend:
NEXT_PUBLIC_USE_EMULATOR=true

# 3. Las funciones se ejecutarán localmente
```

### 3. Prueba en Producción

```bash
# 1. Desplegar funciones
./deploy-functions.sh

# 2. Crear un usuario de prueba
# 3. Acceder a /admin
# 4. Probar edición de rol
# 5. Verificar en Firebase Console
# 6. Probar eliminación
```

### Casos de Prueba

#### Caso 1: Actualizar Rol Exitosamente
```
Given: Usuario con rol "supervisor"
When: Admin cambia rol a "admin"
Then: 
  - Custom claims se actualizan
  - Documento Firestore se actualiza
  - Toast de éxito aparece
  - Diálogo se cierra
  - UI se actualiza automáticamente
```

#### Caso 2: Error de Permisos
```
Given: Usuario sin rol "admin"
When: Intenta acceder a /admin
Then: 
  - AdminRoute redirige a /
  - No puede ver la página
```

#### Caso 3: Eliminar Usuario
```
Given: Usuario existente
When: Admin confirma eliminación
Then:
  - Usuario se elimina de Auth
  - Documento se elimina de Firestore
  - Toast de éxito aparece
  - UI se actualiza automáticamente
```

---

## Troubleshooting

### Error: "Permission Denied"

**Problema**: El usuario no puede ejecutar las Cloud Functions

**Solución**:
```bash
# 1. Verificar que el usuario tiene rol admin en Firestore
# 2. Verificar custom claims:
firebase auth:export users.json
# Buscar el usuario y verificar customClaims.role

# 3. Si no tiene custom claims, establecerlos:
node setAdmin.js usuario@email.com
```

### Error: "Functions not found"

**Problema**: Las funciones no están desplegadas

**Solución**:
```bash
# 1. Verificar despliegue
firebase functions:list

# 2. Si no aparecen, desplegar:
cd functions
firebase deploy --only functions

# 3. Verificar región (debe ser us-central1)
```

### Error: "User not found"

**Problema**: El usuario fue eliminado de Auth pero no de Firestore

**Solución**:
```bash
# Las funciones manejan este caso automáticamente
# Si persiste, eliminar manualmente de Firestore:
# En Firebase Console > Firestore > users > [documento del usuario] > Eliminar
```

### La UI no se actualiza después de editar/eliminar

**Problema**: El hook useUsers no detecta cambios

**Solución**:
```tsx
// El hook usa onSnapshot que debe actualizarse automáticamente
// Si no funciona, verificar:
// 1. Que Firestore esté correctamente configurado
// 2. Que no haya errores en la consola
// 3. Refrescar la página como último recurso
```

### Función tarda mucho en responder

**Problema**: Cold start de Cloud Functions

**Solución**:
```javascript
// Las Cloud Functions pueden tardar 5-10 segundos en cold start
// Esto es normal en la primera ejecución
// Mejorar con min instances (costo adicional):

export const updateUserRole = onCall(
  {
    region: "us-central1",
    minInstances: 1, // Mantener siempre una instancia caliente
  },
  async (request) => { /* ... */ }
);
```

---

## Seguridad

### Validaciones Implementadas

1. **Autenticación**: Solo usuarios autenticados
2. **Autorización**: Solo admins pueden ejecutar funciones
3. **Auto-protección**: No puedes cambiar tu propio rol o eliminarte
4. **Validación de inputs**: Tipos y valores correctos
5. **Manejo de errores**: Mensajes claros sin exponer detalles internos

### Mejores Prácticas

- ✅ Siempre usar HTTPS callable functions
- ✅ Validar permisos en el backend
- ✅ No confiar en validaciones del frontend
- ✅ Registrar acciones en logs
- ✅ Limpiar tokens FCM inválidos

---

## Próximos Pasos

### Funcionalidades Futuras

1. **Auditoría de cambios**
   - Registrar quién cambió qué y cuándo
   - Historial de modificaciones

2. **Roles personalizados**
   - Más allá de admin/supervisor
   - Permisos granulares

3. **Invitación de usuarios**
   - Enviar invitaciones por email
   - Registro con código

4. **Gestión masiva**
   - Selección múltiple
   - Acciones en lote

5. **Exportación de datos**
   - CSV de usuarios
   - Reportes

---

## Recursos Adicionales

- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Cloud Functions](https://firebase.google.com/docs/functions)
- [Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

**Última actualización**: 20 de octubre de 2025  
**Versión del sistema**: Sprint 5  
**Autor**: Sistema de Riego Inteligente - Uniminuto
