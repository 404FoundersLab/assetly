import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Stack,
  Alert,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import KeyIcon from '@mui/icons-material/Key';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { apiFetch } from '../../services/api/client';
import type { Tenant } from '../../types';

interface ResetTenantPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  tenant: Tenant | null;
}

export function ResetTenantPasswordDialog({
  open,
  onClose,
  tenant,
}: ResetTenantPasswordDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [mustChange, setMustChange] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Initialize or reset form when dialog opens
  const handleOpen = () => {
    if (tenant) {
      setEmail(tenant.adminEmail || '');
      generatePassword();
      setMustChange(true);
      setError(null);
      setSuccess(null);
      setCopied(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let result = 'Pass@';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) return;
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await apiFetch<{ success: boolean; message?: string }>(
        `/api/tenants/${tenant.id}/reset-password`,
        {
          method: 'POST',
          body: JSON.stringify({
            password,
            email: email.trim(),
            mustChangePassword: mustChange,
          }),
        },
      );

      setSuccess(res.message || `Password successfully updated for ${email || tenant.adminEmail}`);
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Failed to reset password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      TransitionProps={{ onEnter: handleOpen }}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            bgcolor: 'rgba(236, 72, 153, 0.12)',
            color: '#EC4899',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <KeyIcon sx={{ fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Reset Admin Password
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {tenant?.name} ({tenant?.slug})
          </Typography>
        </Box>
      </DialogTitle>

      <form onSubmit={handleReset}>
        <DialogContent sx={{ pt: 1.5 }}>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && (
              <Alert severity="success" icon={<CheckCircleOutlineIcon fontSize="inherit" />}>
                {success}
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary">
              Platform administrators can overwrite the login password for the primary administrator of this organization.
            </Typography>

            <TextField
              label="Admin Account Email"
              type="email"
              fullWidth
              size="small"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              helperText="The user account under this organization receiving the new password"
            />

            <Box>
              <TextField
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                size="small"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={copied ? 'Copied!' : 'Copy Password'}>
                        <IconButton size="small" onClick={handleCopy} edge="end">
                          <ContentCopyIcon fontSize="small" color={copied ? 'success' : 'inherit'} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={showPassword ? 'Hide password' : 'Show password'}>
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ ml: 0.5 }}
                        >
                          {showPassword ? (
                            <VisibilityOffIcon fontSize="small" />
                          ) : (
                            <VisibilityIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button
                  size="small"
                  startIcon={<AutoFixHighIcon />}
                  onClick={generatePassword}
                  sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                >
                  Generate Strong Password
                </Button>
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={mustChange}
                  onChange={(e) => setMustChange(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2">
                  Require user to change password on next sign-in
                </Typography>
              }
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={onClose} disabled={loading}>
            {success ? 'Done' : 'Cancel'}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !password}
            sx={{
              background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #DB2777 0%, #BE185D 100%)',
              },
            }}
          >
            {loading ? 'Updating...' : 'Set New Password'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
