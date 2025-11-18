"use client";

import { useEffect, useState } from "react";
import IrrigationLineCard from "@/components/ui/IrrigationLineCard";
import { WifiOff, Droplets, CheckCircle, XCircle, Zap } from "lucide-react";
import { useIrrigationData } from "@/lib/useIrrigationData";
import { useSensors } from "@/lib/useSensors";
import { useSystemConfig } from "@/lib/useSystemConfig";
import { useAuth } from "@/lib/AuthProvider";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Switch } from "@/components/ui/switch";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

export default function DashboardPage() {
  const [isOffline] = useState(false); // Simular modo offline
  const { lines, loading, error, fromCache } = useIrrigationData();
  const { sensors, loading: sensorsLoading, error: sensorsError } = useSensors();
  const { config, updateConfig } = useSystemConfig();
  const { role } = useAuth(); // Obtener el rol del usuario
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    // Detectar cambios de conectividad para mostrar estado offline
    const update = () => setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-eliminar después de 3 segundos
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  const handleToggleLine = async (id: string, checked: boolean) => {
    try {
      const lineRef = doc(db, "irrigationLines", id);
      await updateDoc(lineRef, {
        isActive: checked,
      });

      // Mostrar notificación de éxito
      showToast(
        `Línea ${checked ? "activada" : "desactivada"} correctamente`,
        "success"
      );
    } catch (err) {
      console.error("Error al actualizar línea de riego:", err);

      // Mostrar notificación de error
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error al actualizar la línea de riego";

      showToast(
        `Error: ${errorMessage}. Por favor, intenta de nuevo.`,
        "error"
      );
    }
  };

  const handleTargetHumidityChange = async (id: string, value: number) => {
    try {
      const lineRef = doc(db, "irrigationLines", id);
      await updateDoc(lineRef, {
        targetHumidity: value,
      });

      showToast(
        `Humedad objetivo actualizada a ${value}%`,
        "success"
      );
    } catch (err) {
      console.error("Error al actualizar humedad objetivo:", err);
      showToast(
        `Error al actualizar humedad objetivo`,
        "error"
      );
    }
  };

  const handleAutoIrrigationToggle = async (checked: boolean) => {
    try {
      await updateConfig({ autoIrrigationEnabled: checked });
      showToast(
        `Riego automático ${checked ? "activado" : "desactivado"} globalmente`,
        "success"
      );
    } catch (err) {
      console.error("Error al cambiar riego automático:", err);
      showToast(
        `Error al cambiar riego automático`,
        "error"
      );
    }
  };

  // Skeleton de carga
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Estado de conectividad */}
        <div className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
          Cargando datos { !isOnline ? "(sin conexión, mostrando caché si disponible)" : "" }
        </div>
        {/* Encabezado */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Dashboard Principal
          </h2>
          <p className="text-muted-foreground">
            Monitorea y controla tus líneas de riego en tiempo real
          </p>
        </div>

        {/* Skeleton de Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>

        {/* Skeleton de Líneas de Riego */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Líneas de Riego
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="h-6 bg-gray-200 rounded w-32"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-11"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Manejo de errores
  if (error) {
    return (
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Dashboard Principal
          </h2>
          <p className="text-muted-foreground">
            Monitorea y controla tus líneas de riego en tiempo real
          </p>
        </div>

        {/* Mensaje de error */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 p-3 rounded-full">
              <Droplets className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Error al cargar datos
          </h3>
          <p className="text-red-700">{error}</p>
          <p className="text-sm text-red-600 mt-2">
            Por favor, verifica tu conexión e intenta recargar la página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner de estado offline / datos en caché */}
      {(!isOnline || fromCache) && (
        <div className="rounded-md border border-border bg-amber-50 dark:bg-amber-900/20 p-3">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            Sin conexión o datos en caché. Mostrando la última información guardada. Los cambios se sincronizarán al reconectar.
          </p>
        </div>
      )}
      {/* Sistema de Notificaciones Toast */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right duration-300 ${
              toast.type === "success"
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        ))}
      </div>

      {/* Banner de Modo sin Conexión */}
      {isOffline && (
        <div className="bg-orange-500 text-white px-4 py-3 rounded-lg shadow-md">
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Modo sin conexión</p>
              <p className="text-sm text-orange-100">
                Los cambios se sincronizarán cuando vuelvas a estar en línea
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner de Solo Lectura para Estudiantes */}
      {role === 'estudiante' && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
              <Droplets className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-900">Modo Solo Lectura</p>
              <p className="text-sm text-blue-700">
                Puedes ver el estado del sistema, pero no realizar cambios. Contacta a tu supervisor si necesitas permisos adicionales.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Dashboard Principal
        </h2>
        <p className="text-muted-foreground">
          Monitorea y controla tus líneas de riego en tiempo real
        </p>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-muted-foreground">Total Líneas</p>
          <p className="text-2xl font-bold text-foreground">{lines.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-muted-foreground">Activas</p>
          <p className="text-2xl font-bold text-green-600">
            {lines.filter((l) => l.isActive).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-muted-foreground">Inactivas</p>
          <p className="text-2xl font-bold text-gray-400">
            {lines.filter((l) => !l.isActive).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-muted-foreground">Humedad Prom.</p>
          <p className="text-2xl font-bold text-blue-600">
            {Math.round(
              lines.reduce((acc, l) => acc + l.humidity, 0) / lines.length
            )}
            %
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-muted-foreground">Sensores Totales</p>
          <p className="text-2xl font-bold text-purple-600">
            {sensorsLoading ? "..." : sensorsError ? "Error" : sensors.length}
          </p>
        </div>
      </div>

      {/* Control Global de Riego Automático */}
      {(role === 'admin' || role === 'supervisor') && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-900">Riego Automático Global</p>
                <p className="text-sm text-green-700">
                  Activa/desactiva el control automático por humedad objetivo en todas las líneas
                </p>
              </div>
            </div>
            <Switch
              checked={Boolean(config?.autoIrrigationEnabled)}
              onCheckedChange={handleAutoIrrigationToggle}
              disabled={false}
            />
          </div>
        </div>
      )}

      {/* Líneas de Riego */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Líneas de Riego</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lines.map((line) => (
            <IrrigationLineCard
              key={line.id}
              title={line.title}
              isActive={line.isActive}
              humidity={line.humidity}
              targetHumidity={line.targetHumidity}
              autoIrrigationEnabled={config?.autoIrrigationEnabled ?? true}
              onToggle={(checked) => handleToggleLine(line.id, checked)}
              onTargetHumidityChange={(value) => handleTargetHumidityChange(line.id, value)}
              disabled={role === 'estudiante'}
              canEdit={role === 'admin' || role === 'supervisor'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
