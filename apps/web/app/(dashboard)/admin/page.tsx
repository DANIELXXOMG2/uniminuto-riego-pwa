"use client";

import { useState } from "react";
import { Search, FilePen, Trash2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminRoute } from "@/lib/AdminRoute";
import { useUsers } from "@/lib/useUsers";
import { useUserAdmin } from "@/lib/useUserAdmin";
import { toast } from "sonner";

interface EditingUser {
  id: string;
  email: string;
  currentRole: string;
}

export default function AdminPage() {
  const { users, loading, error } = useUsers();
  const { updateUserRole, deleteUserAccount, loading: adminLoading } =
    useUserAdmin();

  const [searchQuery, setSearchQuery] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<"admin" | "supervisor">(
    "supervisor"
  );

  // Filtrar usuarios por búsqueda
  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Abrir diálogo de edición
  const handleEditClick = (user: {
    id: string;
    email: string | null;
    role: string | null;
  }) => {
    setEditingUser({
      id: user.id,
      email: user.email || "Sin email",
      currentRole: user.role || "Sin rol",
    });
    setSelectedRole((user.role as "admin" | "supervisor") || "supervisor");
    setEditDialogOpen(true);
  };

  // Confirmar edición de rol
  const handleConfirmEdit = async () => {
    if (!editingUser) return;

    try {
      await updateUserRole(editingUser.id, selectedRole);

      toast.success("Rol actualizado exitosamente", {
        description: `El usuario ${editingUser.email} ahora es ${selectedRole}`,
      });

      setEditDialogOpen(false);
      setEditingUser(null);
    } catch (err) {
      toast.error("Error al actualizar rol", {
        description:
          err instanceof Error
            ? err.message
            : "Ocurrió un error al actualizar el rol del usuario",
      });
    }
  };

  // Abrir diálogo de eliminación
  const handleDeleteClick = (userId: string) => {
    setDeletingUserId(userId);
    setDeleteDialogOpen(true);
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!deletingUserId) return;

    const userToDelete = users.find((u) => u.id === deletingUserId);

    try {
      await deleteUserAccount(deletingUserId);

      toast.success("Usuario eliminado exitosamente", {
        description: `El usuario ${userToDelete?.email || "desconocido"} ha sido eliminado del sistema`,
      });

      setDeleteDialogOpen(false);
      setDeletingUserId(null);
    } catch (err) {
      toast.error("Error al eliminar usuario", {
        description:
          err instanceof Error
            ? err.message
            : "Ocurrió un error al eliminar el usuario",
      });
    }
  };

  return (
    <AdminRoute>
      <div className="container mx-auto p-6 space-y-6">
        {/* Título */}
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="search"
            placeholder="Buscar usuario..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Estado de error */}
        {error && (
          <Card className="p-4 border-destructive bg-destructive/10">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  Error al cargar usuarios
                </p>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Estado de carga */}
        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-muted rounded w-48"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-9 w-9 bg-muted rounded"></div>
                    <div className="h-9 w-9 bg-muted rounded"></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Lista de usuarios */}
        {!loading && !error && (
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "No se encontraron usuarios con ese criterio"
                    : "No hay usuarios registrados"}
                </p>
              </Card>
            ) : (
              filteredUsers.map((user) => (
                <Card key={user.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{user.email || "Sin email"}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {user.role || "Sin rol asignado"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(user)}
                        disabled={adminLoading}
                        title="Editar rol"
                      >
                        <FilePen className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(user.id)}
                        disabled={adminLoading}
                        title="Eliminar usuario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Diálogo de Edición de Rol */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Rol de Usuario</DialogTitle>
              <DialogDescription>
                Cambia el rol de {editingUser?.email}. Los cambios se aplicarán
                inmediatamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Rol Actual</label>
                <p className="text-sm text-muted-foreground capitalize">
                  {editingUser?.currentRole}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nuevo Rol</label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) =>
                    setSelectedRole(value as "admin" | "supervisor")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={adminLoading}
              >
                Cancelar
              </Button>
              <Button onClick={handleConfirmEdit} disabled={adminLoading}>
                {adminLoading ? "Actualizando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo de Confirmación de Eliminación */}
        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Esto eliminará
                permanentemente la cuenta del usuario{" "}
                <span className="font-semibold">
                  {users.find((u) => u.id === deletingUserId)?.email}
                </span>{" "}
                y todos sus datos asociados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={adminLoading}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={adminLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {adminLoading ? "Eliminando..." : "Eliminar Usuario"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminRoute>
  );
}
