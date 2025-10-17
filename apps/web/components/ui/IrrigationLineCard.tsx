'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Droplet, Activity } from 'lucide-react';

interface IrrigationLineCardProps {
  title: string;
  isActive: boolean;
  humidity: number;
  onToggle: (checked: boolean) => void;
}

export default function IrrigationLineCard({
  title,
  isActive,
  humidity,
  onToggle,
}: IrrigationLineCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Droplet className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Activity className={`w-3.5 h-3.5 ${isActive ? 'text-green-500' : 'text-gray-400'}`} />
                <span className={`text-xs font-medium ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
                  {isActive ? 'Regando' : 'Detenida'}
                </span>
              </div>
            </div>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={onToggle}
            aria-label={`Activar/Desactivar ${title}`}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 text-center border border-blue-100">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-blue-900">{humidity}</span>
            <span className="text-2xl font-semibold text-blue-700">%</span>
          </div>
          <p className="text-sm text-gray-600 mt-1 font-medium">Humedad Promedio</p>
        </div>

        {/* Información adicional */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
          <span>Última actualización</span>
          <span className="font-medium">Hace 2 min</span>
        </div>
      </CardContent>
    </Card>
  );
}
