# Sistema de Roles y Permisos

## Descripción

El sistema de UNIMINUTO Riego cuenta con 3 roles de usuario con diferentes niveles de permisos:

## Roles Disponibles

### 1. 👨‍🎓 Estudiante (Rol por Defecto)
- **Permisos**: Solo Lectura
- **Puede**:
  - Ver el estado del sistema de riego
  - Ver lecturas de sensores (humedad, temperatura)
  - Ver el historial de eventos
  - Ver líneas de riego
- **NO puede**:
  - Activar/desactivar líneas de riego
  - Modificar configuraciones
  - Gestionar usuarios
  - Enviar notificaciones

**Asignación**: Todos los usuarios nuevos (registro con email o Google) reciben este rol por defecto.

### 2. 👨‍🏫 Supervisor
- **Permisos**: Lectura y Control
- **Puede**:
  - Todo lo que puede un Estudiante
  - ✅ Activar/desactivar líneas de riego manualmente
  - ✅ Modificar configuraciones del sistema
  - ✅ Ver información detallada de todos los sensores
- **NO puede**:
  - Gestionar usuarios (cambiar roles)
  - Acceder al panel de administración
  - Eliminar datos del sistema

**Asignación**: Debe ser asignado manualmente por un Admin.

### 3. 👨‍💼 Admin
- **Permisos**: Control Total
- **Puede**:
  - Todo lo que puede un Supervisor
  - ✅ Gestionar usuarios (crear, editar, eliminar, cambiar roles)
  - ✅ Acceder al panel de administración
  - ✅ Enviar notificaciones push a usuarios
  - ✅ Eliminar datos del sistema
  - ✅ Ver logs del sistema
  - ✅ Configuraciones avanzadas

**Asignación**: Debe ser asignado manualmente mediante:
- Script: `node setAdmin.js [email]`
- Firebase Console
- Otro administrador desde el panel

## Flujo de Registro

### Registro Normal (Email/Contraseña)
```javascript
{
  email: "usuario@ejemplo.com",
  role: "estudiante",  // Por defecto
  createdAt: "2025-10-21T04:43:05.460Z"
}
```

### Registro con Google
```javascript
{
  email: "usuario@gmail.com",
  role: "estudiante",  // Por defecto
  createdAt: "2025-10-21T04:43:05.460Z"
}
```

## Cambio de Roles

### Para convertir un Estudiante en Supervisor:

1. **Desde Firebase Console**:
   - Ve a Firestore Database
   - Navega a `users/{userId}`
   - Edita el campo `role` y cambia `"estudiante"` por `"supervisor"`

2. **Desde el Panel de Admin** (cuando esté implementado):
   - Ir a "Gestión de Usuarios"
   - Seleccionar el usuario
   - Cambiar rol a "Supervisor"

### Para convertir un usuario en Admin:

**Opción 1: Script de consola**
```bash
cd /home/danielxxomg/proyectos/uniminuto-riego-pwa
node setAdmin.js usuario@ejemplo.com
```

**Opción 2: Firebase Console**
```javascript
// En Firestore, actualizar el documento del usuario
{
  role: "admin"
}
```

**Opción 3: Custom Claims (Recomendado para producción)**
```javascript
// Firebase Admin SDK
admin.auth().setCustomUserClaims(uid, { role: 'admin' });
```

## Implementación en el Código

### Verificación de Roles en el Frontend

```typescript
// hooks/useUserRole.ts
const { role } = useUserRole();

// Verificar si es estudiante
if (role === 'estudiante') {
  // Solo mostrar información
}

// Verificar si es supervisor o admin
if (role === 'supervisor' || role === 'admin') {
  // Mostrar controles de riego
}

// Verificar si es admin
if (role === 'admin') {
  // Mostrar panel de administración
}
```

### Rutas Protegidas

```typescript
// Componente AdminRoute
if (role !== 'admin') {
  router.push('/'); // Redirigir a dashboard
}

// Componente SupervisorRoute
if (role === 'estudiante') {
  router.push('/'); // Redirigir a dashboard
}
```

### Componentes Condicionales

```tsx
{role !== 'estudiante' && (
  <Button onClick={toggleIrrigation}>
    Activar Riego
  </Button>
)}

{role === 'admin' && (
  <Link href="/admin">
    Panel de Administración
  </Link>
)}
```

## Seguridad

### Frontend
- Los botones y enlaces se ocultan según el rol
- Las rutas redirigen si el usuario no tiene permisos

### Backend (Firebase Security Rules)
```javascript
// firestore.rules
match /users/{userId} {
  // Los usuarios solo pueden leer su propio documento
  allow read: if request.auth.uid == userId;
  
  // Solo admins pueden modificar roles
  allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

match /irrigation/{docId} {
  // Todos pueden leer
  allow read: if request.auth != null;
  
  // Solo supervisores y admins pueden escribir
  allow write: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['supervisor', 'admin'];
}
```

## Matriz de Permisos

| Acción | Estudiante | Supervisor | Admin |
|--------|-----------|------------|-------|
| Ver dashboard | ✅ | ✅ | ✅ |
| Ver sensores | ✅ | ✅ | ✅ |
| Ver historial | ✅ | ✅ | ✅ |
| Activar/Desactivar riego | ❌ | ✅ | ✅ |
| Modificar configuraciones | ❌ | ✅ | ✅ |
| Gestionar usuarios | ❌ | ❌ | ✅ |
| Panel de administración | ❌ | ❌ | ✅ |
| Enviar notificaciones | ❌ | ❌ | ✅ |
| Ver logs del sistema | ❌ | ❌ | ✅ |

## Buenas Prácticas

1. **Principio de Menor Privilegio**: Todos los usuarios comienzan como "estudiante"
2. **Elevación Manual**: Los roles superiores deben ser asignados explícitamente
3. **Auditoría**: Registrar cambios de roles en logs
4. **Validación en Backend**: Nunca confiar solo en validaciones del frontend
5. **Custom Claims**: Para producción, usar Firebase Custom Claims en lugar de Firestore

## Próximos Pasos

- [ ] Implementar middleware de verificación de roles
- [ ] Crear hook `useUserRole()` o usar `useUserAdmin()` existente
- [ ] Actualizar componentes para mostrar/ocultar elementos según rol
- [ ] Implementar rutas protegidas con verificación de roles
- [ ] Crear panel de gestión de usuarios para admins
- [ ] Añadir logs de auditoría para cambios de roles
- [ ] Implementar Firebase Security Rules actualizadas
