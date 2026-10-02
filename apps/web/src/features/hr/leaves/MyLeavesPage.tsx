import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { PageHeader } from '../../../components/PageHeader';
import { useAuthUser } from '../../../hooks/storeHooks';

export function MyLeavesPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const user = useAuthUser();

  const [openModal, setOpenModal] = useState(false);
  const [leaves, setLeaves] = useState([
    { id: '1', type: 'Casual Leave', startDate: '2026-10-12', endDate: '2026-10-14', days: 3, status: 'approved', reason: 'Family engagement', appliedOn: '2026-10-01' },
    { id: '2', type: 'Sick Leave', startDate: '2026-09-18', endDate: '2026-09-18', days: 1, status: 'approved', reason: 'Dental appointment', appliedOn: '2026-09-17' },
    { id: '3', type: 'Earned Leave', startDate: '2026-11-20', endDate: '2026-11-27', days: 6, status: 'pending', reason: 'Annual vacation trip', appliedOn: '2026-10-02' },
  ]);

  const [form, setForm] = useState({
    type: 'Casual Leave',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) return;

    const newReq = {
      id: String(Date.now()),
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      days: 2,
      status: 'pending',
      reason: form.reason || 'Personal leave',
      appliedOn: new Date().toISOString().split('T')[0],
    };

    setLeaves([newReq, ...leaves]);
    setOpenModal(false);
    setForm({ type: 'Casual Leave', startDate: '', endDate: '', reason: '' });
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="My Leaves & Applications"
        subtitle={`Track your active leave balances and submit time-off requests for ${user?.firstName || 'Employee'}`}
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenModal(true)}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            Apply for Leave
          </Button>
        }
      />

      {/* Leave Balance Overview */}
      <Grid container spacing={2.5} sx={{ mb: 4, mt: 1 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4', border: `1px solid ${alpha('#10B981', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#10B981">CASUAL LEAVE</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>8 / 12</Typography>
            <Typography variant="caption" color="text.secondary">4 days utilized this year</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF', border: `1px solid ${alpha('#6366F1', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#6366F1">SICK LEAVE</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>10 / 12</Typography>
            <Typography variant="caption" color="text.secondary">2 days utilized</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB', border: `1px solid ${alpha('#F59E0B', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#F59E0B">EARNED / PRIVILEGE</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>15 / 18</Typography>
            <Typography variant="caption" color="text.secondary">Carry forward eligible</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(6, 182, 212, 0.08)' : '#ECFEFF', border: `1px solid ${alpha('#06B6D4', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#06B6D4">OPTIONAL HOLIDAYS</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>2 / 2</Typography>
            <Typography variant="caption" color="text.secondary">Festive quotas</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Leave Application History */}
      <Card sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={800}>Leave History & Pending Approvals</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Leave Type</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Applied On</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaves.map((l) => (
                <TableRow key={l.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{l.type}</TableCell>
                  <TableCell>{l.startDate}</TableCell>
                  <TableCell>{l.endDate}</TableCell>
                  <TableCell>{l.days} Day(s)</TableCell>
                  <TableCell>{l.reason}</TableCell>
                  <TableCell>{l.appliedOn}</TableCell>
                  <TableCell>
                    <Chip
                      label={l.status.toUpperCase()}
                      size="small"
                      color={l.status === 'approved' ? 'success' : l.status === 'pending' ? 'warning' : 'error'}
                      sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Apply Dialog */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleApply}>
          <DialogTitle sx={{ fontWeight: 800 }}>Apply for Leave</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                select
                required
                fullWidth
                label="Leave Type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <MenuItem value="Casual Leave">Casual Leave (Balance: 8)</MenuItem>
                <MenuItem value="Sick Leave">Sick Leave (Balance: 10)</MenuItem>
                <MenuItem value="Earned Leave">Earned Leave (Balance: 15)</MenuItem>
                <MenuItem value="Compensatory Off">Compensatory Off (Balance: 2)</MenuItem>
                <MenuItem value="Unpaid Leave">Loss of Pay / Unpaid</MenuItem>
              </TextField>
              <Stack direction="row" spacing={2}>
                <TextField
                  type="date"
                  required
                  fullWidth
                  label="Start Date"
                  InputLabelProps={{ shrink: true }}
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
                <TextField
                  type="date"
                  required
                  fullWidth
                  label="End Date"
                  InputLabelProps={{ shrink: true }}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </Stack>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason / Notes for Manager"
                placeholder="Explain the context of your leave request..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}>
              Submit Application
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
