"use client";

import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReadings } from "@/lib/useReadings";
import { useSensors } from "@/lib/useSensors";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DateRange = "24h" | "7d" | "30d";

export default function HistorialPage() {
  const router = useRouter();
  const [selectedRange, setSelectedRange] = useState<DateRange>("7d");
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);

  // Obtener lista de sensores disponibles
  const {
    sensors,
    loading: sensorsLoading,
    error: sensorsError,
  } = useSensors();

  // Seleccionar automáticamente el primer sensor cuando se carguen
  useEffect(() => {
    if (sensors.length > 0 && selectedSensorId === null) {
      setSelectedSensorId(sensors[0].id);
    }
  }, [sensors, selectedSensorId]);

  // Funciones de navegación entre sensores
  const handlePrevSensor = () => {
    if (!selectedSensorId || sensors.length <= 1) return;
    
    const currentIndex = sensors.findIndex(s => s.id === selectedSensorId);
    if (currentIndex <= 0) return;
    
    const newIndex = currentIndex - 1;
    setSelectedSensorId(sensors[newIndex].id);
  };

  const handleNextSensor = () => {
    if (!selectedSensorId || sensors.length <= 1) return;
    
    const currentIndex = sensors.findIndex(s => s.id === selectedSensorId);
    if (currentIndex < 0 || currentIndex >= sensors.length - 1) return;
    
    const newIndex = currentIndex + 1;
    setSelectedSensorId(sensors[newIndex].id);
  };

  // Obtener lecturas del sensor seleccionado
  const { readings, loading, error } = useReadings(
    selectedSensorId,
    selectedRange
  );

  // Calcular métricas de resumen
  const metrics = useMemo(() => {
    if (readings.length === 0) {
      return { average: 0, lowest: 0, highest: 0 };
    }

    const values = readings.map((r) => r.valueVWC);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / values.length;
    const lowest = Math.min(...values);
    const highest = Math.max(...values);

    return {
      average: Math.round(average),
      lowest: Math.round(lowest),
      highest: Math.round(highest),
    };
  }, [readings]);

  // Preparar datos para el gráfico
  const chartData = useMemo(() => {
    return readings.map((reading) => {
      const date = reading.timestamp.toDate();
      const timeLabel =
        selectedRange === "24h"
          ? date.toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : date.toLocaleDateString("es-ES", {
              month: "short",
              day: "numeric",
            });

      return {
        time: timeLabel,
        humidity: reading.valueVWC,
      };
    });
  }, [readings, selectedRange]);

  // Mapeo de rango para mostrar en la UI
  const rangeLabel = {
    "24h": "24 horas",
    "7d": "7 días",
    "30d": "30 días",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">Historial</h1>
        </div>
      </header>

      <div className="px-4 pb-6 space-y-6">
        {/* Sensor Selection */}
        {sensorsLoading ? (
          <div className="bg-emerald-900/50 rounded-lg p-4">
            <div className="h-10 bg-emerald-800/30 animate-pulse rounded" />
          </div>
        ) : sensorsError ? (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-200">
            <p className="font-semibold">Error al cargar sensores</p>
            <p className="text-sm">{sensorsError}</p>
          </div>
        ) : sensors.length === 0 ? (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 text-yellow-200">
            <p className="font-semibold">No hay sensores disponibles</p>
            <p className="text-sm">No se encontraron sensores en el sistema</p>
          </div>
        ) : (
          <div className="space-y-2">
            <label
              htmlFor="sensor-select"
              className="text-sm font-medium text-emerald-200"
            >
              Seleccionar Sensor
            </label>
            <div className="flex items-center gap-2">
              {/* Botón Anterior */}
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevSensor}
                disabled={
                  sensorsLoading ||
                  sensors.length <= 1 ||
                  (selectedSensorId !== null &&
                    sensors.findIndex(s => s.id === selectedSensorId) === 0)
                }
                className="bg-emerald-900/50 border-emerald-700 text-white hover:bg-emerald-800/50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {/* Select */}
              <Select
                value={selectedSensorId ?? ""}
                onValueChange={setSelectedSensorId}
              >
                <SelectTrigger
                  id="sensor-select"
                  className="flex-1 bg-emerald-900/50 border-emerald-700 text-white hover:bg-emerald-800/50"
                  disabled={sensorsLoading || sensors.length === 0}
                >
                  <SelectValue placeholder={sensorsLoading ? "Cargando sensores..." : "Selecciona un sensor"} />
                </SelectTrigger>
                <SelectContent className="bg-emerald-900 border-emerald-700 text-white">
                  {sensors.map((sensor) => (
                    <SelectItem
                      key={sensor.id}
                      value={sensor.id}
                      className="focus:bg-emerald-800 focus:text-white"
                    >
                      {`${sensor.id} - ${sensor.title}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Botón Siguiente */}
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextSensor}
                disabled={
                  sensorsLoading ||
                  sensors.length <= 1 ||
                  (selectedSensorId !== null &&
                    sensors.findIndex(s => s.id === selectedSensorId) === sensors.length - 1)
                }
                className="bg-emerald-900/50 border-emerald-700 text-white hover:bg-emerald-800/50 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Date Range Filters */}
        <div className="flex gap-2 bg-secondary rounded-lg p-1">
          <Button
            variant={selectedRange === "24h" ? "default" : "ghost"}
            className={`flex-1`}
            onClick={() => setSelectedRange("24h")}
          >
            24h
          </Button>
          <Button
            variant={selectedRange === "7d" ? "default" : "ghost"}
            className={`flex-1`}
            onClick={() => setSelectedRange("7d")}
          >
            7 días
          </Button>
          <Button
            variant={selectedRange === "30d" ? "default" : "ghost"}
            className={`flex-1`}
            onClick={() => setSelectedRange("30d")}
          >
            30 días
          </Button>
        </div>

        {/* Badge de resolución para rangos largos (7d y 30d) */}
        {selectedRange !== "24h" && (
          <div className="w-fit rounded-full border border-border bg-secondary px-2 py-1 text-xs text-muted-foreground inline-flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            Resolución: por hora
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-200">
            <p className="font-semibold">Error al cargar datos</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Humidity Section */}
        {selectedSensorId ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">Humedad</h2>
              <div className="flex items-baseline gap-2">
                {loading ? (
                  <div className="h-14 w-32 bg-emerald-800/30 animate-pulse rounded" />
                ) : (
                  <>
                    <span className="text-5xl font-bold">
                      {metrics.average}%
                    </span>
                    <span className="text-emerald-400 text-sm">
                      Últimos {rangeLabel[selectedRange]}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Chart */}
            <div className="bg-card rounded-lg border-2 border-border p-4">
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                    <p className="text-muted-foreground">Cargando datos...</p>
                  </div>
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <p className="text-muted-foreground text-lg">
                      No hay datos disponibles
                    </p>
                    <p className="text-muted-foreground/80 text-sm">
                      No se encontraron lecturas para el rango seleccionado
                    </p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="time"
                      stroke="var(--muted-foreground)"
                      style={{ fontSize: "12px" }}
                      tick={{ fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      style={{ fontSize: "12px" }}
                      tick={{ fill: "var(--muted-foreground)" }}
                      domain={[0, 100]}
                      label={{
                        value: "%",
                        position: "insideTopLeft",
                        fill: "var(--muted-foreground)",
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        border: "1px solid var(--ring)",
                        borderRadius: "8px",
                        color: "var(--popover-foreground)",
                      }}
                      labelStyle={{ color: "var(--muted-foreground)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="humidity"
                      stroke="var(--chart-2)"
                      strokeWidth={3}
                      dot={{ fill: "var(--chart-2)", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Summary Metrics */}
            <div className="space-y-3 pt-4">
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="text-muted-foreground">Humedad Promedio</span>
                {loading ? (
                  <div className="h-7 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  <span className="text-xl font-semibold">
                    {metrics.average}%
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="text-muted-foreground">Humedad Más Baja</span>
                {loading ? (
                  <div className="h-7 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  <span className="text-xl font-semibold">
                    {metrics.lowest}%
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-muted-foreground">Humedad Más Alta</span>
                {loading ? (
                  <div className="h-7 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  <span className="text-xl font-semibold">
                    {metrics.highest}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6 text-center">
            <p className="text-blue-200 text-lg">
              Por favor, selecciona un sensor para ver su historial
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
