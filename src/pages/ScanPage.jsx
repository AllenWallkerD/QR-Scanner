import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { getUserRecord, addAttendanceRecord, checkDeviceAlreadyUsed } from '../services/firestore';
import { Html5Qrcode } from 'html5-qrcode';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import '../styles/ScanPage.css';

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

export default function ScanPage() {
  const navigate = useNavigate();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
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
        setSuccessMessage('Бұл сессия бұрын тіркелген!');
        return;
      }
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setError('Пайдаланушы авторизован емес.');
          return;
        }
        const userRecord = await getUserRecord(currentUser.uid);
        const studentId = userRecord ? userRecord.studentId : 'Белгісіз';

        let parsed;
        try {
          parsed = JSON.parse(decodedText);
        } catch {
          setError('QR-код деректерін оқу мүмкін емес.');
          return;
        }

        const { sessionId, generatorLat, generatorLng } = parsed;
        if (!sessionId || generatorLat == null || generatorLng == null) {
          setError('QR-код деректері толық емес.');
          return;
        }

        const deviceFingerprint = deviceFingerprintRef.current;
        if (!deviceFingerprint) {
          setError('Құрылғы анықтау жүктелуде. Қайта сканерлеңіз.');
          return;
        }

        const deviceCheck = await checkDeviceAlreadyUsed(sessionId, deviceFingerprint, currentUser.email);
        if (deviceCheck.used) {
          setError(`Бұл құрылғы осы сессияда басқа студент (${deviceCheck.byStudent}) үшін қолданылған. Бір құрылғыдан тек бір студент тіркеле алады.`);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const distKm = getDistanceFromLatLonInKm(generatorLat, generatorLng, lat, lng);
            const distance = distKm * 1000;
            const valid = distance <= 10;
            try {
              await addAttendanceRecord({
                sessionId,
                email: currentUser.email,
                name: currentUser.displayName,
                studentId,
                scannedAt: new Date(),
                valid,
                distance,
                deviceFingerprint
              });
              setSuccessMessage('Қатысу сәтті тіркелді!');
              setLastQR(decodedText);
            } catch {
              setError('Қатысуды тіркеу кезінде қате болды.');
            }
          },
          () => {
            setError('Геолокацияны алу кезінде қате болды.');
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } catch {
        setError('Қатысуды тіркеу кезінде қате болды.');
      }
    },
    [lastQR, setScannerVisible, setSuccessMessage, setError, stopScanner]
  );

  useEffect(() => {
    if (scannerVisible) {
      (async () => {
        setError('');
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
            setError('Камераны іске қосу кезінде қате.');
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
          Қош келдіңіз, {auth.currentUser?.displayName || auth.currentUser?.email}
        </h2>
      </header>
      <main className="scan-main">
        <div className="scanner-section">
          {!scannerVisible && (
            <button
              className="btn open-btn"
              disabled={!fingerprintReady}
              onClick={() => {
                setSuccessMessage('');
                setError('');
                setScannerVisible(true);
              }}
            >
              {fingerprintReady ? 'Камераны ашу' : 'Жүктелуде...'}
            </button>
          )}
          {error && <p className="error-msg">{error}</p>}
          {scannerVisible && <div id="reader" className="reader" />}
          {successMessage && (
            <div className="success-message">
              <p>{successMessage}</p>
            </div>
          )}
        </div>
      </main>
      <button className="btn logout-btn" onClick={handleSignOut}>
        Шығу
      </button>
    </div>
  );
}
