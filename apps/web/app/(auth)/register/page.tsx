"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Droplets } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setIsLoading(false);
      return;
    }

    // Validar longitud mínima de contraseña
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setIsLoading(false);
      return;
    }

    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Crear documento del usuario en Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: userCredential.user.email,
        role: "supervisor", // Rol por defecto
        createdAt: new Date().toISOString(),
      });

      // Redirigir al dashboard
      router.push("/");
    } catch (err: unknown) {
      console.error("Error al registrarse:", err);

      let errorMessage =
        "Error al crear la cuenta. Por favor, intenta de nuevo.";

      if (err && typeof err === "object" && "code" in err) {
        const firebaseError = err as { code: string };

        if (firebaseError.code === "auth/email-already-in-use") {
          errorMessage = "Ya existe una cuenta con este correo electrónico.";
        } else if (firebaseError.code === "auth/invalid-email") {
          errorMessage = "El correo electrónico no es válido.";
        } else if (firebaseError.code === "auth/weak-password") {
          errorMessage = "La contraseña es demasiado débil.";
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
          <p className="text-gray-600">Crear Cuenta Nueva</p>
        </div>

        {/* Formulario de Registro */}
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

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-gray-700"
              >
                Confirmar Contraseña
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
            </Button>

            {/* Mensaje de error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}
          </form>

          <div className="text-center text-sm text-gray-600">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Inicia sesión aquí
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
