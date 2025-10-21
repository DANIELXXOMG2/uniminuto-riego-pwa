import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthProvider';

/**
 * Tipo de notificación
 */
export type NotificationType = 
  | 'low_humidity' 
  | 'irrigation_started' 
  | 'irrigation_stopped'
  | 'sensor_failure' 
  | 'test'
  | 'system_alert';

/**
 * Interfaz de datos adicionales de la notificación
 */
export interface NotificationData {
  lineId?: string;
  sensorId?: string;
  humidity?: number;
  [key: string]: unknown;
}

/**
 * Interfaz de una notificación
 */
export interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: Timestamp;
  read: boolean;
  type: NotificationType;
  data?: NotificationData;
}

/**
 * Hook personalizado para gestionar notificaciones en tiempo real
 * 
 * Este hook se suscribe a las notificaciones del usuario actual
 * y proporciona funciones para marcar notificaciones como leídas.
 * 
 * @returns {Object} Estado y funciones de notificaciones
 * - notifications: Array de notificaciones
 * - unreadCount: Número de notificaciones no leídas
 * - loading: Estado de carga inicial
 * - error: Error si ocurre algún problema
 * - markAsRead: Función para marcar una notificación como leída
 * - markAllAsRead: Función para marcar todas como leídas
 */
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si no hay usuario, resetear el estado
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      setError(null);
      return;
    }

    // Suscribirse a las notificaciones del usuario en tiempo real
    const notificationsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(
      notificationsRef,
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const notificationsData: Notification[] = [];
          let unreadCounter = 0;

          snapshot.forEach((doc) => {
            const data = doc.data();
            const notification: Notification = {
              id: doc.id,
              title: data.title || '',
              body: data.body || '',
              timestamp: data.timestamp,
              read: data.read || false,
              type: data.type || 'test',
              data: data.data || {},
            };

            notificationsData.push(notification);

            // Contar no leídas
            if (!notification.read) {
              unreadCounter++;
            }
          });

          setNotifications(notificationsData);
          setUnreadCount(unreadCounter);
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error al procesar notificaciones:', err);
          setError('Error al cargar las notificaciones');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error en la suscripción de notificaciones:', err);
        setError('Error al conectar con las notificaciones');
        setLoading(false);
      }
    );

    // Cleanup: desuscribirse cuando el componente se desmonte
    return () => unsubscribe();
  }, [user]);

  /**
   * Marca una notificación específica como leída
   * @param notificationId - ID de la notificación a marcar
   */
  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const notificationRef = doc(
        db,
        'users',
        user.uid,
        'notifications',
        notificationId
      );
      await updateDoc(notificationRef, {
        read: true,
      });
    } catch (err) {
      console.error('Error al marcar notificación como leída:', err);
    }
  };

  /**
   * Marca todas las notificaciones no leídas como leídas
   */
  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;

    try {
      const batch = writeBatch(db);

      // Filtrar solo las notificaciones no leídas
      const unreadNotifications = notifications.filter((n) => !n.read);

      // Añadir cada actualización al batch
      unreadNotifications.forEach((notification) => {
        const notificationRef = doc(
          db,
          'users',
          user.uid,
          'notifications',
          notification.id
        );
        batch.update(notificationRef, { read: true });
      });

      // Ejecutar el batch
      await batch.commit();
    } catch (err) {
      console.error('Error al marcar todas las notificaciones como leídas:', err);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
  };
}
