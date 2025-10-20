# Refactorización: Página de Historial y Hook useReadings

## 📋 Resumen

Se realizó una refactorización completa de la página de historial (`apps/web/app/(dashboard)/historial/page.tsx`) y el hook `useReadings` para eliminar el `SENSOR_ID` hardcoded y permitir la selección dinámica de sensores.

## 🎯 Objetivos Cumplidos

1. ✅ Eliminado el `SENSOR_ID` hardcoded ("sensor-001")
2. ✅ Modificado `useReadings` para aceptar `sensorId` opcional
3. ✅ Creado nuevo hook `useSensors` para obtener lista de sensores disponibles
4. ✅ Implementado selector de sensores en la UI usando shadcn/ui Select
5. ✅ Eliminados todos los TODOs del proyecto web

## 📁 Archivos Modificados

### 1. `apps/web/lib/useReadings.ts`

**Cambio:** Parámetro `sensorId` ahora acepta `string | null | undefined`

```typescript
// Antes
export function useReadings(
  sensorId: string,
  timeRange: TimeRange
): UseReadingsReturn;

// Después
export function useReadings(
  sensorId: string | null | undefined,
  timeRange: TimeRange
): UseReadingsReturn;
```

**Beneficios:**

- Mayor flexibilidad al permitir valores nulos o indefinidos
- No ejecuta consulta si no hay sensor seleccionado
- Mantiene toda la funcionalidad existente

### 2. `apps/web/lib/useSensors.ts` (NUEVO)

**Descripción:** Hook personalizado para obtener la lista de sensores disponibles.

**Características:**

- Obtiene sensores desde la colección `irrigationLines`
- Maneja estados de carga y error
- Asume que cada línea de riego tiene un sensor asociado
- Soporta campo `sensorId` explícito o genera ID en formato `sensor-{lineId}`

**Interfaz:**

```typescript
interface Sensor {
  id: string;
  title: string;
}

interface UseSensorsReturn {
  sensors: Sensor[];
  loading: boolean;
  error: string | null;
}
```

### 3. `apps/web/app/(dashboard)/historial/page.tsx`

**Cambios principales:**

#### a) Importaciones agregadas:

- `useEffect` de React
- Componentes `Select` de shadcn/ui
- Hook `useSensors`

#### b) Estado agregado:

```typescript
const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);
```

#### c) Selector automático de sensor:

```typescript
useEffect(() => {
  if (sensors.length > 0 && !selectedSensorId) {
    setSelectedSensorId(sensors[0].id);
  }
}, [sensors, selectedSensorId]);
```

#### d) UI mejorada:

- **Selector de sensores:** Dropdown con lista de sensores disponibles
- **Estados de carga:** Skeleton loader para selector
- **Manejo de errores:** Mensajes de error específicos para sensores
- **Estado vacío:** Mensaje cuando no hay sensores disponibles
- **Estado sin selección:** Mensaje para indicar que se debe seleccionar un sensor

## 🎨 Componentes UI Agregados

### Select Component (shadcn/ui)

Instalado mediante:

```bash
bunx shadcn@latest add select
```

**Archivos generados:**

- `apps/web/components/ui/select.tsx`

**Dependencias:**

- `@radix-ui/react-select: ^2.2.6` (ya estaba instalada)

## 🔄 Flujo de Funcionamiento

```
1. Usuario abre página de historial
2. useSensors() obtiene lista de sensores desde Firestore
3. Primer sensor se selecciona automáticamente
4. useReadings() obtiene lecturas del sensor seleccionado
5. Usuario puede cambiar sensor mediante el selector
6. Gráficos y métricas se actualizan dinámicamente
```

## 📊 Estructura de Datos Asumida

### Colección: `irrigationLines`

```typescript
{
  id: string,
  title: string,
  isActive: boolean,
  humidity: number,
  sensorId?: string // Opcional, si no existe usa "sensor-{id}"
}
```

### Colección: `sensors/{sensorId}/readings`

```typescript
{
  timestamp: Timestamp,
  valueVWC: number
}
```

## 🎯 Características de la UI

### Selector de Sensores

- **Estilo:** Tema verde esmeralda acorde al diseño
- **Comportamiento:** Selección única con indicador visual
- **Estado inicial:** Primer sensor seleccionado automáticamente
- **Responsive:** Se adapta a diferentes tamaños de pantalla

### Manejo de Estados

#### Cargando Sensores

```
┌─────────────────────────────┐
│  [Skeleton Loader]          │
└─────────────────────────────┘
```

#### Error al Cargar Sensores

```
┌─────────────────────────────┐
│  ⚠️ Error al cargar sensores│
│  [Mensaje de error]         │
└─────────────────────────────┘
```

#### Sin Sensores Disponibles

```
┌─────────────────────────────┐
│  ℹ️ No hay sensores         │
│  disponibles                │
└─────────────────────────────┘
```

#### Sin Sensor Seleccionado

```
┌─────────────────────────────┐
│  ℹ️ Por favor, selecciona   │
│  un sensor para ver su      │
│  historial                  │
└─────────────────────────────┘
```

## 🧪 Casos de Prueba Recomendados

1. **Sin sensores en BD:** Verificar mensaje apropiado
2. **Un sensor:** Selección automática funciona
3. **Múltiples sensores:** Cambio entre sensores actualiza correctamente
4. **Error de red:** Manejo de errores de conexión
5. **Sensor sin lecturas:** Mensaje "No hay datos disponibles"
6. **Diferentes rangos de tiempo:** 24h, 7d, 30d funcionan correctamente

## 🔮 Mejoras Futuras Sugeridas

1. **Persistencia de selección:** Guardar sensor seleccionado en localStorage
2. **Comparación de sensores:** Vista para comparar múltiples sensores
3. **Filtros avanzados:** Filtrar por estado activo/inactivo
4. **Exportación de datos:** Descargar historial en CSV/JSON
5. **Notificaciones:** Alertas cuando sensor seleccionado tiene anomalías
6. **Gráficos múltiples:** Visualización simultánea de varios sensores

## 📝 Notas Técnicas

### Optimizaciones Aplicadas

1. **useMemo:** Cálculo de métricas y datos de gráfico solo cuando cambian readings
2. **useEffect:** Selección automática con dependencias optimizadas
3. **Lazy loading:** Lecturas solo se cargan cuando hay sensor seleccionado

### Consideraciones de Rendimiento

- Hook `useSensors` se ejecuta una sola vez al montar
- Hook `useReadings` se re-ejecuta solo cuando cambia sensor o rango de tiempo
- No hay consultas innecesarias a Firestore

## 🐛 Bugs Conocidos

Ninguno reportado al momento de la refactorización.

## ✅ Checklist de Validación

- [x] Código compila sin errores
- [x] No hay errores de TypeScript
- [x] No hay TODOs pendientes
- [x] Componentes UI instalados correctamente
- [x] Hooks personalizados funcionan independientemente
- [x] Estados de carga y error manejados
- [x] UI responsive y accesible
- [x] Mantiene estilo visual existente

## 📚 Referencias

- [Recharts Documentation](https://recharts.org/)
- [shadcn/ui Select Component](https://ui.shadcn.com/docs/components/select)
- [Firebase Firestore Queries](https://firebase.google.com/docs/firestore/query-data/queries)
- [React Hooks Best Practices](https://react.dev/reference/react)

---

**Fecha de refactorización:** 19 de Octubre, 2025
**Sprint:** Sprint 4
**Autor:** Refactorización automatizada
