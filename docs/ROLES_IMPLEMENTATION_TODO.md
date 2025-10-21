# Plan de Implementación de Roles - TODO

## 🚨 Estado Actual: INCOMPLETO

La lógica de roles NO está funcionando correctamente. Este documento lista todas las tareas necesarias para implementar el sistema de roles completamente.

## ❌ Problemas Críticos

### 1. Inconsistencia de Nombres de Roles
- **Registro**: usa `"estudiante"`, `"supervisor"`, `"admin"`
- **AdminRoute**: verifica `"administrator"` ❌
- **Layout**: verifica `"admin"` ✓
- **AuthProvider**: lee desde Custom Claims (siempre null) ❌

### 2. Custom Claims vs Firestore
- Los roles se guardan en **Firestore** al registrar
- `AuthProvider` lee desde **Custom Claims** (Firebase Auth)
- **Solución**: Elegir UNA fuente de verdad

### 3. Sin Control de Permisos en Componentes
- Dashboard: todos pueden activar/desactivar riego
- No hay verificación de roles en botones/acciones

---

## ✅ Tareas Requeridas

### Fase 1: Estandarizar Nombres de Roles

- [ ] **Tarea 1.1**: Decidir nombres finales de roles:
  ```typescript
  type UserRole = 'estudiante' | 'supervisor' | 'admin';
  ```

- [ ] **Tarea 1.2**: Actualizar `AdminRoute.tsx`
  ```typescript
  // Cambiar de:
  if (role !== 'administrator')
  // A:
  if (role !== 'admin')
  ```

- [ ] **Tarea 1.3**: Actualizar `useUserAdmin.ts`
  ```typescript
  // Agregar 'estudiante' a los tipos
  type UserRole = "estudiante" | "supervisor" | "admin";
  ```

### Fase 2: Elegir Fuente de Verdad para Roles

**Opción A: Usar Firestore (Recomendado para desarrollo)**

- [ ] **Tarea 2.1**: Modificar `AuthProvider.tsx` para leer desde Firestore
  ```typescript
  import { doc, getDoc } from 'firebase/firestore';
  import { db } from './firebase';
  
  // En lugar de:
  const tokenResult = await getIdTokenResult(currentUser, true);
  const userRole = tokenResult.claims.role;
  
  // Usar:
  const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
  const userRole = userDoc.data()?.role || 'estudiante';
  ```

- [ ] **Tarea 2.2**: Agregar listener en tiempo real para cambios de rol
  ```typescript
  import { onSnapshot, doc } from 'firebase/firestore';
  
  const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
    setRole(doc.data()?.role || 'estudiante');
  });
  ```

**Opción B: Usar Custom Claims (Recomendado para producción)**

- [ ] **Tarea 2.3**: Crear Cloud Function para sincronizar Firestore → Custom Claims
  ```typescript
  // functions/src/index.ts
  export const onUserRoleChanged = functions.firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
      const newRole = change.after.data()?.role;
      await admin.auth().setCustomUserClaims(context.params.userId, {
        role: newRole
      });
    });
  ```

- [ ] **Tarea 2.4**: Forzar refresh del token después de cambiar rol
  ```typescript
  // Después de updateUserRole
  await auth.currentUser?.getIdToken(true); // Fuerza refresh
  ```

### Fase 3: Crear Componentes de Protección

- [ ] **Tarea 3.1**: Crear hook `useUserRole`
  ```typescript
  // apps/web/lib/useUserRole.ts
  export function useUserRole() {
    const { role, loading } = useAuth();
    
    return {
      role,
      loading,
      isEstudiante: role === 'estudiante',
      isSupervisor: role === 'supervisor' || role === 'admin',
      isAdmin: role === 'admin',
      canControl: role === 'supervisor' || role === 'admin',
      canManageUsers: role === 'admin',
    };
  }
  ```

- [ ] **Tarea 3.2**: Crear `SupervisorRoute` component
  ```typescript
  // apps/web/lib/SupervisorRoute.tsx
  export function SupervisorRoute({ children }: { children: React.ReactNode }) {
    const { role, loading } = useAuth();
    
    if (loading) return <LoadingSpinner />;
    
    if (role === 'estudiante') {
      return <AccessDenied />;
    }
    
    return <>{children}</>;
  }
  ```

- [ ] **Tarea 3.3**: Crear componente `RoleGate`
  ```typescript
  // apps/web/components/RoleGate.tsx
  interface RoleGateProps {
    allowedRoles: UserRole[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }
  
  export function RoleGate({ allowedRoles, children, fallback }: RoleGateProps) {
    const { role } = useUserRole();
    
    if (!role || !allowedRoles.includes(role)) {
      return fallback || null;
    }
    
    return <>{children}</>;
  }
  ```

### Fase 4: Proteger Acciones en Dashboard

- [ ] **Tarea 4.1**: Deshabilitar controles para estudiantes en `page.tsx`
  ```typescript
  // apps/web/app/(dashboard)/page.tsx
  import { useUserRole } from '@/lib/useUserRole';
  
  export default function DashboardPage() {
    const { canControl } = useUserRole();
    
    return (
      <IrrigationLineCard
        {...line}
        onToggle={canControl ? handleToggleLine : undefined}
        disabled={!canControl}
      />
    );
  }
  ```

- [ ] **Tarea 4.2**: Mostrar badge de "Solo Lectura" para estudiantes
  ```typescript
  {!canControl && (
    <div className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-md text-sm">
      📖 Modo Solo Lectura
    </div>
  )}
  ```

### Fase 5: Actualizar Navegación

- [ ] **Tarea 5.1**: Ocultar ruta "/admin" para no-admins en `layout.tsx`
  ```typescript
  // Cambiar de:
  ...(role === "admin" ? [...] : [])
  
  // A:
  ...(role === "admin" ? [
    {
      name: "Administración",
      href: "/admin",
      icon: Users,
      active: pathname === "/admin",
    },
  ] : []),
  ```

- [ ] **Tarea 5.2**: Agregar indicador visual de rol en sidebar
  ```typescript
  <p className="text-xs text-gray-500 capitalize flex items-center gap-1">
    {role === 'admin' && <Shield className="w-3 h-3" />}
    {role === 'supervisor' && <Star className="w-3 h-3" />}
    {role === 'estudiante' && <Book className="w-3 h-3" />}
    {role || "Usuario"}
  </p>
  ```

### Fase 6: Actualizar IrrigationLineCard

- [ ] **Tarea 6.1**: Agregar prop `disabled` a `IrrigationLineCard`
  ```typescript
  // apps/web/components/ui/IrrigationLineCard.tsx
  interface IrrigationLineCardProps {
    // ... props existentes
    disabled?: boolean;
  }
  
  export default function IrrigationLineCard({ disabled, ...props }: IrrigationLineCardProps) {
    return (
      <Switch
        disabled={disabled}
        // ... resto de props
      />
    );
  }
  ```

### Fase 7: Implementar Backend Validation

- [ ] **Tarea 7.1**: Crear Security Rules para Firestore
  ```javascript
  // firestore.rules
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      
      // Helper function para obtener rol
      function getUserRole() {
        return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
      }
      
      // Usuarios
      match /users/{userId} {
        allow read: if request.auth.uid == userId;
        allow write: if getUserRole() == 'admin';
      }
      
      // Líneas de riego - todos pueden leer, solo supervisores/admins escribir
      match /irrigationLines/{lineId} {
        allow read: if request.auth != null;
        allow write: if getUserRole() in ['supervisor', 'admin'];
      }
      
      // Sensores - solo lectura para todos
      match /sensors/{sensorId} {
        allow read: if request.auth != null;
        allow write: if getUserRole() in ['supervisor', 'admin'];
      }
      
      // Notificaciones
      match /notifications/{notificationId} {
        allow read: if request.auth.uid == resource.data.userId;
        allow write: if getUserRole() == 'admin';
      }
    }
  }
  ```

- [ ] **Tarea 7.2**: Desplegar Security Rules
  ```bash
  firebase deploy --only firestore:rules
  ```

### Fase 8: Testing

- [ ] **Tarea 8.1**: Probar como Estudiante
  - ✓ Puede ver dashboard
  - ✓ Puede ver sensores
  - ✓ Puede ver historial
  - ✗ NO puede activar/desactivar riego
  - ✗ NO puede acceder a /admin
  - ✗ NO puede modificar configuraciones

- [ ] **Tarea 8.2**: Probar como Supervisor
  - ✓ Puede ver dashboard
  - ✓ Puede activar/desactivar riego
  - ✓ Puede modificar configuraciones
  - ✗ NO puede acceder a /admin
  - ✗ NO puede gestionar usuarios

- [ ] **Tarea 8.3**: Probar como Admin
  - ✓ Puede hacer todo lo de Supervisor
  - ✓ Puede acceder a /admin
  - ✓ Puede gestionar usuarios
  - ✓ Puede cambiar roles

### Fase 9: Documentación

- [ ] **Tarea 9.1**: Actualizar README con sistema de roles
- [ ] **Tarea 9.2**: Crear guía de usuario por rol
- [ ] **Tarea 9.3**: Documentar cómo elevar permisos

---

## 📝 Orden Recomendado de Implementación

### Prioridad ALTA (Crítico)
1. ✅ **Fase 1**: Estandarizar nombres (30 min)
2. ✅ **Fase 2**: Elegir fuente de verdad (1-2 horas)
3. ✅ **Fase 3.1**: Crear hook useUserRole (30 min)

### Prioridad MEDIA (Importante)
4. ✅ **Fase 4**: Proteger acciones en dashboard (1 hora)
5. ✅ **Fase 5**: Actualizar navegación (30 min)
6. ✅ **Fase 6**: Actualizar IrrigationLineCard (30 min)

### Prioridad BAJA (Mejorar)
7. ✅ **Fase 3.2-3.3**: Componentes adicionales (1 hora)
8. ✅ **Fase 7**: Security Rules (1 hora)
9. ✅ **Fase 8**: Testing completo (2 horas)
10. ✅ **Fase 9**: Documentación (1 hora)

---

## 🎯 Resumen

**Total estimado**: 8-10 horas de trabajo

**Estado actual**: 10% implementado
- ✅ Roles definidos en registro
- ✅ Panel de admin existe
- ❌ Sin verificación de permisos
- ❌ Sin protección de rutas funcional
- ❌ Sin control de acciones por rol
- ❌ Sin Security Rules

**Siguiente paso**: Comenzar con Fase 1 (estandarizar nombres de roles)
