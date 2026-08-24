import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Stack,
  Alert,
  Typography,
  CircularProgress,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/storeHooks';
import { createUser } from '../../store/usersSlice';
import { PageHeader } from '../../components/PageHeader';
import { assignableRolesFor, ROLE_LABELS } from '../../constants/roles';
import type { User, UserRole } from '../../types';

const ROLE_OPTIONS = assignableRolesFor('platform_admin').map((value) => ({
  value,
  label: ROLE_LABELS[value],
}));

export function CreateUserPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const tenants = useAppSelector((s) => s.tenants.items);

  const [form, setForm] = useState<Partial<User>>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'tenant_admin',
    tenantId: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.tenantId || !form.role) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const newUser = await dispatch(
        createUser({
          firstName: form.firstName,
          lastName: form.lastName || '',
          email: form.email,
          role: form.role,
          tenantId: form.tenantId,
        })
      ).unwrap();
      setCreatedUser(newUser);
    } catch (err) {
      setError('Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <PageHeader
        title="Provision New User"
        subtitle="Create a new user across any tenant environment"
        showBack
        onBack={() => navigate('/system-admin/users')}
      />

      <Card sx={{ mt: 3 }}>
        <CardContent>
          {createdUser ? (
            <Stack spacing={3} alignItems="center" py={4}>
              <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'success.light', color: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckIcon sx={{ fontSize: 32 }} />
              </Box>
              <Box textAlign="center">
                <Typography variant="h5" gutterBottom>User Created Successfully</Typography>
                <Typography color="text.secondary">
                  The temporary password for <strong>{createdUser.email}</strong> is:
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px dashed', borderColor: 'divider', minWidth: 300, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontFamily: 'monospace', letterSpacing: 2 }}>
                  {createdUser.generatedPassword}
                </Typography>
              </Box>
              <Alert severity="warning" sx={{ maxWidth: 400 }}>
                Please copy and share this password securely. The user will be required to change it upon their first login.
              </Alert>
              <Button variant="contained" size="large" onClick={() => navigate('/system-admin/users')}>
                Done
              </Button>
            </Stack>
          ) : (
            <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {error && <Alert severity="error">{error}</Alert>}
              
              <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
                <TextField
                  required
                  fullWidth
                  label="First Name"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
                
                <TextField
                  fullWidth
                  label="Last Name"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </Stack>

              <TextField
                required
                fullWidth
                label="Email Address"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />

              <TextField
                select
                required
                fullWidth
                label="Organization (Tenant)"
                value={form.tenantId}
                onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
              >
                <MenuItem value="system">System (Assetly Internal)</MenuItem>
                {tenants.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                required
                fullWidth
                label="Role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              >
                {ROLE_OPTIONS.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
                  </MenuItem>
                ))}
              </TextField>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                <Button onClick={() => navigate('/system-admin/users')} size="large">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  size="large"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  Create User
                </Button>
              </Box>
            </Stack>
          </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
