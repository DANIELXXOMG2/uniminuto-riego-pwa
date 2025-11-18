'use client';

import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthProvider';

// VAPID Key desde las variables de entorno
// La encuentras en: Consola Firebase -> Cloud Messaging -> Certificados de clave web
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

// Debug: Verificar si la VAPID key está presente
if (typeof window !== 'undefined') {
  console.log('🔑 VAPID Key present:', VAPID_KEY ? `Yes (${VAPID_KEY.substring(0, 10)}...)` : '❌ NO');
}

interface UseFCMResult {
  token: string | null;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  isSupported: boolean;
}

interface NotificationHandler {
  (title: string, body: string, data?: Record<string, unknown>): void;
}

/**
 * Hook personalizado para gestionar Firebase Cloud Messaging (FCM)
 * Maneja permisos, tokens y recepción de notificaciones
 */
export function useFCM(onNotificationReceived?: NotificationHandler): UseFCMResult {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const { user } = useAuth();

  // Verificar soporte de notificaciones
  useEffect(() => {
    const checkSupport = () => {
      // Verificar que el navegador soporte notificaciones y service workers
      const supported =
        typeof window !== 'undefined' &&
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window;
      
      setIsSupported(supported);
      
      if (!supported) {
        console.warn('⚠️ Este navegador no soporta notificaciones push');
      }
    };

    checkSupport();
  }, []);

  // Guardar token en Firestore
  const saveTokenToFirestore = async (fcmToken: string, userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      
      // Obtener tokens existentes
      const userDoc = await getDoc(userRef);
      const existingTokens = userDoc.data()?.fcmTokens || [];
      
      // Solo agregar si no existe
      if (!existingTokens.includes(fcmToken)) {
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(fcmToken),
          lastTokenUpdate: new Date(),
        });
        console.log('✅ Token FCM guardado en Firestore');
      } else {
        console.log('ℹ️ Token FCM ya existe en Firestore');
      }
    } catch (err) {
      console.error('❌ Error al guardar token en Firestore:', err);
      throw err;
    }
  };

  // Solicitar permiso y obtener token
  const requestPermission = async () => {
    if (!isSupported) {
      setError('Las notificaciones no están soportadas en este navegador');
      return;
    }

    if (!user) {
      setError('Usuario no autenticado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Solicitar permiso al usuario
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('✅ Permiso de notificaciones concedido');

        // Registrar service worker para FCM
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('✅ Service Worker de FCM registrado');

        // Esperar a que el Service Worker esté activo
        await navigator.serviceWorker.ready;
        console.log('✅ Service Worker activado y listo');

        // Obtener instancia de messaging
        const messaging = getMessaging();

        // Obtener token FCM con el SW validado
        const fcmToken = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (fcmToken) {
          console.log('✅ Token FCM obtenido:', fcmToken.substring(0, 20) + '...');
          setToken(fcmToken);

          // Guardar token en Firestore
          await saveTokenToFirestore(fcmToken, user.uid);
        } else {
          throw new Error('No se pudo obtener el token FCM');
        }
      } else if (permission === 'denied') {
        throw new Error('Permiso de notificaciones denegado por el usuario');
      } else {
        throw new Error('Permiso de notificaciones no concedido');
      }
    } catch (err) {
      console.error('❌ Error al solicitar permiso de notificaciones:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Escuchar mensajes en primer plano
  useEffect(() => {
    if (!isSupported || !user) return;

    let unsubscribe: (() => void) | undefined;

    const setupForegroundMessaging = async () => {
      try {
        const messaging = getMessaging();

        // Escuchar mensajes cuando la app está en primer plano
        unsubscribe = onMessage(messaging, (payload: MessagePayload) => {
          console.log('📨 Mensaje recibido en primer plano:', payload);

          const title = payload.notification?.title || payload.data?.title || 'Nueva Notificación';
          const body = payload.notification?.body || payload.data?.body || '';
          const data = payload.data || {};

          // Llamar al handler personalizado si existe
          if (onNotificationReceived) {
            onNotificationReceived(title, body, data);
          }

          // Mostrar notificación del navegador si el usuario lo permite
          if (Notification.permission === 'granted') {
            new Notification(title, {
              body,
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              data,
            });
          }
        });
      } catch (err) {
        console.error('❌ Error al configurar mensajería en primer plano:', err);
      }
    };

    setupForegroundMessaging();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isSupported, user, onNotificationReceived]);

  // Solicitar permiso automáticamente si ya está concedido
  useEffect(() => {
    if (!isSupported || !user) return;

    const checkAndRequestToken = async () => {
      // Si ya tiene permiso, obtener token automáticamente
      if (Notification.permission === 'granted' && !token) {
        await requestPermission();
      }
    };

    checkAndRequestToken();
  }, [isSupported, user]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    token,
    loading,
    error,
    requestPermission,
    isSupported,
  };
}
