#!/usr/bin/env node

/**
 * Script de prueba para las funciones de gestión de usuarios
 * 
 * Este script ayuda a probar las Cloud Functions de updateUserRole y deleteUser
 * antes de usarlas en producción desde la interfaz de usuario.
 * 
 * Uso:
 *   node scripts/test-user-management.js
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = require('../functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();
const auth = admin.auth();

async function listUsers() {
  console.log('\n📋 Listando usuarios del sistema:\n');
  
  const usersSnapshot = await db.collection('users').get();
  
  if (usersSnapshot.empty) {
    console.log('❌ No hay usuarios en la base de datos.');
    return [];
  }
  
  const users = [];
  usersSnapshot.forEach((doc) => {
    const userData = doc.data();
    users.push({
      uid: doc.id,
      email: userData.email,
      role: userData.role || 'sin rol'
    });
    
    console.log(`  • ${userData.email || 'sin email'}`);
    console.log(`    UID: ${doc.id}`);
    console.log(`    Rol: ${userData.role || 'sin rol'}`);
    console.log('');
  });
  
  return users;
}

async function testUpdateRole(userId, newRole) {
  console.log(`\n🔄 Probando actualización de rol...`);
  console.log(`   Usuario: ${userId}`);
  console.log(`   Nuevo rol: ${newRole}\n`);
  
  try {
    // Actualizar custom claims
    await auth.setCustomUserClaims(userId, { role: newRole });
    console.log('✅ Custom claims actualizados');
    
    // Actualizar Firestore
    await db.collection('users').doc(userId).update({
      role: newRole,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Documento de Firestore actualizado');
    
    // Verificar cambios
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    console.log(`✅ Rol verificado en Firestore: ${userData.role}`);
    
    const userRecord = await auth.getUser(userId);
    console.log(`✅ Rol verificado en Auth: ${userRecord.customClaims?.role}`);
    
    console.log('\n✅ Actualización de rol completada exitosamente\n');
    return true;
  } catch (error) {
    console.error('❌ Error al actualizar rol:', error.message);
    return false;
  }
}

async function testDeleteUser(userId) {
  console.log(`\n🗑️  Probando eliminación de usuario...`);
  console.log(`   Usuario: ${userId}\n`);
  
  try {
    // Obtener info antes de eliminar
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log('❌ Usuario no encontrado en Firestore');
      return false;
    }
    
    const userData = userDoc.data();
    console.log(`   Email: ${userData.email}`);
    console.log(`   Rol: ${userData.role}`);
    
    // Eliminar de Firestore
    await db.collection('users').doc(userId).delete();
    console.log('✅ Usuario eliminado de Firestore');
    
    // Eliminar de Authentication
    await auth.deleteUser(userId);
    console.log('✅ Usuario eliminado de Authentication');
    
    console.log('\n✅ Usuario eliminado completamente del sistema\n');
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar usuario:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n🔧 Sistema de Prueba de Gestión de Usuarios\n');
  console.log('═'.repeat(50));
  
  try {
    // Listar usuarios
    const users = await listUsers();
    
    if (users.length === 0) {
      console.log('\n💡 Primero crea algunos usuarios de prueba.');
      process.exit(0);
    }
    
    console.log('\n📝 Instrucciones:');
    console.log('   1. Este script es solo para pruebas en desarrollo');
    console.log('   2. NO uses este script en producción');
    console.log('   3. Las funciones en producción deben llamarse desde la app\n');
    
    // Ejemplo comentado para evitar ejecuciones accidentales
    console.log('💡 Para probar, descomenta las líneas de prueba en el código:\n');
    console.log('   // Ejemplo de actualización de rol:');
    console.log('   // await testUpdateRole("USER_ID", "admin");\n');
    console.log('   // Ejemplo de eliminación:');
    console.log('   // await testDeleteUser("USER_ID");\n');
    
    // DESCOMENTA ESTAS LÍNEAS PARA PROBAR (con cuidado):
    // ⚠️ ADVERTENCIA: Estas operaciones afectan datos reales
    
    // await testUpdateRole('REEMPLAZAR_CON_UID_REAL', 'supervisor');
    // await testDeleteUser('REEMPLAZAR_CON_UID_REAL');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    console.log('═'.repeat(50));
    console.log('✅ Script completado\n');
    process.exit(0);
  }
}

// Ejecutar
main();
