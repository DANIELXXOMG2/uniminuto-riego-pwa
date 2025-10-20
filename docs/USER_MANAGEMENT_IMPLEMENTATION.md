# Gestión de Usuarios - Implementación Completa

## 📋 Resumen

Se implementó la funcionalidad completa de gestión de usuarios en la página de administración (`apps/web/app/(dashboard)/admin/page.tsx`), incluyendo la capacidad de editar roles y eliminar usuarios de forma segura mediante Cloud Functions.

## 🎯 Objetivos Cumplidos

1. ✅ **Editar Usuario:** Modificación de roles (admin/supervisor) mediante diálogo
2. ✅ **Eliminar Usuario:** Eliminación con confirmación mediante AlertDialog
3. ✅ **Seguridad:** Operaciones privilegiadas mediante Cloud Functions `onCall`
4. ✅ **Manejo de Errores:** Feedback visual con sistema de Toast (Sonner)
5. ✅ **Validaciones:** Verificación de permisos en backend
6. ✅ **Búsqueda:** Filtrado en tiempo real de usuarios

## 🏗️ Arquitectura de Seguridad

```
┌─────────────────┐
│   Admin Page    │
│   (Cliente)     │
└────────┬────────┘
         │ httpsCallable()
         ▼
┌─────────────────┐
│ Cloud Functions │
│    (Servidor)   │
├─────────────────┤
│ updateUserRole  │ ← Verifica permisos admin
│ deleteUser      │ ← Verifica permisos admin
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Firebase Auth + Firestore   │
│ - Custom Claims             │
│ - User Documents            │
└─────────────────────────────┘
```

### Principios Aplicados

1. **Principio de Menor Privilegio:** Las operaciones sensibles solo se pueden ejecutar desde el backend
2. **Defensa en Profundidad:** Validaciones tanto en cliente como en servidor
3. **Separación de Responsabilidades:** Cliente maneja UI, servidor maneja lógica de negocio

## 📁 Archivos Creados/Modificados

### Backend (Cloud Functions)

#### 1. `functions/src/index.ts` (MODIFICADO)

**Funciones agregadas:**

##### `updateUserRole` (Callable Function)
- **Propósito:** Actualizar el rol de un usuario
- **Parámetros:** `{ userId: string, newRole: 'admin' | 'supervisor' }`
- **Validaciones:**
  - Usuario autenticado
  - Caller es admin
  - Usuario no puede cambiar su propio rol
  - newRole es válido
- **Operaciones:**
  1. Actualiza Custom Claims en Firebase Auth
  2. Actualiza documento en Firestore
  3. Registra auditoría (updatedBy, updatedAt)

##### `deleteUser` (Callable Function)
- **Propósito:** Eliminar un usuario del sistema
- **Parámetros:** `{ userId: string }`
- **Validaciones:**
  - Usuario autenticado
  - Caller es admin
  - Usuario no puede eliminarse a sí mismo
- **Operaciones:**
  1. Elimina documento de Firestore
  2. Elimina usuario de Firebase Auth
  3. Maneja casos edge (usuario ya eliminado)

**Importaciones agregadas:**
```typescript
import { onCall, HttpsError } from "firebase-functions/v2/https";
```

### Frontend (Web App)

#### 2. `apps/web/lib/useUserAdmin.ts` (NUEVO)

Hook personalizado para operaciones de administración:

```typescript
interface UseUserAdmin {
  updateUserRole: (userId: string, newRole: 'admin' | 'supervisor') => Promise<CloudFunctionResponse>;
  deleteUserAccount: (userId: string) => Promise<CloudFunctionResponse>;
  loading: boolean;
  error: string | null;
}
```

**Características:**
- Manejo de estado de carga
- Manejo de errores
- Tipado completo con TypeScript
- Uso de `httpsCallable` para invocar Cloud Functions

#### 3. `apps/web/lib/firebase.ts` (MODIFICADO)

**Agregado:**
- Importación y exportación de Firebase Functions
- Configuración de región (`us-central1`)
- Soporte para emulador en desarrollo

```typescript
export const functions = getFunctions(app, 'us-central1');
```

#### 4. `apps/web/app/(dashboard)/admin/page.tsx` (REFACTORIZADO)

**Estado agregado:**
```typescript
- searchQuery: string                    // Búsqueda de usuarios
- editDialogOpen: boolean                // Control del diálogo de edición
- deleteDialogOpen: boolean              // Control del diálogo de eliminación
- editingUser: EditingUser | null        // Usuario en edición
- deletingUserId: string | null          // Usuario a eliminar
- selectedRole: 'admin' | 'supervisor'   // Rol seleccionado
```

**Funciones principales:**
- `handleEditClick()` - Abre diálogo de edición
- `handleConfirmEdit()` - Confirma cambio de rol
- `handleDeleteClick()` - Abre diálogo de eliminación
- `handleConfirmDelete()` - Confirma eliminación

**Componentes UI agregados:**
- `Dialog` - Para edición de rol
- `AlertDialog` - Para confirmación de eliminación
- `Select` - Para selección de rol
- `Toast` (Sonner) - Para feedback de operaciones

#### 5. `apps/web/app/layout.tsx` (MODIFICADO)

**Agregado:**
```tsx
<Toaster richColors position="top-right" />
```

Sistema global de notificaciones para toda la aplicación.

## 🎨 Componentes UI Instalados

### 1. Dialog Component
```bash
bunx shadcn@latest add dialog
```
- **Archivos:** `apps/web/components/ui/dialog.tsx`
- **Uso:** Edición de roles

### 2. AlertDialog Component
```bash
bunx shadcn@latest add alert-dialog
```
- **Archivos:** `apps/web/components/ui/alert-dialog.tsx`
- **Uso:** Confirmación de eliminación

### 3. Sonner (Toast)
```bash
bunx shadcn@latest add sonner
```
- **Archivos:** `apps/web/components/ui/sonner.tsx`
- **Uso:** Notificaciones de éxito/error

## 🔒 Seguridad Implementada

### Validaciones en Backend

#### updateUserRole:
```typescript
✓ Verificar autenticación
✓ Verificar que caller es admin
✓ Validar formato de userId
✓ Validar que newRole es 'admin' o 'supervisor'
✓ Prevenir auto-modificación de rol
✓ Registrar auditoría (quién y cuándo)
```

#### deleteUser:
```typescript
✓ Verificar autenticación
✓ Verificar que caller es admin
✓ Validar formato de userId
✓ Prevenir auto-eliminación
✓ Manejar caso de usuario no encontrado
✓ Eliminar de Auth y Firestore atómicamente
```

### Manejo de Errores

**Tipos de HttpsError utilizados:**
- `unauthenticated` - Usuario no autenticado
- `permission-denied` - Sin permisos suficientes
- `invalid-argument` - Parámetros inválidos
- `internal` - Error interno del servidor

## 🎭 Flujos de Usuario

### Flujo 1: Editar Rol

```
1. Admin hace clic en botón "Editar" (icono lápiz)
2. Se abre Dialog con rol actual y selector de nuevo rol
3. Admin selecciona nuevo rol (admin/supervisor)
4. Admin hace clic en "Guardar Cambios"
5. Se invoca Cloud Function updateUserRole
   ├─ Backend valida permisos
   ├─ Backend actualiza Custom Claims
   ├─ Backend actualiza Firestore
   └─ Backend retorna éxito/error
6. Cliente muestra toast de confirmación
7. Lista de usuarios se actualiza automáticamente (useUsers)
```

### Flujo 2: Eliminar Usuario

```
1. Admin hace clic en botón "Eliminar" (icono basura)
2. Se abre AlertDialog de confirmación
3. Se muestra email del usuario y advertencia
4. Admin hace clic en "Eliminar Usuario"
5. Se invoca Cloud Function deleteUser
   ├─ Backend valida permisos
   ├─ Backend elimina de Firestore
   ├─ Backend elimina de Auth
   └─ Backend retorna éxito/error
6. Cliente muestra toast de confirmación
7. Lista de usuarios se actualiza automáticamente (useUsers)
```

### Flujo 3: Búsqueda de Usuarios

```
1. Admin escribe en campo de búsqueda
2. Filtrado en tiempo real por:
   - Email del usuario
   - Rol del usuario
3. Lista se actualiza instantáneamente
4. Mensaje de "no encontrado" si no hay coincidencias
```

## 📊 Estructura de Datos

### Custom Claims (Firebase Auth)
```typescript
{
  role: "admin" | "supervisor"
}
```

### Documento de Usuario (Firestore)
```typescript
{
  email: string;
  role: "admin" | "supervisor";
  fcmTokens?: string[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: string;  // UID del admin que hizo el cambio
}
```

## 🧪 Casos de Prueba

### Pruebas de Seguridad

1. **❌ Usuario no admin intenta cambiar rol**
   - Resultado esperado: `permission-denied`

2. **❌ Admin intenta cambiar su propio rol**
   - Resultado esperado: Error "No puedes cambiar tu propio rol"

3. **❌ Admin intenta eliminarse a sí mismo**
   - Resultado esperado: Error "No puedes eliminarte a ti mismo"

4. **❌ Invocar función sin autenticación**
   - Resultado esperado: `unauthenticated`

### Pruebas Funcionales

5. **✅ Admin cambia rol de supervisor a admin**
   - Resultado esperado: Rol actualizado, toast de éxito

6. **✅ Admin elimina usuario supervisor**
   - Resultado esperado: Usuario eliminado, toast de éxito

7. **✅ Búsqueda por email**
   - Resultado esperado: Filtrado correcto

8. **✅ Búsqueda por rol**
   - Resultado esperado: Filtrado correcto

### Pruebas de Edge Cases

9. **✅ Eliminar usuario que solo existe en Firestore**
   - Resultado esperado: Usuario eliminado sin error

10. **✅ Cambiar rol con red lenta**
    - Resultado esperado: Loading state mostrado, operación completa

## 🎨 UI/UX Implementada

### Estados de Carga
- **Skeleton loaders** para lista de usuarios
- **Botones deshabilitados** durante operaciones
- **Texto dinámico** ("Actualizando...", "Eliminando...")

### Feedback Visual
- **Toast success (verde)** - Operación exitosa
- **Toast error (rojo)** - Operación fallida
- **Descripciones claras** en cada toast

### Accesibilidad
- **Títulos en botones** (title attribute)
- **Labels semánticos** en formularios
- **Confirmación explícita** para acciones destructivas
- **Mensajes de error descriptivos**

### Responsividad
- **Mobile-first design**
- **Cards adaptables**
- **Diálogos responsive**

## 📈 Métricas de Rendimiento

### Optimizaciones Aplicadas

1. **Actualizaciones en Tiempo Real**
   - Hook `useUsers` usa `onSnapshot`
   - Lista se actualiza automáticamente sin refetch manual

2. **Operaciones Optimistas (posible mejora futura)**
   - Actualmente espera confirmación del servidor
   - Se podría implementar optimistic updates

3. **Índices de Firestore**
   - Consulta por role usa índice
   - Búsqueda local sin queries adicionales

## 🚀 Despliegue

### Comandos Necesarios

#### 1. Desplegar Cloud Functions
```bash
cd functions
bun run build
firebase deploy --only functions:updateUserRole,functions:deleteUser
```

#### 2. Verificar Funciones Desplegadas
```bash
firebase functions:list
```

#### 3. Probar en Desarrollo
```bash
cd apps/web
bun run dev
```

### Variables de Entorno

No se requieren variables adicionales. Las funciones usan:
- Firebase Admin SDK (auto-configurado)
- Región: `us-central1` (hardcoded)

## 🔮 Mejoras Futuras Sugeridas

### Funcionalidades

1. **Auditoría Completa**
   - Tabla de historial de cambios
   - Registro de quién modificó qué y cuándo

2. **Roles Personalizados**
   - Más allá de admin/supervisor
   - Permisos granulares

3. **Invitación de Usuarios**
   - Envío de emails de invitación
   - Registro con código temporal

4. **Paginación**
   - Para más de 50 usuarios
   - Scroll infinito o paginación clásica

5. **Exportación de Datos**
   - Lista de usuarios a CSV
   - Reporte de actividad

### Seguridad

6. **Rate Limiting**
   - Limitar operaciones por minuto
   - Prevenir abuso

7. **Confirmación por Email**
   - Operaciones críticas requieren confirmación
   - Código OTP para eliminaciones

8. **Logs de Auditoría**
   - Google Cloud Logging
   - Alertas de operaciones sospechosas

### UI/UX

9. **Edición Inline**
   - Cambio de rol sin diálogo
   - Confirmación más rápida

10. **Filtros Avanzados**
    - Por fecha de registro
    - Por última actividad
    - Por tokens FCM

## 📝 Notas Técnicas

### Consideraciones de Firestore

- Los Custom Claims de Auth pueden tardar hasta 1 hora en propagarse
- Para forzar actualización: usuario debe hacer logout/login
- La lista de usuarios se actualiza en tiempo real vía `onSnapshot`

### Limitaciones de Firebase

- **Functions:** 10 MB payload máximo
- **Auth:** Rate limiting automático
- **Firestore:** Costos por operación de escritura

### TypeScript

- Todos los tipos están correctamente definidos
- No hay uso de `any`
- Interfaces exportadas para reutilización

## ✅ Checklist de Validación

### Backend
- [x] Cloud Functions creadas y tipadas
- [x] Validaciones de seguridad implementadas
- [x] Manejo de errores con HttpsError
- [x] Auditoría básica (updatedBy, updatedAt)
- [x] Sin errores de TypeScript/ESLint

### Frontend
- [x] Hook useUserAdmin creado
- [x] Firebase Functions configuradas
- [x] Componentes UI instalados (Dialog, AlertDialog, Sonner)
- [x] Página de admin refactorizada
- [x] Estado de carga manejado
- [x] Errores manejados con toast
- [x] Búsqueda implementada
- [x] Sin errores de TypeScript/ESLint

### Seguridad
- [x] Operaciones privilegiadas en backend
- [x] Validación de permisos en cada función
- [x] Prevención de auto-modificación
- [x] Confirmación para acciones destructivas

### UI/UX
- [x] Feedback visual (toasts)
- [x] Estados de carga
- [x] Confirmaciones explícitas
- [x] Búsqueda funcional
- [x] Responsive design

## 📚 Referencias

- [Firebase Admin SDK - Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Firebase Functions v2 - Callable](https://firebase.google.com/docs/functions/callable)
- [shadcn/ui Components](https://ui.shadcn.com/docs)
- [Sonner Toast](https://sonner.emilkowal.ski/)

---

**Fecha de implementación:** 19 de Octubre, 2025
**Sprint:** Sprint 4
**Autor:** Implementación de gestión de usuarios
