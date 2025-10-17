'use client';

import { Search, FilePen, Trash2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AdminRoute } from "@/lib/AdminRoute";
import { useUsers } from "@/lib/useUsers";

export default function AdminPage() {
  const { users, loading, error } = useUsers();

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
          />
        </div>

        {/* Estado de error */}
        {error && (
          <Card className="p-4 border-destructive bg-destructive/10">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Error al cargar usuarios</p>
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
            {users.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No hay usuarios registrados</p>
              </Card>
            ) : (
              users.map((user) => (
                <Card key={user.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{user.email || 'Sin email'}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.role || 'Sin rol asignado'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <FilePen className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </AdminRoute>
  );
}
