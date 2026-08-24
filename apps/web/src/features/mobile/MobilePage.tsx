import { useEffect, useState } from 'react';
import { Box, Card, Typography, List, ListItem, ListItemText, IconButton, Button, Alert, keyframes } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import WifiIcon from '@mui/icons-material/Wifi';
import SignalCellular4BarIcon from '@mui/icons-material/SignalCellular4Bar';
import GetAppIcon from '@mui/icons-material/GetApp';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/storeHooks';
import { PageHeader } from '../../components/PageHeader';
import { StatusChip } from '../../components/StatusChip';
import { EmptyState } from '../../components/EmptyState';
import { QrScannerDialog } from '../../components/QrScannerDialog';
import { subscribeInstallPrompt, promptPwaInstall, type BeforeInstallPromptEvent } from '../../utils/pwa';

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(33, 150, 243, 0); }
  100% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0); }
`;

export function MobilePage() {
  const navigate = useNavigate();
  const assets = useAppSelector((s) => s.assets.items);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    return subscribeInstallPrompt(setInstallPrompt);
  }, []);

  const handleScanSuccess = (decodedText: string) => {
    setScannerOpen(false);
    const raw = decodedText.trim();
    let assetId = '';
    if (raw.includes('/lookup/')) {
      assetId = raw.split('/lookup/')[1]?.split('?')[0]?.split('#')[0]?.replace(/\/$/, '') || '';
    } else if (raw.startsWith('ASSET:')) {
      const parts = raw.split(':');
      assetId = parts[2] || parts[1] || '';
    } else {
      assetId = raw;
    }

    if (assetId) {
      navigate(`/lookup/${encodeURIComponent(assetId)}`);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Mobile & Field"
        subtitle="On-the-go asset management and PWA barcode scanner"
      />

      {installPrompt && (
        <Alert
          severity="info"
          icon={<GetAppIcon />}
          action={
            <Button color="inherit" size="small" variant="outlined" onClick={promptPwaInstall}>
              Install App
            </Button>
          }
          sx={{ mt: 2, mb: 1, borderRadius: 2 }}
        >
          <strong>Install Assetly Mobile App</strong> — Add to your home screen for quick offline QR scanning.
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Box
          sx={{
            width: 375, // iPhone width
            height: 750,
            bgcolor: '#f8f9fa',
            border: '12px solid #1c1c1e',
            borderRadius: '44px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2), inset 0 0 0 4px #000',
          }}
        >
          {/* Hardware Notch */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 120,
              height: 28,
              bgcolor: '#1c1c1e',
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              zIndex: 10,
            }}
          />

          {/* Status Bar */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            px: 3, 
            pt: 1.5,
            pb: 0.5,
            bgcolor: 'primary.main', 
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            <Box>9:41</Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SignalCellular4BarIcon sx={{ fontSize: 14 }} />
              <WifiIcon sx={{ fontSize: 14 }} />
              <BatteryFullIcon sx={{ fontSize: 16, transform: 'rotate(90deg)' }} />
            </Box>
          </Box>

          {/* Mobile Header */}
          <Box sx={{ 
            bgcolor: 'primary.main', 
            color: 'white', 
            p: 2, 
            pt: 2, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <Typography variant="h6" fontWeight={700}>Field Assets</Typography>
            <IconButton color="inherit" onClick={() => setScannerOpen(true)}>
              <QrCodeScannerIcon />
            </IconButton>
          </Box>

          <Box sx={{ p: 2 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<QrCodeScannerIcon />}
              onClick={() => setScannerOpen(true)}
              sx={{ 
                mb: 3, 
                py: 1.5, 
                borderRadius: 3,
                fontSize: '1.05rem',
                fontWeight: 600,
                textTransform: 'none',
                animation: `${pulse} 2s infinite`,
                boxShadow: '0 8px 16px rgba(33, 150, 243, 0.25)',
              }}
            >
              Scan Asset Tag
            </Button>

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              RECENTLY VIEWED
            </Typography>

            {assets.length === 0 ? (
              <EmptyState icon={<PhoneIphoneIcon />} title="No assets" description="No assets available for field view." />
            ) : (
              <Box sx={{ height: 400, overflowY: 'auto', pb: 4, px: 0.5, mx: -0.5 }}>
                <List sx={{ p: 0 }}>
                  {assets.slice(0, 10).map(asset => (
                    <Card 
                      key={asset.id} 
                      sx={{ 
                        mb: 1.5, 
                        borderRadius: 3, 
                        transition: 'all 0.2s ease',
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        '&:active': { transform: 'scale(0.96)' } 
                      }}
                    >
                      <ListItem
                        onClick={() => navigate(`/assets/${asset.id}`)}
                        sx={{ cursor: 'pointer', p: 1.5 }}
                      secondaryAction={<ChevronRightIcon color="action" />}
                    >
                      <ListItemText
                        primary={<Typography fontWeight={600}>{asset.assetTag}</Typography>}
                        secondary={<Typography variant="caption" color="text.secondary">{asset.name}</Typography>}
                      />
                      <Box sx={{ mr: 2 }}>
                        <StatusChip status={asset.status} />
                      </Box>
                    </ListItem>
                    </Card>
                  ))}
                </List>
              </Box>
            )}
          </Box>

          {/* Home Indicator */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 130,
              height: 5,
              bgcolor: '#1c1c1e',
              borderRadius: 3,
            }}
          />
        </Box>
      </Box>
      <QrScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </Box>
  );
}
