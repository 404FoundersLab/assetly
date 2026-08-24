import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { changePassword } from '../../services/api/auth';
import { ApiError } from '../../services/api/client';
import { LoadingButton } from '../../components/Loader';
import { SettingsCard } from './SettingsCard';

const MIN_LENGTH = 8;

function RequirementRow({ met, label }: { met: boolean; label: string }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {met ? (
        <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'success.main' }} />
      ) : (
        <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
      )}
      <Typography variant="caption" color={met ? 'success.main' : 'text.secondary'} fontWeight={met ? 600 : 400}>
        {label}
      </Typography>
    </Stack>
  );
}

export function ChangePasswordCard() {
  const theme = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const hasMinLength = newPassword.length >= MIN_LENGTH;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isDifferent = newPassword.length > 0 && currentPassword.length > 0 && newPassword !== currentPassword;

  const strength = useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= MIN_LENGTH) score += 35;
    if (newPassword.length >= 12) score += 20;
    if (/[A-Z]/.test(newPassword)) score += 15;
    if (/[0-9]/.test(newPassword)) score += 15;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 15;
    return Math.min(100, score);
  }, [newPassword]);

  const strengthLabel =
    strength === 0 ? '' : strength < 45 ? 'Weak' : strength < 75 ? 'Fair' : 'Strong';
  const strengthColor = strength < 45 ? 'error' : strength < 75 ? 'warning' : 'success';

  const canSubmit =
    currentPassword.length > 0 &&
    hasMinLength &&
    passwordsMatch &&
    isDifferent &&
    !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    if (!passwordsMatch) {
      setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    if (!hasMinLength) {
      setMessage({ type: 'error', text: `New password must be at least ${MIN_LENGTH} characters.` });
      return;
    }
    if (!isDifferent) {
      setMessage({ type: 'error', text: 'New password must be different from your current password.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await changePassword(currentPassword, newPassword);
      setMessage({ type: 'success', text: 'Password updated successfully. Use your new password next time you sign in.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof ApiError ? e.message : 'Password change failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const passwordAdornment = (visible: boolean, toggle: () => void) => (
    <InputAdornment position="end">
      <IconButton
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={toggle}
        edge="end"
        size="small"
      >
        {visible ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
      </IconButton>
    </InputAdornment>
  );

  return (
    <SettingsCard
      title="Change password"
      subtitle="Update your account password"
      icon={<LockOutlinedIcon fontSize="small" />}
    >
      <Grid container spacing={3} sx={{ flex: 1 }}>
        <Grid item xs={12} md={4}>
          <Stack spacing={2} sx={{ height: '100%', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Choose a strong password you do not use elsewhere. You will need your current password to confirm the change.
            </Typography>
            <Divider flexItem />
            <Stack spacing={0.75}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Requirements
              </Typography>
              <RequirementRow met={hasMinLength} label={`At least ${MIN_LENGTH} characters`} />
              <RequirementRow met={passwordsMatch} label="Passwords match" />
              <RequirementRow met={isDifferent} label="Different from current password" />
            </Stack>
          </Stack>
        </Grid>

        <Grid item xs={12} md={8}>
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: alpha(theme.palette.primary.main, 0.02),
              height: '100%',
            }}
          >
            <Stack spacing={2}>
              <TextField
                fullWidth
                type={showCurrent ? 'text' : 'password'}
                label="Current password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setMessage(null);
                }}
                autoComplete="current-password"
                InputProps={{ endAdornment: passwordAdornment(showCurrent, () => setShowCurrent((v) => !v)) }}
              />

              <TextField
                fullWidth
                type={showNew ? 'text' : 'password'}
                label="New password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setMessage(null);
                }}
                autoComplete="new-password"
                helperText={`Minimum ${MIN_LENGTH} characters`}
                InputProps={{ endAdornment: passwordAdornment(showNew, () => setShowNew((v) => !v)) }}
              />

              {newPassword.length > 0 && (
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Password strength
                    </Typography>
                    {strengthLabel && (
                      <Typography variant="caption" fontWeight={700} color={`${strengthColor}.main`}>
                        {strengthLabel}
                      </Typography>
                    )}
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={strength}
                    color={strengthColor}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              )}

              <TextField
                fullWidth
                type={showConfirm ? 'text' : 'password'}
                label="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setMessage(null);
                }}
                autoComplete="new-password"
                error={confirmPassword.length > 0 && !passwordsMatch}
                helperText={
                  confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : ' '
                }
                InputProps={{ endAdornment: passwordAdornment(showConfirm, () => setShowConfirm((v) => !v)) }}
              />

              {message && (
                <Alert severity={message.type} onClose={() => setMessage(null)}>
                  {message.text}
                </Alert>
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
                <LoadingButton
                  variant="outlined"
                  color="inherit"
                  disabled={loading || (!currentPassword && !newPassword && !confirmPassword)}
                  onClick={() => {
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setMessage(null);
                  }}
                >
                  Clear
                </LoadingButton>
                <LoadingButton
                  variant="contained"
                  loading={loading}
                  loadingLabel="Updating…"
                  disabled={!canSubmit}
                  onClick={() => void handleSubmit()}
                  sx={{ minWidth: 160 }}
                >
                  Update password
                </LoadingButton>
              </Stack>
            </Stack>
          </Box>
        </Grid>
      </Grid>
    </SettingsCard>
  );
}
