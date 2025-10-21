"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Droplets } from "lucide-react";

// Componente de icono de Google
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(""); // Limpiar errores previos

    try {
      // Autenticar con Firebase
      await signInWithEmailAndPassword(auth, email, password);

      // Asegurar que el documento del usuario exista en Firestore
      // NOTA: No establecemos el rol aquí para no sobrescribir roles asignados manualmente
      const userCred = auth.currentUser;
      if (userCred) {
        const userRef = doc(db, "users", userCred.uid);
        await setDoc(
          userRef,
          {
            email: userCred.email,
            lastLogin: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      // Si es exitoso, redirigir al dashboard
      router.push("/");
    } catch (err: unknown) {
      // Capturar y mostrar errores
      console.error("Error al iniciar sesión:", err);

      // Personalizar mensajes de error según el código de Firebase
      let errorMessage =
        "Error al iniciar sesión. Por favor, intenta de nuevo.";

      if (err && typeof err === "object" && "code" in err) {
        const firebaseError = err as { code: string };

        if (firebaseError.code === "auth/user-not-found") {
          errorMessage = "No existe una cuenta con este correo electrónico.";
        } else if (firebaseError.code === "auth/wrong-password") {
          errorMessage = "Contraseña incorrecta.";
        } else if (firebaseError.code === "auth/invalid-email") {
          errorMessage = "El correo electrónico no es válido.";
        } else if (firebaseError.code === "auth/user-disabled") {
          errorMessage = "Esta cuenta ha sido deshabilitada.";
        } else if (firebaseError.code === "auth/too-many-requests") {
          errorMessage =
            "Demasiados intentos fallidos. Por favor, intenta más tarde.";
        } else if (firebaseError.code === "auth/invalid-credential") {
          errorMessage =
            "Credenciales inválidas. Verifica tu correo y contraseña.";
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Autenticar con Google
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Asegurar que el documento del usuario exista en Firestore
      // IMPORTANTE: Solo establecer rol "estudiante" para usuarios NUEVOS
      const userRef = doc(db, "users", user.uid);
      const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
      
      if (isNewUser) {
        // Usuario nuevo: establecer rol por defecto
        await setDoc(userRef, {
          email: user.email,
          role: "estudiante",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        });
      } else {
        // Usuario existente: solo actualizar lastLogin, NO tocar el rol
        await setDoc(
          userRef,
          {
            email: user.email,
            lastLogin: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      // Redirigir al dashboard
      router.push("/");
    } catch (err: unknown) {
      console.error("Error al iniciar sesión con Google:", err);

      let errorMessage =
        "Error al iniciar sesión con Google. Por favor, intenta de nuevo.";

      if (err && typeof err === "object" && "code" in err) {
        const firebaseError = err as { code: string };

        if (firebaseError.code === "auth/popup-closed-by-user") {
          errorMessage = "Ventana emergente cerrada. Por favor, intenta de nuevo.";
        } else if (firebaseError.code === "auth/account-exists-with-different-credential") {
          errorMessage = "Ya existe una cuenta con este correo usando otro método de inicio de sesión.";
        } else if (firebaseError.code === "auth/popup-blocked") {
          errorMessage = "Ventana emergente bloqueada. Por favor, permite ventanas emergentes e intenta de nuevo.";
        } else if (firebaseError.code === "auth/cancelled-popup-request") {
          errorMessage = "Solicitud cancelada.";
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo y Título */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-4 rounded-full">
              <Droplets className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">UNIMINUTO Riego</h1>
          <p className="text-gray-600">Sistema de Riego Automatizado</p>
        </div>

        {/* Formulario de Login */}
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>

            {/* Mensaje de error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}

            {/* Divisor */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">O</span>
              </div>
            </div>

            {/* Botón de Google */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <GoogleIcon />
              <span className="ml-2">Continuar con Google</span>
            </Button>
          </form>

          <div className="space-y-3">
            <div className="text-center text-sm text-gray-600">
              <a href="#" className="hover:text-blue-600 transition-colors">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <div className="text-center text-sm text-gray-600">
              ¿No tienes cuenta?{" "}
              <Link
                href="/register"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Regístrate aquí
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
