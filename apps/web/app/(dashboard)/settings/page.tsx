"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminRoute } from "@/lib/AdminRoute";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useSystemConfig } from "@/lib/useSystemConfig";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { config, loading, updateConfig } = useSystemConfig();
  const [defaultInterval, setDefaultInterval] = useState<string>("");
  const [activeInterval, setActiveInterval] = useState<string>("");
  const [moistureThreshold, setMoistureThreshold] = useState<string>("");
  const [autoIrrigationEnabled, setAutoIrrigationEnabled] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  const hasChanges = useMemo(() => {
    if (!config) return false;
    const defaultInt = Number(defaultInterval);
    const activeInt = Number(activeInterval);
    const threshold = Number(moistureThreshold);

    return (
      defaultInt !== config.defaultReadingIntervalSeconds ||
      activeInt !== config.activeIrrigationIntervalSeconds ||
      threshold !== config.irrigationMoistureThreshold ||
      autoIrrigationEnabled !== Boolean(config.autoIrrigationEnabled)
    );
  }, [config, defaultInterval, activeInterval, moistureThreshold, autoIrrigationEnabled]);

  useEffect(() => {
    if (!config) return;
    setDefaultInterval(String(config.defaultReadingIntervalSeconds ?? ""));
    setActiveInterval(String(config.activeIrrigationIntervalSeconds ?? ""));
    setMoistureThreshold(String(config.irrigationMoistureThreshold ?? ""));
    setAutoIrrigationEnabled(Boolean(config.autoIrrigationEnabled));
  }, [config]);

  const handleSave = async () => {
    if (!config || saving) return;
    setSaving(true);
    try {
      await updateConfig({
        defaultReadingIntervalSeconds: Number(defaultInterval) || 0,
        activeIrrigationIntervalSeconds: Number(activeInterval) || 0,
        irrigationMoistureThreshold: Number(moistureThreshold) || 0,
        autoIrrigationEnabled,
      });
      toast.success("Configuración guardada");
    } catch (error) {
      console.error("Error al guardar la configuración", error);
      toast.error("No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminRoute>
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Configuración del Sistema</CardTitle>
            <CardDescription>Ajustes globales de riego y lecturas</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando configuración...
              </div>
            ) : config ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Intervalo de lectura por defecto (segundos)
                  </label>
                  <Input
                    type="number"
                    value={defaultInterval}
                    onChange={(e) => setDefaultInterval(e.target.value)}
                    min={0}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Intervalo de riego activo (segundos)
                  </label>
                  <Input
                    type="number"
                    value={activeInterval}
                    onChange={(e) => setActiveInterval(e.target.value)}
                    min={0}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Umbral de humedad para riego (%)
                  </label>
                  <Input
                    type="number"
                    value={moistureThreshold}
                    onChange={(e) => setMoistureThreshold(e.target.value)}
                    min={0}
                    max={100}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">Riego automático</p>
                    <p className="text-sm text-muted-foreground">
                      Activa la lógica automática basada en el umbral de humedad
                    </p>
                  </div>
                  <Switch
                    checked={autoIrrigationEnabled}
                    onCheckedChange={setAutoIrrigationEnabled}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={!hasChanges || saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Guardando...
                      </>
                    ) : (
                      "Guardar Cambios"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">
                No se encontró la configuración del sistema.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminRoute>
  );
}
