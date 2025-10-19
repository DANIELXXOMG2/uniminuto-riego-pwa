# Progressive Web App (PWA) - Sistema de Riego Inteligente

## 📱 Configuración PWA

Este proyecto está configurado como una Progressive Web App (PWA) que permite:

- ✅ **Instalación en dispositivos**: Los usuarios pueden instalar la aplicación en sus dispositivos móviles y escritorio
- ✅ **Funcionamiento offline**: La app funciona sin conexión gracias a Firestore offline persistence y Service Workers
- ✅ **Actualizaciones automáticas**: El Service Worker se actualiza automáticamente cuando hay nuevas versiones
- ✅ **Caché inteligente**: Los recursos estáticos se cachean para una carga más rápida

## 🔧 Tecnologías Utilizadas

- **next-pwa**: Plugin de Next.js para PWA
- **Firestore Offline Persistence**: Persistencia de datos sin conexión
- **Service Workers**: Cacheo de recursos y funcionamiento offline
- **Web App Manifest**: Configuración de la app instalable

## 📦 Archivos Importantes

### `/public/manifest.json`
Archivo de manifiesto que define:
- Nombre de la aplicación
- Iconos en diferentes tamaños
- Configuración de visualización (standalone)
- Colores del tema
- URL de inicio

### `/public/sw.js`
Service Worker generado automáticamente por `next-pwa` que:
- Cachea recursos estáticos (HTML, CSS, JS, imágenes)
- Maneja estrategias de caché para diferentes tipos de recursos
- Se actualiza automáticamente cuando hay cambios

### `next.config.mjs`
Configuración de Next.js con PWA:
```javascript
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});
```

## 🚀 Instalación en Dispositivos

### Android (Chrome/Edge)
1. Abre la aplicación en Chrome o Edge
2. Toca el menú (⋮) → "Instalar aplicación" o "Agregar a pantalla de inicio"
3. Confirma la instalación

### iOS (Safari)
1. Abre la aplicación en Safari
2. Toca el botón de compartir (□↑)
3. Selecciona "Agregar a pantalla de inicio"
4. Confirma la instalación

### Escritorio (Chrome/Edge)
1. Abre la aplicación en Chrome o Edge
2. Busca el icono de instalación (⊕) en la barra de direcciones
3. Haz clic en "Instalar"

## 📊 Funcionamiento Offline

### Datos de Firestore
- Los datos se sincronizan automáticamente cuando hay conexión
- Las lecturas funcionan desde la caché local offline
- Las escrituras se encolan y se sincronizan al reconectar

### Recursos Estáticos
- HTML, CSS, JavaScript se cachean automáticamente
- Imágenes e iconos se almacenan en caché
- Fuentes y otros recursos estáticos disponibles offline

## 🔍 Verificación de PWA

### Chrome DevTools
1. Abre DevTools (F12)
2. Ve a la pestaña "Application"
3. Verifica:
   - **Manifest**: Debe mostrar el archivo `manifest.json`
   - **Service Workers**: Debe mostrar el SW activo
   - **Cache Storage**: Debe mostrar recursos cacheados

### Lighthouse Audit
1. Abre DevTools (F12)
2. Ve a la pestaña "Lighthouse"
3. Selecciona "Progressive Web App"
4. Haz clic en "Analyze page load"
5. Verifica que obtenga una buena puntuación PWA

## 🛠️ Desarrollo

### Modo Desarrollo
En desarrollo, PWA está **deshabilitado** para evitar problemas con el caché durante el desarrollo:
```bash
bun run dev
```

### Modo Producción
Para probar PWA localmente:
```bash
bun run build
bun run start
```

## 📝 Actualización de Iconos

Los iconos se generan desde `public/icon.svg`:

```bash
# Generar iconos PNG
cd apps/web/public
convert -background none icon.svg -resize 192x192 icon-192x192.png
convert -background none icon.svg -resize 256x256 icon-256x256.png
convert -background none icon.svg -resize 384x384 icon-384x384.png
convert -background none icon.svg -resize 512x512 icon-512x512.png
convert -background none icon.svg -resize 32x32 favicon.ico
```

## 🎨 Personalización

### Cambiar Colores del Tema
Edita en `manifest.json`:
```json
{
  "theme_color": "#22c55e",
  "background_color": "#ffffff"
}
```

Y en `app/layout.tsx`:
```typescript
export const viewport: Viewport = {
  themeColor: "#22c55e",
};
```

### Cambiar Nombre de la App
Edita en `manifest.json`:
```json
{
  "name": "Sistema de Riego Inteligente - Uniminuto",
  "short_name": "Riego Uniminuto"
}
```

## 📱 Comportamiento Esperado

### Online
- ✅ Datos en tiempo real desde Firestore
- ✅ Actualizaciones instantáneas
- ✅ Sincronización automática

### Offline
- ✅ Lectura de datos desde caché local
- ✅ Escrituras encoladas para sincronización posterior
- ✅ Interfaz completamente funcional
- ⚠️ Indicador de "Modo sin conexión" (próxima implementación)

## 🐛 Solución de Problemas

### El Service Worker no se actualiza
1. Cierra todas las pestañas de la aplicación
2. Abre DevTools → Application → Service Workers
3. Haz clic en "Unregister"
4. Recarga la página

### Los datos offline no funcionan
1. Verifica la consola de Firebase en `lib/firebase.ts`
2. Debe mostrar: "✅ Persistencia offline de Firestore habilitada correctamente"
3. Si hay error, verifica que no haya múltiples pestañas abiertas

### La app no se puede instalar
1. Verifica que estés en HTTPS (o localhost)
2. Verifica el manifest.json en DevTools → Application
3. Verifica que el Service Worker esté activo
4. Ejecuta Lighthouse audit para ver qué falta

## 📚 Referencias

- [Next PWA Documentation](https://github.com/shadowwalker/next-pwa)
- [Web.dev - PWA](https://web.dev/progressive-web-apps/)
- [MDN - Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Firebase - Offline Data](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
