/* eslint-disable no-console */
// Сброс демо-данных: удаляет все документы из `sessions` и `attendance`.
// Запуск: node reset.js
// Студентов в `users` НЕ трогает.

const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  getDocs,
  writeBatch
} = require('firebase/firestore');

// Загружаем переменные из .env.local без сторонних зависимостей
function loadEnvLocal() {
  const env = {};
  try {
    const content = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    });
  } catch {
    // Файл может отсутствовать — тогда берём значения из process.env
  }
  return env;
}

const env = { ...loadEnvLocal(), ...process.env };

const firebaseConfig = {
  apiKey: env.REACT_APP_FIREBASE_API_KEY,
  authDomain: env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Удаление всей коллекции пачками (лимит batch — 500 операций)
async function deleteCollection(name) {
  const snap = await getDocs(collection(db, name));
  if (snap.empty) {
    console.log(`${name}: жою үшін деректер жоқ.`);
    return 0;
  }
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db);
    docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  console.log(`${name}: ${docs.length} құжат жойылды.`);
  return docs.length;
}

async function reset() {
  await deleteCollection('attendance');
  await deleteCollection('sessions');
  console.log('Дайын! Сессиялар мен қатысу жазбалары тазартылды.');
  process.exit(0);
}

reset().catch((err) => {
  console.error('Қате:', err);
  process.exit(1);
});
