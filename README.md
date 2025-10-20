# 💧 UNIMINUTO Riego PWA

PWA Offline-First para la supervisión y control de un sistema de riego inteligente. Proyecto de grado de la Tecnología en Desarrollo de Software de UNIMINUTO Villavicencio.

---

## 🎯 Características

- **Monitoreo en Tiempo Real:** Visualiza la humedad y el estado de las electroválvulas desde Firestore.
- **Arquitectura Offline-First:** La aplicación garantiza su funcionalidad en casos de conectividad intermitente, sincronizando datos automáticamente al recuperar la conexión gracias a la persistencia de Firestore.
- **Control Manual Remoto:** Activa o desactiva el riego de cada línea directamente desde la interfaz.
- **Gestión de Usuarios Basada en Roles:** Acceso diferenciado para `Administradores` y `Supervisores`.
- **Historial y Analítica:** Gráficos con la evolución de las métricas históricas.
- **Notificaciones Push:** Alertas en tiempo real sobre eventos críticos del sistema.

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Aplicación Web (PWA)** | [Next.js](https://nextjs.org/) (React) | Frontend, Backend integrado y capacidades de PWA. |
| **Base de Datos** | [Firebase Firestore](https://firebase.google.com/products/firestore) | Base de datos NoSQL para almacenamiento centralizado. |
| **Base de Datos Local** | [IndexedDB](https://developer.mozilla.org/es/docs/Web/API/IndexedDB_API) | Almacenamiento de datos en el navegador para uso offline. |
| **Autenticación** | [Firebase Authentication](https://firebase.google.com/products/auth) | Gestión de usuarios y seguridad. |
| **Dispositivo IoT** | [Arduino](https://www.arduino.cc/) | Control de sensores y actuadores en el campo. |
| **Despliegue** | [Vercel](https://vercel.com/) | Hosting y despliegue continuo de la aplicación web. |

---

## 🚀 Cómo Empezar

### Prerrequisitos

- Node.js (v18 o superior)
- Git
- Una cuenta de Firebase con un proyecto configurado (Firestore y Authentication habilitados).

### Instalación

1.  **Clonar el repositorio:**

    ```bash
    git clone [https://github.com/DANIELXXOMG2/uniminuto-riego-pwa.git](https://github.com/DANIELXXOMG2/uniminuto-riego-pwa.git)
    cd uniminuto-riego-pwa/app
    ```

2.  **Instalar dependencias:**

    ```bash
    npm install
    ```

3.  **Configurar variables de entorno:**
    - Crea un archivo `.env.local` en la raíz de la carpeta `app`.
    - Añade las credenciales de tu proyecto de Firebase.

    ```
    NEXT_PUBLIC_FIREBASE_API_KEY="TU_VALOR"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="TU_VALOR"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="TU_VALOR"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="TU_VALOR"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="TU_VALOR"
    NEXT_PUBLIC_FIREBASE_APP_ID="TU_VALOR"
    ```

4.  **Ejecutar la aplicación:**
    ```bash
    npm run dev
    ```

---

## 👥 Autores

- **Daniel Sebastián Bello Hernández**
- **Jorge Alberto Roncancio Enciso**
- **Samuel David Gómez Piamba**
