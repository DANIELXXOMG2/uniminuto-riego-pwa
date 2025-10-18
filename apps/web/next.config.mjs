import withPWAInit from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Deshabilitar PWA en desarrollo para evitar problemas de caché
  register: true,
  skipWaiting: true,
});

export default withPWA(nextConfig);
