"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Droplet, Activity, Zap, Hand, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface IrrigationLineCardProps {
  title: string;
  isActive: boolean;
  humidity: number;
  targetHumidity?: number;
  autoIrrigationEnabled?: boolean;
  onToggle: (checked: boolean) => void;
  onTargetHumidityChange?: (value: number) => void;
  disabled?: boolean;
  canEdit?: boolean;
}

export default function IrrigationLineCard({
  title,
  isActive,
  humidity,
  targetHumidity = 0,
  autoIrrigationEnabled = false,
  onToggle,
  onTargetHumidityChange,
  disabled = false,
  canEdit = false,
}: IrrigationLineCardProps) {
  const [localTarget, setLocalTarget] = useState(targetHumidity);
  const [showWarning, setShowWarning] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sincronizar localTarget cuando targetHumidity cambie desde fuera
  useEffect(() => {
    setLocalTarget(targetHumidity);
  }, [targetHumidity]);

  // Determinar modo: automático o manual
  const isAutoMode = autoIrrigationEnabled && targetHumidity > 0;

  // Calcular estado de riego automático (con histéresis del 3%)
  const HYSTERESIS = 3;
  const shouldAutoIrrigate = isAutoMode && humidity < (targetHumidity - HYSTERESIS);
  
  // Estado efectivo de riego (manual O automático)
  const isEffectivelyIrrigating = isActive || shouldAutoIrrigate;
  
  const needsWater = isAutoMode && humidity < targetHumidity;
  const isNearTarget = isAutoMode && humidity >= (targetHumidity - 5) && humidity < targetHumidity;

  // Función para guardar el valor con debounce
  const saveTargetHumidity = (value: number) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (onTargetHumidityChange) {
        onTargetHumidityChange(value);
      }
    }, 800); // Espera 800ms después del último cambio
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setLocalTarget(value);
    setShowWarning(value > 60);
    saveTargetHumidity(value);
  };

  // Para el slider: guardar cuando se suelta el mouse
  const handleSliderMouseUp = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (onTargetHumidityChange) {
      onTargetHumidityChange(localTarget);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0 && value <= 60) {
      setLocalTarget(value);
      setShowWarning(value > 60);
      saveTargetHumidity(value);
    }
  };

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${disabled ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-lg ${
                isEffectivelyIrrigating ? (shouldAutoIrrigate ? "bg-green-100" : "bg-blue-100") : "bg-gray-100"
              }`}
            >
              <Droplet
                className={`w-5 h-5 ${
                  isEffectivelyIrrigating ? (shouldAutoIrrigate ? "text-green-600" : "text-blue-600") : "text-gray-400"
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{title}</h3>
                {isAutoMode ? (
                  <Zap className="w-4 h-4 text-green-600" />
                ) : (
                  <Hand className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Activity
                  className={`w-3.5 h-3.5 ${isEffectivelyIrrigating ? "text-green-500" : "text-muted-foreground"}`}
                />
                <span
                  className={`text-xs font-medium ${isEffectivelyIrrigating ? "text-green-600" : "text-muted-foreground"}`}
                >
                  {isEffectivelyIrrigating 
                    ? (shouldAutoIrrigate ? "Regando (Auto)" : "Regando (Manual)") 
                    : "Detenida"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Switch
              checked={isEffectivelyIrrigating}
              onCheckedChange={onToggle}
              disabled={disabled}
              aria-label={`Activar/Desactivar ${title}`}
              title={shouldAutoIrrigate ? 'Auto activo: el sistema puede volver a encender' : ''}
            />
            {shouldAutoIrrigate && (
              <span className="text-[10px] text-green-600 font-medium">Auto</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Humedad actual */}
        <div className="rounded-lg p-4 text-center border border-border bg-card">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-foreground">{humidity}</span>
            <span className="text-2xl font-semibold text-muted-foreground">%</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Humedad Actual
          </p>
        </div>

        {/* Estado de riego automático */}
        {isAutoMode && needsWater && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 rounded-lg p-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-900 dark:text-amber-200">
              Faltan <strong>{(targetHumidity - humidity).toFixed(1)}%</strong> para alcanzar objetivo
            </p>
          </div>
        )}

        {isAutoMode && isNearTarget && (
          <div className="bg-green-50 dark:bg-emerald-900/20 border border-green-200/60 rounded-lg p-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-xs text-green-900 dark:text-emerald-200">
              Cerca del objetivo ({targetHumidity}%)
            </p>
          </div>
        )}

        {/* Control de humedad objetivo */}
        {canEdit && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Humedad Objetivo
              </label>
              <span className="text-sm font-bold text-foreground">{localTarget}%</span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max="60"
              value={localTarget}
              onChange={handleSliderChange}
              onMouseUp={handleSliderMouseUp}
              onTouchEnd={handleSliderMouseUp}
              disabled={disabled}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />

            {/* Input numérico */}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="60"
                value={localTarget}
                onChange={handleInputChange}
                disabled={disabled}
                className="text-center"
              />
              <span className="text-sm text-gray-600">%</span>
            </div>

            {/* Advertencia saturación */}
            {showWarning && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200/60 rounded-lg p-2 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-900 dark:text-orange-200">
                  Después del 60%, los sensores entran en zona de saturación con lecturas erráticas.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Información adicional */}
        <div className="pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
          <span>Última actualización</span>
          <span className="font-medium text-foreground">Hace 2 min</span>
        </div>
      </CardContent>
    </Card>
  );
}
