# Configuración de Autenticación con Google

## Descripción

Este documento describe cómo habilitar la autenticación con Google en Firebase para el proyecto UNIMINUTO Riego PWA.

## Pasos para Habilitar Google Authentication

### 1. Acceder a Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto `uniminuto-riego-pwa`

### 2. Habilitar el Proveedor de Google

1. En el menú lateral, ve a **Build** → **Authentication**
2. Haz clic en la pestaña **Sign-in method**
3. En la lista de proveedores, busca **Google**
4. Haz clic en **Google** para editarlo
5. Activa el toggle **Enable** (Habilitar)
6. Configura los siguientes campos:
   - **Project support email**: Selecciona un email de soporte (puede ser tu email principal)
   - **Project public-facing name**: `UNIMINUTO Riego` (o el nombre que prefieras mostrar a los usuarios)
7. Haz clic en **Save** (Guardar)

### 3. Configurar Dominios Autorizados (Opcional)

Si estás desplegando en un dominio personalizado:

1. En la misma sección de **Authentication** → **Settings**
2. Ve a la pestaña **Authorized domains**
3. Añade tu dominio de producción si no está en la lista
   - Ejemplo: `tu-dominio.com`
   - Los dominios `localhost`, `*.firebaseapp.com`, y `*.web.app` ya están autorizados por defecto

### 4. Verificar Configuración del Proyecto

1. Ve a **Project Settings** (⚙️ en la parte superior izquierda)
2. En la pestaña **General**, verifica que el **Public-facing name** y **Support email** estén configurados
3. Estos campos son requeridos para que funcione la autenticación con Google

## Características Implementadas

### Página de Login (`/login`)

- ✅ Botón "Continuar con Google" con icono de Google
- ✅ Autenticación mediante popup de Google
- ✅ Creación/actualización automática del documento en Firestore
- ✅ Manejo de errores específicos:
  - Popup cerrado por el usuario
  - Cuenta existente con credenciales diferentes
  - Popup bloqueado
  - Solicitud cancelada
- ✅ Redirección automática al dashboard después del login

### Página de Registro (`/register`)

- ✅ Botón "Continuar con Google" con icono de Google
- ✅ Autenticación mediante popup de Google
- ✅ Creación del documento en Firestore con:
  - Email del usuario
  - Rol por defecto: `supervisor`
  - Timestamp de creación
- ✅ Uso de `merge: true` para evitar sobrescribir datos existentes
- ✅ Manejo de errores idéntico a la página de login
- ✅ Redirección automática al dashboard después del registro

### Archivo `firebase.ts`

- ✅ Importación de `GoogleAuthProvider`
- ✅ Exportación de instancia de `googleProvider`

## Flujo de Autenticación

### Para Usuarios Nuevos (Registro)

1. Usuario hace clic en "Continuar con Google"
2. Se abre un popup de autenticación de Google
3. Usuario selecciona su cuenta de Google
4. Firebase Authentication crea la cuenta
5. Se crea un documento en Firestore con:
   ```javascript
   {
     email: "usuario@gmail.com",
     role: "supervisor",
     createdAt: "2025-10-20T12:00:00.000Z"
   }
   ```
6. Usuario es redirigido al dashboard

### Para Usuarios Existentes (Login)

1. Usuario hace clic en "Continuar con Google"
2. Se abre un popup de autenticación de Google
3. Usuario selecciona su cuenta de Google
4. Firebase Authentication autentica al usuario
5. Se actualiza/crea el documento en Firestore con `merge: true`
6. Usuario es redirigido al dashboard

## Manejo de Errores

El sistema maneja los siguientes errores de Firebase:

| Código de Error | Mensaje al Usuario |
|----------------|-------------------|
| `auth/popup-closed-by-user` | "Ventana emergente cerrada. Por favor, intenta de nuevo." |
| `auth/account-exists-with-different-credential` | "Ya existe una cuenta con este correo usando otro método de inicio de sesión." |
| `auth/popup-blocked` | "Ventana emergente bloqueada. Por favor, permite ventanas emergentes e intenta de nuevo." |
| `auth/cancelled-popup-request` | "Solicitud cancelada." |
| Otros errores | "Error al iniciar sesión con Google. Por favor, intenta de nuevo." |

## Consideraciones de Seguridad

1. **Merge en Firestore**: Se usa `{ merge: true }` para evitar sobrescribir roles de administrador u otros campos importantes
2. **Rol por Defecto**: Los nuevos usuarios reciben el rol `supervisor` por defecto
3. **Email Verificado**: Google garantiza que los emails están verificados
4. **Popup Bloqueado**: Los usuarios deben permitir popups en su navegador

## Testing

### Pruebas Locales

1. Asegúrate de que el servidor de desarrollo esté corriendo:
   ```bash
   cd apps/web
   bun run dev
   ```

2. Navega a `http://localhost:3000/login` o `http://localhost:3000/register`

3. Haz clic en "Continuar con Google"

4. Verifica que:
   - El popup de Google se abre correctamente
   - Puedes seleccionar tu cuenta
   - Después de autenticarte, eres redirigido al dashboard
   - El documento del usuario se crea en Firestore

### Pruebas de Errores

1. **Popup cerrado**: Cierra el popup antes de seleccionar una cuenta
2. **Cuenta existente**: Intenta registrarte con un email que ya usaste con email/contraseña
3. **Popup bloqueado**: Bloquea los popups en tu navegador y verifica el mensaje de error

## Archivos Modificados

1. `apps/web/lib/firebase.ts`
   - Importación de `GoogleAuthProvider`
   - Exportación de `googleProvider`

2. `apps/web/app/(auth)/login/page.tsx`
   - Componente `GoogleIcon`
   - Función `handleGoogleSignIn`
   - Botón "Continuar con Google"
   - Divisor visual ("O")

3. `apps/web/app/(auth)/register/page.tsx`
   - Componente `GoogleIcon`
   - Función `handleGoogleSignUp`
   - Botón "Continuar con Google"
   - Divisor visual ("O")

## Próximos Pasos (Opcional)

1. **Agregar más proveedores**: Facebook, GitHub, etc.
2. **Personalizar la experiencia**: Logo personalizado en el popup de Google
3. **Recuperación de contraseña**: Implementar "Olvidé mi contraseña" para usuarios de email/contraseña
4. **Vincular cuentas**: Permitir vincular múltiples métodos de autenticación a una misma cuenta

## Recursos

- [Firebase Authentication - Google](https://firebase.google.com/docs/auth/web/google-signin)
- [Manejo de Errores de Firebase Auth](https://firebase.google.com/docs/reference/js/auth#autherrorcodes)
- [Firestore merge](https://firebase.google.com/docs/firestore/manage-data/add-data#set_a_document)
