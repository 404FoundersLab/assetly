import { useEffect, useState } from 'react';
import { Alert, Box, Stack, TextField, Typography } from '@mui/material';
import { QRCodeCanvas } from 'qrcode.react';
import { enableMfa, setupMfa } from '../../services/api/auth';
import { ApiError } from '../../services/api/client';
import { LoadingButton } from '../../components/Loader';

interface Props {
  /** Called with the full session token once MFA is enabled. */
  onComplete: (token: string) => void;
  onCancel: () => void;
}

/** Shown at sign-in when an administrator requires MFA and the user has not enrolled yet. */
export function MfaEnrollPanel({ onComplete, onCancel }: Props) {
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ token: string; codes: string[] } | null>(null);

  useEffect(() => {
    setupMfa()
      .then(setSetup)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not start MFA setup'));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await enableMfa(code);
      if (!res.token) throw new Error('No session returned');
      setDone({ token: res.token, codes: res.recoveryCodes ?? [] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning">
          Save these recovery codes now. Each can be used once if you lose your authenticator. They will not be shown again.
        </Alert>
        <Box component="pre" sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, m: 0, fontSize: 14 }}>
          {done.codes.join('\n')}
        </Box>
        <LoadingButton fullWidth variant="contained" size="large" onClick={() => onComplete(done.token)}>
          I have saved them - continue
        </LoadingButton>
      </Stack>
    );
  }

  return (
    <Box component="form" onSubmit={submit}>
      <Stack spacing={2}>
        <Alert severity="info">
          Your administrator requires multi-factor authentication. Set it up to continue.
        </Alert>
        {error && <Alert severity="error">{error}</Alert>}
        {setup && (
          <>
            <Typography variant="body2" color="text.secondary">
              Scan this QR code with Google Authenticator, Microsoft Authenticator, or Authy, then enter the 6-digit
              code.
            </Typography>
            <Box sx={{ p: 1.5, bgcolor: '#fff', borderRadius: 2, width: 'fit-content', alignSelf: 'center' }}>
              <QRCodeCanvas value={setup.otpauthUri} size={168} />
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
              autoFocus
            />
          </>
        )}
        <LoadingButton
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          loading={loading}
          loadingLabel="Verifying…"
          disabled={!setup || code.length !== 6}
        >
          Verify & continue
        </LoadingButton>
        <LoadingButton variant="text" color="inherit" onClick={onCancel} disabled={loading}>
          Cancel
        </LoadingButton>
      </Stack>
    </Box>
  );
}

