const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const bucket = () => admin.storage().bucket();

exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.');
  }

  const uid = typeof data?.uid === 'string' ? data.uid.trim() : '';
  const isAdmin = data?.isAdmin;

  if (!uid || typeof isAdmin !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'Expected payload: { uid: string, isAdmin: boolean }.');
  }

  const callerIsAdmin = context.auth.token?.admin === true;
  if (!callerIsAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can change admin claims.');
  }

  try {
    const user = await admin.auth().getUser(uid);
    const existingClaims = user.customClaims || {};
    const nextClaims = { ...existingClaims, admin: isAdmin };

    await admin.auth().setCustomUserClaims(uid, nextClaims);
    console.log('Updated admin claim', { targetUid: uid, isAdmin, callerUid: context.auth.uid });

    return {
      ok: true,
      message: `Admin claim ${isAdmin ? 'granted' : 'revoked'} for ${uid}. Ask the user to sign out/in or refresh their ID token.`,
      uid,
      isAdmin
    };
  } catch (err) {
    console.error('setAdminClaim failed', { targetUid: uid, callerUid: context.auth.uid, error: err?.message || err });
    throw new functions.https.HttpsError('internal', 'Failed to update admin claim.');
  }
});

function tryGetStoragePathFromUrl(url) {
  // Best-effort: parse a Firebase Storage download URL and extract the object path.
  // Example:
  // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/permits%2F123_file.jpg?alt=media&token=...
  try {
    if (!url || typeof url !== 'string') return null;
    const u = new URL(url);
    if (!u.pathname.includes('/o/')) return null;
    const encodedPath = u.pathname.split('/o/')[1];
    if (!encodedPath) return null;
    return decodeURIComponent(encodedPath);
  } catch (e) {
    return null;
  }
}

async function deleteIfPresent(filePath) {
  if (!filePath) return;
  try {
    await bucket().file(filePath).delete({ ignoreNotFound: true });
    console.log('Deleted storage file:', filePath);
  } catch (err) {
    // best-effort + skip on failure
    console.warn('Failed to delete storage file (skipping):', filePath, err?.message || err);
  }
}

function makeOnDeleteHandler(collectionName, imageFieldName) {
  return functions.firestore
    .document(`${collectionName}/{docId}`)
    .onDelete(async (snap, context) => {
      const data = snap.data() || {};

      // Prefer explicit stored storage path
      const explicitPath = data[`${imageFieldName}Path`];
      if (explicitPath) {
        await deleteIfPresent(explicitPath);
        return;
      }

      // Fallback: try to parse path from download URL
      const url = data[imageFieldName];
      const parsedPath = tryGetStoragePathFromUrl(url);
      if (parsedPath) {
        await deleteIfPresent(parsedPath);
      }
    });
}

exports.onPermitDeleted = makeOnDeleteHandler('permits', 'image');
exports.onLicenseDeleted = makeOnDeleteHandler('licenses', 'image');
