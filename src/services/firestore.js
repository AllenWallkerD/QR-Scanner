import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  getDoc,
  writeBatch
} from 'firebase/firestore';

const ATTENDANCE_COLLECTION = 'attendance';

export const checkDeviceAlreadyUsed = async (sessionId, deviceFingerprint, email) => {
  const colRef = collection(db, ATTENDANCE_COLLECTION);
  const q = query(
    colRef,
    where('sessionId', '==', sessionId),
    where('deviceFingerprint', '==', deviceFingerprint)
  );
  const snapshot = await getDocs(q);
  for (const docItem of snapshot.docs) {
    const data = docItem.data();
    if (data.email !== email) {
      return { used: true, byStudent: data.name || data.email };
    }
  }
  return { used: false };
};

export const addAttendanceRecord = async ({
  sessionId,
  email,
  name,
  studentId,
  scannedAt,
  valid,
  distance,
  deviceFingerprint,
  status
}) => {
  const colRef = collection(db, ATTENDANCE_COLLECTION);
  const docRef = await addDoc(colRef, {
    sessionId,
    email,
    name,
    studentId,
    scannedAt,
    valid,
    distance,
    deviceFingerprint,
    status,
    createdAt: new Date()
  });
  return docRef.id;
};

// Чтение документа сессии sessions/<id>; null, если не найден
export const getClassSession = async (classSessionId) => {
  const sessionRef = doc(db, 'sessions', classSessionId);
  const snap = await getDoc(sessionRef);
  return snap.exists() ? snap.data() : null;
};

// true, если у этого email уже есть запись посещения по данной сессии
export const checkAlreadyMarked = async (sessionId, email) => {
  const colRef = collection(db, ATTENDANCE_COLLECTION);
  const q = query(
    colRef,
    where('sessionId', '==', sessionId),
    where('email', '==', email)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

export const fetchAllAttendance = async () => {
  const colRef = collection(db, ATTENDANCE_COLLECTION);
  const q = query(colRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    _id: doc.id,
    ...doc.data()
  }));
};

export const getUserRecord = async (uid) => {
  const userDocRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userDocRef);
  if (userSnap.exists()) {
    return userSnap.data();
  }
  return null;
};

export const deleteAllAttendanceRecords = async () => {
  const batch = writeBatch(db);
  const colRef = collection(db, ATTENDANCE_COLLECTION);
  const snapshot = await getDocs(colRef);
  snapshot.forEach((docItem) => {
    batch.delete(docItem.ref);
  });
  await batch.commit();
};
