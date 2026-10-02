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
  Stack,
  alpha,
  useTheme,
  LinearProgress,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { PageHeader } from '../../../components/PageHeader';
import { useAuthUser } from '../../../hooks/storeHooks';

export function MyAttendancePage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const user = useAuthUser();

  const [clockedIn, setClockedIn] = useState(true);
  const [clockInTime, setClockInTime] = useState('09:12 AM');
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);

  const logs = [
    { date: 'Today (Oct 02, 2026)', inTime: '09:12 AM', outTime: '—', totalHours: '6h 45m', status: 'present', location: 'Headquarters - Floor 4' },
    { date: 'Yesterday (Oct 01, 2026)', inTime: '09:05 AM', outTime: '06:15 PM', totalHours: '8h 40m', status: 'present', location: 'Headquarters - Floor 4' },
    { date: 'Sep 30, 2026', inTime: '09:30 AM', outTime: '06:00 PM', totalHours: '8h 00m', status: 'wfh', location: 'Remote / Home' },
    { date: 'Sep 29, 2026', inTime: '09:00 AM', outTime: '05:45 PM', totalHours: '8h 15m', status: 'present', location: 'Headquarters - Floor 4' },
    { date: 'Sep 28, 2026', inTime: '09:15 AM', outTime: '06:30 PM', totalHours: '8h 45m', status: 'present', location: 'Headquarters - Floor 4' },
    { date: 'Sep 25, 2026', inTime: '—', outTime: '—', totalHours: '—', status: 'on_leave', location: 'Casual Leave (Approved)' },
  ];

  const handleTogglePunch = () => {
    if (clockedIn) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setClockOutTime(now);
      setClockedIn(false);
    } else {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setClockInTime(now);
      setClockOutTime(null);
      setClockedIn(true);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="My Attendance & Timesheet"
        subtitle={`Personal check-in records, working hours, and activity history for ${user?.firstName || 'Employee'}`}
      />

      {/* Clock In / Out Card */}
      <Grid container spacing={3} sx={{ mb: 4, mt: 1 }}>
        <Grid item xs={12} md={5}>
          <Card
            sx={{
              p: 3,
              borderRadius: '20px',
              border: `1px solid ${alpha('#10B981', 0.3)}`,
              background: isDark
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)'
                : 'linear-gradient(135deg, #F0FDF4 0%, #ECFEFF 100%)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="caption" fontWeight={700} color="#10B981" sx={{ letterSpacing: '0.04em' }}>
                  TODAY'S SHIFT (09:00 AM - 06:00 PM)
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                  {clockedIn ? 'Currently Clocked In' : 'Clocked Out'}
                </Typography>
              </Box>
              <Chip
                label={clockedIn ? 'ON DUTY' : 'OFF DUTY'}
                size="small"
                color={clockedIn ? 'success' : 'default'}
                sx={{ fontWeight: 800, borderRadius: '6px' }}
              />
            </Box>

            <Stack direction="row" spacing={3} sx={{ my: 2.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">PUNCH IN</Typography>
                <Typography variant="h6" fontWeight={700}>{clockInTime}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">PUNCH OUT</Typography>
                <Typography variant="h6" fontWeight={700}>{clockOutTime || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">DURATION</Typography>
                <Typography variant="h6" fontWeight={700} color="#10B981">6h 45m</Typography>
              </Box>
            </Stack>

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={clockedIn ? <StopIcon /> : <PlayArrowIcon />}
              onClick={handleTogglePunch}
              sx={{
                bgcolor: clockedIn ? '#EF4444' : '#10B981',
                '&:hover': { bgcolor: clockedIn ? '#DC2626' : '#059669' },
                borderRadius: '12px',
                fontWeight: 700,
                py: 1.25,
                textTransform: 'none',
              }}
            >
              {clockedIn ? 'Clock Out for Today' : 'Clock In Now'}
            </Button>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4', border: `1px solid ${alpha('#10B981', 0.25)}` }}>
                <Typography variant="caption" fontWeight={700} color="#10B981">MONTHLY ATTENDANCE</Typography>
                <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>96.5%</Typography>
                <Typography variant="caption" color="text.secondary">21 / 22 Working Days</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF', border: `1px solid ${alpha('#6366F1', 0.25)}` }}>
                <Typography variant="caption" fontWeight={700} color="#6366F1">AVG DAILY HOURS</Typography>
                <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>8.4h</Typography>
                <Typography variant="caption" color="text.secondary">+24m above standard</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(6, 182, 212, 0.08)' : '#ECFEFF', border: `1px solid ${alpha('#06B6D4', 0.25)}` }}>
                <Typography variant="caption" fontWeight={700} color="#06B6D4">WFH CONSUMED</Typography>
                <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>4 Days</Typography>
                <Typography variant="caption" color="text.secondary">2 days remaining</Typography>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Attendance History */}
      <Card sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={800}>Monthly Timesheet & Logs</Typography>
          <Chip label="Current Month: October 2026" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>In Time</TableCell>
                <TableCell>Out Time</TableCell>
                <TableCell>Effective Hours</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Working Mode / Location</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((row, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{row.date}</TableCell>
                  <TableCell>{row.inTime}</TableCell>
                  <TableCell>{row.outTime}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: row.totalHours !== '—' ? '#10B981' : undefined }}>{row.totalHours}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.status.toUpperCase()}
                      size="small"
                      color={row.status === 'present' ? 'success' : row.status === 'wfh' ? 'primary' : 'warning'}
                      sx={{ fontWeight: 700, fontSize: '0.65rem', borderRadius: '6px' }}
                    />
                  </TableCell>
                  <TableCell>{row.location}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
