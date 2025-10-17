'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { auth } from './firebase';

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
    // Suscribirse a los cambios de autenticación
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Obtener el token con los claims personalizados
          const tokenResult = await getIdTokenResult(currentUser, true);
          // Extraer el rol del claim
          const userRole = tokenResult.claims.role as string | undefined;
          setRole(userRole || null);
        } catch (error) {
          console.error('Error al obtener el rol del usuario:', error);
          setRole(null);
        }
      } else {
        setRole(null);
      }
      
      setLoading(false);
    });

    // Limpiar la suscripción cuando el componente se desmonte
    return () => unsubscribe();
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
