import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { adminMfaAction, getTenantMfa, type MfaAdminUser } from '../../services/api/auth';
import type { Tenant } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  tenant: Tenant | null;
}

export function TenantMfaDialog({ open, onClose, tenant }: Props) {
  const [tenantEnforced, setTenantEnforced] = useState(false);
  const [users, setUsers] = useState<MfaAdminUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    try {
      const res = await getTenantMfa(tenant.id);
      setTenantEnforced(res.tenantEnforced);
      setUsers(res.users);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load MFA settings');
    }
  }, [tenant?.id]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Multi-factor authentication
        <Typography variant="caption" color="text.secondary" display="block">
          {tenant?.name} ({tenant?.slug})
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <FormControlLabel
            control={
              <Switch
                checked={tenantEnforced}
                disabled={busy}
                onChange={(e) =>
                  tenant &&
                  void run(() =>
                    adminMfaAction({ action: 'setTenantEnforced', tenantId: tenant.id, enforced: e.target.checked }),
                  )
                }
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Require MFA for all users in this organization
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Users without MFA are prompted to set it up at their next sign-in.
                </Typography>
              </Box>
            }
          />

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>MFA status</TableCell>
                <TableCell>Require MFA</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.email}>
                  <TableCell>
                    <Typography variant="body2">{u.name || u.email}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {u.email}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{u.role?.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={u.enrolled ? 'Enrolled' : tenantEnforced || u.enforced ? 'Pending' : 'Off'}
                      color={u.enrolled ? 'success' : tenantEnforced || u.enforced ? 'warning' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      size="small"
                      checked={u.enforced || tenantEnforced}
                      disabled={busy || tenantEnforced}
                      onChange={(e) =>
                        void run(() =>
                          adminMfaAction({ action: 'setUserEnforced', email: u.email, enforced: e.target.checked }),
                        )
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="warning"
                      disabled={busy || !u.enrolled}
                      onClick={() => {
                        if (window.confirm(`Reset MFA for ${u.email}? They will need to enroll again.`)) {
                          void run(() => adminMfaAction({ action: 'resetUser', email: u.email }));
                        }
                      }}
                    >
                      Reset MFA
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

