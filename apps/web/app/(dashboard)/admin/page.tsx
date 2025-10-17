import { Search, FilePen, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AdminRoute } from "@/lib/AdminRoute";

// Datos de ejemplo de usuarios
const mockUsers = [
  { id: 1, email: "admin@example.com", role: "Administrador" },
  { id: 2, email: "operador1@example.com", role: "Operador" },
  { id: 3, email: "operador2@example.com", role: "Operador" },
  { id: 4, email: "usuario@example.com", role: "Usuario" },
];

export default function AdminPage() {
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

      {/* Lista de usuarios */}
      <div className="space-y-3">
        {mockUsers.map((user) => (
          <Card key={user.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium">{user.email}</p>
                <p className="text-sm text-muted-foreground">{user.role}</p>
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
        ))}
      </div>
    </div>
    </AdminRoute>
  );
}
