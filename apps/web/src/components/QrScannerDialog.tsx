import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

interface QrScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export function QrScannerDialog({ open, onClose, onScanSuccess }: QrScannerDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerId = 'qr-reader';

  useEffect(() => {
    let timer: number;
    if (open) {
      setError(null);
      
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
        aspectRatio: 1.0,
      };

      // Delay initialization to allow the MUI Dialog to fully mount and transition
      timer = window.setTimeout(() => {
        const element = document.getElementById(scannerId);
        if (!element) return;
        
        scannerRef.current = new Html5QrcodeScanner(scannerId, config, false);
        
        scannerRef.current.render(
          (decodedText: string) => {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try { navigator.vibrate([100, 50, 100]); } catch (e) {}
            }
            if (scannerRef.current) {
              scannerRef.current.clear().catch(console.error);
            }
            onScanSuccess(decodedText);
          },
          (errorMessage: string) => {
            if (typeof errorMessage === 'string' && errorMessage.includes('NotAllowedError')) {
              setError('Camera permission was denied. Please allow camera access to scan.');
            }
          }
        );
      }, 300);
    }

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [open, onScanSuccess]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      keepMounted={false}
    >
      <DialogTitle>Scan Asset QR Code</DialogTitle>
      <DialogContent>
        {error ? (
          <Typography color="error" sx={{ p: 2, textAlign: 'center' }}>
            {error}
          </Typography>
        ) : (
          <Box sx={{ width: '100%', minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box id={scannerId} sx={{ width: '100%', mt: 1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              Point your camera at the asset's QR code sticker.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
