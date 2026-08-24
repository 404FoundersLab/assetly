import { useRef } from 'react';
import { Box, Button, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { QRCodeCanvas } from 'qrcode.react';
import { downloadQrFromCanvas, getAssetQrValue } from '../utils/assetUtils';

interface AssetQrPanelProps {
  assetId: string;
  assetTag: string;
  size?: number;
  showDownload?: boolean;
  caption?: string;
}

export function AssetQrPanel({
  assetId,
  assetTag,
  size = 200,
  showDownload = true,
  caption,
}: AssetQrPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrValue = getAssetQrValue(assetId);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadQrFromCanvas(canvas, `${assetTag}-qr.png`);
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          p: 2,
          display: 'inline-block',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <QRCodeCanvas
          ref={canvasRef}
          value={qrValue}
          size={size}
          level="M"
          marginSize={2}
        />
      </Box>
      <Typography variant="body2" fontWeight={600} mt={1.5}>
        {assetTag}
      </Typography>
      {caption && (
        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          {caption}
        </Typography>
      )}
      {showDownload && (
        <Button
          startIcon={<DownloadIcon />}
          variant="contained"
          size="small"
          onClick={handleDownload}
          sx={{ mt: 2 }}
        >
          Download QR Code
        </Button>
      )}
    </Box>
  );
}
