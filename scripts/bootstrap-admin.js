#!/usr/bin/env node
/*
 * One-time admin bootstrap helper.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node scripts/bootstrap-admin.js <firebase-auth-uid>
 *   node scripts/bootstrap-admin.js <firebase-auth-uid> /path/to/service-account.json
 *
 * This script is intentionally outside functions/ so it is not deployed as a Cloud Function.
 */

const path = require('path');

function loadFirebaseAdmin() {
  try {
    return require('firebase-admin');
  } catch (err) {
    return require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  }
}

async function main() {
  const uid = (process.argv[2] || '').trim();
  const serviceAccountPath = process.argv[3] || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!uid) {
    throw new Error('Missing Firebase Auth UID. Usage: node scripts/bootstrap-admin.js <uid> [/path/to/service-account.json]');
  }

  if (!serviceAccountPath) {
    throw new Error('Missing service account path. Set GOOGLE_APPLICATION_CREDENTIALS or pass it as the second argument.');
  }

  const admin = loadFirebaseAdmin();
  const serviceAccount = require(path.resolve(serviceAccountPath));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  const user = await admin.auth().getUser(uid);
  const existingClaims = user.customClaims || {};
  await admin.auth().setCustomUserClaims(uid, { ...existingClaims, admin: true });

  console.log(`Admin claim granted to ${uid}. The user must sign out/in or refresh their ID token.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
