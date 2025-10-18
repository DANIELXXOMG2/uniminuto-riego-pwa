"use client";

import { useState, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useReadings } from "@/lib/useReadings";
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

  // TODO: Reemplazar con el sensorId real de tu sistema
  // Puedes obtenerlo desde el contexto o props cuando integres con el dashboard
  const SENSOR_ID = "sensor-001"; // Hardcoded por ahora

  // Obtener lecturas del sensor
  const { readings, loading, error } = useReadings(SENSOR_ID, selectedRange);

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
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 to-emerald-900 text-white">
      {/* Header */}
      <header className="flex items-center gap-4 p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="text-white hover:bg-emerald-800"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold">Historial</h1>
      </header>

      <div className="px-4 pb-6 space-y-6">
        {/* Date Range Filters */}
        <div className="flex gap-2 bg-emerald-900/50 rounded-lg p-1">
          <Button
            variant={selectedRange === "24h" ? "default" : "ghost"}
            className={`flex-1 ${
              selectedRange === "24h"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "text-white hover:bg-emerald-800"
            }`}
            onClick={() => setSelectedRange("24h")}
          >
            24h
          </Button>
          <Button
            variant={selectedRange === "7d" ? "default" : "ghost"}
            className={`flex-1 ${
              selectedRange === "7d"
                ? "bg-emerald-500 hover:bg-emerald-600"
                : "text-white hover:bg-emerald-800"
            }`}
            onClick={() => setSelectedRange("7d")}
          >
            7 días
          </Button>
          <Button
            variant={selectedRange === "30d" ? "default" : "ghost"}
            className={`flex-1 ${
              selectedRange === "30d"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "text-white hover:bg-emerald-800"
            }`}
            onClick={() => setSelectedRange("30d")}
          >
            30 días
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-200">
            <p className="font-semibold">Error al cargar datos</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Humidity Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">Humedad</h2>
            <div className="flex items-baseline gap-2">
              {loading ? (
                <div className="h-14 w-32 bg-emerald-800/30 animate-pulse rounded" />
              ) : (
                <>
                  <span className="text-5xl font-bold">{metrics.average}%</span>
                  <span className="text-emerald-400 text-sm">
                    Últimos {rangeLabel[selectedRange]}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="bg-emerald-900/30 rounded-lg border-2 border-emerald-700/50 p-4">
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto" />
                  <p className="text-emerald-300/70">Cargando datos...</p>
                </div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <p className="text-emerald-300/70 text-lg">
                    No hay datos disponibles
                  </p>
                  <p className="text-emerald-400/50 text-sm">
                    No se encontraron lecturas para el rango seleccionado
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(16, 185, 129, 0.1)"
                  />
                  <XAxis
                    dataKey="time"
                    stroke="#6ee7b7"
                    style={{ fontSize: "12px" }}
                    tick={{ fill: "#6ee7b7" }}
                  />
                  <YAxis
                    stroke="#6ee7b7"
                    style={{ fontSize: "12px" }}
                    tick={{ fill: "#6ee7b7" }}
                    domain={[0, 100]}
                    label={{
                      value: "%",
                      position: "insideTopLeft",
                      fill: "#6ee7b7",
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#064e3b",
                      border: "1px solid #10b981",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    labelStyle={{ color: "#6ee7b7" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: "#10b981", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="space-y-3 pt-4">
          <div className="flex justify-between items-center py-3 border-b border-emerald-700/30">
            <span className="text-emerald-200">Humedad Promedio</span>
            {loading ? (
              <div className="h-7 w-16 bg-emerald-800/30 animate-pulse rounded" />
            ) : (
              <span className="text-xl font-semibold">{metrics.average}%</span>
            )}
          </div>
          <div className="flex justify-between items-center py-3 border-b border-emerald-700/30">
            <span className="text-emerald-200">Humedad Más Baja</span>
            {loading ? (
              <div className="h-7 w-16 bg-emerald-800/30 animate-pulse rounded" />
            ) : (
              <span className="text-xl font-semibold">{metrics.lowest}%</span>
            )}
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-emerald-200">Humedad Más Alta</span>
            {loading ? (
              <div className="h-7 w-16 bg-emerald-800/30 animate-pulse rounded" />
            ) : (
              <span className="text-xl font-semibold">{metrics.highest}%</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
