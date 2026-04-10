import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onScanSuccess, onScanError }) {
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const [scanned, setScanned] = useState(false);

  const handleScan = (decodedText, decodedResult) => {
    if (scanned) return;
    setScanned(true);
    onScanSuccess && onScanSuccess(decodedText, decodedResult);
  };

  useEffect(() => {
    html5QrCodeRef.current = new Html5Qrcode('reader');
    const startScanning = async () => {
      try {
        await html5QrCodeRef.current.start(
          { facingMode: { exact: 'environment' } },
          { fps: 10, qrbox: 250 },
          handleScan,
          (errorMessage) => {
            onScanError && onScanError(errorMessage);
          }
        );
      } catch (err) {
        onScanError && onScanError(err);
      }
    };
    startScanning();
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
        html5QrCodeRef.current.clear();
      }
    };
  }, [onScanSuccess, onScanError, scanned]);

  return <div id="reader" ref={scannerRef} style={{ width: '100%' }} />;
}
