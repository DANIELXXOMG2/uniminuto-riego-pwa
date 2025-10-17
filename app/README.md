# UNIMINUTO Riego - PWA

Sistema de Riego Automatizado desarrollado con Next.js 14+ y Firebase.

## 🚀 Inicio Rápido

### Prerrequisitos
- Bun instalado
- Node.js 18+
- Cuenta de Firebase

### Instalación

Las dependencias ya están instaladas. Si necesitas reinstalarlas:

```bash
bun install
```

### Configuración de Firebase

1. Copia el archivo de ejemplo de variables de entorno:
```bash
cp .env.local.example .env.local
```

2. Edita `.env.local` y completa con tus credenciales de Firebase:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

### Ejecutar en Desarrollo

```bash
bun dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
/app
  /app                    # Directorio raíz de Next.js
    /page.tsx             # Redirige al dashboard
    /layout.tsx           # Layout principal de la app
    /globals.css          # Estilos globales
  /(auth)                 # Grupo de rutas de autenticación
    /login
      /page.tsx           # Página de inicio de sesión
  /(dashboard)            # Grupo de rutas del dashboard
    /layout.tsx           # Layout del dashboard con navbar
    /page.tsx             # Dashboard principal
  /components             # Componentes reutilizables
    /ui                   # Componentes de UI (shadcn/ui)
      /button.tsx
      /input.tsx
      /switch.tsx
      /card.tsx
      /IrrigationLineCard.tsx  # Tarjeta de línea de riego
    /index.ts             # Exportaciones de componentes
  /lib                    # Utilidades y configuración
    /firebase.ts          # Configuración de Firebase
    /utils.ts             # Funciones de utilidad
```

## 🎨 Componentes Implementados

### Pantallas

#### Login (`/(auth)/login/page.tsx`)
- Formulario de inicio de sesión mobile-first
- Campos de email y contraseña
- Diseño centrado con logo y branding de UNIMINUTO
- Validación de formularios

#### Dashboard (`/(dashboard)/page.tsx`)
- Vista principal del sistema
- Banner de modo sin conexión (cuando aplique)
- Estadísticas rápidas (Total líneas, Activas, Inactivas, Humedad promedio)
- Grid responsivo de tarjetas de líneas de riego
- Actualización en tiempo real del estado

### Componentes Reutilizables

#### IrrigationLineCard
Tarjeta que muestra información de cada línea de riego:
- Título de la línea
- Estado visual (Regando/Detenida)
- Valor grande de humedad promedio
- Switch para activar/desactivar
- Última actualización
- Animaciones y transiciones suaves

#### Layout del Dashboard
- Navbar superior sticky con:
  - Logo de UNIMINUTO Riego
  - Botón de menú (móvil)
  - Icono de notificaciones con indicador
- Diseño responsivo
- Container con máximo ancho

## 🛠️ Tecnologías Utilizadas

- **Next.js 14+** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS v4** - Estilos utility-first
- **shadcn/ui** - Componentes de UI accesibles
- **Firebase** - Backend as a Service (Auth, Firestore)
- **Lucide React** - Iconos modernos
- **Bun** - Runtime y package manager

## 📱 Características de UI

- ✅ Diseño mobile-first
- ✅ Componentes reutilizables con shadcn/ui
- ✅ Diseño responsive (móvil, tablet, desktop)
- ✅ Tema de colores consistente (azul principal, verde para estados activos)
- ✅ Transiciones y animaciones suaves
- ✅ Indicadores visuales de estado
- ✅ Accesibilidad (aria-labels, contraste de colores)

## 🔄 Próximos Pasos

1. **Integración con Firebase Auth**
   - Implementar login con email/password
   - Persistencia de sesión
   - Protección de rutas

2. **Conexión con Firestore**
   - Sincronización en tiempo real de líneas de riego
   - CRUD de líneas de riego
   - Historial de mediciones

3. **PWA Features**
   - Service Worker para modo offline
   - Caché de datos
   - Notificaciones push

4. **Dashboard Avanzado**
   - Gráficas de humedad en el tiempo
   - Configuración de umbrales
   - Programación de riego automático

## 📄 Licencia

MIT

