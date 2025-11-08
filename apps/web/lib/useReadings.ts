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

        console.log(`📊 Obteniendo lecturas para sensor: ${sensorId}, rango: ${timeRange}`);

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

        console.log(`📅 Buscando lecturas desde: ${startDate.toISOString()}`);

        // Convertir a Timestamp de Firebase
        const startTimestamp = Timestamp.fromDate(startDate);

        // Referencia a la subcolección de readings del sensor
        const readingsRef = collection(db, "sensors", sensorId, "readings");

        // Crear query con ordenamiento (sin filtro de fecha por ahora para evitar problemas)
        const q = query(
          readingsRef,
          orderBy("timestamp", "desc")
        );

        // Ejecutar la consulta
        const querySnapshot = await getDocs(q);

        console.log(`📦 Documentos obtenidos: ${querySnapshot.docs.length}`);

        // Mapear los documentos a la interfaz Reading
        const fetchedReadings: Reading[] = querySnapshot.docs
          .map((doc) => {
            const data = doc.data();
            console.log(`📄 Documento ${doc.id}:`, data);
            
            // Manejar diferentes formatos de timestamp
            let timestamp: Timestamp;
            if (data.timestamp instanceof Timestamp) {
              timestamp = data.timestamp;
              console.log(`✅ Timestamp es instancia de Timestamp`);
            } else if (data.timestamp?.seconds) {
              // Si es un objeto con seconds, convertirlo a Timestamp
              timestamp = new Timestamp(data.timestamp.seconds, data.timestamp.nanoseconds || 0);
              console.log(`✅ Timestamp convertido desde objeto: ${timestamp.toDate().toISOString()}`);
            } else {
              // Fallback: usar timestamp actual
              console.warn('⚠️ Formato de timestamp no reconocido en documento:', doc.id, data);
              timestamp = Timestamp.now();
            }
            
            return {
              timestamp,
              valueVWC: typeof data.valueVWC === 'number' ? data.valueVWC : 0,
            };
          })
          .filter((reading) => {
            // Filtrar por fecha en el cliente
            const readingDate = reading.timestamp.toDate();
            const isInRange = readingDate >= startDate;
            console.log(`🔍 Lectura ${readingDate.toISOString()} - En rango: ${isInRange}`);
            return isInRange;
          })
          .sort((a, b) => a.timestamp.seconds - b.timestamp.seconds); // Ordenar ascendente por tiempo

        console.log(`✅ Lecturas filtradas y ordenadas: ${fetchedReadings.length}`);
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
