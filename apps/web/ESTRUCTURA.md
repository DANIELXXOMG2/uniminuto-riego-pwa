# 📁 Explicación de la Estructura de Directorios

## ¿Por qué hay 2 carpetas llamadas "app"?

Esta es la estructura **CORRECTA** de Next.js 14+ con App Router:

```
uniminuto-riego-pwa/               (Repositorio Git)
└── app/                            ← [1] CARPETA DEL PROYECTO
    ├── package.json                   (Configuración del proyecto)
    ├── next.config.ts                 (Configuración de Next.js)
    ├── tsconfig.json                  (Configuración de TypeScript)
    │
    ├── app/                        ← [2] DIRECTORIO APP ROUTER (rutas)
    │   ├── layout.tsx                 (Layout raíz)
    │   ├── globals.css                (Estilos globales)
    │   │
    │   ├── (dashboard)/               (Grupo de rutas - no afecta URL)
    │   │   ├── layout.tsx             → Layout para rutas del dashboard
    │   │   └── page.tsx               → Ruta: / (raíz)
    │   │
    │   └── (auth)/                    (Grupo de rutas - no afecta URL)
    │       └── login/
    │           └── page.tsx           → Ruta: /login
    │
    ├── components/                 ← Componentes reutilizables
    │   └── ui/
    │       ├── button.tsx
    │       ├── input.tsx
    │       └── IrrigationLineCard.tsx
    │
    └── lib/                        ← Utilidades y configuración
        ├── firebase.ts
        └── utils.ts
```

## 🔑 Explicación de Cada Nivel

### Nivel 1: `/app` - Carpeta del Proyecto
- Es la **carpeta raíz del proyecto Next.js**
- Contiene `package.json`, `node_modules`, etc.
- Este nombre lo elegimos al crear el proyecto con `create-next-app app`
- **Podría llamarse de cualquier manera** (frontend, webapp, client, etc.)

### Nivel 2: `/app/app` - Directorio App Router
- Es el **directorio especial de Next.js** para el App Router
- Next.js 13+ **REQUIERE** que se llame exactamente `app/`
- Aquí van todas las rutas de la aplicación
- Cada `page.tsx` dentro define una ruta accesible

## 📍 Mapeo de Rutas

| Archivo | URL | Descripción |
|---------|-----|-------------|
| `app/(dashboard)/page.tsx` | `/` | Dashboard principal |
| `app/(auth)/login/page.tsx` | `/login` | Pantalla de login |

**Nota**: Los paréntesis `(dashboard)` y `(auth)` son **grupos de rutas** que:
- ✅ Permiten organizar el código
- ✅ Permiten layouts compartidos
- ❌ NO cambian la URL

## ❌ Problema que Tenías

Antes había un archivo `app/page.tsx` que retornaba `null`:

```tsx
// ❌ INCORRECTO - Competía con (dashboard)/page.tsx
export default function Home() {
  return null;  // Pantalla vacía
}
```

Como `app/page.tsx` y `app/(dashboard)/page.tsx` compiten por la ruta `/`, Next.js estaba cargando el primero (que no mostraba nada).

## ✅ Solución Aplicada

Se eliminó `app/page.tsx` para que **solo exista** `app/(dashboard)/page.tsx` en la ruta raíz.

Ahora:
- `http://localhost:3000/` → Muestra el Dashboard ✅
- `http://localhost:3000/login` → Muestra el Login ✅

## 🎯 Resumen

| Pregunta | Respuesta |
|----------|-----------|
| ¿Por qué 2 carpetas `app`? | Una es el proyecto, otra es el directorio de rutas de Next.js |
| ¿Es un error? | No, es la estructura estándar de Next.js 14+ |
| ¿Puedo cambiar el nombre? | El primer `/app` sí, el segundo NO (debe ser `app/`) |
| ¿Por qué no cargaba? | Había un `page.tsx` vacío compitiendo con el dashboard |

## 🚀 Estado Actual

✅ **Funcionando correctamente**
- Servidor corriendo en `http://localhost:3000`
- Dashboard cargando en `/`
- Login disponible en `/login`
- Sin conflictos de rutas
