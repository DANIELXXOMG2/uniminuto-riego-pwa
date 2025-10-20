"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

interface UpdateRoleParams {
  userId: string;
  newRole: "admin" | "supervisor";
}

interface DeleteUserParams {
  userId: string;
}

interface CloudFunctionResponse {
  success: boolean;
  message: string;
  userId?: string;
  newRole?: string;
}

/**
 * Hook personalizado para operaciones de administración de usuarios
 * Proporciona funciones para actualizar roles y eliminar usuarios
 */
export function useUserAdmin() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Actualiza el rol de un usuario
   * @param userId - ID del usuario a actualizar
   * @param newRole - Nuevo rol ('admin' o 'supervisor')
   * @returns Promise con el resultado de la operación
   */
  const updateUserRole = async (
    userId: string,
    newRole: "admin" | "supervisor"
  ): Promise<CloudFunctionResponse> => {
    setLoading(true);
    setError(null);

    try {
      const updateRole = httpsCallable<
        UpdateRoleParams,
        CloudFunctionResponse
      >(functions, "updateUserRole");

      const result = await updateRole({ userId, newRole });

      setLoading(false);
      return result.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al actualizar el rol";
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  };

  /**
   * Elimina un usuario del sistema
   * @param userId - ID del usuario a eliminar
   * @returns Promise con el resultado de la operación
   */
  const deleteUserAccount = async (
    userId: string
  ): Promise<CloudFunctionResponse> => {
    setLoading(true);
    setError(null);

    try {
      const deleteUserFunc = httpsCallable<
        DeleteUserParams,
        CloudFunctionResponse
      >(functions, "deleteUser");

      const result = await deleteUserFunc({ userId });

      setLoading(false);
      return result.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al eliminar el usuario";
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  };

  return {
    updateUserRole,
    deleteUserAccount,
    loading,
    error,
  };
}
