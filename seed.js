/* eslint-disable no-console */
// Реалистичное наполнение демо-данными.
// Запуск: node seed.js
// Пишет только в `sessions` и `attendance`; коллекцию `users` НЕ трогает
// (студентов берёт из уже существующих `users`).

const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  addDoc
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

// Общие константы (совпадают с приложениями)
const ROTATE_SECONDS = 60;
const SESSION_MINUTES = 15;
const PRESENT_MINUTES = 5;

// Фиксированные координаты "аудитории"
const GENERATOR_LAT = 43.238949;
const GENERATOR_LNG = 76.889709;

const SESSION_COUNT = 12; // сколько уроков создаём
const SUSPICIOUS_DISTANCE_PROB = 0.12; // доля отметок с нарушением дистанции

// Профили поведения студентов: вероятность прийти, вероятность опоздать (среди
// пришедших) и drift — сдвиг динамики от начала к концу периода (+ улучшение, − спад)
const PROFILES = [
  { name: 'excellent', attend: 0.96, late: 0.05, drift: 0.0 },
  { name: 'good', attend: 0.86, late: 0.15, drift: 0.0 },
  { name: 'average', attend: 0.72, late: 0.3, drift: 0.0 },
  { name: 'improving', attend: 0.6, late: 0.35, drift: 0.4 },
  { name: 'declining', attend: 0.82, late: 0.25, drift: -0.5 },
  { name: 'at_risk', attend: 0.45, late: 0.45, drift: -0.2 }
];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function randomHex(length) {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

async function seed() {
  // Студентов берём из существующей коллекции `users`
  const usersSnap = await getDocs(collection(db, 'users'));
  const students = usersSnap.docs.map((d, i) => {
    const data = d.data();
    return {
      studentId: data.studentId,
      name: data.name,
      email: data.email,
      // Стабильный "отпечаток устройства" на каждого студента (как личный телефон)
      device: randomHex(32),
      // Профиль распределяем по кругу — чтобы были представлены все типы
      profile: PROFILES[i % PROFILES.length]
    };
  });

  if (students.length === 0) {
    console.log('Алдымен студенттерді тіркеңіз');
    process.exit(0);
  }

  console.log(`${students.length} студент табылды.`);

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // Создаём уроки в прошлом, по одному примерно каждые 1.6 дня, время — 09:00
  const sessions = [];
  for (let i = 0; i < SESSION_COUNT; i++) {
    const d = new Date(now - (SESSION_COUNT - i) * 1.6 * DAY);
    d.setHours(9, 0, 0, 0); // урок начинается в 09:00
    const startedAt = d.getTime();
    const classSessionId = `class-${startedAt}`;
    const token = randomHex(32);

    await setDoc(doc(db, 'sessions', classSessionId), {
      startedAt,
      expiresAt: startedAt + SESSION_MINUTES * 60000,
      rotateSeconds: ROTATE_SECONDS,
      currentToken: token,
      previousToken: null,
      tokenIssuedAt: startedAt,
      tokenExpiresAt: startedAt + (ROTATE_SECONDS + 10) * 1000,
      generatorLat: GENERATOR_LAT,
      generatorLng: GENERATOR_LNG,
      active: false,
      createdAt: new Date(startedAt)
    });

    sessions.push({ id: classSessionId, startedAt });
    console.log(`Сессия құрылды: ${classSessionId}`);
  }

  // Гарантируем минимум одного студента с 3 пропусками подряд в конце (для "Ескерту")
  const lastThreeIds = sessions.slice(-3).map((s) => s.id);
  const forcedAbsentEmail = students[0].email;

  let attendanceCount = 0;
  for (let si = 0; si < sessions.length; si++) {
    const session = sessions[si];
    // Прогресс по таймлайну 0..1 — для динамики (drift)
    const progress = sessions.length > 1 ? si / (sessions.length - 1) : 0;

    for (const student of students) {
      // Принудительный пропуск последних 3 уроков для одного студента
      if (student.email === forcedAbsentEmail && lastThreeIds.includes(session.id)) {
        continue;
      }

      const p = student.profile;
      // Эффективная вероятность прийти с учётом тренда (drift вокруг середины периода)
      const effAttend = clamp(p.attend + p.drift * (progress - 0.5), 0.05, 0.99);
      if (Math.random() > effAttend) {
        continue; // отсутствовал — записи нет
      }

      const isLate = Math.random() < p.late;
      const status = isLate ? 'late' : 'present';

      // Смещение сканирования: present 0–5 мин, late 5–15 мин
      const offsetMin = isLate
        ? PRESENT_MINUTES + Math.random() * (SESSION_MINUTES - PRESENT_MINUTES)
        : Math.random() * PRESENT_MINUTES;
      const scannedAt = session.startedAt + offsetMin * 60000;

      // Дистанция: обычно 2–9 м (valid), иногда нарушение 11–26 м (suspicious)
      let distance;
      let valid;
      if (Math.random() < SUSPICIOUS_DISTANCE_PROB) {
        distance = 11 + Math.random() * 15;
        valid = false;
      } else {
        distance = 2 + Math.random() * 7;
        valid = true;
      }

      await addDoc(collection(db, 'attendance'), {
        sessionId: session.id,
        email: student.email,
        name: student.name,
        studentId: student.studentId,
        scannedAt: new Date(scannedAt),
        valid,
        distance,
        status,
        deviceFingerprint: student.device,
        createdAt: new Date(scannedAt)
      });
      attendanceCount++;
    }
  }

  console.log(`Барлығы ${attendanceCount} қатысу жазбасы құрылды.`);
  console.log('Дайын!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Қате:', err);
  process.exit(1);
});
