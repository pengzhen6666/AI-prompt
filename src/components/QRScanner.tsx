import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
  scanHint?: string;
}

export function QRScanner({
  onScanSuccess,
  onScanError,
  scanHint = "将礼品卡二维码对准摄像头",
}: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanning = useRef(false);

  useEffect(() => {
    const startScanner = async () => {
      if (isScanning.current) return;

      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        isScanning.current = true;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            onScanSuccess(decodedText);
            stopScanner();
          },
          (errorMessage) => {
            // 忽略常规扫描错误
            if (onScanError && !errorMessage.includes("NotFoundException")) {
              onScanError(errorMessage);
            }
          }
        );
      } catch (err) {
        console.error("启动扫描器失败:", err);
        isScanning.current = false;
        if (onScanError) {
          onScanError("无法访问摄像头,请检查权限设置");
        }
      }
    };

    const stopScanner = async () => {
      if (scannerRef.current && isScanning.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (err) {
          console.error("停止扫描器失败:", err);
        } finally {
          isScanning.current = false;
        }
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, [onScanSuccess, onScanError]);

  return (
    <div className="relative w-full">
      <div
        id="qr-reader"
        className="w-full rounded-lg overflow-hidden border-2 border-primary"
      />
      <div className="mt-2 text-center text-sm text-muted-foreground">
        {scanHint}
      </div>
    </div>
  );
}
