const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const bucket = () => admin.storage().bucket();

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

exports.verifyRecaptchaToken = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const secret = functions.config()?.recaptcha?.secret || process.env.RECAPTCHA_SECRET || '';
  if (!secret) {
    return res.status(500).json({ ok: false, error: 'reCAPTCHA secret is not configured on backend' });
  }

  const token = (req.body?.token || '').toString().trim();
  if (!token) {
    return res.status(400).json({ ok: false, error: 'Missing token' });
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);

    const remoteIp = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
    if (remoteIp) params.append('remoteip', remoteIp);

    const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await verifyRes.json();
    if (!data.success) {
      return res.status(403).json({ ok: false, error: 'reCAPTCHA verification failed', details: data['error-codes'] || [] });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('reCAPTCHA verify error', err);
    return res.status(500).json({ ok: false, error: 'Verification request failed' });
  }
});
