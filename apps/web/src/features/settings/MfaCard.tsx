import { useEffect, useState } from 'react';
import { Alert, Box, Chip, Stack, TextField, Typography } from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { QRCodeCanvas } from 'qrcode.react';
import { disableMfa, enableMfa, getMfaStatus, setupMfa } from '../../services/api/auth';
import { ApiError } from '../../services/api/client';
import { LoadingButton } from '../../components/Loader';
import { SettingsCard } from './SettingsCard';

export function MfaStatusChip() {
  const [status, setStatus] = useState<{ enabled: boolean; enforced: boolean } | null>(null);
  useEffect(() => {
    getMfaStatus()
      .then(setStatus)
      .catch(() => setStatus({ enabled: false, enforced: false }));
  }, []);
  if (!status) return <Chip label="…" size="small" variant="outlined" />;
  return (
    <Chip
      label={status.enabled ? 'Enabled' : status.enforced ? 'Required — setup pending' : 'Not enabled'}
      size="small"
      color={status.enabled ? 'success' : 'default'}
      variant={status.enabled ? 'filled' : 'outlined'}
    />
  );
}

export function MfaCard() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [enforced, setEnforced] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [disabling, setDisabling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getMfaStatus()
      .then((s) => {
        setEnabled(s.enabled);
        setEnforced(s.enforced);
      })
      .catch(() => setEnabled(false));
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof ApiError ? e.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSetup(null);
    setCode('');
    setPassword('');
    setDisabling(false);
  };

  return (
    <SettingsCard
      title="Two-factor authentication"
      subtitle="Require a one-time code from an authenticator app at sign-in"
      icon={<ShieldOutlinedIcon fontSize="small" />}
    >
      <Stack spacing={2} sx={{ flex: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" fontWeight={600}>
            Status
          </Typography>
          <Chip
            size="small"
            label={enabled === null ? '…' : enabled ? 'Enabled' : 'Disabled'}
            color={enabled ? 'success' : 'default'}
          />
        </Stack>

        {message && (
          <Alert severity={message.type} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {enabled === false && !setup && (
          <Box>
            <LoadingButton
              variant="contained"
              loading={loading}
              loadingLabel="Starting…"
              onClick={() =>
                void run(async () => {
                  setSetup(await setupMfa());
                })
              }
            >
              Enable MFA
            </LoadingButton>
          </Box>
        )}

        {enabled === false && setup && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Scan this QR code with Google Authenticator, Microsoft Authenticator, or Authy, then enter the 6-digit
              code.
            </Typography>
            <Box sx={{ p: 1.5, bgcolor: '#fff', borderRadius: 2, width: 'fit-content' }}>
              <QRCodeCanvas value={setup.otpauthUri} size={160} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
              Manual key: <strong>{setup.secret}</strong>
            </Typography>
            <TextField
              label="Verification code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputProps={{ inputMode: 'numeric', maxLength: 6 }}
              autoComplete="one-time-code"
            />
            <Stack direction="row" spacing={1.5}>
              <LoadingButton variant="outlined" color="inherit" onClick={reset} disabled={loading}>
                Cancel
              </LoadingButton>
              <LoadingButton
                variant="contained"
                loading={loading}
                loadingLabel="Verifying…"
                disabled={code.length !== 6}
                onClick={() =>
                  void run(async () => {
                    await enableMfa(code);
                    setEnabled(true);
                    reset();
                    setMessage({ type: 'success', text: 'MFA enabled. You will be asked for a code at next sign-in.' });
                  })
                }
              >
                Verify & enable
              </LoadingButton>
            </Stack>
          </Stack>
        )}

        {enabled && !disabling && (
          <Box>
            <LoadingButton variant="outlined" color="error" onClick={() => setDisabling(true)}>
              Disable MFA
            </LoadingButton>
          </Box>
        )}

        {enabled && !enforced && disabling && (
          <Stack spacing={2}>
            <TextField
              type="password"
              label="Current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <TextField
              label="Authenticator code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputProps={{ inputMode: 'numeric', maxLength: 6 }}
              autoComplete="one-time-code"
            />
            <Stack direction="row" spacing={1.5}>
              <LoadingButton variant="outlined" color="inherit" onClick={reset} disabled={loading}>
                Cancel
              </LoadingButton>
              <LoadingButton
                variant="contained"
                color="error"
                loading={loading}
                loadingLabel="Disabling…"
                disabled={!password || code.length !== 6}
                onClick={() =>
                  void run(async () => {
                    await disableMfa(password, code);
                    setEnabled(false);
                    reset();
                    setMessage({ type: 'success', text: 'MFA disabled.' });
                  })
                }
              >
                Confirm disable
              </LoadingButton>
            </Stack>
          </Stack>
        )}
      </Stack>
    </SettingsCard>
  );
}

