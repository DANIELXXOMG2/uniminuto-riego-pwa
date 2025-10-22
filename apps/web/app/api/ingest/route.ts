import { NextResponse } from 'next/server';
import { admin, initFirebaseAdmin } from '@/lib/firebase-admin';

/**
 * API Route para recibir datos del Arduino
 * Endpoint: POST /api/ingest
 */
export async function POST(request: Request) {
  try {
    // ============================================
    // 1. VALIDAR AUTENTICACIÓN
    // ============================================
    const authHeader = request.headers.get('Authorization');
    const expectedToken = `Bearer ${process.env.ARDUINO_API_SECRET}`;

    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token de autorización inválido' },
        { status: 401 }
      );
    }

    // ============================================
    // 2. PROCESAR DATOS DEL BODY
    // ============================================
    const body = await request.json();

    // Validar que se envió un array de lecturas
    if (!body.readings || !Array.isArray(body.readings)) {
      return NextResponse.json(
        { 
          error: 'Bad Request', 
          message: 'Se espera un objeto con propiedad "readings" (array)' 
        },
        { status: 400 }
      );
    }

    if (body.readings.length === 0) {
      return NextResponse.json(
        { 
          error: 'Bad Request', 
          message: 'El array de lecturas está vacío' 
        },
        { status: 400 }
      );
    }

    // ============================================
    // 3. INICIALIZAR FIREBASE ADMIN
    // ============================================
    initFirebaseAdmin();
    const db = admin.firestore();

    // ============================================
    // 4. CREAR BATCH PARA ESCRITURA EN FIRESTORE
    // ============================================
    const batch = db.batch();

    for (const reading of body.readings) {
      // Validar que cada lectura tenga los campos necesarios
      if (!reading.sensorId || typeof reading.valueVWC !== 'number') {
        return NextResponse.json(
          { 
            error: 'Bad Request', 
            message: 'Cada lectura debe tener "sensorId" (string) y "valueVWC" (number)' 
          },
          { status: 400 }
        );
      }

      // Crear referencia al documento en la subcolección readings
      const readingRef = db
        .collection('sensors')
        .doc(reading.sensorId)
        .collection('readings')
        .doc();

      // Añadir al batch
      batch.set(readingRef, {
        valueVWC: reading.valueVWC,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // ============================================
    // 5. EJECUTAR BATCH
    // ============================================
    await batch.commit();

    // ============================================
    // 6. RESPUESTA EXITOSA
    // ============================================
    return NextResponse.json(
      { 
        success: true, 
        count: body.readings.length,
        message: `${body.readings.length} lectura(s) guardada(s) correctamente` 
      },
      { status: 200 }
    );

  } catch (error) {
    // ============================================
    // MANEJO DE ERRORES
    // ============================================
    console.error('Error en /api/ingest:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    );
  }
}
