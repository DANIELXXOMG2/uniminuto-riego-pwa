'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from './firebase';

// Interfaz para una línea de riego
export interface IrrigationLine {
  id: string;
  title: string;
  isActive: boolean;
  humidity: number;
  targetHumidity?: number; // Umbral objetivo (0-60%)
}

// Interfaz del resultado del hook
interface UseIrrigationDataResult {
  lines: IrrigationLine[];
  loading: boolean;
  error: string | null;
  fromCache: boolean;
}

/**
 * Hook personalizado para obtener datos en tiempo real de Firestore
 * Se suscribe a la colección 'irrigationLines' y actualiza los datos automáticamente
 */
export function useIrrigationData(): UseIrrigationDataResult {
  const [lines, setLines] = useState<IrrigationLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);

  useEffect(() => {
    // Referencia a la colección de irrigationLines
    const irrigationLinesRef = collection(db, 'irrigationLines');

    // Configurar el listener de Firestore
    const unsubscribe = onSnapshot(
      // Incluir cambios de metadatos para detectar si vienen del caché
      irrigationLinesRef,
      { includeMetadataChanges: true },
      (snapshot: QuerySnapshot<DocumentData>) => {
        try {
          // Mapear los documentos a nuestro formato de datos
          const irrigationData: IrrigationLine[] = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title || 'Sin título',
              isActive: data.isActive ?? false,
              humidity: data.humidity ?? 0,
              targetHumidity: typeof data.targetHumidity === 'number' ? data.targetHumidity : undefined,
            };
          });

          setLines(irrigationData);
          // Marcar si los datos provienen del caché (útil para modo offline)
          setFromCache(snapshot.metadata.fromCache === true);
          setError(null);
        } catch (err) {
          console.error('Error al procesar datos de Firestore:', err);
          setError('Error al procesar los datos');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        // Manejar errores de la suscripción
        console.error('Error al suscribirse a Firestore:', err);
        setError('Error al conectar con la base de datos');
        setLoading(false);
      }
    );

    // Función de limpieza: desuscribirse cuando el componente se desmonte
    return () => {
      unsubscribe();
    };
  }, []); // Array vacío: el efecto solo se ejecuta una vez al montar

  return { lines, loading, error, fromCache };
}
