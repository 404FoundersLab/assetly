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
  LinearProgress,
  alpha,
  useTheme,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { PageHeader } from '../../../components/PageHeader';

interface OffboardingEmployee {
  id: string;
  employeeName: string;
  department: string;
  jobTitle: string;
  resignationDate: string;
  lastWorkingDay: string;
  itClearance: boolean;
  financeClearance: boolean;
  hrClearance: boolean;
  status: 'In Clearance' | 'Pending IT Handover' | 'Exit Interview Due' | 'Settled & Relieved';
}

const INITIAL_OFFBOARDING: OffboardingEmployee[] = [
  { id: '1', employeeName: 'Robert Langdon', department: 'Engineering', jobTitle: 'Senior Backend Developer', resignationDate: '2026-09-15', lastWorkingDay: '2026-10-15', itClearance: false, financeClearance: true, hrClearance: true, status: 'Pending IT Handover' },
  { id: '2', employeeName: 'Natasha Romanoff', department: 'Operations', jobTitle: 'Operations Coordinator', resignationDate: '2026-09-20', lastWorkingDay: '2026-10-20', itClearance: false, financeClearance: false, hrClearance: true, status: 'In Clearance' },
  { id: '3', employeeName: 'Bruce Banner', department: 'Research & Labs', jobTitle: 'Principal Data Scientist', resignationDate: '2026-08-30', lastWorkingDay: '2026-09-30', itClearance: true, financeClearance: true, hrClearance: true, status: 'Settled & Relieved' },
];

export function OffboardingPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [list, setList] = useState<OffboardingEmployee[]>(INITIAL_OFFBOARDING);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({ employeeName: '', department: 'Engineering', jobTitle: '', lastWorkingDay: '' });

  const handleInitiate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeName || !form.lastWorkingDay) return;

    const newOff: OffboardingEmployee = {
      id: String(Date.now()),
      employeeName: form.employeeName,
      department: form.department,
      jobTitle: form.jobTitle || 'Team Member',
      resignationDate: new Date().toISOString().split('T')[0],
      lastWorkingDay: form.lastWorkingDay,
      itClearance: false,
      financeClearance: false,
      hrClearance: false,
      status: 'In Clearance',
    };

    setList([newOff, ...list]);
    setOpenModal(false);
    setForm({ employeeName: '', department: 'Engineering', jobTitle: '', lastWorkingDay: '' });
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Employee Offboarding & Exit Management"
        subtitle="Coordinate asset handback, departmental clearances, full & final payroll settlements, and exit interviews"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenModal(true)}
            sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            Initiate Exit
          </Button>
        }
      />

      {/* Metrics */}
      <Grid container spacing={2.5} sx={{ mb: 4, mt: 1 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2', border: `1px solid ${alpha('#EF4444', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#EF4444">ACTIVE CLEARANCES</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
              {list.filter((x) => x.status !== 'Settled & Relieved').length}
            </Typography>
            <Typography variant="caption" color="text.secondary">In progress this quarter</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB', border: `1px solid ${alpha('#F59E0B', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#F59E0B">PENDING ASSET HANDBACKS</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
              {list.filter((x) => !x.itClearance && x.status !== 'Settled & Relieved').length}
            </Typography>
            <Typography variant="caption" color="text.secondary">Hardware returns pending</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4', border: `1px solid ${alpha('#10B981', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#10B981">COMPLETED EXITS</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
              {list.filter((x) => x.status === 'Settled & Relieved').length}
            </Typography>
            <Typography variant="caption" color="text.secondary">F&F settlement closed</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Table */}
      <Card sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Exiting Employee</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Notice / Resignation Date</TableCell>
                <TableCell>Last Working Day (LWD)</TableCell>
                <TableCell>IT Clearance</TableCell>
                <TableCell>Finance Clearance</TableCell>
                <TableCell>Exit Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((emp) => (
                <TableRow key={emp.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 34, height: 34, bgcolor: '#EF4444', fontSize: '0.8rem', fontWeight: 700 }}>
                        {emp.employeeName[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{emp.employeeName}</Typography>
                        <Typography variant="caption" color="text.secondary">{emp.jobTitle}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{emp.department}</TableCell>
                  <TableCell>{emp.resignationDate}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#EF4444' }}>{emp.lastWorkingDay}</TableCell>
                  <TableCell>
                    <Chip
                      label={emp.itClearance ? 'CLEARED' : 'PENDING'}
                      size="small"
                      color={emp.itClearance ? 'success' : 'warning'}
                      sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={emp.financeClearance ? 'CLEARED' : 'PENDING'}
                      size="small"
                      color={emp.financeClearance ? 'success' : 'warning'}
                      sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={emp.status}
                      size="small"
                      color={emp.status === 'Settled & Relieved' ? 'success' : 'default'}
                      variant="outlined"
                      sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleInitiate}>
          <DialogTitle sx={{ fontWeight: 800 }}>Initiate Offboarding</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                required
                fullWidth
                label="Employee Name"
                value={form.employeeName}
                onChange={(e) => setForm({ ...form, employeeName: e.target.value })}
              />
              <TextField
                select
                required
                fullWidth
                label="Department"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                <MenuItem value="Engineering">Engineering</MenuItem>
                <MenuItem value="Human Resources">Human Resources</MenuItem>
                <MenuItem value="Finance">Finance</MenuItem>
                <MenuItem value="IT Operations">IT Operations</MenuItem>
                <MenuItem value="Operations">Operations</MenuItem>
              </TextField>
              <TextField
                fullWidth
                label="Job Designation"
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
              />
              <TextField
                type="date"
                required
                fullWidth
                label="Last Working Day (LWD)"
                InputLabelProps={{ shrink: true }}
                value={form.lastWorkingDay}
                onChange={(e) => setForm({ ...form, lastWorkingDay: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' } }}>
              Confirm Resignation & Start Clearance
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
