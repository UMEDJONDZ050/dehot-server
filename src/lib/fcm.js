const admin = require('firebase-admin');
const path  = require('path');

let _initialized = false;

function initFCM() {
  if (_initialized) return;
  try {
    // Дар Render: тамоми JSON-и service account-ро ҳамчун як env var
    // (FIREBASE_SERVICE_ACCOUNT) мегузорем — файл лозим нест.
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      const keyPath = process.env.FIREBASE_KEY_PATH ||
        path.join(__dirname, '../../firebase-service-account.json');
      serviceAccount = require(keyPath);
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    _initialized = true;
    console.log('Firebase Admin initialized');
  } catch (err) {
    console.error('Firebase Admin init failed:', err.message);
  }
}

// Tokens — массиви FCM tokenҳо, title ва body
async function sendPush(tokens, title, body) {
  if (!_initialized) return;
  const valid = tokens.filter(Boolean);
  if (!valid.length) return;

  const chunks = [];
  for (let i = 0; i < valid.length; i += 500) {
    chunks.push(valid.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    try {
      await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        android: { priority: 'high' },
      });
    } catch (err) {
      console.error('FCM send error:', err.message);
    }
  }
}

module.exports = { initFCM, sendPush };
