'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Droplets, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Verificar autenticación y redirigir si es necesario
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  // Mostrar pantalla de carga mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, no renderizar nada (se redirigirá)
  if (!user) {
    return null;
  }

  // Renderizar el dashboard solo si hay un usuario autenticado
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar Superior */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo y Título */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Droplets className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">UNIMINUTO Riego</h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Sistema Automatizado
                </p>
              </div>
            </div>
          </div>

          {/* Iconos de acción */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              {/* Indicador de notificaciones */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {children}
      </main>
    </div>
  );
}
