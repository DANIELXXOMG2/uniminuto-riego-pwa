# Rutas de la Aplicación

## 🔐 Rutas de Autenticación

### `/login` - Pantalla de Inicio de Sesión
- **Archivo**: `app/(auth)/login/page.tsx`
- **Descripción**: Formulario de autenticación con email y contraseña
- **Características**:
  - Logo de UNIMINUTO Riego con icono de gota
  - Campos de entrada para email y contraseña
  - Botón de inicio de sesión
  - Enlace de "¿Olvidaste tu contraseña?"
  - Diseño mobile-first con gradiente de fondo
  - Validación de formularios

## 📊 Rutas del Dashboard

### `/` - Dashboard Principal
- **Archivo**: `app/(dashboard)/page.tsx`
- **Layout**: `app/(dashboard)/layout.tsx`
- **Descripción**: Vista principal del sistema de riego
- **Características**:
  - Banner de modo sin conexión (cuando aplique)
  - Estadísticas rápidas:
    - Total de líneas
    - Líneas activas
    - Líneas inactivas
    - Humedad promedio
  - Grid de tarjetas de líneas de riego
  - Actualización en tiempo real
  - Controles de encendido/apagado para cada línea

## 🎨 Componentes UI

### Navbar (Dashboard Layout)
- Logo de UNIMINUTO Riego
- Título de la aplicación
- Icono de notificaciones con indicador
- Botón de menú para móvil
- Diseño sticky (permanece visible al hacer scroll)

### IrrigationLineCard
- **Ubicación**: `components/ui/IrrigationLineCard.tsx`
- **Props**:
  - `title`: Nombre de la línea de riego
  - `isActive`: Estado activo/inactivo
  - `humidity`: Valor de humedad en porcentaje
  - `onToggle`: Función callback para cambiar el estado
- **Características**:
  - Indicador visual del estado (Regando/Detenida)
  - Valor grande de humedad con diseño destacado
  - Switch para control on/off
  - Timestamp de última actualización
  - Animaciones hover
  - Diseño responsive

## 🎨 Paleta de Colores

- **Azul principal**: #2563EB (bg-blue-600)
- **Verde activo**: #16A34A (text-green-600)
- **Naranja offline**: #F97316 (bg-orange-500)
- **Gris neutral**: #6B7280 (text-gray-600)

## 📱 Breakpoints Responsivos

- **Móvil**: < 640px (por defecto)
- **Tablet**: >= 768px (md:)
- **Desktop**: >= 1024px (lg:)

## 🚀 Navegación

```
/ (raíz)
├── / → Dashboard Principal (con layout)
└── /login → Inicio de Sesión (sin layout del dashboard)
```

## 🔄 Estados de la Aplicación

### Online
- Todas las funcionalidades disponibles
- Sincronización en tiempo real
- Sin banner de advertencia

### Offline (Futuro)
- Banner naranja visible
- Datos en caché disponibles
- Cambios pendientes de sincronización
- Indicador visual en navbar

## 📝 Notas de Desarrollo

- Los grupos de rutas `(auth)` y `(dashboard)` no afectan la URL
- El layout del dashboard solo se aplica a rutas dentro de `(dashboard)`
- Las rutas de autenticación no tienen el navbar del dashboard
- Todos los componentes usan TypeScript estricto
- shadcn/ui proporciona componentes base accesibles
