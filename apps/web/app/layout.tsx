import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthProvider";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UNIMINUTO Riego PWA",
  description: "Sistema de Riego Inteligente PWA Offline-First.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Riego Uniminuto",
  },
  icons: {
    icon: "/icon.svg", // Icono principal (SVG)
    shortcut: "/icon-192x192.png", // Para PWA y accesos directos
    apple: "/icon-192x192.png", // Para dispositivos Apple
    other: [
      {
        rel: "icon",
        url: "/favicon.ico", // Apunta al /public/favicon.ico
        sizes: "any",
      },
      {
        rel: "icon",
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
  },
  themeColor: "#22c55e", // Verde (coincide con manifest.json)
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#22c55e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#22c55e" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
