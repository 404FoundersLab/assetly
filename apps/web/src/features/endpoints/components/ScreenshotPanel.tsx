import { useCallback, useEffect, useState } from 'react';
import { Box, Button, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Typography, Snackbar, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import RefreshIcon from '@mui/icons-material/Refresh';
import { apiFetch } from '../../../services/api/client';

const INTERVAL_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 30, label: 'Every 30 seconds' },
  { value: 60, label: 'Every 1 minute' },
  { value: 300, label: 'Every 5 minutes' },
  { value: 600, label: 'Every 10 minutes' },
  { value: 900, label: 'Every 15 minutes' },
  { value: 1800, label: 'Every 30 minutes' },
  { value: 3600, label: 'Every 1 hour' },
];

interface Shot { id: string; image_data: string; captured_at: string }

export function ScreenshotPanel({ endpointId, isOffline }: { endpointId: string; isOffline: boolean }) {
  const [interval, setIntervalSec] = useState<number>(0);
  const [shots, setShots] = useState<Shot[]>([]);
  const [toast, setToast] = useState('');

  const loadShots = useCallback(async () => {
    try {
      const res = await apiFetch<{ screenshots: Shot[] }>(`/api/endpoints/${endpointId}/screenshots`);
      setShots(res.screenshots ?? []);
    } catch { /* ignore */ }
  }, [endpointId]);

  useEffect(() => {
    apiFetch<{ interval_seconds: number }>(`/api/endpoints/${endpointId}/screenshot-settings`)
      .then((r) => setIntervalSec(r.interval_seconds ?? 0))
      .catch(() => {});
    loadShots();
  }, [endpointId, loadShots]);

  const changeInterval = async (value: number) => {
    const prev = interval;
    setIntervalSec(value);
    try {
      await apiFetch(`/api/endpoints/${endpointId}/screenshot-settings`, {
        method: 'PUT',
        body: JSON.stringify({ interval_seconds: value }),
      });
      setToast(value === 0 ? 'Screenshot capture disabled' : 'Interval saved. Applies on next device check-in');
    } catch (err: unknown) {
      setIntervalSec(prev);
      setToast(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const deleteShot = async (shotId: string) => {
    try {
      await apiFetch(`/api/endpoints/${endpointId}/screenshots?id=${encodeURIComponent(shotId)}`, { method: 'DELETE' });
      setShots((prev) => prev.filter((s) => s.id !== shotId));
      setToast('Screenshot deleted');
    } catch (err: unknown) {
      setToast(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const deleteAll = async () => {
    if (!window.confirm('Delete all screenshots for this device?')) return;
    try {
      await apiFetch(`/api/endpoints/${endpointId}/screenshots`, { method: 'DELETE' });
      setShots([]);
      setToast('All screenshots deleted');
    } catch (err: unknown) {
      setToast(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const captureNow = async () => {
    try {
      await apiFetch(`/api/endpoints/${endpointId}/screenshots`, { method: 'POST' });
      setToast('Capture requested. Refresh in a moment');
    } catch (err: unknown) {
      setToast(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="subtitle2">Screen Capture</Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id={`ss-interval-${endpointId}`}>Interval</InputLabel>
          <Select
            labelId={`ss-interval-${endpointId}`}
            label="Interval"
            value={interval}
            onChange={(e) => changeInterval(Number(e.target.value))}
          >
            {INTERVAL_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Button size="small" variant="outlined" startIcon={<PhotoCameraIcon />} onClick={captureNow} disabled={isOffline}>
          Capture Now
        </Button>
        <Button size="small" startIcon={<RefreshIcon />} onClick={loadShots}>Refresh</Button>
        <Button size="small" color="error" startIcon={<DeleteSweepIcon />} onClick={deleteAll} disabled={shots.length === 0}>
          Delete all
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          Stored in the database · auto-deleted after 7 days · latest 20 kept per device
        </Typography>
      </Box>

      {shots.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1.5, mt: 2, overflowX: 'auto' }}>
          {shots.map((s) => (
            <Box key={s.id} sx={{ flex: '0 0 auto', position: 'relative' }}>
              <Tooltip title="Delete screenshot">
                <IconButton
                  size="small"
                  onClick={() => deleteShot(s.id)}
                  sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', '&:hover': { bgcolor: 'error.main' } }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <a href={s.image_data} target="_blank" rel="noreferrer">
                <img src={s.image_data} alt="screenshot" style={{ height: 120, borderRadius: 4, border: '1px solid #ccc' }} />
              </a>
              <Typography variant="caption" display="block">{new Date(s.captured_at).toLocaleString()}</Typography>
            </Box>
          ))}
        </Box>
      )}

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Paper>
  );
}

