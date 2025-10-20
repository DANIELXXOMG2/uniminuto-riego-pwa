"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

export interface Reading {
  timestamp: Timestamp;
  valueVWC: number;
}

type TimeRange = "24h" | "7d" | "30d";

interface UseReadingsReturn {
  readings: Reading[];
  loading: boolean;
  error: string | null;
}

export function useReadings(
  sensorId: string | null | undefined,
  timeRange: TimeRange
): UseReadingsReturn {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si no hay sensorId, no ejecutar la consulta
    if (!sensorId) {
      setReadings([]);
      setLoading(false);
      return;
    }

    const fetchReadings = async () => {
      try {
        setLoading(true);
        setError(null);

        // Calcular la fecha de inicio basada en el timeRange
        const now = new Date();
        let startDate: Date;

        switch (timeRange) {
          case "24h":
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case "7d":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "30d":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        // Convertir a Timestamp de Firebase
        const startTimestamp = Timestamp.fromDate(startDate);

        // Referencia a la subcolección de readings del sensor
        const readingsRef = collection(db, "sensors", sensorId, "readings");

        // Crear query con filtro de fecha y ordenamiento
        const q = query(
          readingsRef,
          where("timestamp", ">=", startTimestamp),
          orderBy("timestamp", "asc")
        );

        // Ejecutar la consulta
        const querySnapshot = await getDocs(q);

        // Mapear los documentos a la interfaz Reading
        const fetchedReadings: Reading[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            timestamp: data.timestamp,
            valueVWC: data.valueVWC,
          };
        });

        setReadings(fetchedReadings);
      } catch (err) {
        console.error("Error fetching readings:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Error al obtener las lecturas del sensor"
        );
        setReadings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReadings();
  }, [sensorId, timeRange]); // Re-ejecutar solo cuando cambien sensorId o timeRange

  return { readings, loading, error };
}
