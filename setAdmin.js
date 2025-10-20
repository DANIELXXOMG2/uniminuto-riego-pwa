// setAdmin.js
const admin = require("firebase-admin");
const serviceAccount = require("./functions/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Obtener email del usuario desde argumentos de línea de comandos
const userEmail = process.argv[2];

if (!userEmail) {
  console.error("❌ Error: Debes proporcionar un email de usuario");
  console.log("\nUso:");
  console.log("  node setAdmin.js usuario@ejemplo.com");
  process.exit(1);
}

// Buscar usuario por email y establecer rol de admin
admin
  .auth()
  .getUserByEmail(userEmail)
  .then((userRecord) => {
    console.log(`✓ Usuario encontrado: ${userRecord.email} (UID: ${userRecord.uid})`);
    return admin.auth().setCustomUserClaims(userRecord.uid, { role: "admin" });
  })
  .then((userRecord) => {
    console.log(`✓ Rol 'admin' asignado exitosamente a ${userRecord.email}`);
    console.log(`✓ Actualizando documento en Firestore...`);
    
    // Actualizar también en Firestore
    return admin
      .firestore()
      .collection("users")
      .doc(userRecord.uid)
      .set(
        {
          email: userRecord.email,
          role: "admin",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      .then(() => userRecord);
  })
  .then((userRecord) => {
    console.log(`✓ Documento actualizado en Firestore`);
    console.log(`✓ Revocando tokens de refresco...`);
    return admin.auth().revokeRefreshTokens(userRecord.uid);
  })
  .then(() => {
    console.log("\n✅ ¡Proceso completado exitosamente!");
    console.log("\n📝 Instrucciones para el usuario:");
    console.log("   1. Cerrar sesión en la aplicación");
    console.log("   2. Volver a iniciar sesión");
    console.log("   3. Ahora tendrá acceso a /admin");
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
