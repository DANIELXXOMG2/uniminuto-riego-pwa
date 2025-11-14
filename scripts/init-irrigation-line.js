#!/usr/bin/env node

/**
 * Init or update a single irrigation line document in Firestore.
 *
 * Purpose: Quickly bootstrap the document that firmware and web app expect
 * at irrigationLines/<id> with fields: title, isActive, humidity, lastUpdated,
 * and optional sensorIds array.
 *
 * Prereqs:
 * - Node.js 18+
 * - Firebase Admin SDK available via service account JSON
 * - Service account JSON located at functions/serviceAccountKey.json (default)
 *   or provide path via --key=/absolute/or/relative/path.json
 *
 * Usage (PowerShell on Windows):
 *   node scripts/init-irrigation-line.js --id=test-line-1 --title="Línea de Prueba" --isActive=false --humidity=15 --sensors=sensor-000,sensor-001
 *
 * Notes:
 * - If the doc exists, unspecified fields are preserved; specified fields are updated.
 * - lastUpdated is always set to serverTimestamp on each run.
 */

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (const a of args) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) {
      const key = m[1];
      let val = m[2];
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      out[key] = val;
    }
  }
  return out;
}

function requireArg(obj, key, help) {
  if (obj[key] === undefined || obj[key] === '') {
    console.error(`\nMissing required argument --${key}.`);
    if (help) console.error(help);
    process.exit(1);
  }
}

async function initializeSystemConfig(db) {
  const configRef = db.collection('system').doc('config');
  const configPayload = {
    defaultReadingIntervalSeconds: 300,
    activeIrrigationIntervalSeconds: 5,
    irrigationMoistureThreshold: 40,
    autoIrrigationEnabled: false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await configRef.set(configPayload, { merge: true });
}

(async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' Init irrigationLines document');
  console.log('═══════════════════════════════════════════════════════');

  const argv = parseArgs();
  // Required id
  requireArg(argv, 'id', 'Example: --id=test-line-1');

  const id = String(argv.id);
  const title = argv.title !== undefined ? String(argv.title) : `Línea ${id}`;
  const isActive = argv.isActive !== undefined ? Boolean(argv.isActive) : false;
  const humidity = argv.humidity !== undefined ? Number(argv.humidity) : null;
  const sensors = argv.sensors
    ? String(argv.sensors)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : undefined; // keep undefined so we don't overwrite when not provided

  // Service account key path
  const keyPath = argv.key
    ? path.resolve(argv.key)
    : path.join(__dirname, '../functions/serviceAccountKey.json');

  if (!fs.existsSync(keyPath)) {
    console.error(`\n❌ Service account key not found at: ${keyPath}`);
    console.error('Place your Firebase service account JSON at functions/serviceAccountKey.json');
    console.error('or pass a custom path via --key=path/to/key.json');
    process.exit(1);
  }

  const serviceAccount = require(keyPath);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();

  try {
    await initializeSystemConfig(db);
    const ref = db.collection('irrigationLines').doc(id);
    const snap = await ref.get();

    const payload = {
      title,
      isActive,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (humidity !== null && !Number.isNaN(humidity)) {
      payload.humidity = humidity;
    }
    if (sensors !== undefined) {
      payload.sensorIds = sensors;
    }

    if (snap.exists) {
      console.log(`\nUpdating irrigationLines/${id} ...`);
      await ref.set(payload, { merge: true });
      console.log('✅ Updated');
    } else {
      console.log(`\nCreating irrigationLines/${id} ...`);
      await ref.set({
        name: title, // keep compatibility with legacy field name if used
        ...payload,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      console.log('✅ Created');
    }

    // Ensure updatedAt is set on update too
    await ref.set({ updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

    // Read back for confirmation
    const after = await ref.get();
    console.log('\nCurrent document:');
    console.log(JSON.stringify(after.data(), null, 2));

    console.log('\nDone.');
  } catch (err) {
    console.error('\n❌ Failed to initialize irrigation line:', err.message || err);
    process.exit(1);
  }
})();
