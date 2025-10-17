'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export interface AppUser {
  id: string;
  email: string | null;
  role: string | null;
}

export function useUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        try {
          const usersData: AppUser[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            email: doc.data().email ?? null,
            role: doc.data().role ?? null,
          }));
          setUsers(usersData);
          setLoading(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
          setLoading(false);
        }
      },
      (err) => {
        setError(err.message || 'Error al suscribirse a la colección users');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { users, loading, error };
}
