// setAdmin.js
const admin = require("firebase-admin");
const serviceAccount = require("./functions/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Obtener email y rol desde argumentos de línea de comandos
const userEmail = process.argv[2];
const roleToSet = process.argv[3] || 'admin';

// Validar que se proporcionó un email
if (!userEmail) {
  console.error("❌ Error: Debes proporcionar un email de usuario");
  console.log("\nUso:");
  console.log("  node setAdmin.js <email> [role]");
  console.log("\nEjemplos:");
  console.log("  node setAdmin.js usuario@ejemplo.com");
  console.log("  node setAdmin.js usuario@ejemplo.com admin");
  console.log("  node setAdmin.js usuario@ejemplo.com supervisor");
  console.log("  node setAdmin.js usuario@ejemplo.com estudiante");
  process.exit(1);
}

// Validar que el rol sea válido
const validRoles = ['admin', 'supervisor', 'estudiante'];
if (!validRoles.includes(roleToSet)) {
  console.error(`❌ Error: Rol inválido "${roleToSet}"`);
  console.log("\nRoles válidos: admin, supervisor, estudiante");
  console.log("\nUso:");
  console.log("  node setAdmin.js <email> [role]");
  process.exit(1);
}

// Buscar usuario por email y establecer rol
let userInfo;

admin
  .auth()
  .getUserByEmail(userEmail)
  .then((userRecord) => {
    userInfo = userRecord; // Guardar referencia al usuario
    console.log(`✓ Usuario encontrado: ${userRecord.email} (UID: ${userRecord.uid})`);
    return admin.auth().setCustomUserClaims(userRecord.uid, { role: roleToSet });
  })
  .then(() => {
    console.log(`✓ Rol "${roleToSet}" asignado exitosamente a ${userInfo.email}`);
    console.log(`✓ Actualizando documento en Firestore...`);
    
    // Actualizar también en Firestore
    return admin
      .firestore()
      .collection("users")
      .doc(userInfo.uid)
      .set(
        {
          email: userInfo.email,
          role: roleToSet,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  })
  .then(() => {
    console.log(`✓ Documento actualizado en Firestore`);
    console.log(`✓ Revocando tokens de refresco...`);
    return admin.auth().revokeRefreshTokens(userInfo.uid);
  })
  .then(() => {
    console.log("\n✅ ¡Proceso completado exitosamente!");
    console.log(`\n📝 Rol asignado: "${roleToSet}"`);
    console.log("\n📝 Instrucciones para el usuario:");
    console.log("   1. Cerrar sesión en la aplicación");
    console.log("   2. Volver a iniciar sesión");
    console.log("   3. Ahora tendrá acceso según su rol");
    console.log("");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    
    if (error.code === "auth/user-not-found") {
      console.log("\n💡 El usuario no existe en Firebase Authentication");
      console.log("   Asegúrate de que el usuario se haya registrado primero");
    }
    
    process.exit(1);
  });
