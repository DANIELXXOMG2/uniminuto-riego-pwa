# 💧 Sistema de Supervisión y Control de Riego (PWA)

## Proyecto de Grado - Tecnología en Desarrollo de Software - UNIMINUTO Villavicencio

Este repositorio contiene el código fuente del proyecto "Desarrollo de una aplicación web para la supervisión y control remoto del riego en cultivos de arroz de la granja UNIMINUTO".

El sistema está diseñado como una **Progressive Web App (PWA)** con una arquitectura **"Offline-First"**, garantizando su funcionamiento en entornos rurales con conectividad a internet intermitente.

---

## 🎯 Características Principales

* **Monitoreo en Tiempo Real:** Visualiza la humedad y temperatura de los sensores instalados en el cultivo.
* **Arquitectura Offline-First:** La aplicación es 100% funcional sin conexión a internet. Los datos se guardan localmente y se sincronizan automáticamente cuando se recupera la conexión.
* **Control de Riego Dual:** Permite activar o desactivar el riego de forma **manual** desde la app, o dejar que el sistema lo gestione de forma **automática** basado en umbrales de humedad.
* **Riego Inteligente:** El sistema consulta el **pronóstico del clima** para evitar riegos innecesarios si hay una alta probabilidad de lluvia.
* **Historial y Analítica:** Visualiza gráficos con la evolución de las métricas históricas del riego a lo largo del tiempo.
* **Alertas y Recomendaciones:** El sistema notifica al usuario sobre eventos definidos y genera recomendaciones para optimizar el proceso de riego.

---

## 🛠️ Stack Tecnológico

| Componente                | Tecnología                                                               | Propósito                                                 |
| ------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- |
| **Aplicación Web (PWA)** | [Next.js](https://nextjs.org/) (React)                                   | Frontend, Backend integrado y capacidades de PWA.         |
| **Base de Datos Remota** | [CockroachDB](https://www.cockroachlabs.com/)                            | Almacenamiento central y persistente de los datos.        |
| **Base de Datos Local** | [IndexedDB](https://developer.mozilla.org/es/docs/Web/API/IndexedDB_API) | Almacenamiento de datos en el navegador para uso offline. |
| **Dispositivo IoT** | [Arduino](https://www.arduino.cc/)                                       | Control de sensores y actuadores en el campo.             |
| **Despliegue** | [Vercel](https://vercel.com/)                                            | Hosting y despliegue continuo de la aplicación web.       |

---

## 🏗️ Arquitectura del Sistema

El sistema sigue una arquitectura de componentes desacoplados que se comunican a través de APIs, optimizada para la resiliencia y la escalabilidad.

![Diagrama de Arquitectura](docs/arquitectura.png)

---

## 📋 Estructura de la Base de Datos

El esquema de la base de datos está diseñado para registrar usuarios, sensores, lecturas, eventos de riego y configuraciones del sistema.

![MER de la Base de Datos](docs/mer_database.png)

---

## 🚀 Cómo Empezar (Pending)

Instrucciones para configurar y ejecutar el proyecto en un entorno de desarrollo local.

### Prerrequisitos

* [Node.js](https://nodejs.org/) (v18 o superior)
* [Git](https://git-scm.com/)
* Cuenta en CockroachDB
* IDE de Arduino o PlatformIO

### Instalación

1.  **Clonar el repositorio:**
    ```bash
    git clone [https://github.com/tu-usuario/tu-repositorio.git](https://github.com/tu-usuario/tu-repositorio.git)
    cd tu-repositorio
    ```

2.  **Instalar dependencias de la Web App:**
    ```bash
    cd webapp
    npm install
    ```

3.  **Configurar variables de entorno:**
    * Crea un archivo `.env.local` en la carpeta `webapp`.
    * Añade las credenciales de tu base de datos y otras claves de API.
        ```
        DATABASE_URL="tu-string-de-conexion"
        WEATHER_API_KEY="tu-clave-de-api"
        ```

4.  **Ejecutar la aplicación:**
    ```bash
    npm run dev
    ```

5.  **Programar el Arduino:**
    * Abre el proyecto en la carpeta `arduino`.
    * Configura las variables de red (WiFi SSID y contraseña) y el endpoint de la API.
    * Carga el código en tu placa Arduino.

---

## 👥 Autores

* **Daniel Sebastián Bello Hernández**
* **Jorge Alberto Roncancio Enciso**
* **Samuel David Gómez Piamba**
