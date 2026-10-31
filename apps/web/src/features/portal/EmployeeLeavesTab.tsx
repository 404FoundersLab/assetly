import { useState, useMemo, useEffect } from 'react';
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
  Avatar,
  LinearProgress,
  Alert,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CloseIcon from '@mui/icons-material/Close';
import GroupsIcon from '@mui/icons-material/Groups';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { useAppDispatch, useAppSelector, useAuthUser } from '../../hooks/storeHooks';
import {
  addLeaveRequest,
  cancelLeaveRequest,
  setLeaveRequests,
  initialLeaveBalances,
  initialLeaveTypes,
  initialLeaveRequests,
  type LeaveRequest,
} from '../../store/hrSlice';
import {
  fetchLeaveRequests,
  createLeaveRequest,
  cancelLeaveRequestApi,
} from '../../services/api/hr';
import { isApiEnabled } from '../../services/api/config';
import { DEMO_EMPLOYEES } from '../../data/demoData';

interface EmployeeLeavesTabProps {
  refreshTrigger?: number;
}

export function EmployeeLeavesTab({ refreshTrigger = 0 }: EmployeeLeavesTabProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dispatch = useAppDispatch();
  const user = useAuthUser();

  const rawRequests = useAppSelector((s) => s.hr?.leaveRequests);
  const allRequests = rawRequests || [];
  const rawBalances = useAppSelector((s) => s.hr?.leaveBalances);
  const allBalances = rawBalances || [];
  const rawTypes = useAppSelector((s) => s.hr?.leaveTypes);
  const leaveTypes = rawTypes && rawTypes.length > 0 ? rawTypes : initialLeaveTypes;
  const employees = useAppSelector((s) => s.employees.items);

  const [openModal, setOpenModal] = useState(false);
  const [holidaysOpen, setHolidaysOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    leaveType: 'Casual Leave (CL)',
    startDate: '',
    endDate: '',
    dayType: 'full' as 'full' | 'first_half' | 'second_half',
    reason: '',
    backupEmployeeId: '',
    handoverNotes: '',
    contactNumber: '',
  });

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

  const reportingManager = useMemo(() => {
    const deptId = currentEmployee?.departmentId;
    const list = employees.length > 0 ? employees : DEMO_EMPLOYEES;
    const lead = list.find(
      (e) =>
        e.departmentId === deptId &&
        e.id !== currentEmployeeId &&
        (e.jobTitle?.toLowerCase().includes('lead') ||
          e.jobTitle?.toLowerCase().includes('manager') ||
          e.jobTitle?.toLowerCase().includes('director') ||
          e.jobTitle?.toLowerCase().includes('architect')),
    );
    return lead || { firstName: 'Alex', lastName: 'Thompson', jobTitle: 'Principal Lead' };
  }, [currentEmployee, currentEmployeeId, employees]);

  const teamPeers = useMemo(() => {
    const list = employees.length > 0 ? employees : DEMO_EMPLOYEES;
    return list.filter(
      (e) => e.departmentId === currentEmployee?.departmentId && e.id !== currentEmployeeId,
    );
  }, [currentEmployee, currentEmployeeId, employees]);

  useEffect(() => {
    if (isApiEnabled()) {
      fetchLeaveRequests({ employeeId: currentEmployeeId })
        .then((res) => {
          if (res && res.length > 0) dispatch(setLeaveRequests(res));
        })
        .catch(() => {});
    }
  }, [currentEmployeeId, dispatch, refreshTrigger]);

  const myRequests = useMemo(() => {
    return allRequests.filter(
      (r) =>
        r.employeeId === currentEmployeeId ||
        (r.employeeEmail && r.employeeEmail.toLowerCase() === user?.email?.toLowerCase()),
    );
  }, [allRequests, currentEmployeeId, user]);

  const teamLeaves = useMemo(() => {
    const deptId = currentEmployee?.departmentId;
    return allRequests.filter(
      (r) =>
        (r.departmentId === deptId || !r.departmentId) &&
        r.employeeId !== currentEmployeeId &&
        (r.status === 'approved' || r.status === 'pending_hr' || r.status === 'pending_manager'),
    );
  }, [allRequests, currentEmployee, currentEmployeeId]);

  const myBalance = useMemo(() => {
    const found = allBalances.find((b) => b.employeeId === currentEmployeeId);
    if (found) return found;
    return {
      casualTotal: 12, casualUsed: 4, casualPending: 2,
      sickTotal: 12, sickUsed: 2, sickPending: 0,
      earnedTotal: 18, earnedUsed: 6, earnedPending: 0,
      compOffTotal: 5, compOffUsed: 1, compOffPending: 0,
      optionalTotal: 3, optionalUsed: 1, optionalPending: 0,
      maternityTotal: 182, maternityUsed: 0, maternityPending: 0,
      paternityTotal: 15, paternityUsed: 0, paternityPending: 0,
    };
  }, [allBalances, currentEmployeeId]);

  const calculatedDays = useMemo(() => {
    if (!form.startDate || !form.endDate) return 1;
    if (form.dayType !== 'full') return 0.5;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }, [form.startDate, form.endDate, form.dayType]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) {
      setErrorMsg('Please select start and end dates.');
      return;
    }
    if (calculatedDays <= 0) {
      setErrorMsg('End date must be on or after start date.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const payload = {
      employeeId: currentEmployeeId,
      leaveType: form.leaveType,
      startDate: form.startDate,
      endDate: form.endDate,
      daysCount: calculatedDays,
      dayType: form.dayType,
      reason: form.reason || 'Personal leave request',
      backupEmployeeId: form.backupEmployeeId || null,
      handoverNotes: form.handoverNotes || null,
      contactNumber: form.contactNumber || null,
    };

    try {
      if (isApiEnabled()) {
        const created = await createLeaveRequest(payload);
        dispatch(addLeaveRequest(created));
      } else {
        const backupPeer = teamPeers.find((p) => p.id === form.backupEmployeeId);
        const localReq: LeaveRequest = {
          id: `req-${Date.now()}`,
          employeeId: currentEmployeeId,
          employeeName: `${currentEmployee?.firstName} ${currentEmployee?.lastName || ''}`.trim(),
          employeeEmail: currentEmployee?.email || user?.email || '',
          departmentId: currentEmployee?.departmentId,
          departmentName: 'Engineering',
          leaveType: form.leaveType,
          startDate: form.startDate,
          endDate: form.endDate,
          daysCount: calculatedDays,
          dayType: form.dayType,
          reason: form.reason || 'Personal leave request',
          status: 'pending_manager',
          managerId: 'mgr-1',
          managerName: `${reportingManager.firstName} ${reportingManager.lastName}`,
          managerStatus: 'pending',
          managerComment: null,
          reviewedByManagerAt: null,
          approvedBy: null,
          hrStatus: 'pending',
          hrComment: null,
          reviewedByHrAt: null,
          backupEmployeeId: form.backupEmployeeId || null,
          backupEmployeeName: backupPeer ? `${backupPeer.firstName} ${backupPeer.lastName}` : null,
          handoverNotes: form.handoverNotes || null,
          contactNumber: form.contactNumber || null,
          createdAt: new Date().toISOString(),
        };
        dispatch(addLeaveRequest(localReq));
      }

      setSuccessMsg(`Leave request submitted to ${reportingManager.firstName} ${reportingManager.lastName} for review.`);
      setOpenModal(false);
      setForm({
        leaveType: 'Casual Leave (CL)',
        startDate: '',
        endDate: '',
        dayType: 'full',
        reason: '',
        backupEmployeeId: '',
        handoverNotes: '',
        contactNumber: '',
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this pending leave request?')) return;
    try {
      if (isApiEnabled()) await cancelLeaveRequestApi(id);
      dispatch(cancelLeaveRequest({ id }));
      setSuccessMsg('Leave request cancelled.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to cancel request');
    }
  };

  return (
    <Box>
      {successMsg && (
        <Alert severity="success" sx={{ mb: 2.5, borderRadius: '12px' }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {/* Header with Apply Action */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            My Leaves & Time Off
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Reporting Lead: <strong>{reportingManager.firstName} {reportingManager.lastName}</strong> ({reportingManager.jobTitle})
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<CalendarMonthIcon />}
            onClick={() => setHolidaysOpen(true)}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Company Holidays
          </Button>
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
            Apply for Leave
          </Button>
        </Stack>
      </Box>

      {/* Quota Balance Cards */}
      {/* Quota Balance Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ p: 2, height: '100%', borderRadius: '12px', bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4', border: `1px solid ${alpha('#10B981', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#10B981">CASUAL (CL)</Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
              {myBalance.casualTotal - myBalance.casualUsed} / {myBalance.casualTotal}
            </Typography>
            <Typography variant="caption" color="text.secondary">Available</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ p: 2, height: '100%', borderRadius: '12px', bgcolor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB', border: `1px solid ${alpha('#F59E0B', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#F59E0B">PRIVILEGE (PL)</Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
              {myBalance.earnedTotal - myBalance.earnedUsed} / {myBalance.earnedTotal}
            </Typography>
            <Typography variant="caption" color="text.secondary">Available</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ p: 2, height: '100%', borderRadius: '12px', bgcolor: isDark ? 'rgba(139, 92, 246, 0.08)' : '#F5F3FF', border: `1px solid ${alpha('#8B5CF6', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#8B5CF6">OPTIONAL (OL)</Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
              {(myBalance.optionalTotal ?? 3) - (myBalance.optionalUsed ?? 1)} / {myBalance.optionalTotal ?? 3}
            </Typography>
            <Typography variant="caption" color="text.secondary">Floating holidays</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ p: 2, height: '100%', borderRadius: '12px', bgcolor: isDark ? 'rgba(6, 182, 212, 0.08)' : '#ECFEFF', border: `1px solid ${alpha('#06B6D4', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#06B6D4">COMP-OFF</Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
              {myBalance.compOffTotal - myBalance.compOffUsed} / {myBalance.compOffTotal}
            </Typography>
            <Typography variant="caption" color="text.secondary">Duty credits</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ p: 2, height: '100%', borderRadius: '12px', bgcolor: isDark ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF', border: `1px solid ${alpha('#3B82F6', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#3B82F6">SICK (SL)</Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
              {myBalance.sickTotal - myBalance.sickUsed} / {myBalance.sickTotal}
            </Typography>
            <Typography variant="caption" color="text.secondary">Medical recovery</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ p: 2, height: '100%', borderRadius: '12px', bgcolor: isDark ? 'rgba(236, 72, 153, 0.08)' : '#FDF2F8', border: `1px solid ${alpha('#EC4899', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#EC4899">
              {myBalance.maternityTotal > 0 ? 'MATERNITY' : 'PATERNITY'}
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
              {myBalance.maternityTotal > 0
                ? `${myBalance.maternityTotal - myBalance.maternityUsed} / ${myBalance.maternityTotal}`
                : `${(myBalance.paternityTotal ?? 15) - (myBalance.paternityUsed ?? 0)} / ${myBalance.paternityTotal ?? 15}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">Parental care</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Applications Table */}
      <Card sx={{ mb: 3, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Leave Type</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Days</TableCell>
                <TableCell>Reason & Handover</TableCell>
                <TableCell>Approval Status</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {myRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No leave requests on file. Click &quot;Apply for Leave&quot; above to submit.
                  </TableCell>
                </TableRow>
              ) : (
                myRequests.map((r) => {
                  const isPending = r.status === 'pending' || r.status === 'pending_manager' || r.status === 'pending_hr';
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{r.leaveType}</TableCell>
                      <TableCell>{r.startDate} to {r.endDate}</TableCell>
                      <TableCell>{r.daysCount}d</TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography variant="caption" noWrap display="block">
                          {r.reason}
                        </Typography>
                        {r.backupEmployeeName && (
                          <Typography variant="caption" color="text.secondary">
                            Backup: {r.backupEmployeeName}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            r.status === 'approved'
                              ? 'Approved'
                              : r.status === 'pending_manager'
                              ? 'Lead Review'
                              : r.status === 'pending_hr'
                              ? 'HR Sanction'
                              : r.status === 'rejected'
                              ? 'Rejected'
                              : 'Cancelled'
                          }
                          size="small"
                          color={
                            r.status === 'approved'
                              ? 'success'
                              : r.status === 'rejected'
                              ? 'error'
                              : 'warning'
                          }
                          sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {isPending && (
                          <Button size="small" color="error" onClick={() => handleCancel(r.id)} sx={{ textTransform: 'none', fontSize: '0.72rem' }}>
                            Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Team Who's Away Widget */}
      <Card sx={{ p: 2.5, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <GroupsIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          Team Absence Calendar (Engineering)
        </Typography>
        {teamLeaves.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            No colleagues from your department are currently scheduled out of office.
          </Typography>
        ) : (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap">
            {teamLeaves.map((tl) => (
              <Chip
                key={tl.id}
                avatar={<Avatar>{tl.employeeName ? tl.employeeName[0] : 'C'}</Avatar>}
                label={`${tl.employeeName}: ${tl.startDate} to ${tl.endDate} (${tl.leaveType})`}
                variant="outlined"
                sx={{ borderRadius: '10px', py: 2 }}
              />
            ))}
          </Stack>
        )}
      </Card>

      {/* Apply Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Apply for Leave
          <Typography variant="caption" color="text.secondary" display="block">
            Reporting Lead: {reportingManager.firstName} {reportingManager.lastName}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Box component="form" onSubmit={handleApply} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField
              select
              label="Leave Type"
              size="small"
              value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
              fullWidth
              required
            >
              {leaveTypes.map((t) => (
                <MenuItem key={t.id} value={t.name}>
                  {t.name}
                </MenuItem>
              ))}
            </TextField>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Start Date"
                  type="date"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="End Date"
                  type="date"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  required
                />
              </Grid>
            </Grid>

            <TextField
              select
              label="Handover Colleague (Team Member)"
              size="small"
              value={form.backupEmployeeId}
              onChange={(e) => setForm({ ...form, backupEmployeeId: e.target.value })}
              fullWidth
            >
              <MenuItem value="">
                <em>None specified</em>
              </MenuItem>
              {teamPeers.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} — {p.jobTitle}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Reason for Absence"
              size="small"
              multiline
              rows={2}
              placeholder="Provide reason for your team lead..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenModal(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={loading}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            {loading ? 'Submitting…' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
