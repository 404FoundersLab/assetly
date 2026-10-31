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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tooltip,
  Alert,
  Divider,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import BusinessIcon from '@mui/icons-material/Business';
import MoreTimeIcon from '@mui/icons-material/MoreTime';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import { useAppDispatch, useAppSelector, useAuthUser } from '../../hooks/storeHooks';
import { markAttendance, AttendanceRecord, AttendanceStatus } from '../../store/attendanceSlice';
import { DEMO_EMPLOYEES } from '../../data/demoData';

interface FormattedLog {
  id: string;
  date: string;
  inTime: string;
  outTime: string;
  effectiveHours: string;
  status: AttendanceStatus;
  location: string;
}

export function EmployeeAttendanceTab() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dispatch = useAppDispatch();
  const user = useAuthUser();

  const employees = useAppSelector((s) => s.employees.items);
  const records = useAppSelector((s) => s.attendance.records);

  // Identify current employee profile
  const currentEmployee = useMemo(() => {
    const list = employees.length > 0 ? employees : DEMO_EMPLOYEES;
    if (user?.employeeId) {
      const match = list.find((e) => e.id === user.employeeId);
      if (match) return match;
    }
    return (
      list.find((e) => e.email?.toLowerCase() === user?.email?.toLowerCase()) ||
      list[0]
    );
  }, [employees, user]);

  const currentEmployeeId = currentEmployee?.id || '44444444-4444-4444-4444-444444444401';

  // Work Mode Selection
  const [workMode, setWorkMode] = useState<'office' | 'wfh' | 'client'>('office');
  const [workLocationNote, setWorkLocationNote] = useState('Headquarters - Floor 4');

  // Dialog for Missed Punch / Regularization
  const [regularizeOpen, setRegularizeOpen] = useState(false);
  const [regDate, setRegDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [regCheckIn, setRegCheckIn] = useState('09:00');
  const [regCheckOut, setRegCheckOut] = useState('18:00');
  const [regMode, setRegMode] = useState<'present' | 'wfh'>('present');
  const [regReason, setRegReason] = useState('');
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's record for this employee
  const todayRecord = useMemo(() => {
    return records.find((r) => r.employeeId === currentEmployeeId && r.date === todayStr);
  }, [records, currentEmployeeId, todayStr]);

  const isClockedIn = Boolean(todayRecord?.checkIn && !todayRecord?.checkOut);
  const isShiftCompleted = Boolean(todayRecord?.checkIn && todayRecord?.checkOut);

  // Toggle Punch (Clock In / Clock Out)
  const handleTogglePunch = () => {
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const time24 = now.toTimeString().slice(0, 5);

    if (isClockedIn && todayRecord) {
      // Clock Out
      const inTimeStr = todayRecord.checkIn || '09:00';
      const [inH, inM] = inTimeStr.includes(':') ? inTimeStr.split(':').map(Number) : [9, 0];
      const [outH, outM] = time24.split(':').map(Number);
      const diffMins = Math.max(0, (outH * 60 + outM) - (inH * 60 + inM));
      const hoursWorked = Math.round((diffMins / 60) * 100) / 100;
      const overtime = Math.max(0, Math.round((hoursWorked - 9) * 100) / 100);

      dispatch(
        markAttendance({
          ...todayRecord,
          checkOut: timeFormatted,
          hoursWorked,
          overtime,
        })
      );
      setBannerNotice(`Successfully clocked out at ${timeFormatted}. Total duration recorded.`);
    } else {
      // Clock In
      const location =
        workMode === 'wfh'
          ? 'Remote / Home'
          : workMode === 'client'
          ? 'Client Location'
          : workLocationNote || 'Headquarters - Floor 4';

      dispatch(
        markAttendance({
          id: todayRecord?.id || `att-portal-${Date.now()}`,
          employeeId: currentEmployeeId,
          date: todayStr,
          checkIn: timeFormatted,
          checkOut: null,
          hoursWorked: 0,
          overtime: 0,
          status: workMode === 'wfh' ? 'wfh' : 'present',
          notes: location,
        })
      );
      setBannerNotice(`Successfully clocked in at ${timeFormatted} (${location}). Shift is now active.`);
    }
  };

  // Submit regularization request
  const handleSubmitRegularization = () => {
    if (!regDate || !regCheckIn || !regCheckOut) return;

    const [inH, inM] = regCheckIn.split(':').map(Number);
    const [outH, outM] = regCheckOut.split(':').map(Number);
    const diffMins = Math.max(0, (outH * 60 + outM) - (inH * 60 + inM));
    const hours = Math.round((diffMins / 60) * 100) / 100;

    dispatch(
      markAttendance({
        id: `att-reg-${Date.now()}`,
        employeeId: currentEmployeeId,
        date: regDate,
        checkIn: regCheckIn,
        checkOut: regCheckOut,
        hoursWorked: hours,
        overtime: Math.max(0, Math.round((hours - 9) * 100) / 100),
        status: regMode,
        notes: regReason ? `Regularized: ${regReason}` : 'Regularized missed punch',
      })
    );

    setRegularizeOpen(false);
    setBannerNotice(`Attendance entry for ${regDate} regularized successfully.`);
    setRegReason('');
  };

  // Build full log rows (combining today's record with history)
  const employeeLogs: FormattedLog[] = useMemo(() => {
    const list: FormattedLog[] = [];

    // Add today's record if present
    if (todayRecord) {
      list.push({
        id: todayRecord.id,
        date: `Today (${new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })})`,
        inTime: todayRecord.checkIn || '—',
        outTime: todayRecord.checkOut || '—',
        effectiveHours:
          todayRecord.hoursWorked > 0
            ? `${Math.floor(todayRecord.hoursWorked)}h ${Math.round((todayRecord.hoursWorked % 1) * 60)}m`
            : isClockedIn
            ? 'In Progress'
            : '—',
        status: todayRecord.status,
        location: todayRecord.notes || (todayRecord.status === 'wfh' ? 'Remote / Home' : 'Headquarters - Floor 4'),
      });
    }

    // Curated realistic logs matching typical monthly timesheet
    const sampleHistory: FormattedLog[] = [
      { id: 'h-1', date: 'Yesterday', inTime: '09:05 AM', outTime: '06:15 PM', effectiveHours: '8h 40m', status: 'present', location: 'Headquarters - Floor 4' },
      { id: 'h-2', date: 'Oct 29, 2026', inTime: '09:12 AM', outTime: '06:10 PM', effectiveHours: '8h 28m', status: 'present', location: 'Headquarters - Floor 4' },
      { id: 'h-3', date: 'Oct 28, 2026', inTime: '09:30 AM', outTime: '06:00 PM', effectiveHours: '8h 00m', status: 'wfh', location: 'Remote / Home' },
      { id: 'h-4', date: 'Oct 27, 2026', inTime: '09:00 AM', outTime: '05:45 PM', effectiveHours: '8h 15m', status: 'present', location: 'Headquarters - Floor 4' },
      { id: 'h-5', date: 'Oct 26, 2026', inTime: '09:15 AM', outTime: '06:30 PM', effectiveHours: '8h 45m', status: 'present', location: 'Headquarters - Floor 4' },
      { id: 'h-6', date: 'Oct 23, 2026', inTime: '—', outTime: '—', effectiveHours: '—', status: 'on_leave', location: 'Casual Leave (Approved)' },
      { id: 'h-7', date: 'Oct 22, 2026', inTime: '09:08 AM', outTime: '06:20 PM', effectiveHours: '8h 32m', status: 'present', location: 'Headquarters - Floor 4' },
      { id: 'h-8', date: 'Oct 21, 2026', inTime: '09:20 AM', outTime: '06:00 PM', effectiveHours: '8h 10m', status: 'wfh', location: 'Remote / Home' },
    ];

    // Combine any other historical records from Redux
    const otherRedux = records
      .filter((r) => r.employeeId === currentEmployeeId && r.date !== todayStr)
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        date: r.date,
        inTime: r.checkIn || '09:00 AM',
        outTime: r.checkOut || '06:00 PM',
        effectiveHours: `${Math.floor(r.hoursWorked || 8)}h ${Math.round(((r.hoursWorked || 8) % 1) * 60)}m`,
        status: r.status,
        location: r.notes || (r.status === 'wfh' ? 'Remote / Home' : 'Headquarters - Floor 4'),
      }));

    return [...list, ...otherRedux, ...sampleHistory];
  }, [todayRecord, isClockedIn, records, currentEmployeeId, todayStr]);

  return (
    <Box>
      {bannerNotice && (
        <Alert
          severity="success"
          onClose={() => setBannerNotice(null)}
          sx={{ mb: 3, borderRadius: '12px' }}
        >
          {bannerNotice}
        </Alert>
      )}

      {/* Header Info */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
            My Attendance & Timesheet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Personal check-in records, shift logging, and working hours for {currentEmployee?.firstName || 'Employee'}{' '}
            {currentEmployee?.lastName || ''}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<EditCalendarIcon />}
          onClick={() => setRegularizeOpen(true)}
          sx={{ borderRadius: '10px', fontWeight: 600, textTransform: 'none' }}
        >
          Regularize Missed Punch
        </Button>
      </Box>

      {/* Clock In / Out Card & Quick Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={5}>
          <Card
            sx={{
              p: 3,
              borderRadius: '20px',
              border: `1px solid ${alpha(isClockedIn ? '#10B981' : theme.palette.divider, 0.4)}`,
              background: isDark
                ? isClockedIn
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(6, 182, 212, 0.08) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)'
                : isClockedIn
                ? 'linear-gradient(135deg, #F0FDF4 0%, #ECFEFF 100%)'
                : '#FFFFFF',
              boxShadow: isClockedIn ? '0 10px 25px -5px rgba(16, 185, 129, 0.15)' : undefined,
              transition: 'all 0.3s ease',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="caption" fontWeight={700} color={isClockedIn ? '#10B981' : 'text.secondary'} sx={{ letterSpacing: '0.04em' }}>
                  TODAY'S SHIFT (09:00 AM - 06:00 PM)
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                  {isClockedIn ? 'Currently Clocked In' : isShiftCompleted ? 'Shift Completed' : 'Not Clocked In'}
                </Typography>
              </Box>
              <Chip
                label={isClockedIn ? 'ON DUTY' : isShiftCompleted ? 'OFF DUTY' : 'PENDING'}
                size="small"
                color={isClockedIn ? 'success' : isShiftCompleted ? 'default' : 'warning'}
                sx={{ fontWeight: 800, borderRadius: '6px', fontSize: '0.7rem' }}
              />
            </Box>

            {/* Mode selection if not clocked in */}
            {!isClockedIn && !isShiftCompleted && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, fontWeight: 600 }}>
                  Select Working Mode:
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip
                    icon={<BusinessIcon sx={{ fontSize: '1rem !important' }} />}
                    label="Office"
                    clickable
                    color={workMode === 'office' ? 'primary' : 'default'}
                    variant={workMode === 'office' ? 'filled' : 'outlined'}
                    onClick={() => {
                      setWorkMode('office');
                      setWorkLocationNote('Headquarters - Floor 4');
                    }}
                    sx={{ fontWeight: 600, borderRadius: '8px' }}
                  />
                  <Chip
                    icon={<HomeWorkIcon sx={{ fontSize: '1rem !important' }} />}
                    label="Work From Home"
                    clickable
                    color={workMode === 'wfh' ? 'primary' : 'default'}
                    variant={workMode === 'wfh' ? 'filled' : 'outlined'}
                    onClick={() => {
                      setWorkMode('wfh');
                      setWorkLocationNote('Remote / Home');
                    }}
                    sx={{ fontWeight: 600, borderRadius: '8px' }}
                  />
                </Stack>
              </Box>
            )}

            <Stack direction="row" spacing={3} sx={{ my: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  PUNCH IN
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {todayRecord?.checkIn || '—'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  PUNCH OUT
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {todayRecord?.checkOut || '—'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  DURATION
                </Typography>
                <Typography variant="h6" fontWeight={700} color="#10B981">
                  {todayRecord?.hoursWorked ? `${todayRecord.hoursWorked}h` : isClockedIn ? 'Active' : '—'}
                </Typography>
              </Box>
            </Stack>

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={isClockedIn ? <StopIcon /> : <PlayArrowIcon />}
              onClick={handleTogglePunch}
              sx={{
                bgcolor: isClockedIn ? '#EF4444' : '#10B981',
                '&:hover': { bgcolor: isClockedIn ? '#DC2626' : '#059669' },
                borderRadius: '12px',
                fontWeight: 700,
                py: 1.25,
                textTransform: 'none',
              }}
            >
              {isClockedIn ? 'Clock Out for Today' : isShiftCompleted ? 'Clock In Again' : 'Clock In Now'}
            </Button>
          </Card>
        </Grid>

        {/* Aggregate Stats Cards */}
        <Grid item xs={12} md={7}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  p: 2.5,
                  borderRadius: '16px',
                  bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4',
                  border: `1px solid ${alpha('#10B981', 0.25)}`,
                  height: '100%',
                }}
              >
                <Typography variant="caption" fontWeight={700} color="#10B981">
                  MONTHLY ATTENDANCE
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
                  96.5%
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  21 / 22 Working Days recorded
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  p: 2.5,
                  borderRadius: '16px',
                  bgcolor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF',
                  border: `1px solid ${alpha('#6366F1', 0.25)}`,
                  height: '100%',
                }}
              >
                <Typography variant="caption" fontWeight={700} color="#6366F1">
                  AVG DAILY HOURS
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
                  8.4h
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  +24m above standard daily 8.0h requirement
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  p: 2.5,
                  borderRadius: '16px',
                  bgcolor: isDark ? 'rgba(6, 182, 212, 0.08)' : '#ECFEFF',
                  border: `1px solid ${alpha('#06B6D4', 0.25)}`,
                  height: '100%',
                }}
              >
                <Typography variant="caption" fontWeight={700} color="#06B6D4">
                  WFH BALANCE
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
                  4 Days
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  2 WFH allowance days remaining this month
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  p: 2.5,
                  borderRadius: '16px',
                  bgcolor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB',
                  border: `1px solid ${alpha('#F59E0B', 0.25)}`,
                  height: '100%',
                }}
              >
                <Typography variant="caption" fontWeight={700} color="#F59E0B">
                  OVERTIME LOGGED
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
                  5.2h
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Eligible for compensatory credit / comp-off
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Attendance History Table */}
      <Card sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Monthly Timesheet & Logs
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Detailed chronological records of daily punches, working hours, and statuses
            </Typography>
          </Box>
          <Chip label="Current Month: October 2026" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)' }}>
                <TableCell sx={{ fontWeight: 700 }}>DATE</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>IN TIME</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>OUT TIME</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>EFFECTIVE HOURS</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>WORKING MODE / LOCATION</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employeeLogs.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{row.date}</TableCell>
                  <TableCell>{row.inTime}</TableCell>
                  <TableCell>{row.outTime}</TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      color: row.effectiveHours !== '—' && !row.effectiveHours.includes('Progress') ? '#10B981' : undefined,
                    }}
                  >
                    {row.effectiveHours}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.status.toUpperCase()}
                      size="small"
                      color={
                        row.status === 'present'
                          ? 'success'
                          : row.status === 'wfh'
                          ? 'primary'
                          : row.status === 'on_leave'
                          ? 'warning'
                          : 'default'
                      }
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

      {/* Missed Punch / Regularization Dialog */}
      <Dialog
        open={regularizeOpen}
        onClose={() => setRegularizeOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Regularize Missed Punch</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Submit an attendance regularization request if you forgot to clock in/out or had on-site duties.
          </Typography>
          <Stack spacing={2.5}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              value={regDate}
              onChange={(e) => setRegDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Check-in Time"
                type="time"
                fullWidth
                value={regCheckIn}
                onChange={(e) => setRegCheckIn(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Check-out Time"
                type="time"
                fullWidth
                value={regCheckOut}
                onChange={(e) => setRegCheckOut(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
            <TextField
              select
              label="Working Mode"
              fullWidth
              value={regMode}
              onChange={(e) => setRegMode(e.target.value as 'present' | 'wfh')}
            >
              <MenuItem value="present">In-Office (Headquarters)</MenuItem>
              <MenuItem value="wfh">Work From Home (Remote)</MenuItem>
            </TextField>
            <TextField
              label="Reason for Regularization"
              placeholder="e.g., Client on-site visit, punch machine connectivity glitch, forgot punch"
              multiline
              rows={3}
              fullWidth
              value={regReason}
              onChange={(e) => setRegReason(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRegularizeOpen(false)} sx={{ fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitRegularization}
            sx={{ fontWeight: 700, borderRadius: '8px' }}
          >
            Submit Regularization
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

