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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PolicyIcon from '@mui/icons-material/Policy';
import { PageHeader } from '../../../components/PageHeader';

interface LeaveTypeConfig {
  id: string;
  name: string;
  code: string;
  daysPerYear: number;
  carryForwardMax: number;
  paid: boolean;
  requiresProof: boolean;
  description: string;
}

const INITIAL_TYPES: LeaveTypeConfig[] = [
  { id: '1', name: 'Casual Leave (CL)', code: 'CL', daysPerYear: 12, carryForwardMax: 0, paid: true, requiresProof: false, description: 'Short unplanned time-off for personal commitments and emergencies.' },
  { id: '2', name: 'Sick Leave (SL)', code: 'SL', daysPerYear: 12, carryForwardMax: 6, paid: true, requiresProof: true, description: 'Medical recovery leave; doctor certificate required for > 2 consecutive days.' },
  { id: '3', name: 'Earned / Privilege Leave (EL)', code: 'EL', daysPerYear: 18, carryForwardMax: 30, paid: true, requiresProof: false, description: 'Accrued annual vacation quota, eligible for year-end carry forward & encashment.' },
  { id: '4', name: 'Maternity Leave', code: 'ML', daysPerYear: 180, carryForwardMax: 0, paid: true, requiresProof: true, description: 'Statutory maternal care leave for expectant and new mothers.' },
  { id: '5', name: 'Paternity Leave', code: 'PL', daysPerYear: 15, carryForwardMax: 0, paid: true, requiresProof: false, description: 'Paid support time-off for new fathers within 6 months of childbirth.' },
  { id: '6', name: 'Compensatory Off (Comp-Off)', code: 'COMP', daysPerYear: 10, carryForwardMax: 0, paid: true, requiresProof: false, description: 'Credited for weekend or holiday emergency deployment work.' },
];

export function LeaveTypesPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [types, setTypes] = useState<LeaveTypeConfig[]>(INITIAL_TYPES);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    daysPerYear: 12,
    carryForwardMax: 0,
    paid: true,
    requiresProof: false,
    description: '',
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) return;

    const newType: LeaveTypeConfig = {
      id: String(Date.now()),
      ...form,
    };

    setTypes([...types, newType]);
    setOpenModal(false);
    setForm({ name: '', code: '', daysPerYear: 12, carryForwardMax: 0, paid: true, requiresProof: false, description: '' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this leave policy rule?')) {
      setTypes(types.filter((t) => t.id !== id));
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Leave Types & Policy Configuration"
        subtitle="Define statutory leave categories, annual quotas, carry-forward limits, and encashment terms"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenModal(true)}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            Add Leave Type
          </Button>
        }
      />

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {types.map((t) => (
          <Grid item xs={12} md={6} lg={4} key={t.id}>
            <Card
              sx={{
                p: 3,
                height: '100%',
                borderRadius: '16px',
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)', borderColor: '#10B981' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                <Box>
                  <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.05rem' }}>{t.name}</Typography>
                  <Chip label={`CODE: ${t.code}`} size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', mt: 0.5 }} />
                </Box>
                <Tooltip title="Delete Type">
                  <IconButton size="small" onClick={() => handleDelete(t.id)} color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', lineHeight: 1.5, mb: 3 }}>
                {t.description}
              </Typography>

              <Stack spacing={1.5} sx={{ mt: 'auto', pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">Annual Quota:</Typography>
                  <Typography variant="caption" fontWeight={700} color="#10B981">{t.daysPerYear} Days / Year</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">Carry Forward Cap:</Typography>
                  <Typography variant="caption" fontWeight={700}>{t.carryForwardMax} Days Max</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">Type:</Typography>
                  <Chip label={t.paid ? 'PAID LEAVE' : 'UNPAID'} size="small" color={t.paid ? 'success' : 'default'} sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                </Box>
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreate}>
          <DialogTitle sx={{ fontWeight: 800 }}>Create Leave Type</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                required
                fullWidth
                label="Leave Name"
                placeholder="e.g. Bereavement Leave"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <TextField
                required
                fullWidth
                label="Short Code"
                placeholder="e.g. BL"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  type="number"
                  required
                  fullWidth
                  label="Days Allocated / Year"
                  value={form.daysPerYear}
                  onChange={(e) => setForm({ ...form, daysPerYear: parseInt(e.target.value, 10) || 0 })}
                />
                <TextField
                  type="number"
                  fullWidth
                  label="Carry Forward Max"
                  value={form.carryForwardMax}
                  onChange={(e) => setForm({ ...form, carryForwardMax: parseInt(e.target.value, 10) || 0 })}
                />
              </Stack>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Policy Guidelines & Eligibility"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}>
              Save Policy
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
