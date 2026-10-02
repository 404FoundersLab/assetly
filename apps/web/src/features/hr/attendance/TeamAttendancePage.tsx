import { useState, useMemo } from 'react';
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
  IconButton,
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
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupsIcon from '@mui/icons-material/Groups';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import { PageHeader } from '../../../components/PageHeader';
import { useAppSelector } from '../../../hooks/storeHooks';

export function TeamAttendancePage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const employees = useAppSelector((s) => s.employees.items);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [overrideStatus, setOverrideStatus] = useState('present');

  const teamRoster = useMemo(() => {
    return employees.map((emp, index) => {
      const statuses = ['present', 'present', 'wfh', 'present', 'on_leave', 'half_day'];
      const status = statuses[index % statuses.length];
      const inTimes = ['09:02 AM', '09:15 AM', '09:30 AM', '08:55 AM', '—', '01:00 PM'];
      const inTime = inTimes[index % inTimes.length];
      const hours = status === 'present' ? '8h 15m' : status === 'wfh' ? '8h 00m' : status === 'half_day' ? '4h 00m' : '—';

      return {
        ...emp,
        status,
        inTime,
        hours,
        shift: 'General (9:00 AM - 6:00 PM)',
      };
    });
  }, [employees]);

  const filtered = useMemo(() => {
    return teamRoster.filter((r) => {
      const matchSearch = `${r.firstName} ${r.lastName}`.toLowerCase().includes(search.toLowerCase()) || r.jobTitle.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [teamRoster, search, filterStatus]);

  const summary = useMemo(() => {
    return {
      present: teamRoster.filter((r) => r.status === 'present').length,
      wfh: teamRoster.filter((r) => r.status === 'wfh').length,
      onLeave: teamRoster.filter((r) => r.status === 'on_leave').length,
      halfDay: teamRoster.filter((r) => r.status === 'half_day').length,
    };
  }, [teamRoster]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Team Attendance & Live Roster"
        subtitle="Real-time daily presence, remote check-ins, and team timesheet verifications"
      />

      {/* Summary Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4, mt: 1 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4', border: `1px solid ${alpha('#10B981', 0.25)}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <CheckCircleIcon sx={{ fontSize: 18, color: '#10B981' }} />
              <Typography variant="caption" fontWeight={700} color="#10B981">IN OFFICE</Typography>
            </Box>
            <Typography variant="h4" fontWeight={800}>{summary.present}</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF', border: `1px solid ${alpha('#6366F1', 0.25)}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <HomeWorkIcon sx={{ fontSize: 18, color: '#6366F1' }} />
              <Typography variant="caption" fontWeight={700} color="#6366F1">REMOTE (WFH)</Typography>
            </Box>
            <Typography variant="h4" fontWeight={800}>{summary.wfh}</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2', border: `1px solid ${alpha('#EF4444', 0.25)}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <PersonOffIcon sx={{ fontSize: 18, color: '#EF4444' }} />
              <Typography variant="caption" fontWeight={700} color="#EF4444">ON LEAVE</Typography>
            </Box>
            <Typography variant="h4" fontWeight={800}>{summary.onLeave}</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB', border: `1px solid ${alpha('#F59E0B', 0.25)}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <AccessTimeIcon sx={{ fontSize: 18, color: '#F59E0B' }} />
              <Typography variant="caption" fontWeight={700} color="#F59E0B">HALF DAY</Typography>
            </Box>
            <Typography variant="h4" fontWeight={800}>{summary.halfDay}</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Row */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search team member or designation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: { sm: 380 } }}
        />
        <TextField
          select
          size="small"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">All Presence Status</MenuItem>
          <MenuItem value="present">In Office</MenuItem>
          <MenuItem value="wfh">Remote / WFH</MenuItem>
          <MenuItem value="on_leave">On Leave</MenuItem>
          <MenuItem value="half_day">Half Day</MenuItem>
        </TextField>
      </Stack>

      {/* Roster Table */}
      <Card sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Team Member</TableCell>
                <TableCell>Job Title</TableCell>
                <TableCell>Check-In Timestamp</TableCell>
                <TableCell>Logged Hours</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((emp) => (
                <TableRow key={emp.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 34, height: 34, bgcolor: '#10B981', fontSize: '0.8rem', fontWeight: 700 }}>
                        {emp.firstName[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {emp.firstName} {emp.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {emp.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{emp.jobTitle}</TableCell>
                  <TableCell>{emp.inTime}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{emp.hours}</TableCell>
                  <TableCell>
                    <Chip
                      label={emp.status === 'present' ? 'In Office' : emp.status === 'wfh' ? 'WFH' : emp.status === 'on_leave' ? 'On Leave' : 'Half Day'}
                      size="small"
                      color={emp.status === 'present' ? 'success' : emp.status === 'wfh' ? 'primary' : emp.status === 'on_leave' ? 'error' : 'warning'}
                      sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Override Status">
                      <IconButton size="small" onClick={() => setSelectedEmp(emp)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Override Dialog */}
      <Dialog open={Boolean(selectedEmp)} onClose={() => setSelectedEmp(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Adjust Attendance Status</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Updating attendance for <strong>{selectedEmp?.firstName} {selectedEmp?.lastName}</strong>
            </Typography>
            <TextField
              select
              fullWidth
              label="Status"
              value={overrideStatus}
              onChange={(e) => setOverrideStatus(e.target.value)}
            >
              <MenuItem value="present">Present (In Office)</MenuItem>
              <MenuItem value="wfh">Work From Home (Remote)</MenuItem>
              <MenuItem value="half_day">Half Day</MenuItem>
              <MenuItem value="on_leave">On Leave</MenuItem>
              <MenuItem value="absent">Absent</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedEmp(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => setSelectedEmp(null)} sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}>
            Confirm Override
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
