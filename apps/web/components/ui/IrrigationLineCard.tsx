"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Droplet, Activity, Zap, Hand, AlertTriangle } from "lucide-react";
import { useState } from "react";

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

  // Determinar modo: automático o manual
  const isAutoMode = autoIrrigationEnabled && targetHumidity > 0;

  // Calcular estado de riego automático
  const needsWater = isAutoMode && humidity < targetHumidity;
  const isNearTarget = isAutoMode && humidity >= (targetHumidity - 5) && humidity < targetHumidity;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setLocalTarget(value);
    setShowWarning(value > 60);
    if (onTargetHumidityChange) {
      onTargetHumidityChange(value);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0 && value <= 60) {
      setLocalTarget(value);
      setShowWarning(value > 60);
      if (onTargetHumidityChange) {
        onTargetHumidityChange(value);
      }
    }
  };

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${disabled ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-lg ${
                isActive ? (isAutoMode ? "bg-green-100" : "bg-blue-100") : "bg-gray-100"
              }`}
            >
              <Droplet
                className={`w-5 h-5 ${
                  isActive ? (isAutoMode ? "text-green-600" : "text-blue-600") : "text-gray-400"
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{title}</h3>
                {isAutoMode ? (
                  <Zap className="w-4 h-4 text-green-600" />
                ) : (
                  <Hand className="w-4 h-4 text-gray-500" />
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Activity
                  className={`w-3.5 h-3.5 ${isActive ? "text-green-500" : "text-gray-400"}`}
                />
                <span
                  className={`text-xs font-medium ${isActive ? "text-green-600" : "text-gray-500"}`}
                >
                  {isActive ? "Regando" : "Detenida"}
                </span>
              </div>
            </div>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={onToggle}
            disabled={disabled}
            aria-label={`Activar/Desactivar ${title}`}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Humedad actual */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 text-center border border-blue-100">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-blue-900">{humidity}</span>
            <span className="text-2xl font-semibold text-blue-700">%</span>
          </div>
          <p className="text-sm text-gray-600 mt-1 font-medium">
            Humedad Actual
          </p>
        </div>

        {/* Estado de riego automático */}
        {isAutoMode && needsWater && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-900">
              Faltan <strong>{(targetHumidity - humidity).toFixed(1)}%</strong> para alcanzar objetivo
            </p>
          </div>
        )}

        {isAutoMode && isNearTarget && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-xs text-green-900">
              Cerca del objetivo ({targetHumidity}%)
            </p>
          </div>
        )}

        {/* Control de humedad objetivo */}
        {canEdit && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Humedad Objetivo
              </label>
              <span className="text-sm font-bold text-gray-900">{localTarget}%</span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max="60"
              value={localTarget}
              onChange={handleSliderChange}
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
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-900">
                  Después del 60%, los sensores entran en zona de saturación con lecturas erráticas.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Información adicional */}
        <div className="pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
          <span>Última actualización</span>
          <span className="font-medium">Hace 2 min</span>
        </div>
      </CardContent>
    </Card>
  );
}
