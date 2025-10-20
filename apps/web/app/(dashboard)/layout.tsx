"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Droplets, Menu, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthProvider";
import { useFCM } from "@/lib/useFCM";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [notificationContent, setNotificationContent] = useState({
    title: "",
    body: "",
  });

  // Configurar FCM y manejar notificaciones en primer plano
  const {
    token,
    loading: fcmLoading,
    error: fcmError,
    requestPermission,
    isSupported,
  } = useFCM((title, body) => {
    // Mostrar notificación como toast cuando la app está en primer plano
    setNotificationContent({ title, body });
    setShowNotificationToast(true);

    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
      setShowNotificationToast(false);
    }, 5000);
  });

  // Verificar autenticación y redirigir si es necesario
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  // Log de estado de FCM para debugging
  useEffect(() => {
    if (token) {
      console.log("📱 FCM Token disponible");
    }
    if (fcmError) {
      console.error("❌ Error FCM:", fcmError);
    }
  }, [token, fcmError]);

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
                <h1 className="text-lg font-bold text-gray-900">
                  UNIMINUTO Riego
                </h1>
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

      {/* Toast de Notificación en Primer Plano */}
      {showNotificationToast && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {notificationContent.title}
                </h4>
                <p className="text-sm text-gray-600">
                  {notificationContent.body}
                </p>
              </div>
              <button
                onClick={() => setShowNotificationToast(false)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                aria-label="Cerrar notificación"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner para solicitar permiso de notificaciones */}
      {isSupported && !token && !fcmError && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:max-w-md">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-2 rounded-full flex-shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold mb-1">
                  Activa las notificaciones
                </h4>
                <p className="text-sm text-blue-50 mb-3">
                  Recibe alertas sobre el estado de tu sistema de riego
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={requestPermission}
                    disabled={fcmLoading}
                    size="sm"
                    className="bg-white text-blue-600 hover:bg-blue-50"
                  >
                    {fcmLoading ? "Activando..." : "Activar"}
                  </Button>
                  <Button
                    onClick={() => {
                      /* Podemos implementar un "recordar después" */
                    }}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                  >
                    Ahora no
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de notificaciones activadas */}
      {token && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-green-500 text-white rounded-lg shadow-lg p-3 flex items-center gap-2 animate-in slide-in-from-bottom duration-300">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">
              Notificaciones activadas
            </span>
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">{children}</main>
    </div>
  );
}
