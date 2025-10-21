#!/bin/bash

# Script de verificación de despliegue de gestión de usuarios
# Verifica que todos los componentes necesarios estén en su lugar

echo "🔍 Verificando implementación de gestión de usuarios..."
echo ""

ERRORS=0
WARNINGS=0

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar archivo
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2 - Archivo no encontrado: $1"
        ((ERRORS++))
        return 1
    fi
}

# Función para verificar contenido en archivo
check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $3"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $3 - No encontrado en: $1"
        ((WARNINGS++))
        return 1
    fi
}

echo "📁 Verificando archivos principales..."
echo "────────────────────────────────────"

# Cloud Functions
check_file "functions/src/index.ts" "Cloud Functions source"
check_content "functions/src/index.ts" "updateUserRole" "Función updateUserRole"
check_content "functions/src/index.ts" "deleteUser" "Función deleteUser"

echo ""
echo "🎨 Verificando frontend..."
echo "────────────────────────────────────"

# Frontend components
check_file "apps/web/lib/useUserAdmin.ts" "Hook useUserAdmin"
check_file "apps/web/lib/useUsers.ts" "Hook useUsers"
check_file "apps/web/app/(dashboard)/admin/page.tsx" "Página de admin"
check_file "apps/web/lib/firebase.ts" "Configuración Firebase"

# Verificar exportación de functions
check_content "apps/web/lib/firebase.ts" "export const functions" "Exportación de functions"
check_content "apps/web/lib/firebase.ts" "getFunctions" "Import de getFunctions"

echo ""
echo "🧩 Verificando componentes UI..."
echo "────────────────────────────────────"

check_file "apps/web/components/ui/dialog.tsx" "Dialog component"
check_file "apps/web/components/ui/alert-dialog.tsx" "AlertDialog component"
check_file "apps/web/components/ui/select.tsx" "Select component"
check_file "apps/web/components/ui/button.tsx" "Button component"
check_file "apps/web/components/ui/input.tsx" "Input component"
check_file "apps/web/components/ui/card.tsx" "Card component"
check_file "apps/web/components/ui/sonner.tsx" "Sonner (Toast) component"

echo ""
echo "🍞 Verificando Toaster..."
echo "────────────────────────────────────"

check_file "apps/web/app/layout.tsx" "Root layout"
check_content "apps/web/app/layout.tsx" "Toaster" "Toaster importado"
check_content "apps/web/app/layout.tsx" "<Toaster" "Toaster renderizado"

echo ""
echo "🎯 Verificando funcionalidades en admin page..."
echo "────────────────────────────────────"

check_content "apps/web/app/(dashboard)/admin/page.tsx" "useUserAdmin" "Hook useUserAdmin utilizado"
check_content "apps/web/app/(dashboard)/admin/page.tsx" "updateUserRole" "Función updateUserRole"
check_content "apps/web/app/(dashboard)/admin/page.tsx" "deleteUserAccount" "Función deleteUserAccount"
check_content "apps/web/app/(dashboard)/admin/page.tsx" "toast.success" "Toast de éxito"
check_content "apps/web/app/(dashboard)/admin/page.tsx" "toast.error" "Toast de error"
check_content "apps/web/app/(dashboard)/admin/page.tsx" "editDialogOpen" "Dialog de edición"
check_content "apps/web/app/(dashboard)/admin/page.tsx" "deleteDialogOpen" "AlertDialog de eliminación"
check_content "apps/web/app/(dashboard)/admin/page.tsx" "filteredUsers" "Búsqueda/filtrado"
check_content "apps/web/app/(dashboard)/admin/page.tsx" "adminLoading" "Estado de carga"

echo ""
echo "📦 Verificando dependencias..."
echo "────────────────────────────────────"

if [ -f "apps/web/package.json" ]; then
    if grep -q "sonner" "apps/web/package.json"; then
        echo -e "${GREEN}✓${NC} Sonner instalado"
    else
        echo -e "${YELLOW}⚠${NC} Sonner no encontrado en package.json"
        ((WARNINGS++))
    fi
fi

echo ""
echo "🔧 Verificando scripts..."
echo "────────────────────────────────────"

check_file "deploy-functions.sh" "Script de despliegue"
check_file "scripts/test-user-management.js" "Script de pruebas"

echo ""
echo "📚 Verificando documentación..."
echo "────────────────────────────────────"

check_file "docs/USER_MANAGEMENT_GUIDE.md" "Guía de gestión de usuarios"
check_file "docs/USER_MANAGEMENT_IMPLEMENTATION.md" "Documentación de implementación"

echo ""
echo "══════════════════════════════════════"
echo "📊 RESUMEN"
echo "══════════════════════════════════════"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Todos los componentes están en su lugar${NC}"
    echo ""
    echo "🚀 Próximos pasos:"
    echo "   1. Desplegar Cloud Functions:"
    echo "      ./deploy-functions.sh"
    echo ""
    echo "   2. Verificar despliegue:"
    echo "      firebase functions:list"
    echo ""
    echo "   3. Probar en la aplicación:"
    echo "      - Acceder a /admin"
    echo "      - Probar editar rol"
    echo "      - Probar eliminar usuario"
    echo ""
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Implementación completa con $WARNINGS advertencias${NC}"
    echo ""
    echo "Las advertencias son menores y no deberían impedir el funcionamiento."
    echo "Revisa los mensajes arriba para más detalles."
    echo ""
else
    echo -e "${RED}❌ Se encontraron $ERRORS errores y $WARNINGS advertencias${NC}"
    echo ""
    echo "Por favor, revisa los mensajes de error arriba."
    echo "Algunos archivos necesarios no fueron encontrados."
    echo ""
    exit 1
fi

echo "══════════════════════════════════════"
echo ""
