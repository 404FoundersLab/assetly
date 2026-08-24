import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAppDispatch, useAppSelector, useAuthUser, usePermissions } from '../../hooks/storeHooks';
import { createUser, deleteUserThunk, fetchUsers } from '../../store/usersSlice';
import { PageHeader } from '../../components/PageHeader';
import { getRoleLabel } from '../../utils/userDisplay';
import { assignableRolesFor, ROLE_DESCRIPTIONS } from '../../constants/roles';
import type { UserRole } from '../../types';
import { LoadingButton } from '../../components/Loader';

export function TenantUsersPage() {
  const dispatch = useAppDispatch();
  const user = useAuthUser();
  const { can } = usePermissions();
  const allUsers = useAppSelector((s) => s.users.items);
  const loading = useAppSelector((s) => s.users.loading);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'employee' as UserRole });
  const [error, setError] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tenantUsers = allUsers.filter((u) => u.tenantId === user?.tenantId);
  const roleOptions = assignableRolesFor(user?.role);

  useEffect(() => {
    if (can('user:manage')) {
      void dispatch(fetchUsers());
    }
  }, [dispatch, can]);

  if (!can('user:manage')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">You do not have permission to manage team accounts.</Alert>
      </Box>
    );
  }

  const handleCreate = async () => {
    if (!user?.tenantId || !form.firstName || !form.email) {
      setError('First name and email are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await dispatch(
        createUser({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          role: form.role,
          tenantId: user.tenantId,
        }),
      ).unwrap();
      setCreatedPassword(created.generatedPassword ?? null);
      setForm({ firstName: '', lastName: '', email: '', role: 'employee' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setCreatedPassword(null);
    setError(null);
    setForm({ firstName: '', lastName: '', email: '', role: 'employee' });
  };

  return (
    <Box>
      <PageHeader
        title="Team accounts"
        subtitle="Create IT Admin, HR Admin, and employee logins for your organization"
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Settings', to: '/settings' },
          { label: 'Team accounts' },
        ]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Add account
          </Button>
        }
      />

      <Card sx={{ mt: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tenantUsers.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <PersonIcon color="action" fontSize="small" />
                      <Typography variant="body2" fontWeight={600}>
                        {u.firstName} {u.lastName}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip label={getRoleLabel(u.role)} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={u.id === user?.id ? 'Cannot delete your own account' : 'Remove account'}>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={u.id === user?.id}
                          onClick={() => void dispatch(deleteUserThunk(u.id))}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && tenantUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No team accounts yet.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          {createdPassword ? 'Account created' : 'Add team account'}
        </DialogTitle>
        <DialogContent>
          {createdPassword ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Share this temporary password securely. The user must change it on first sign-in.
              </Typography>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 2,
                  fontFamily: 'monospace',
                  fontSize: '1.25rem',
                  textAlign: 'center',
                  letterSpacing: 2,
                }}
              >
                {createdPassword}
              </Box>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  required
                  fullWidth
                  label="First name"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Last name"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </Stack>
              <TextField
                required
                fullWidth
                type="email"
                label="Work email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <TextField
                select
                required
                fullWidth
                label="Role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                helperText={ROLE_DESCRIPTIONS[form.role]}
              >
                {roleOptions.map((r) => (
                  <MenuItem key={r} value={r}>
                    {getRoleLabel(r)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog}>{createdPassword ? 'Done' : 'Cancel'}</Button>
          {!createdPassword && (
            <LoadingButton variant="contained" loading={submitting} onClick={() => void handleCreate()}>
              Create account
            </LoadingButton>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
