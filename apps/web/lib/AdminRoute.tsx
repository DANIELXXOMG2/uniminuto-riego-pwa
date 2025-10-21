'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si no está cargando y el usuario no es administrador, redirigir
    if (!loading && role !== 'admin') {
      router.push('/');
    }
  }, [loading, role, router]);

  // Mostrar spinner mientras carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si no es administrador, mostrar mensaje de acceso denegado
  if (role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Acceso Denegado</h1>
          <p className="text-muted-foreground">
            No tienes permisos para acceder a esta página.
          </p>
        </div>
      </div>
    );
  }

  // Si es administrador, mostrar el contenido
  return <>{children}</>;
}
