'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';

// Tipo del contexto de autenticación
interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
}

// Crear el contexto de autenticación
const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
});

// Proveedor de autenticación
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Variable para guardar la función de cleanup de Firestore
    let unsubscribeFirestore: (() => void) | undefined;

    // Suscribirse a los cambios de autenticación
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Leer el rol desde Firestore en tiempo real
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        unsubscribeFirestore = onSnapshot(
          userDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              // Obtener el rol del documento
              const userRole = snapshot.data()?.role || null;
              setRole(userRole);
              console.log('✅ Rol obtenido desde Firestore:', userRole);
            } else {
              // Usuario autenticado pero sin documento en Firestore
              console.warn('⚠️ Usuario autenticado sin documento en Firestore');
              setRole(null);
            }
            setLoading(false);
          },
          (error) => {
            // Manejo de errores
            console.error('❌ Error al leer rol desde Firestore:', error);
            setRole(null);
            setLoading(false);
          }
        );
      } else {
        // No hay usuario autenticado
        setRole(null);
        setLoading(false);
      }
    });

    // Limpiar suscripciones cuando el componente se desmonte
    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para consumir el contexto de autenticación
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  
  return context;
}
