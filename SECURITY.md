# 🔒 Guía de Seguridad y .gitignore

## 📋 Resumen de Archivos .gitignore

Este proyecto utiliza un sistema de `.gitignore` en cascada para máxima seguridad:

```
📁 Proyecto
├── .gitignore              ← Nivel raíz (reglas globales)
├── apps/web/.gitignore     ← Frontend (Next.js + PWA)
└── functions/.gitignore    ← Backend (Cloud Functions)
```

---

## ✅ Archivos Protegidos

### 🔐 Secretos y Credenciales

```bash
# Variables de entorno
.env
.env.*
*.env (excepto .env.example)

# Credenciales de Firebase
serviceAccountKey.json
firebase-adminsdk-*.json

# Certificados y claves
*.pem
*.key
*.p12
*.pfx
```

### 📦 Dependencias

```bash
node_modules/
bun.lockb (local)
.pnp/
```

### 🏗️ Build Outputs

```bash
.next/
out/
build/
dist/
lib/
```

### 📝 Logs y Debugging

```bash
*.log
firebase-debug.log
npm-debug.log*
```

### 💻 IDE y Sistema Operativo

```bash
.vscode/ (excepto configuraciones compartidas)
.idea/
.DS_Store
Thumbs.db
```

---

## ⚠️ Archivos QUE DEBEN Estar Versionados

### ✅ Archivos de Ejemplo

```bash
.env.example          ← Plantilla sin credenciales reales
.runtimeconfig.example
```

### ✅ Service Workers con Placeholders

```bash
apps/web/public/firebase-messaging-sw.js  ← Con valores placeholder
```

### ✅ Configuraciones del Proyecto

```bash
firebase.json
.firebaserc
package.json
tsconfig.json
eslint.config.mjs
```

---

## 🔍 Verificación de Seguridad

### Comprobar archivos sensibles en Git:

```bash
# Buscar archivos .env trackeados
git ls-files | grep -E "\.env$"

# Buscar credenciales
git ls-files | grep -E "(credential|serviceAccount|key\.json)"

# Ver archivos staged
git status
```

### Eliminar archivo sensible del historial de Git:

```bash
# ⚠️ CUIDADO: Esto reescribe el historial
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch apps/web/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Forzar push (coordinar con el equipo)
git push origin --force --all
```

### Mejor práctica: Usar BFG Repo-Cleaner

```bash
# Instalar BFG
brew install bfg  # macOS
# o descargar de: https://rtyley.github.io/bfg-repo-cleaner/

# Limpiar archivos sensibles
bfg --delete-files .env
bfg --replace-text passwords.txt  # archivo con secrets a reemplazar

# Finalizar limpieza
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

---

## 🚨 Qué Hacer Si Subes un Secret por Error

### 1. **Acción Inmediata**

```bash
# 1. Elimina el archivo del último commit
git reset HEAD~1
git add .
git commit -m "chore: remove sensitive files"

# 2. Si ya hiciste push, contacta al equipo
```

### 2. **Rotar Credenciales**

- 🔄 Regenerar API Keys en Firebase Console
- 🔄 Crear nuevo Service Account Key
- 🔄 Actualizar VAPID key para FCM
- 🔄 Cambiar cualquier otra credencial expuesta

### 3. **Notificar al Equipo**

- Informar sobre la exposición
- Compartir nuevas credenciales por canal seguro
- Documentar el incidente

---

## 📚 Mejores Prácticas

### ✅ DO (Hacer)

1. **Usar archivos .env.example**

   ```bash
   cp .env.example .env
   # Luego editar .env con valores reales
   ```

2. **Verificar antes de commit**

   ```bash
   git status
   git diff --cached
   ```

3. **Usar pre-commit hooks** (opcional)

   ```bash
   # Instalar git-secrets
   brew install git-secrets
   git secrets --install
   git secrets --register-aws
   ```

4. **Revisar .gitignore regularmente**

   ```bash
   # Ver archivos ignorados
   git status --ignored

   # Ver qué archivos matchean un pattern
   git check-ignore -v *
   ```

### ❌ DON'T (No Hacer)

1. ❌ Nunca hagas `git add .` sin revisar
2. ❌ No comitees archivos `node_modules/`
3. ❌ No versiones archivos `.log`
4. ❌ No subas service account keys
5. ❌ No uses `--force` sin entender las consecuencias

---

## 🔧 Comandos Útiles

### Ver archivos ignorados:

```bash
git status --ignored
```

### Limpiar archivos ignorados:

```bash
git clean -fdX  # Solo archivos ignorados
git clean -fdx  # Archivos ignorados + no trackeados
```

### Ver qué ignora un patrón:

```bash
git check-ignore -v node_modules/
```

### Agregar archivo a .gitignore después de trackearlo:

```bash
# 1. Agregar a .gitignore
echo ".env" >> .gitignore

# 2. Quitar del index de Git (mantiene archivo local)
git rm --cached apps/web/.env

# 3. Commit
git add .gitignore
git commit -m "chore: add .env to gitignore"
```

---

## 📖 Recursos

- [GitHub: Ignoring Files](https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files)
- [gitignore.io](https://www.toptal.com/developers/gitignore) - Generador de .gitignore
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [git-secrets](https://github.com/awslabs/git-secrets)

---

## ✅ Checklist de Seguridad

Antes de hacer commit:

- [ ] ¿Revisé `git status`?
- [ ] ¿Revisé `git diff --cached`?
- [ ] ¿No hay archivos `.env` en staging?
- [ ] ¿No hay service account keys?
- [ ] ¿Los archivos de ejemplo (\*.example) están actualizados?
- [ ] ¿El `.gitignore` está actualizado?

Antes de hacer push:

- [ ] ¿Revisé el historial con `git log`?
- [ ] ¿Notifiqué al equipo de cambios importantes?
- [ ] ¿Las credenciales expuestas han sido rotadas?

---

**Última actualización:** 19 de Octubre, 2025  
**Mantenido por:** Equipo Uniminuto Riego PWA
