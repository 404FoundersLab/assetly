import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Stack,
  Alert,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/storeHooks';
import { updateUserThunk } from '../../store/usersSlice';
import { PageHeader } from '../../components/PageHeader';
import { assignableRolesFor, ROLE_LABELS } from '../../constants/roles';
import type { User, UserRole } from '../../types';

const ROLE_OPTIONS = assignableRolesFor('platform_admin').map((value) => ({
  value,
  label: ROLE_LABELS[value],
}));

export function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const users = useAppSelector((s) => s.users.items);
  const tenants = useAppSelector((s) => s.tenants.items);

  const [form, setForm] = useState<Partial<User>>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'tenant_admin',
    tenantId: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = users.find((u) => u.id === id);
    if (user) {
      setForm(user);
    } else {
      navigate('/system-admin/users');
    }
  }, [id, users, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.tenantId || !form.role) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (!form.id) return;

    try {
      await dispatch(
        updateUserThunk({
          ...(form as User),
          firstName: form.firstName,
          lastName: form.lastName || '',
          email: form.email,
          role: form.role,
          tenantId: form.tenantId,
        })
      ).unwrap();
      navigate('/system-admin/users');
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Failed to update user';
      setError(msg);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <PageHeader
        title="Edit User"
        subtitle={`Update details for ${form.firstName} ${form.lastName || ''}`}
        showBack
        onBack={() => navigate('/system-admin/users')}
      />

      <Card sx={{ mt: 3 }}>
        <CardContent>
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
                  value={form.lastName || ''}
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
                value={form.tenantId || ''}
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
                value={form.role || ''}
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
                <Button type="submit" variant="contained" size="large">
                  Save Changes
                </Button>
              </Box>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
