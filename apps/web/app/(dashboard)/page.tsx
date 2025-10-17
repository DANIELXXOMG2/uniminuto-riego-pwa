'use client';

import { useState } from 'react';
import IrrigationLineCard from '@/components/ui/IrrigationLineCard';
import { WifiOff, Droplets } from 'lucide-react';
import { useIrrigationData } from '@/lib/useIrrigationData';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function DashboardPage() {
  const [isOffline] = useState(false); // Simular modo offline
  const { lines, loading, error } = useIrrigationData();

  const handleToggleLine = async (id: string, checked: boolean) => {
    try {
      const lineRef = doc(db, 'irrigationLines', id);
      await updateDoc(lineRef, {
        isActive: checked,
      });
    } catch (err) {
      console.error('Error al actualizar línea de riego:', err);
    }
  };

  // Skeleton de carga
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Principal</h2>
          <p className="text-gray-600">
            Monitorea y controla tus líneas de riego en tiempo real
          </p>
        </div>

        {/* Skeleton de Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>

        {/* Skeleton de Líneas de Riego */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Líneas de Riego</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
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
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Principal</h2>
          <p className="text-gray-600">
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
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error al cargar datos</h3>
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

      {/* Encabezado */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Principal</h2>
        <p className="text-gray-600">
          Monitorea y controla tus líneas de riego en tiempo real
        </p>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Total Líneas</p>
          <p className="text-2xl font-bold text-gray-900">{lines.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Activas</p>
          <p className="text-2xl font-bold text-green-600">
            {lines.filter((l) => l.isActive).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Inactivas</p>
          <p className="text-2xl font-bold text-gray-400">
            {lines.filter((l) => !l.isActive).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Humedad Prom.</p>
          <p className="text-2xl font-bold text-blue-600">
            {Math.round(
              lines.reduce((acc, l) => acc + l.humidity, 0) / lines.length
            )}%
          </p>
        </div>
      </div>

      {/* Líneas de Riego */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Líneas de Riego</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lines.map((line) => (
            <IrrigationLineCard
              key={line.id}
              title={line.title}
              isActive={line.isActive}
              humidity={line.humidity}
              onToggle={(checked) => handleToggleLine(line.id, checked)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
