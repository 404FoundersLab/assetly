import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Link,
  Typography,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { useAppSelector } from '../../hooks/storeHooks';
import { NetworkStatusChip } from '../../components/NetworkStatusChip';
import { NETWORK_DEVICE_TYPE_LABELS } from '../../data/demoData';
import { formatDateTime } from '../../utils/format';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Grid container spacing={2} sx={{ py: 1 }}>
      <Grid item xs={4}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Grid>
      <Grid item xs={8}>
        <Typography variant="body2" fontWeight={500} component="div">
          {value}
        </Typography>
      </Grid>
    </Grid>
  );
}

export function NetworkDeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const device = useAppSelector((s) => s.networkDevices.items.find((d) => d.id === id));

  if (!device) {
    return (
      <Box>
        <Alert severity="error">Network device not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/network-devices')} sx={{ mt: 2 }}>
          Back to Network Devices
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/network-devices" underline="hover" color="inherit">
          Network Devices
        </Link>
        <Typography color="text.primary">{device.deviceTag}</Typography>
      </Breadcrumbs>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {device.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body1" color="text.secondary">
              {device.deviceTag}
            </Typography>
            <NetworkStatusChip status={device.status} />
            <Chip label={NETWORK_DEVICE_TYPE_LABELS[device.type]} size="small" variant="outlined" />
          </Box>
        </Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/network-devices')}>
          Back
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Device Information
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <DetailRow label="Manufacturer" value={device.manufacturer} />
              <DetailRow label="Model" value={device.model} />
              <DetailRow label="Serial Number" value={device.serialNumber} />
              <DetailRow label="Firmware" value={device.firmwareVersion} />
              <DetailRow label="Location" value={device.location} />
              {device.vlan && <DetailRow label="VLAN" value={device.vlan} />}
              {device.notes && <DetailRow label="Notes" value={device.notes} />}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Network
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <DetailRow
                label="IP Address"
                value={
                  <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                    {device.ipAddress}
                  </Typography>
                }
              />
              <DetailRow
                label="MAC Address"
                value={
                  <Typography variant="body2" fontFamily="monospace">
                    {device.macAddress}
                  </Typography>
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Health & Monitoring
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Uptime (30 days)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={device.uptimePercent}
                  sx={{ flex: 1, height: 10, borderRadius: 1 }}
                  color={
                    device.uptimePercent >= 99
                      ? 'success'
                      : device.uptimePercent >= 90
                        ? 'warning'
                        : 'error'
                  }
                />
                <Typography variant="h6" fontWeight={700}>
                  {device.uptimePercent}%
                </Typography>
              </Box>
              <DetailRow label="Last Seen" value={formatDateTime(device.lastSeenAt)} />
              <DetailRow label="Status" value={<NetworkStatusChip status={device.status} />} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
