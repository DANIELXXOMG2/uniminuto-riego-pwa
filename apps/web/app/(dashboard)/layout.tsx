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
  BellRing,
  CheckCheck,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/lib/AuthProvider";
import { useFCM } from "@/lib/useFCM";
import { useNotifications, Notification } from "@/lib/useNotifications";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

// Tipo para Firestore Timestamp
interface FirestoreTimestamp {
  toDate: () => Date;
}

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

  // Hook de notificaciones
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

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

  // Función auxiliar para formatear timestamp
  const formatNotificationTime = (timestamp: unknown) => {
    try {
      const date = timestamp && typeof timestamp === 'object' && 'toDate' in timestamp 
        ? (timestamp as FirestoreTimestamp).toDate() 
        : new Date(timestamp as string | number);
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    } catch {
      return "Fecha no disponible";
    }
  };

  // Función auxiliar para obtener el icono según el tipo de notificación
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'low_humidity':
        return { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'irrigation_started':
      case 'irrigation_stopped':
        return { icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'sensor_failure':
      case 'system_alert':
        return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' };
      default:
        return { icon: BellRing, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label="Notificaciones"
                  >
                    <Bell className="h-5 w-5" />
                    {/* Indicador de notificaciones no leídas */}
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  {/* Encabezado */}
                  <div className="p-4 border-b flex items-center justify-between">
                    <h4 className="font-medium">Notificaciones</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground h-auto p-1"
                      onClick={markAllAsRead}
                      disabled={unreadCount === 0}
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Marcar todas como leídas
                    </Button>
                  </div>

                  {/* Lista de notificaciones */}
                  <div className="max-h-96 overflow-y-auto">
                    {/* Estado de carga */}
                    {notificationsLoading && (
                      <div className="p-8 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500">Cargando notificaciones...</p>
                      </div>
                    )}

                    {/* Estado de error */}
                    {notificationsError && (
                      <div className="p-8 text-center">
                        <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
                        <p className="text-sm text-red-600">{notificationsError}</p>
                      </div>
                    )}

                    {/* Notificaciones */}
                    {!notificationsLoading && !notificationsError && (
                      <>
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm text-gray-500">No hay notificaciones nuevas</p>
                          </div>
                        ) : (
                          <div className="divide-y">
                            {notifications.map((notification: Notification) => {
                              const iconData = getNotificationIcon(notification.type);
                              const Icon = iconData.icon;
                              
                              return (
                                <div
                                  key={notification.id}
                                  className={`p-4 hover:bg-gray-50 transition-colors ${
                                    !notification.read ? 'bg-blue-50/30' : ''
                                  }`}
                                >
                                  <div className="flex gap-3">
                                    {/* Icono */}
                                    <div className={`${iconData.bg} p-2 rounded-full h-fit flex-shrink-0`}>
                                      <Icon className={`h-4 w-4 ${iconData.color}`} />
                                    </div>

                                    {/* Contenido */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className="text-sm font-medium text-gray-900">
                                          {notification.title}
                                        </p>
                                        {!notification.read && (
                                          <button
                                            onClick={() => markAsRead(notification.id)}
                                            className="text-blue-600 hover:text-blue-700 flex-shrink-0"
                                            aria-label="Marcar como leída"
                                            title="Marcar como leída"
                                          >
                                            <Check className="h-4 w-4" />
                                          </button>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-600 mb-2">
                                        {notification.body}
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs text-gray-400">
                                          {formatNotificationTime(notification.timestamp)}
                                        </p>
                                        {!notification.read && (
                                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Pie de página */}
                  {notifications.length > 0 && (
                    <div className="p-2 border-t text-center">
                      <Link
                        href="/notificaciones"
                        className="text-xs text-blue-600 hover:underline inline-block py-1"
                      >
                        Ver todas las notificaciones
                      </Link>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
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
