"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export interface Sensor {
  id: string;
  title: string;
  status?: string;
}

interface UseSensorsReturn {
  sensors: Sensor[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook personalizado para obtener la lista de sensores disponibles
 * desde la colección sensors
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

        // Obtener todos los sensores de la colección sensors
        const sensorsRef = collection(db, "sensors");
        const sensorsQuery = query(sensorsRef, orderBy("title", "asc"));
        const querySnapshot = await getDocs(sensorsQuery);

        // Mapear los documentos a objetos Sensor
        const fetchedSensors: Sensor[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || `Sensor ${doc.id}`,
            status: data.status,
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
