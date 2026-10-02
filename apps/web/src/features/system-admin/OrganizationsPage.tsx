import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BusinessIcon from '@mui/icons-material/Business';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useAppSelector, useAppDispatch } from '../../hooks/storeHooks';
import { fetchTenants, deleteTenantThunk } from '../../store/tenantsSlice';
import { PageHeader } from '../../components/PageHeader';
import { ResetTenantPasswordDialog } from './ResetTenantPasswordDialog';
import { DEFAULT_ENABLED_MODULES, SYSTEM_MODULES } from '../../constants/modules';
import type { Tenant } from '../../types';

export function OrganizationsPage() {
  const tenants = useAppSelector((state) => state.tenants.items);
  const loading = useAppSelector((state) => state.tenants.loading);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [selectedTenantForReset, setSelectedTenantForReset] = useState<Tenant | null>(null);

  useEffect(() => {
    dispatch(fetchTenants());
  }, [dispatch]);

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', p: 3 }}>
      <PageHeader
        title="Organizations (Tenants)"
        subtitle="Manage client accounts and tenant provisioning"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/system-admin/organizations/new')}
          >
            New Organization
          </Button>
        }
      />

      <Card sx={{ mt: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Organization</TableCell>
                <TableCell>Domain</TableCell>
                <TableCell>Infrastructure</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Enabled Modules</TableCell>
                <TableCell>Primary Admin</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tenants.map((tenant) => {
                const enabledList = tenant.enabledModules ?? DEFAULT_ENABLED_MODULES;
                return (
                  <TableRow key={tenant.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <BusinessIcon color="action" />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {tenant.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {tenant.id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{tenant.domain || '—'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={tenant.infrastructureStrategy === 'dedicated' ? 'Dedicated' : 'Shared'} 
                        color={tenant.infrastructureStrategy === 'dedicated' ? 'secondary' : 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{tenant.plan}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 220 }}>
                        {SYSTEM_MODULES.map((m) => {
                          const isEnabled = enabledList.includes(m.id);
                          if (!isEnabled) return null;
                          return (
                            <Chip
                              key={m.id}
                              label={m.badge}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                bgcolor: `${m.color}1A`,
                                color: m.color,
                                border: `1px solid ${m.color}40`,
                                borderRadius: '4px',
                              }}
                            />
                          );
                        })}
                        {enabledList.length === 0 && (
                          <Typography variant="caption" color="error.main" fontWeight={600}>
                            No modules
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{tenant.adminName || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tenant.adminEmail || '—'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Reset Admin Password">
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() => setSelectedTenantForReset(tenant)}
                        >
                          <LockResetIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/system-admin/organizations/${tenant.id}/edit`)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${tenant.name}?`)) {
                              dispatch(deleteTenantThunk(tenant.id));
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {tenants.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    No organizations provisioned yet.
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    Loading organizations...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <ResetTenantPasswordDialog
        open={Boolean(selectedTenantForReset)}
        onClose={() => setSelectedTenantForReset(null)}
        tenant={selectedTenantForReset}
      />
    </Box>
  );
}
