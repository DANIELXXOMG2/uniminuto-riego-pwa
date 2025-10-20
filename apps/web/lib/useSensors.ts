"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export interface Sensor {
  id: string;
  title: string;
}

interface UseSensorsReturn {
  sensors: Sensor[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook personalizado para obtener la lista de sensores disponibles
 * desde la colección de irrigationLines
 */
export function useSensors(): UseSensorsReturn {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSensors = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener todas las líneas de riego que tienen sensores
        const irrigationLinesRef = collection(db, "irrigationLines");
        const querySnapshot = await getDocs(irrigationLinesRef);

        // Mapear los documentos a sensores
        // Asumimos que cada irrigationLine tiene un sensor asociado
        // con ID en formato "sensor-{lineId}" o un campo sensorId
        const fetchedSensors: Sensor[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          // Si existe un campo sensorId explícito, usarlo; sino, usar el ID del documento
          const sensorId = data.sensorId || `sensor-${doc.id}`;
          return {
            id: sensorId,
            title: data.title || `Sensor ${doc.id}`,
          };
        });

        setSensors(fetchedSensors);
      } catch (err) {
        console.error("Error fetching sensors:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Error al obtener la lista de sensores"
        );
        setSensors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSensors();
  }, []);

  return { sensors, loading, error };
}
