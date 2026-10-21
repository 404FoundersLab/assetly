import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  alpha,
  useTheme,
  Tooltip,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PolicyIcon from '@mui/icons-material/Policy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { PageHeader } from '../../../components/PageHeader';
import { useAppDispatch, useAppSelector, useAuthUser } from '../../../hooks/storeHooks';
import {
  addLeaveType,
  deleteLeaveType,
  initialLeaveTypes,
  type LeaveTypeConfig,
} from '../../../store/hrSlice';

export function LeaveTypesPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dispatch = useAppDispatch();
  const user = useAuthUser();

  const rawTypes = useAppSelector((s) => s.hr?.leaveTypes);
  const types = rawTypes && rawTypes.length > 0 ? rawTypes : initialLeaveTypes;
  const [openModal, setOpenModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    daysPerYear: 12,
    carryForwardMax: 0,
    paid: true,
    requiresProof: false,
    description: '',
  });

  const isHrAdmin =
    user?.role === 'tenant_admin' ||
    user?.role === 'hr_admin' ||
    user?.role === 'platform_admin';

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) return;

    const newType: LeaveTypeConfig = {
      id: `lt-${Date.now()}`,
      ...form,
    };

    dispatch(addLeaveType(newType));
    setSuccessMsg(`Leave policy "${newType.name}" configured and active across organization.`);
    setOpenModal(false);
    setForm({
      name: '',
      code: '',
      daysPerYear: 12,
      carryForwardMax: 0,
      paid: true,
      requiresProof: false,
      description: '',
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete the "${name}" leave policy rule?`)) {
      dispatch(deleteLeaveType(id));
      setSuccessMsg(`Leave policy "${name}" deleted.`);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Leave Types & Policy Configuration"
        subtitle="Define statutory leave categories, annual quotas, carry-forward limits, and encashment terms"
        actions={
          isHrAdmin ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenModal(true)}
              sx={{
                bgcolor: '#10B981',
                '&:hover': { bgcolor: '#059669' },
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              Add Leave Type
            </Button>
          ) : undefined
        }
      />

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {types.map((type) => (
          <Grid item xs={12} sm={6} md={4} key={type.id}>
            <Card
              sx={{
                p: 3,
                borderRadius: '16px',
                border: `1px solid ${theme.palette.divider}`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        p: 1.25,
                        borderRadius: '12px',
                        bgcolor: alpha('#10B981', isDark ? 0.2 : 0.1),
                        color: '#10B981',
                      }}
                    >
                      <PolicyIcon sx={{ fontSize: 22 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={800}>
                        {type.name}
                      </Typography>
                      <Chip
                        label={type.code}
                        size="small"
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, mt: 0.25 }}
                      />
                    </Box>
                  </Box>

                  {isHrAdmin && (
                    <IconButton size="small" color="error" onClick={() => handleDelete(type.id, type.name)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ minHeight: 44, mb: 2, fontSize: '0.85rem' }}>
                  {type.description}
                </Typography>
              </Box>

              <Box sx={{ pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      Annual Allowance:
                    </Typography>
                    <Typography variant="caption" fontWeight={700}>
                      {type.daysPerYear} days / year
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      Carry-Forward Max:
                    </Typography>
                    <Typography variant="caption" fontWeight={700}>
                      {type.carryForwardMax} days
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      Paid Leave:
                    </Typography>
                    <Chip
                      label={type.paid ? 'Fully Paid' : 'Unpaid'}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        bgcolor: type.paid ? alpha('#10B981', 0.15) : alpha('#EF4444', 0.15),
                        color: type.paid ? '#10B981' : '#EF4444',
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      Proof / Medical Certificate:
                    </Typography>
                    <Typography variant="caption" fontWeight={700}>
                      {type.requiresProof ? 'Required (>2 days)' : 'Not Required'}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add Leave Type Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Leave Policy Rule</DialogTitle>
        <DialogContent dividers>
          <Box component="form" onSubmit={handleCreate} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField
              label="Policy Name"
              size="small"
              placeholder="e.g. Sabbatical Leave"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
              required
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Short Code"
                  size="small"
                  placeholder="e.g. SAB"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Annual Quota (Days)"
                  type="number"
                  size="small"
                  value={form.daysPerYear}
                  onChange={(e) => setForm({ ...form, daysPerYear: Number(e.target.value) })}
                  fullWidth
                  required
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Carry-Forward Max"
                  type="number"
                  size="small"
                  value={form.carryForwardMax}
                  onChange={(e) => setForm({ ...form, carryForwardMax: Number(e.target.value) })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  label="Paid / Unpaid"
                  size="small"
                  value={form.paid ? 'paid' : 'unpaid'}
                  onChange={(e) => setForm({ ...form, paid: e.target.value === 'paid' })}
                  fullWidth
                >
                  <MenuItem value="paid">Fully Paid</MenuItem>
                  <MenuItem value="unpaid">Unpaid / LOP</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            <TextField
              select
              label="Proof / Medical Certificate Required"
              size="small"
              value={form.requiresProof ? 'yes' : 'no'}
              onChange={(e) => setForm({ ...form, requiresProof: e.target.value === 'yes' })}
              fullWidth
            >
              <MenuItem value="no">No proof required</MenuItem>
              <MenuItem value="yes">Doctor / proof note required for &gt; 2 days</MenuItem>
            </TextField>

            <TextField
              label="Policy Description & Guidance"
              size="small"
              multiline
              rows={3}
              placeholder="Explain qualifying conditions, advance notice rules, and terms..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenModal(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            Create Policy
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
