import { useState } from 'react';
import type React from 'react';
import { Button, Paper, Tooltip, Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import SyncIcon from '@mui/icons-material/Sync';
import BlockIcon from '@mui/icons-material/Block';
import TvIcon from '@mui/icons-material/Tv';
import { apiFetch } from '../../../services/api/client';

export function ActionsBar({ endpointId, isOffline, onRemoteControl }: { endpointId: string, isOffline: boolean, onRemoteControl?: () => void }) {
  const [toastMsg, setToastMsg] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isolateOpen, setIsolateOpen] = useState(false);
  const [isolated, setIsolated] = useState(false);

  const handleAction = async (action: string) => {
    if (action === 'remote' && onRemoteControl) {
      onRemoteControl();
      return;
    }
    if (action === 'isolate') {
      setIsolateOpen(true);
      return;
    }
    executeAction(action);
  };

  const executeAction = async (action: string) => {
    setIsolateOpen(false);
    setLoadingAction(action);
    try {
      await apiFetch(`/api/endpoints/${endpointId}/actions/${action}`, { method: 'POST' });
      if (action === 'force-scan') setToastMsg('Scan queued');
      if (action === 'sync') setToastMsg('Sync requested');
      if (action === 'isolate') {
        setIsolated(true);
      }
    } catch (err: unknown) {
      setToastMsg(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const ActionButton = ({ action, label, icon: Icon, color = "primary", variant = "outlined" }: {
    action: string;
    label: string;
    icon: React.ElementType;
    color?: 'primary' | 'error' | 'success' | 'warning' | 'info';
    variant?: 'outlined' | 'contained' | 'text';
  }) => {
    const btn = (
      <Button
        variant={variant}
        color={color}
        size="small"
        startIcon={<Icon />}
        onClick={() => handleAction(action)}
        disabled={isOffline || loadingAction === action || (action === 'isolate' && isolated)}
      >
        {label}
      </Button>
    );

    return isOffline ? (
      <Tooltip title="Device is offline">
        <span>{btn}</span>
      </Tooltip>
    ) : btn;
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', bgcolor: 'background.default' }}>
      <ActionButton action="remote" label="Take Remote Control" icon={TvIcon} color="info" variant="contained" />
      <ActionButton action="force-scan" label="Force Scan" icon={SecurityIcon} />
      <ActionButton action="isolate" label={isolated ? "Isolated" : "Isolate Device"} icon={BlockIcon} color="error" variant={isolated ? "contained" : "outlined"} />
      <ActionButton action="sync" label="Sync Now" icon={SyncIcon} />

      {isolated && (
        <Alert severity="warning" sx={{ ml: 'auto', py: 0 }}>
          Device isolated
        </Alert>
      )}

      <Snackbar
        open={!!toastMsg}
        autoHideDuration={3000}
        onClose={() => setToastMsg('')}
        message={toastMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <Dialog open={isolateOpen} onClose={() => setIsolateOpen(false)}>
        <DialogTitle>Isolate Device?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to isolate this device from the network? It will only be able to communicate with the security console.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsolateOpen(false)}>Cancel</Button>
          <Button onClick={() => executeAction('isolate')} color="error" variant="contained">
            Isolate
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
