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
  Avatar,
  alpha,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { PageHeader } from '../../../components/PageHeader';
import { useAuthUser } from '../../../hooks/storeHooks';

interface WFHRequest {
  id: string;
  employeeName: string;
  department: string;
  date: string;
  reason: string;
  deliverables: string;
  status: 'approved' | 'pending' | 'rejected';
}

const INITIAL_WFH: WFHRequest[] = [
  { id: '1', employeeName: 'Sarah Chen', department: 'Engineering', date: '2026-10-06', reason: 'Focus sprint on complex microservice refactoring', deliverables: 'Complete PR #412 and unit test coverage', status: 'approved' },
  { id: '2', employeeName: 'Alex Thompson', department: 'Engineering', date: '2026-10-08', reason: 'Home broadband fiber maintenance', deliverables: 'Attend all standups and complete API reviews', status: 'pending' },
  { id: '3', employeeName: 'Jordan Smith', department: 'Human Resources', date: '2026-10-09', reason: 'Focus on confidential compensation benchmarking report', deliverables: 'Deliver draft Q4 salary scale report', status: 'pending' },
  { id: '4', employeeName: 'Priya Patel', department: 'Finance', date: '2026-10-02', reason: 'Tax filing review session with audit firm', deliverables: 'Reconcile ledger accounts for Q3', status: 'approved' },
];

export function WFHPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const user = useAuthUser();

  const [wfhList, setWfhList] = useState<WFHRequest[]>(INITIAL_WFH);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({ date: '', reason: '', deliverables: '' });

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date) return;

    const newReq: WFHRequest = {
      id: String(Date.now()),
      employeeName: `${user?.firstName || 'Employee'} ${user?.lastName || ''}`,
      department: 'Engineering',
      date: form.date,
      reason: form.reason || 'Remote working day',
      deliverables: form.deliverables || 'Daily core tasks',
      status: 'pending',
    };

    setWfhList([newReq, ...wfhList]);
    setOpenModal(false);
    setForm({ date: '', reason: '', deliverables: '' });
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Work From Home (WFH)"
        subtitle="Manage flexible remote working requests, deliverables, and team presence transparency"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenModal(true)}
            sx={{ bgcolor: '#6366F1', '&:hover': { bgcolor: '#4F46E5' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            Request WFH
          </Button>
        }
      />

      {/* Metrics */}
      <Grid container spacing={2.5} sx={{ mb: 4, mt: 1 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF', border: `1px solid ${alpha('#6366F1', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#6366F1">MONTHLY WFH ALLOWANCE</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>4 / 6 Days</Typography>
            <Typography variant="caption" color="text.secondary">2 remote days available this month</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4', border: `1px solid ${alpha('#10B981', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#10B981">TODAY REMOTE</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>6 Teammates</Typography>
            <Typography variant="caption" color="text.secondary">Connected & active via Slack</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB', border: `1px solid ${alpha('#F59E0B', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#F59E0B">PENDING APPROVALS</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
              {wfhList.filter((r) => r.status === 'pending').length}
            </Typography>
            <Typography variant="caption" color="text.secondary">Upcoming schedule requests</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Table */}
      <Card sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={800}>Remote Work Applications & Roster</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>WFH Date</TableCell>
                <TableCell>Key Deliverables Planned</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {wfhList.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 34, height: 34, bgcolor: '#6366F1', fontSize: '0.8rem', fontWeight: 700 }}>
                        {row.employeeName[0]}
                      </Avatar>
                      <Typography variant="body2" fontWeight={700}>{row.employeeName}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{row.department}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{row.date}</TableCell>
                  <TableCell>{row.deliverables}</TableCell>
                  <TableCell>{row.reason}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.status.toUpperCase()}
                      size="small"
                      color={row.status === 'approved' ? 'success' : row.status === 'pending' ? 'warning' : 'error'}
                      sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Dialog */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleApply}>
          <DialogTitle sx={{ fontWeight: 800 }}>Submit Work From Home Request</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                type="date"
                required
                fullWidth
                label="Requested Date"
                InputLabelProps={{ shrink: true }}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <TextField
                required
                fullWidth
                label="Primary Deliverables for the Day"
                placeholder="List specific milestones, commits, or tickets to be achieved..."
                value={form.deliverables}
                onChange={(e) => setForm({ ...form, deliverables: e.target.value })}
              />
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Reason / Notes"
                placeholder="e.g. Deep focus day on roadmap architecture..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#6366F1', '&:hover': { bgcolor: '#4F46E5' } }}>
              Submit Request
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
