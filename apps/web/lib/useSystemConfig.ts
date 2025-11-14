'use client';

import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthProvider';

export interface SystemConfig {
  defaultReadingIntervalSeconds: number;
  activeIrrigationIntervalSeconds: number;
  irrigationMoistureThreshold: number;
  autoIrrigationEnabled: boolean;
  updatedAt?: Timestamp;
  [key: string]: unknown;
}

export function useSystemConfig() {
  const { user } = useAuth();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setConfig(null);
      setLoading(false);
      return;
    }

    const configRef = doc(db, 'system', 'config');
    setLoading(true);

    const unsubscribe = onSnapshot(
      configRef,
      (snapshot) => {
        setConfig(snapshot.exists() ? (snapshot.data() as SystemConfig) : null);
        setLoading(false);
      },
      (error) => {
        console.error('Error al suscribirse a system/config:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const updateConfig = useCallback(async (partialConfig: Partial<SystemConfig>) => {
    const configRef = doc(db, 'system', 'config');
    await setDoc(
      configRef,
      {
        ...partialConfig,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }, []);

  return { config, loading, updateConfig } as const;
}
