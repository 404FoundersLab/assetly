import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Chip, Button, Grid } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { apiFetch } from '../../../services/api/client';
import { PanelLoader } from '../../../components/Loader';
import type { DeviceContextData, Endpoint } from '../../../types';

interface DeviceContextProps {
  endpointId: string;
  endpoint?: Endpoint | null;
}

export function DeviceContext({ endpointId, endpoint }: DeviceContextProps) {
  const [data, setData] = useState<DeviceContextData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = async () => {
    if (!data) setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<any>(`/api/endpoints/${endpointId}/device-context`);
      setData(res);
    } catch (err: unknown) {
      if (!endpoint?.last_logged_user) {
        setError(err instanceof Error ? err.message : 'Failed to fetch device context');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContext();
  }, [endpointId]);

  const ctx = {
    last_logged_user: data?.last_logged_user ?? endpoint?.last_logged_user ?? null,
    uptime_seconds: data?.uptime_seconds ?? endpoint?.uptime_seconds ?? null,
    last_reboot_at: data?.last_reboot_at ?? endpoint?.last_reboot_at ?? null,
    agent_version: data?.agent_version ?? endpoint?.agent_version ?? null,
    bitlocker_status: data?.bitlocker_status ?? endpoint?.bitlocker_status ?? null,
    bitlocker_drive: data?.bitlocker_drive ?? endpoint?.bitlocker_drive ?? null,
    serial_number: data?.serial_number ?? endpoint?.serial_number ?? null,
  };

  if (loading && !ctx.last_logged_user && !ctx.agent_version) {
    return (
      <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
        <PanelLoader message="Loading device context…" minHeight={120} />
      </Paper>
    );
  }

  if (error && !ctx.last_logged_user && !ctx.agent_version) {
    return (
      <Paper variant="outlined" sx={{ p: 2.5, height: '100%', borderLeft: '4px solid #f44336' }}>
        <Typography color="error" gutterBottom>{error}</Typography>
        <Button variant="outlined" color="error" onClick={fetchContext} size="small">Retry</Button>
      </Paper>
    );
  }

  // Format Uptime
  const uptimeSec = ctx.uptime_seconds ? Number(ctx.uptime_seconds) : 0;
  const uptimeDays = uptimeSec ? Math.floor(uptimeSec / 86400) : 0;
  const uptimeHours = uptimeSec ? Math.floor((uptimeSec % 86400) / 3600) : 0;
  const uptimeMins = uptimeSec ? Math.floor((uptimeSec % 3600) / 60) : 0;

  let uptimeStr = 'Unknown';
  if (uptimeSec > 0) {
    if (uptimeDays > 0) uptimeStr = `${uptimeDays}d ${uptimeHours}h ${uptimeMins}m`;
    else if (uptimeHours > 0) uptimeStr = `${uptimeHours}h ${uptimeMins}m`;
    else uptimeStr = `${uptimeMins}m`;
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ mb: 2 }}>Device Context</Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={4}>
          <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>Last Logged-in User</Typography>
          <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
            <PersonIcon color="action" fontSize="small" />
            <Typography variant="body2" fontWeight={600}>{ctx.last_logged_user || 'Unknown'}</Typography>
          </Box>
        </Grid>

        <Grid item xs={6} sm={4}>
          <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>Uptime</Typography>
          <Typography variant="body2" fontWeight={600} mt={0.5}>{uptimeStr}</Typography>
        </Grid>

        <Grid item xs={6} sm={4}>
          <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>Last Reboot</Typography>
          <Typography variant="body2" fontWeight={600} mt={0.5}>
            {ctx.last_reboot_at ? new Date(ctx.last_reboot_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '') : 'Unknown'}
          </Typography>
        </Grid>

        <Grid item xs={6} sm={4}>
          <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>Agent Version</Typography>
          <Box mt={0.5}>
            <Chip label={ctx.agent_version || '2.0.0'} size="small" variant="outlined" color="info" sx={{ fontSize: '0.75rem' }} />
          </Box>
        </Grid>

        <Grid item xs={6} sm={4}>
          <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>BitLocker Status</Typography>
          <Box display="flex" alignItems="center" gap={1} mt={0.5}>
            <Chip 
              label={ctx.bitlocker_status?.toUpperCase() || 'UNKNOWN'} 
              color={ctx.bitlocker_status === 'enabled' ? 'success' : (ctx.bitlocker_status === 'disabled' ? 'error' : 'default')} 
              size="small" 
              sx={{ fontSize: '0.7rem' }}
            />
            {ctx.bitlocker_drive && (
              <Typography variant="caption" color="text.secondary">({ctx.bitlocker_drive})</Typography>
            )}
          </Box>
        </Grid>

        <Grid item xs={6} sm={4}>
          <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>Serial Number</Typography>
          <Typography variant="body2" fontWeight={600} mt={0.5} fontFamily="monospace" fontSize="0.8rem">
            {ctx.serial_number || '—'}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
}
