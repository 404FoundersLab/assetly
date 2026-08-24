import { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Button, Tabs, Tab, Grid, Card, CardContent, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Stack, Avatar, LinearProgress,
  alpha, useTheme, Tooltip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useAppDispatch, useAppSelector } from '../../../hooks/storeHooks';
import { markAttendance, updateTimesheetStatus, AttendanceStatus } from '../../../store/attendanceSlice';
import { PageHeader } from '../../../components/PageHeader';
import { BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

const STATUS_COLOR: Record<AttendanceStatus, 'success' | 'error' | 'primary' | 'warning' | 'secondary'> = {
  present: 'success', absent: 'error', wfh: 'primary', half_day: 'warning', on_leave: 'secondary',
};

const STATUS_OPTIONS: AttendanceStatus[] = ['present', 'wfh', 'half_day', 'absent', 'on_leave'];

export function AttendancePage() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const employees = useAppSelector(s => s.employees.items);
  const records = useAppSelector(s => s.attendance.records);
  const timesheets = useAppSelector(s => s.attendance.timesheets);
  const leaveRequests = useAppSelector(s => s.hr.leaveRequests);

  const [activeTab, setActiveTab] = useState(0);
  const [editDialog, setEditDialog] = useState<string | null>(null); // employeeId
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('present');
  const [editNotes, setEditNotes] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const todayRecords = useMemo(() => records.filter(r => r.date === today), [records, today]);
  const getEmployeeName = (id: string) => { const e = employees.find(x => x.id === id); return e ? `${e.firstName} ${e.lastName}` : 'Unknown'; };
  const getEmployeeJobTitle = (id: string) => employees.find(x => x.id === id)?.jobTitle || '';

  const todayRecordByEmp = useMemo(() => {
    const map: Record<string, typeof records[0]> = {};
    todayRecords.forEach(r => { map[r.employeeId] = r; });
    return map;
  }, [todayRecords]);

  const attendanceSummary = useMemo(() => {
    const counts = { present: 0, absent: 0, wfh: 0, half_day: 0, on_leave: 0 };
    todayRecords.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return counts;
  }, [todayRecords]);

  const handleMarkAttendance = (empId: string) => {
    const existing = todayRecordByEmp[empId];
    setEditStatus(existing?.status || 'present');
    setEditNotes(existing?.notes || '');
    setEditDialog(empId);
  };

  const handleSaveAttendance = () => {
    if (!editDialog) return;
    const emp = employees.find(e => e.id === editDialog);
    if (!emp) return;
    const existing = todayRecordByEmp[editDialog];
    const hours = editStatus === 'absent' ? 0 : editStatus === 'half_day' ? 4.5 : 8.5;
    dispatch(markAttendance({
      id: existing?.id || `att-${Date.now()}`,
      employeeId: editDialog,
      date: today,
      checkIn: editStatus === 'absent' ? null : '09:00',
      checkOut: editStatus === 'absent' ? null : '17:30',
      hoursWorked: hours,
      overtime: Math.max(0, hours - 9),
      status: editStatus,
      notes: editNotes,
    }));
    setEditDialog(null);
  };

  // Monthly report data (last 14 days)
  const reportData = useMemo(() => {
    const last14 = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - (13 - i) * 86400000);
      const dStr = d.toISOString().split('T')[0];
      const dayRecs = records.filter(r => r.date === dStr);
      const present = dayRecs.filter(r => r.status === 'present').length;
      const wfh = dayRecs.filter(r => r.status === 'wfh').length;
      const absent = dayRecs.filter(r => r.status === 'absent').length;
      return { date: dStr.slice(5), present, wfh, absent };
    });
    return last14;
  }, [records]);

  return (
    <Box>
      <PageHeader
        title="Attendance & Timesheets"
        subtitle="Track daily attendance, manage timesheets, and generate attendance reports."
        breadcrumbs={[{ label: 'HR Portal', to: '/hr' }, { label: 'Attendance' }]}
      />

      {/* Summary Cards */}
      <Grid container spacing={2.5} sx={{ mt: 2, mb: 3 }}>
        {[
          { label: "Present Today", value: attendanceSummary.present, color: '#4caf50' },
          { label: "Work From Home", value: attendanceSummary.wfh, color: '#2196f3' },
          { label: "Absent Today", value: attendanceSummary.absent, color: '#f44336' },
          { label: "On Leave", value: attendanceSummary.on_leave + leaveRequests.filter(r => r.status === 'approved' && today >= r.startDate && today <= r.endDate).length, color: '#9c27b0' },
        ].map(s => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <Card sx={{ border: `1px solid ${alpha(s.color, 0.3)}`, background: `linear-gradient(135deg, ${alpha(s.color, 0.1)} 0%, ${alpha(s.color, 0.04)} 100%)` }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: s.color, width: 44, height: 44 }}>
                  <PeopleIcon />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>{s.label}</Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab icon={<AccessTimeIcon fontSize="small" />} iconPosition="start" label="Today's Attendance" />
        <Tab icon={<AssignmentIcon fontSize="small" />} iconPosition="start" label="Timesheets" />
        <Tab icon={<TrendingUpIcon fontSize="small" />} iconPosition="start" label="Reports" />
      </Tabs>

      {activeTab === 0 && (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Check In</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Check Out</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Hours</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Mark</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.filter(e => e.status === 'active').map(emp => {
                  const rec = todayRecordByEmp[emp.id];
                  return (
                    <TableRow key={emp.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.8rem' }}>
                            {emp.firstName[0]}{emp.lastName[0]}
                          </Avatar>
                          <Typography variant="body2" fontWeight={600}>{emp.firstName} {emp.lastName}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{emp.jobTitle}</Typography></TableCell>
                      <TableCell>{rec?.checkIn || '—'}</TableCell>
                      <TableCell>{rec?.checkOut || '—'}</TableCell>
                      <TableCell>{rec ? `${rec.hoursWorked}h` : '—'}</TableCell>
                      <TableCell>
                        {rec ? (
                          <Chip label={rec.status.replace('_', ' ')} color={STATUS_COLOR[rec.status]} size="small" sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
                        ) : (
                          <Chip label="Not Marked" variant="outlined" size="small" color="default" />
                        )}
                      </TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 120 }}>{rec?.notes || '—'}</Typography></TableCell>
                      <TableCell align="right">
                        <Tooltip title="Mark / Edit Attendance">
                          <IconButton size="small" color="primary" onClick={() => handleMarkAttendance(emp.id)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {activeTab === 1 && (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Week</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Mon</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tue</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Wed</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Thu</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Fri</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Overtime</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {timesheets.map(ts => (
                  <TableRow key={ts.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{getEmployeeName(ts.employeeId)}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{ts.weekStart}</Typography></TableCell>
                    <TableCell>{ts.mondayHours}h</TableCell>
                    <TableCell>{ts.tuesdayHours}h</TableCell>
                    <TableCell>{ts.wednesdayHours}h</TableCell>
                    <TableCell>{ts.thursdayHours}h</TableCell>
                    <TableCell>{ts.fridayHours}h</TableCell>
                    <TableCell><Typography fontWeight={700}>{ts.totalHours}h</Typography></TableCell>
                    <TableCell sx={{ color: ts.overtimeHours > 0 ? 'warning.main' : 'text.secondary' }}>{ts.overtimeHours}h</TableCell>
                    <TableCell>
                      <Chip
                        label={ts.status}
                        color={ts.status === 'approved' ? 'success' : ts.status === 'submitted' ? 'warning' : ts.status === 'rejected' ? 'error' : 'default'}
                        size="small"
                        sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {ts.status === 'submitted' && (
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Approve">
                            <IconButton size="small" color="success" onClick={() => dispatch(updateTimesheetStatus({ id: ts.id, status: 'approved', approvedBy: 'hr-admin' }))}>
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton size="small" color="error" onClick={() => dispatch(updateTimesheetStatus({ id: ts.id, status: 'rejected' }))}>
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {activeTab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>Attendance Trend — Last 14 Days</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Daily breakdown of present, WFH, and absent employees.</Typography>
          <Box sx={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <ChartTooltip />
                <Legend />
                <Bar name="Present" dataKey="present" fill="#4caf50" radius={[3, 3, 0, 0]} stackId="a" />
                <Bar name="WFH" dataKey="wfh" fill="#2196f3" radius={[3, 3, 0, 0]} stackId="a" />
                <Bar name="Absent" dataKey="absent" fill="#f44336" radius={[3, 3, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      )}

      {/* Mark Attendance Dialog */}
      <Dialog open={!!editDialog} onClose={() => setEditDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Mark Attendance — {editDialog ? getEmployeeName(editDialog) : ''}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              select fullWidth label="Attendance Status"
              value={editStatus} onChange={e => setEditStatus(e.target.value as AttendanceStatus)}
            >
              {STATUS_OPTIONS.map(s => (
                <MenuItem key={s} value={s}><Chip label={s.replace('_', ' ')} color={STATUS_COLOR[s]} size="small" sx={{ textTransform: 'capitalize', mr: 1 }} />{s.replace('_', ' ')}</MenuItem>
              ))}
            </TextField>
            <TextField fullWidth label="Notes" multiline rows={2} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Optional notes..." />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditDialog(null)} color="inherit">Cancel</Button>
          <Button onClick={handleSaveAttendance} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AttendancePage;
