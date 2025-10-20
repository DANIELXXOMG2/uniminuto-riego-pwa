// setAdmin.js
const admin = require("firebase-admin");
// Asegúrate de que la ruta al archivo JSON sea correcta
const serviceAccount = require("./uniminuto-riego-pwa-firebase-adminsdk-fbsvc-41f5d73cad.json"); // <-- CAMBIA ESTO

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Reemplaza con el UID de tu usuario de prueba de Firebase Auth
const uid = "uqphMNbwyCUUwtSPkuzVapbEccS2"; // <-- CAMBIA ESTO

admin
  .auth()
  .setCustomUserClaims(uid, { role: "administrator" })
  .then(() => {
    console.log(`Rol 'administrator' asignado exitosamente a ${uid}`);
    // Forzar actualización del token en el cliente la próxima vez que inicie sesión
    return admin.auth().revokeRefreshTokens(uid);
  })
  .then(() => {
    console.log(
      "Tokens de refresco revocados. El usuario obtendrá el nuevo rol al volver a iniciar sesión."
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error asignando rol:", error);
    process.exit(1);
  });
