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
import { updateTenantThunk } from '../../store/tenantsSlice';
import { PageHeader } from '../../components/PageHeader';
import type { Tenant } from '../../types';

export function EditOrganizationPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const tenants = useAppSelector((state) => state.tenants.items);

  const [form, setForm] = useState<Partial<Tenant>>({
    name: '',
    slug: '',
    plan: 'Professional',
    domain: '',
    infrastructureStrategy: 'shared',
    adminEmail: '',
    adminName: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tenant = tenants.find((t) => t.id === id);
    if (tenant) {
      setForm(tenant);
    } else {
      navigate('/system-admin/organizations');
    }
  }, [id, tenants, navigate]);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug && prev.slug !== generateSlug(prev.name || '') ? prev.slug : generateSlug(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug || !form.plan || !form.infrastructureStrategy) {
      setError('Please fill in all required fields');
      return;
    }

    if (!form.id) return;

    try {
      await dispatch(updateTenantThunk(form as Tenant)).unwrap();
      navigate('/system-admin/organizations');
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Failed to update tenant';
      setError(msg);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <PageHeader
        title="Edit Organization"
        subtitle={`Update details for ${form.name}`}
        showBack
        onBack={() => navigate('/system-admin/organizations')}
      />

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {error && <Alert severity="error">{error}</Alert>}
              
              <TextField
                required
                fullWidth
                label="Company Name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
              
              <TextField
                required
                fullWidth
                label="Tenant Slug (URL Identifier)"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                helperText={`Used for subdomains: ${form.slug || 'company'}.assetly.com`}
              />

              <TextField
                select
                required
                fullWidth
                label="Subscription Plan"
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
              >
                <MenuItem value="Starter">Starter</MenuItem>
                <MenuItem value="Professional">Professional</MenuItem>
                <MenuItem value="Enterprise">Enterprise</MenuItem>
              </TextField>

              <TextField
                fullWidth
                label="Email Domain (Optional)"
                value={form.domain || ''}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                helperText="e.g. company.com (Used for SSO routing)"
              />

              <TextField
                select
                required
                fullWidth
                label="Infrastructure Strategy"
                value={form.infrastructureStrategy}
                onChange={(e) => setForm({ ...form, infrastructureStrategy: e.target.value as 'shared' | 'dedicated' })}
              >
                <MenuItem value="shared">Shared (Multi-tenant Database)</MenuItem>
                <MenuItem value="dedicated">Dedicated (Isolated Database)</MenuItem>
              </TextField>

              <Box sx={{ pt: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Primary Admin contact details
                </Alert>
                
                <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
                  <TextField
                    fullWidth
                    label="Admin Name"
                    value={form.adminName || ''}
                    onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                  />
                  <TextField
                    fullWidth
                    label="Admin Email"
                    type="email"
                    value={form.adminEmail || ''}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  />
                </Stack>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                <Button onClick={() => navigate('/system-admin/organizations')} size="large">
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
