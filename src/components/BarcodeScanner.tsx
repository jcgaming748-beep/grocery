import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { useEffect, useRef, useState } from 'react';

type Props = {
  onScan: (barcode: string) => void;
  onClose: () => void;
};

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const lastScanRef = useRef<{ barcode: string; at: number } | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let active = true;
    let controls: IScannerControls | null = null;

    async function start() {
      if (!videoRef.current) return;

      try {
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current,
          (result) => {
            if (!active || !result) return;

            const barcode = result.getText();
            const now = Date.now();
            const last = lastScanRef.current;

            if (last && last.barcode === barcode && now - last.at < 2000) {
              return;
            }

            lastScanRef.current = { barcode, at: now };
            setLastScanned(barcode);
            onScan(barcode);
          },
        );
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : 'Camera access denied. Allow camera permission and use HTTPS.',
        );
      }
    }

    start();

    return () => {
      active = false;
      controls?.stop();
    };
  }, [onScan]);

  return (
    <div className="scanner">
      <div className="scanner-header">
        <h2>Scan barcode</h2>
        <button type="button" className="btn-secondary" onClick={onClose}>
          Done
        </button>
      </div>

      {error ? (
        <p className="error-text">{error}</p>
      ) : (
        <>
          <video ref={videoRef} className="scanner-video" playsInline muted />
          <p className="scanner-hint">Point at a product barcode</p>
          {lastScanned ? <p className="scanner-last">Last scan: {lastScanned}</p> : null}
        </>
      )}
    </div>
  );
}
