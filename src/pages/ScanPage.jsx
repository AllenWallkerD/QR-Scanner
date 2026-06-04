import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import {
  getUserRecord,
  addAttendanceRecord,
  checkDeviceAlreadyUsed,
  getClassSession,
  checkAlreadyMarked
} from '../services/firestore';
import { Html5Qrcode } from 'html5-qrcode';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { useI18n } from '../i18n/i18n';
import '../styles/ScanPage.css';

// Общие константы (должны совпадать с генератором)
const PRESENT_MINUTES = 5; // 0–5 мин после начала — пришёл, 5–15 — опоздал
const DISTANCE_LIMIT_M = 10; // допустимое расстояние до генератора, метры

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Промис-обёртка над геолокацией, чтобы можно было await внутри обработки
function getPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  });
}

export default function ScanPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [scannerVisible, setScannerVisible] = useState(false);
  // Сообщения храним как { key, vars } (или null), переводим при рендере
  const [successMessage, setSuccessMessage] = useState(null);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [lastQR, setLastQR] = useState('');
  const [fingerprintReady, setFingerprintReady] = useState(false);
  const html5QrCodeRef = useRef(null);
  const isRunningRef = useRef(false);
  const fingerprintRef = useRef(null);
  const deviceFingerprintRef = useRef('');

  useEffect(() => {
    FingerprintJS.load().then(async (fp) => {
      fingerprintRef.current = fp;
      const result = await fp.get();
      deviceFingerprintRef.current = result.visitorId;
      setFingerprintReady(true);
    });
  }, []);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current && isRunningRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch {}
      try {
        await html5QrCodeRef.current.clear();
      } catch {}
      isRunningRef.current = false;
    }
  }, []);

  const handleDecodedQR = useCallback(
    async (decodedText) => {
      await stopScanner();
      setScannerVisible(false);

      if (lastQR === decodedText) {
        setSuccessMessage({ key: 'scan.alreadyThisQR' });
        return;
      }

      // Показываем индикатор загрузки на время всей проверки и записи
      setProcessing(true);
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setError({ key: 'scan.notAuth' });
          return;
        }
        const userRecord = await getUserRecord(currentUser.uid);
        const studentId = userRecord ? userRecord.studentId : 'Белгісіз';

        let parsed;
        try {
          parsed = JSON.parse(decodedText);
        } catch {
          setError({ key: 'scan.qrUnreadable' });
          return;
        }

        const { classSessionId, token } = parsed;
        if (!classSessionId || !token) {
          setError({ key: 'scan.qrIncomplete' });
          return;
        }

        // Получаем сессию из коллекции `sessions`
        const session = await getClassSession(classSessionId);
        if (!session) {
          setError({ key: 'scan.sessionNotFound' });
          return;
        }
        if (!session.active) {
          setError({ key: 'scan.sessionEnded' });
          return;
        }
        const now = Date.now();
        if (now > session.expiresAt) {
          setError({ key: 'scan.sessionExpired' });
          return;
        }
        // Токен должен совпадать с текущим или предыдущим
        if (token !== session.currentToken && token !== session.previousToken) {
          setError({ key: 'scan.tokenInvalid' });
          return;
        }
        if (now > session.tokenExpiresAt) {
          setError({ key: 'scan.tokenRefreshed' });
          return;
        }

        // Координаты берём из документа сессии, а не из QR
        const generatorLat = session.generatorLat;
        const generatorLng = session.generatorLng;
        if (generatorLat == null || generatorLng == null) {
          setError({ key: 'scan.geoUnknown' });
          return;
        }

        // Проверяем, не отмечен ли студент уже на этой сессии
        const alreadyMarked = await checkAlreadyMarked(classSessionId, currentUser.email);
        if (alreadyMarked) {
          setSuccessMessage({ key: 'scan.alreadyMarked' });
          setLastQR(decodedText);
          return;
        }

        const deviceFingerprint = deviceFingerprintRef.current;
        if (!deviceFingerprint) {
          setError({ key: 'scan.fingerprintLoading' });
          return;
        }

        const deviceCheck = await checkDeviceAlreadyUsed(classSessionId, deviceFingerprint, currentUser.email);
        if (deviceCheck.used) {
          setError({ key: 'scan.deviceUsed', vars: { student: deviceCheck.byStudent } });
          return;
        }

        let pos;
        try {
          pos = await getPosition();
        } catch {
          setError({ key: 'scan.geoError' });
          return;
        }

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const distKm = getDistanceFromLatLonInKm(generatorLat, generatorLng, lat, lng);
        const distance = distKm * 1000;
        // Расстояние — мягкий флаг: посещение всегда записывается, valid лишь помечает дистанцию
        const valid = distance <= DISTANCE_LIMIT_M;

        // Статус по времени с начала сессии: <=5 мин — пришёл, иначе опоздал
        const minutesLate = (now - session.startedAt) / 60000;
        const status = minutesLate <= PRESENT_MINUTES ? 'present' : 'late';

        await addAttendanceRecord({
          sessionId: classSessionId,
          email: currentUser.email,
          name: currentUser.displayName,
          studentId,
          scannedAt: new Date(),
          valid,
          distance,
          deviceFingerprint,
          status
        });
        // Отметка засчитана в любом случае; если далеко — сообщаем, что помечена
        setSuccessMessage({ key: valid ? 'scan.success' : 'scan.successFlagged' });
        setLastQR(decodedText);
      } catch {
        setError({ key: 'scan.recordError' });
      } finally {
        // Снимаем индикатор загрузки в любом случае
        setProcessing(false);
      }
    },
    [lastQR, setScannerVisible, setSuccessMessage, setError, stopScanner]
  );

  useEffect(() => {
    if (scannerVisible) {
      (async () => {
        setError(null);
        html5QrCodeRef.current = new Html5Qrcode('reader');
        try {
          await html5QrCodeRef.current.start(
            { facingMode: 'environment' },
            { fps: 5, qrbox: 200, aspectRatio: 1 },
            handleDecodedQR
          );
          isRunningRef.current = true;
        } catch {
          try {
            await html5QrCodeRef.current.start(
              { facingMode: 'user' },
              { fps: 5, qrbox: 200, aspectRatio: 1 },
              handleDecodedQR
            );
            isRunningRef.current = true;
          } catch {
            setError({ key: 'scan.cameraError' });
          }
        }
      })();
    }
    return () => {
      stopScanner();
    };
  }, [scannerVisible, stopScanner, handleDecodedQR]);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/signin');
  };

  return (
    <div className={`scan-container ${scannerVisible ? 'scanner-open' : ''}`}>
      <header className="scan-header">
        <h2 className="welcome-text">
          {t('scan.welcome', {
            name: auth.currentUser?.displayName || auth.currentUser?.email
          })}
        </h2>
      </header>
      <main className="scan-main">
        <div className="scanner-section">
          {!scannerVisible && !processing && (
            <button
              className="btn open-btn"
              disabled={!fingerprintReady}
              onClick={() => {
                setSuccessMessage(null);
                setError(null);
                setScannerVisible(true);
              }}
            >
              {fingerprintReady ? t('scan.openCamera') : t('common.loading')}
            </button>
          )}
          {processing && (
            <div className="processing-message">
              <span className="spinner" />
              <p>{t('scan.checking')}</p>
            </div>
          )}
          {error && <p className="error-msg">{t(error.key, error.vars)}</p>}
          {scannerVisible && <div id="reader" className="reader" />}
          {successMessage && (
            <div className="success-message">
              <p>{t(successMessage.key, successMessage.vars)}</p>
            </div>
          )}
        </div>
      </main>
      <button className="btn logout-btn" onClick={handleSignOut}>
        {t('scan.logout')}
      </button>
    </div>
  );
}
