// Firebase Cloud Messaging Service Worker
// Este archivo obtiene las credenciales de Firebase desde el API endpoint
// porque los Service Workers no pueden acceder a variables de entorno directamente

// Import scripts for Firebase library
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"
);

// Variable para almacenar el messaging
let messagingInstance = null;

// Inicializar Firebase de forma asíncrona
async function initializeFirebase() {
  try {
    // Obtener configuración desde el API endpoint
    const response = await fetch("/api/firebase-config");

    if (!response.ok) {
      throw new Error("Failed to fetch Firebase config");
    }

    const firebaseConfig = await response.json();

    // Inicializar Firebase
    firebase.initializeApp(firebaseConfig);
    messagingInstance = firebase.messaging();

    console.log("[firebase-messaging-sw.js] Firebase initialized successfully");

    // Configurar listener de mensajes en segundo plano
    setupBackgroundMessageHandler();
  } catch (error) {
    console.error(
      "[firebase-messaging-sw.js] Error initializing Firebase:",
      error
    );
  }
}

// Configurar el manejador de mensajes en segundo plano
function setupBackgroundMessageHandler() {
  if (!messagingInstance) return;

  messagingInstance.onBackgroundMessage((payload) => {
    console.log(
      "[firebase-messaging-sw.js] Received background message:",
      payload
    );

    // Extraer información de la notificación
    const notificationTitle =
      payload.notification?.title ||
      payload.data?.title ||
      "Nueva Notificación";
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || "",
      icon: "/icon-192x192.png", // Icono de la PWA
      badge: "/icon-192x192.png",
      tag: payload.data?.tag || "default-notification",
      requireInteraction: false,
      data: payload.data || {},
      // Opciones adicionales para una mejor experiencia
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
    };

    // Mostrar la notificación
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Inicializar Firebase cuando el Service Worker se activa
self.addEventListener("activate", (event) => {
  console.log("[firebase-messaging-sw.js] Service Worker activated");
  event.waitUntil(initializeFirebase());
});

// También intentar inicializar cuando se instala
self.addEventListener("install", (event) => {
  console.log("[firebase-messaging-sw.js] Service Worker installed");
  event.waitUntil(initializeFirebase());
});

// Manejar clics en las notificaciones
self.addEventListener("notificationclick", (event) => {
  console.log(
    "[firebase-messaging-sw.js] Notification clicked:",
    event.notification
  );

  event.notification.close();

  // Abrir o enfocar la aplicación
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow("/");
        }
      })
  );
});
