"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Droplets,
  Menu,
  CheckCircle,
  LayoutDashboard,
  History,
  Users,
  LogOut,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthProvider";
import { useFCM } from "@/lib/useFCM";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // Cerrar sidebar móvil cuando cambia la ruta
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Navegación del sidebar
  const navigationItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      active: pathname === "/",
    },
    {
      name: "Historial",
      href: "/historial",
      icon: History,
      active: pathname === "/historial",
    },
    ...(role === "admin"
      ? [
          {
            name: "Administración",
            href: "/admin",
            icon: Users,
            active: pathname === "/admin",
          },
        ]
      : []),
  ];

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
      {/* Sidebar Desktop - Siempre visible en md+ */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 md:bg-white md:border-r md:border-gray-200">
        {/* Logo en Sidebar */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-200">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">UNIMINUTO</h1>
            <p className="text-xs text-gray-500">Sistema de Riego</p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.active
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Usuario y Logout */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-sm">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.email}
              </p>
              <p className="text-xs text-gray-500 capitalize">{role || "Usuario"}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start gap-2"
            size="sm"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Sidebar Mobile - Overlay */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar */}
          <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 md:hidden">
            {/* Header con botón cerrar */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Droplets className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">UNIMINUTO</h1>
                  <p className="text-xs text-gray-500">Sistema de Riego</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Navegación */}
            <nav className="px-3 py-4 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      item.active
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Usuario y Logout */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{role || "Usuario"}</p>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full justify-start gap-2"
                size="sm"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </Button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <div className="md:pl-64">
        {/* Navbar Superior */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Botón Menu Mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Título (solo visible en móvil) */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Droplets className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-900">UNIMINUTO</h1>
            </div>

            {/* Espaciador en desktop */}
            <div className="hidden md:block" />

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
          <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
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
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
}
