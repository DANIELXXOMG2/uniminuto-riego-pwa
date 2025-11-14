# Auditoría estática apps/web – 14/11/2025

## apps/web/components/index.ts

- **Código muerto – reexport innecesaria:** `IrrigationLineCard` se vuelve a exportar desde este índice pero ningún archivo importa desde `components/index`. Todos los consumidores hacen `import ... from "@/components/ui/IrrigationLineCard"`, por lo que la reexport queda huérfana.
  - **Sugerencia:** eliminar la reexport o reemplazar los imports de la app para centralizarlos en `components/index.ts`, evitando tener dos rutas distintas para el mismo componente.

## apps/web/lib/firebase.ts

- **Código muerto – export default sin uso:** El archivo exporta `export default app;`, pero no existe ningún `import app from "@/lib/firebase"`. Esto mantiene código sin ejecutar y puede generar confusión si se asume que la instancia default se usa en algún sitio.
  - **Sugerencia:** remover el `export default` o cambiar los consumidores a `import app from "@/lib/firebase"` si realmente se requiere exponer la instancia.

## apps/web/lib/firebase-admin.ts

- **Código muerto – `adminApp` sin consumidores externos:** Sólo se importa `db` desde este módulo (`app/api/ingest/route.ts`). `adminApp` queda exportado pero nunca se utiliza.
  - **Sugerencia:** eliminar la exportación o exponer utilidades adicionales (por ejemplo auth admin) que justifiquen el símbolo.

## apps/web/lib/useIrrigationData.ts

- **Código muerto – tipos exportados sin consumo:** La interfaz `IrrigationLine` se exporta pero únicamente se usa dentro del propio archivo.
  - **Sugerencia:** quitar el `export` o mover el tipo a un módulo compartido si se espera usarlo en componentes como `IrrigationLineCard`.
- **Violación DRY – patrón de suscripción repetido:** Este hook replica el mismo esquema `useState` + `onSnapshot` + `setLoading/setError` que también está en `useNotifications`, `useUsers`, `useSensors` y `useSystemConfig`.
  - **Sugerencia:** extraer un helper (`useFirestoreSubscription`) que reciba la referencia y un mapper; así sólo se define la transformación específica y se reutiliza el manejo de estados y errores.

## apps/web/lib/useNotifications.ts

- **Código muerto – tipos sin uso externo:** `NotificationType` y `NotificationData` se exportan pero no se consumen fuera del hook; sólo `Notification` se importa en `app/(dashboard)/layout.tsx`.
  - **Sugerencia:** dejar los tipos como internos o moverlos a un módulo dedicado a tipados compartidos.
- **Violación DRY:** La lógica de `onSnapshot`, `loading`, `error` y `cleanup` es casi idéntica a la de los demás hooks de Firestore.
  - **Sugerencia:** reutilizar el helper propuesto arriba para mantener un único lugar con el manejo genérico de suscripciones.

## apps/web/lib/useReadings.ts

- **Código muerto – import y variable sin uso:** Se importa `where` y se calcula `const startTimestamp = Timestamp.fromDate(startDate);` pero ninguna de las dos referencias se usa después (ESLint lo reporta en la ejecución de `bun run lint:web`).
  - **Sugerencia:** reintroducir el filtro `where("timestamp", ">=", startTimestamp)` en la query para aprovechar la fecha calculada y evitar traer datos innecesarios; esto anula los warnings y mejora la performance.
- **Oportunidad de rendimiento:** Actualmente se descargan todas las lecturas de la colección, se filtran en el cliente y se registran múltiples `console.log` por documento. Con históricos grandes esto provoca tráfico y ruido en consola.
  - **Sugerencia:** usar la comparación por fecha dentro de la query (como se mencionó) y eliminar los `console.log` masivos o condicionarlos a entornos de desarrollo mediante `if (process.env.NODE_ENV !== "production")`.

## apps/web/lib/useSensors.ts

- **Código muerto – interfaz `Sensor` sin consumidores externos:** Sólo el propio hook la usa.
  - **Sugerencia:** convertirla en tipo interno o moverla a un archivo común si se planea tipar los componentes de sensores.
- **Violación DRY:** Lógica de carga e incertidumbre similar a los otros hooks de Firestore.
  - **Sugerencia:** reutilizar el helper de suscripciones para que el código de `useSensors` se limite al mapeo del documento.

## apps/web/lib/useSystemConfig.ts

- **Código muerto – interfaz `SystemConfig` sin uso externo:** Sólo se usa dentro del hook; no hay importaciones desde otros módulos.
  - **Sugerencia:** eliminar el `export` o mover la interfaz a un archivo de tipos compartidos si `page.tsx` u otros formularios la necesitan.
- **Violación DRY:** Comparte exactamente el mismo patrón de `doc` + `onSnapshot` + `updateConfig` que otros hooks de Firestore.
  - **Sugerencia:** al extraer un helper, la lógica compartida (manejo de loading/errores) se reduce y sólo queda la parte específica del documento.

## apps/web/lib/useUsers.ts

- **Código muerto – interfaz `AppUser` sin uso fuera del hook.**
  - **Sugerencia:** convertirla en tipo local o compartirla desde un módulo de modelos.
- **Violación DRY:** La suscripción a `collection('users')` repite el mismo boilerplate que el resto de hooks.
  - **Sugerencia:** reutilizar el helper de Firestore para evitar divergencias en el manejo de errores.

## apps/web/app/(auth)/login/page.tsx y apps/web/app/(auth)/register/page.tsx

- **Violación DRY – componente duplicado:** Ambos archivos definen `const GoogleIcon = () => (...)` con el mismo SVG (línea 14 en cada archivo).
  - **Sugerencia:** mover el ícono a `components/icons/Google.tsx` o a `components/ui/social-button.tsx` para reutilizarlo (incluyendo atributos accesibles).
- **Violación DRY – layout y banners idénticos:** Las secciones de hero, card y banner de error (`bg-red-50 border border-red-200 ...`, líneas 227 y 232 respectivamente) son iguales en login y register, e incluso el dashboard usa el mismo banner en su estado de error.
  - **Sugerencia:** crear componentes como `<AuthShell>`, `<AuthErrorBanner>` y `<AuthHero>` que reciban el contenido variable y eviten repetir 100+ líneas en cada vista.

## apps/web/app/(dashboard)/page.tsx

- **Código muerto – banner reutilizado sin abstracción:** El error container (`bg-red-50 border border-red-200 ...`, línea 132) replica la misma estructura que login/register.
  - **Sugerencia:** reutilizar el mismo componente de alerta global mencionado arriba.
- **Violación DRY – tarjetas de métricas repetidas:** Cada tarjeta en la cuadrícula de estadísticas repite exactamente la misma estructura `bg-white p-4 ...` cambiando sólo el texto y el valor.
  - **Sugerencia:** crear un `StatCard` que reciba `title`, `value` y `color` para definir la cuadrícula desde un arreglo de configuraciones.
- **Oportunidad de rendimiento – cálculos no memoizados:** En cada render se ejecutan `lines.filter(...)` dos veces, `!lines.isActive` otra vez y un `reduce` para promedio. Con muchas líneas esto provoca cuatro recorridos del array en cada render.
  - **Sugerencia:** encapsular los conteos y promedios en un `useMemo` dependiente de `lines`, devolviendo un objeto con `total`, `active`, `inactive` y `averageHumidity`.
- **Oportunidad de rendimiento – callbacks inestables:** Dentro del map de `lines` se pasa `onToggle={(checked) => handleToggleLine(line.id, checked)}`. Esa función inline crea una nueva referencia en cada render, impidiendo cualquier `React.memo` en `IrrigationLineCard`.
  - **Sugerencia:** envolver `handleToggleLine` en `useCallback` y exponer un helper `const toggleLine = useCallback((lineId) => (checked) => {...}, [db])` para entregar callbacks estables.

## apps/web/components/ui/IrrigationLineCard.tsx

- **Oportunidad de rendimiento – componente no memoizado:** Aunque recibe props primitivos, el `onToggle` cambia en cada render del padre, forzando renders innecesarios.
  - **Sugerencia:** envolver el componente en `React.memo` y tipar `onToggle` con `useCallback` desde el padre para evitar renders cuando `line` no cambie.

## apps/web/app/(dashboard)/layout.tsx

- **Oportunidad de rendimiento – componente monolítico (582 líneas):** Este layout maneja autenticación, navegación, popover de notificaciones, toast en primer plano y banner FCM. Cualquier cambio en `sidebarOpen`, `notifications`, `token` o `showNotificationToast` vuelve a renderizar toda la página.
  - **Sugerencia:** dividir el archivo en subcomponentes (`DashboardSidebar`, `DashboardNavbar`, `NotificationsPopover`, `ForegroundToast`) y envolver los que reciben props complejas en `React.memo`. Además, mover `navigationItems` a un `useMemo` dependiente de `role`/`pathname` reduce trabajo.

## apps/web/app/(dashboard)/admin/page.tsx

- **Oportunidad de rendimiento – filtrado costoso sin memo:** `const filteredUsers = users.filter(...)` se ejecuta en cada render, aunque sólo depende de `users` y `searchQuery`.
  - **Sugerencia:** usar `useMemo(() => users.filter(...), [users, searchQuery])` para evitar recalcular toda la lista cuando cambian estados no relacionados (por ejemplo, diálogos abiertos/cerrados).

## apps/web/app/(dashboard)/historial/page.tsx

- **Violación DRY – navegación de sensores repetida:** Las funciones `handlePrevSensor` y `handleNextSensor` repiten la misma lógica de índice (buscar el actual, validar límites, actualizar).
  - **Sugerencia:** crear un helper `const jumpSensor = (step: 1 | -1) => { ... }` o un `useSensorNavigator` para encapsular el cálculo del índice siguiente y reducir la duplicación.
- **Oportunidad de rendimiento – renderizado del Select sin memo:** El menú `<SelectItem>` se recalcula completo cada vez que cambian `selectedRange` o `readings`, pese a depender sólo de `sensors`.
  - **Sugerencia:** envolver el mapeo de `sensors` en `useMemo` o extraerlo a un componente hijo memoizado para evitar renders innecesarios cuando llegan nuevas lecturas.

## apps/web/app/(dashboard)/layout.tsx & apps/web/app/(dashboard)/page.tsx & apps/web/app/(auth)/*/page.tsx

- **Violación DRY – banners de estado repetidos:** Además del error banner, hay múltiples bloques para "Modo sin conexión", "Modo solo lectura" y mensajes vacíos con la misma estructura (`icon + título + descripción + colores`).
  - **Sugerencia:** extraer un componente `StatusBanner` parametrizable con `variant` (`error`, `warning`, `info`) y reutilizarlo en las distintas vistas.

## apps/web/lib/useUsers.ts, useNotifications.ts, useSensors.ts, useSystemConfig.ts

- **Oportunidad de rendimiento – estados `loading/error` independientes:** Cada hook maneja `loading` e `error` por separado aunque comparten la misma semántica. Esto dificulta cachear resultados o compartirlos entre vistas.
  - **Sugerencia:** además del helper de suscripción, considerar un `useFirestoreResource<T>` que acepte claves de cache y devuelva resultados memoizados (por ejemplo con Zustand o React Query) para evitar múltiples listeners sobre la misma colección en diferentes componentes.
