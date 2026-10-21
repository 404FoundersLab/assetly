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
  Tabs,
  Tab,
  Avatar,
  LinearProgress,
  Tooltip,
  IconButton,
  Alert,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HandshakeIcon from '@mui/icons-material/Handshake';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { PageHeader } from '../../../components/PageHeader';
import { useAppDispatch, useAppSelector, useAuthUser } from '../../../hooks/storeHooks';
import {
  addLeaveRequest,
  cancelLeaveRequest,
  setLeaveRequests,
  initialLeaveBalances,
  initialLeaveTypes,
  initialLeaveRequests,
  type LeaveRequest,
} from '../../../store/hrSlice';
import {
  fetchLeaveRequests,
  createLeaveRequest,
  cancelLeaveRequestApi,
} from '../../../services/api/hr';
import { isApiEnabled } from '../../../services/api/config';
import { DEMO_EMPLOYEES } from '../../../data/demoData';

export function MyLeavesPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dispatch = useAppDispatch();
  const user = useAuthUser();

  const rawRequests = useAppSelector((s) => s.hr?.leaveRequests);
  const allRequests = rawRequests && rawRequests.length > 0 ? rawRequests : initialLeaveRequests;
  const rawBalances = useAppSelector((s) => s.hr?.leaveBalances);
  const allBalances = rawBalances && rawBalances.length > 0 ? rawBalances : initialLeaveBalances;
  const rawTypes = useAppSelector((s) => s.hr?.leaveTypes);
  const leaveTypes = rawTypes && rawTypes.length > 0 ? rawTypes : initialLeaveTypes;
  const employees = useAppSelector((s) => s.employees.items);
  const departments = useAppSelector((s) => s.departments.items);

  const [activeTab, setActiveTab] = useState(0);
  const [openModal, setOpenModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
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

  // Resolve current employee
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

  // Resolve reporting lead/manager
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
    return lead || { firstName: 'Alex', lastName: 'Thompson', jobTitle: 'Principal Lead', email: 'alex.t@company.com' };
  }, [currentEmployee, currentEmployeeId, employees]);

  // Team peers for handover selection
  const teamPeers = useMemo(() => {
    const list = employees.length > 0 ? employees : DEMO_EMPLOYEES;
    return list.filter(
      (e) => e.departmentId === currentEmployee?.departmentId && e.id !== currentEmployeeId,
    );
  }, [currentEmployee, currentEmployeeId, employees]);

  // Load API leaves on mount
  useEffect(() => {
    if (isApiEnabled()) {
      fetchLeaveRequests({ employeeId: currentEmployeeId })
        .then((res) => {
          if (res && res.length > 0) dispatch(setLeaveRequests(res));
        })
        .catch(() => {
          /* fallback to store */
        });
    }
  }, [currentEmployeeId, dispatch]);

  // My requests
  const myRequests = useMemo(() => {
    return allRequests.filter(
      (r) =>
        r.employeeId === currentEmployeeId ||
        (r.employeeEmail && r.employeeEmail.toLowerCase() === user?.email?.toLowerCase()),
    );
  }, [allRequests, currentEmployeeId, user]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return myRequests.filter((r) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'pending') {
        return r.status === 'pending' || r.status === 'pending_manager' || r.status === 'pending_hr';
      }
      return r.status === statusFilter;
    });
  }, [myRequests, statusFilter]);

  // Team members on leave (for calendar transparency)
  const teamLeaves = useMemo(() => {
    const deptId = currentEmployee?.departmentId;
    return allRequests.filter(
      (r) =>
        (r.departmentId === deptId || !r.departmentId) &&
        r.employeeId !== currentEmployeeId &&
        (r.status === 'approved' || r.status === 'pending_hr' || r.status === 'pending_manager'),
    );
  }, [allRequests, currentEmployee, currentEmployeeId]);

  // My balance
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

  // Calculate days for form
  const calculatedDays = useMemo(() => {
    if (!form.startDate || !form.endDate) return 1;
    if (form.dayType !== 'full') return 0.5;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
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
          managerId: reportingManager ? 'mgr-1' : null,
          managerName: reportingManager ? `${reportingManager.firstName} ${reportingManager.lastName}` : 'Alex Thompson',
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

      setSuccessMsg(`Leave application for ${calculatedDays} day(s) submitted to ${reportingManager.firstName} ${reportingManager.lastName} for review.`);
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

  const handleCancelRequest = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this pending leave application?')) return;
    try {
      if (isApiEnabled()) {
        await cancelLeaveRequestApi(id);
      }
      dispatch(cancelLeaveRequest({ id }));
      setSuccessMsg('Leave application cancelled successfully.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to cancel leave request');
    }
  };

  const renderStatusChip = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'approved':
        return <Chip icon={<CheckCircleIcon sx={{ fontSize: 14 }} />} label="Approved" size="small" sx={{ bgcolor: alpha('#10B981', 0.15), color: '#10B981', fontWeight: 700 }} />;
      case 'pending_manager':
        return <Chip icon={<PendingActionsIcon sx={{ fontSize: 14 }} />} label="Awaiting Lead Review" size="small" sx={{ bgcolor: alpha('#F59E0B', 0.15), color: '#F59E0B', fontWeight: 700 }} />;
      case 'pending_hr':
        return <Chip icon={<PendingActionsIcon sx={{ fontSize: 14 }} />} label="Awaiting HR Sanction" size="small" sx={{ bgcolor: alpha('#3B82F6', 0.15), color: '#3B82F6', fontWeight: 700 }} />;
      case 'rejected':
        return <Chip icon={<CloseIcon sx={{ fontSize: 14 }} />} label="Rejected" size="small" sx={{ bgcolor: alpha('#EF4444', 0.15), color: '#EF4444', fontWeight: 700 }} />;
      case 'cancelled':
        return <Chip icon={<CancelOutlinedIcon sx={{ fontSize: 14 }} />} label="Cancelled" size="small" sx={{ bgcolor: alpha('#6B7280', 0.15), color: '#6B7280', fontWeight: 700 }} />;
      default:
        return <Chip label="Pending" size="small" sx={{ bgcolor: alpha('#F59E0B', 0.15), color: '#F59E0B', fontWeight: 700 }} />;
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="My Leaves & Time Off"
        subtitle={`Self-service leave management for ${currentEmployee?.firstName || 'Employee'} · Reporting to ${reportingManager.firstName} ${reportingManager.lastName}`}
        actions={
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
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
            }}
          >
            Apply for Leave
          </Button>
        }
      />

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {/* Reporting Lead Banner */}
      <Card
        sx={{
          mb: 3,
          p: 2,
          borderRadius: '16px',
          bgcolor: isDark ? 'rgba(16, 185, 129, 0.05)' : '#F0FDF4',
          border: `1px solid ${alpha('#10B981', 0.2)}`,
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="space-between" spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 44, height: 44, bgcolor: '#10B981', fontWeight: 700 }}>
              {reportingManager.firstName[0]}
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                REPORTING WORKFLOW
              </Typography>
              <Typography variant="body1" fontWeight={700}>
                {reportingManager.firstName} {reportingManager.lastName}
                <Chip label={reportingManager.jobTitle} size="small" sx={{ ml: 1, fontSize: '0.7rem', height: 20 }} />
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Applications are first reviewed by your Reporting Lead, then finalized by HR Partner Emily Davis.
              </Typography>
            </Box>
          </Box>
          <Chip
            icon={<ShieldOutlinedIcon sx={{ fontSize: 16 }} />}
            label="2-Tier Approval Active"
            size="small"
            sx={{ bgcolor: alpha('#10B981', 0.15), color: '#10B981', fontWeight: 700 }}
          />
        </Stack>
      </Card>

      {/* Leave Balance Overview Cards */}
      {/* Leave Balance Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {/* 1. Casual Leave */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            sx={{
              p: 2,
              height: '100%',
              borderRadius: '16px',
              bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4',
              border: `1px solid ${alpha('#10B981', 0.25)}`,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" fontWeight={700} color="#10B981">
                CASUAL LEAVE (CL)
              </Typography>
              {myBalance.casualPending > 0 && (
                <Chip label={`${myBalance.casualPending}p`} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: alpha('#F59E0B', 0.2), color: '#F59E0B' }} />
              )}
            </Box>
            <Typography variant="h5" fontWeight={800}>
              {myBalance.casualTotal - myBalance.casualUsed} / {myBalance.casualTotal}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.round((myBalance.casualUsed / myBalance.casualTotal) * 100)}
              sx={{ my: 1.2, height: 6, borderRadius: 3, bgcolor: alpha('#10B981', 0.15), '& .MuiLinearProgress-bar': { bgcolor: '#10B981' } }}
            />
            <Typography variant="caption" color="text.secondary">
              {myBalance.casualUsed} days utilized
            </Typography>
          </Card>
        </Grid>

        {/* 2. Privilege / Earned Leave */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            sx={{
              p: 2,
              height: '100%',
              borderRadius: '16px',
              bgcolor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB',
              border: `1px solid ${alpha('#F59E0B', 0.25)}`,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" fontWeight={700} color="#F59E0B">
                PRIVILEGE LEAVE (PL)
              </Typography>
              {myBalance.earnedPending > 0 && (
                <Chip label={`${myBalance.earnedPending}p`} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: alpha('#F59E0B', 0.2), color: '#F59E0B' }} />
              )}
            </Box>
            <Typography variant="h5" fontWeight={800}>
              {myBalance.earnedTotal - myBalance.earnedUsed} / {myBalance.earnedTotal}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.round((myBalance.earnedUsed / myBalance.earnedTotal) * 100)}
              sx={{ my: 1.2, height: 6, borderRadius: 3, bgcolor: alpha('#F59E0B', 0.15), '& .MuiLinearProgress-bar': { bgcolor: '#F59E0B' } }}
            />
            <Typography variant="caption" color="text.secondary">
              Carry forward max 30d
            </Typography>
          </Card>
        </Grid>

        {/* 3. Optional Leave */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            sx={{
              p: 2,
              height: '100%',
              borderRadius: '16px',
              bgcolor: isDark ? 'rgba(139, 92, 246, 0.08)' : '#F5F3FF',
              border: `1px solid ${alpha('#8B5CF6', 0.25)}`,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" fontWeight={700} color="#8B5CF6">
                OPTIONAL LEAVE (OL)
              </Typography>
              {(myBalance.optionalPending ?? 0) > 0 && (
                <Chip label={`${myBalance.optionalPending}p`} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: alpha('#F59E0B', 0.2), color: '#F59E0B' }} />
              )}
            </Box>
            <Typography variant="h5" fontWeight={800}>
              {(myBalance.optionalTotal ?? 3) - (myBalance.optionalUsed ?? 1)} / {myBalance.optionalTotal ?? 3}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.round(((myBalance.optionalUsed ?? 1) / (myBalance.optionalTotal ?? 3)) * 100)}
              sx={{ my: 1.2, height: 6, borderRadius: 3, bgcolor: alpha('#8B5CF6', 0.15), '& .MuiLinearProgress-bar': { bgcolor: '#8B5CF6' } }}
            />
            <Typography variant="caption" color="text.secondary">
              Floating festival holidays
            </Typography>
          </Card>
        </Grid>

        {/* 4. Compensation / Comp-Off */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            sx={{
              p: 2,
              height: '100%',
              borderRadius: '16px',
              bgcolor: isDark ? 'rgba(6, 182, 212, 0.08)' : '#ECFEFF',
              border: `1px solid ${alpha('#06B6D4', 0.25)}`,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" fontWeight={700} color="#06B6D4">
                COMP-OFF (COMP)
              </Typography>
              {myBalance.compOffPending > 0 && (
                <Chip label={`${myBalance.compOffPending}p`} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: alpha('#F59E0B', 0.2), color: '#F59E0B' }} />
              )}
            </Box>
            <Typography variant="h5" fontWeight={800}>
              {myBalance.compOffTotal - myBalance.compOffUsed} / {myBalance.compOffTotal}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.round((myBalance.compOffUsed / myBalance.compOffTotal) * 100)}
              sx={{ my: 1.2, height: 6, borderRadius: 3, bgcolor: alpha('#06B6D4', 0.15), '& .MuiLinearProgress-bar': { bgcolor: '#06B6D4' } }}
            />
            <Typography variant="caption" color="text.secondary">
              Overtime / Weekend duty
            </Typography>
          </Card>
        </Grid>

        {/* 5. Sick Leave */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            sx={{
              p: 2,
              height: '100%',
              borderRadius: '16px',
              bgcolor: isDark ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF',
              border: `1px solid ${alpha('#3B82F6', 0.25)}`,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" fontWeight={700} color="#3B82F6">
                SICK LEAVE (SL)
              </Typography>
              {myBalance.sickPending > 0 && (
                <Chip label={`${myBalance.sickPending}p`} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: alpha('#F59E0B', 0.2), color: '#F59E0B' }} />
              )}
            </Box>
            <Typography variant="h5" fontWeight={800}>
              {myBalance.sickTotal - myBalance.sickUsed} / {myBalance.sickTotal}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.round((myBalance.sickUsed / myBalance.sickTotal) * 100)}
              sx={{ my: 1.2, height: 6, borderRadius: 3, bgcolor: alpha('#3B82F6', 0.15), '& .MuiLinearProgress-bar': { bgcolor: '#3B82F6' } }}
            />
            <Typography variant="caption" color="text.secondary">
              Proof for &gt; 2 days
            </Typography>
          </Card>
        </Grid>

        {/* 6. Parental (Maternity / Paternity) */}
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card
            sx={{
              p: 2,
              height: '100%',
              borderRadius: '16px',
              bgcolor: isDark ? 'rgba(236, 72, 153, 0.08)' : '#FDF2F8',
              border: `1px solid ${alpha('#EC4899', 0.25)}`,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" fontWeight={700} color="#EC4899">
                {myBalance.maternityTotal > 0 ? 'MATERNITY (ML)' : 'PATERNITY (PL)'}
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight={800}>
              {myBalance.maternityTotal > 0
                ? `${myBalance.maternityTotal - myBalance.maternityUsed} / ${myBalance.maternityTotal}`
                : `${(myBalance.paternityTotal ?? 15) - (myBalance.paternityUsed ?? 0)} / ${myBalance.paternityTotal ?? 15}`}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={0}
              sx={{ my: 1.2, height: 6, borderRadius: 3, bgcolor: alpha('#EC4899', 0.15), '& .MuiLinearProgress-bar': { bgcolor: '#EC4899' } }}
            />
            <Typography variant="caption" color="text.secondary">
              Statutory parental care
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        sx={{
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.92rem' },
        }}
      >
        <Tab icon={<BeachAccessIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`My Applications (${myRequests.length})`} />
        <Tab icon={<GroupsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Team Who's Away (${teamLeaves.length})`} />
        <Tab icon={<InfoOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Leave Policy Rules" />
      </Tabs>

      {/* TAB 0: My Applications */}
      {activeTab === 0 && (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            {['all', 'pending', 'approved', 'rejected', 'cancelled'].map((st) => (
              <Chip
                key={st}
                label={st.toUpperCase()}
                onClick={() => setStatusFilter(st)}
                color={statusFilter === st ? 'primary' : 'default'}
                variant={statusFilter === st ? 'filled' : 'outlined'}
                size="small"
                sx={{ fontWeight: 700, borderRadius: '8px' }}
              />
            ))}
          </Stack>

          <Card sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Leave Type & Duration</TableCell>
                    <TableCell>Dates</TableCell>
                    <TableCell>Reason & Handover</TableCell>
                    <TableCell>Approval Workflow</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        <BeachAccessIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                        <Typography variant="body1" fontWeight={600}>No leave applications found</Typography>
                        <Typography variant="caption">Submit your planned vacation or medical time off above.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((req) => {
                      const isPending = req.status === 'pending' || req.status === 'pending_manager' || req.status === 'pending_hr';
                      return (
                        <TableRow key={req.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700}>
                              {req.leaveType}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                              <Chip
                                label={`${req.daysCount} Day${req.daysCount > 1 ? 's' : ''}`}
                                size="small"
                                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                              />
                              {req.dayType && req.dayType !== 'full' && (
                                <Chip
                                  label={req.dayType === 'first_half' ? 'First Half' : 'Second Half'}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.65rem' }}
                                />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {req.startDate} {req.startDate !== req.endDate ? `to ${req.endDate}` : ''}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Applied on {new Date(req.createdAt).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 300 }}>
                            <Typography variant="body2" noWrap>
                              {req.reason || '—'}
                            </Typography>
                            {req.backupEmployeeName && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <HandshakeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                  Backup: <strong>{req.backupEmployeeName}</strong>
                                </Typography>
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.75}>
                              {renderStatusChip(req.status)}
                              {req.managerComment && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Lead note: {req.managerComment}
                                </Typography>
                              )}
                              {req.hrComment && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  HR note: {req.hrComment}
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            {isPending && (
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                onClick={() => handleCancelRequest(req.id)}
                                sx={{ textTransform: 'none', borderRadius: '8px', fontSize: '0.75rem' }}
                              >
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
        </>
      )}

      {/* TAB 1: Team Who's Away Calendar */}
      {activeTab === 1 && (
        <Card sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={800}>
              Team Availability & Upcoming Absences
            </Typography>
            <Typography variant="caption" color="text.secondary">
              See when your department colleagues are away to coordinate shift coverage and handovers.
            </Typography>
          </Box>

          {teamLeaves.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              <GroupsIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
              <Typography variant="body1" fontWeight={700}>Full Team Present</Typography>
              <Typography variant="caption">No colleagues from your department are currently scheduled out of office.</Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {teamLeaves.map((tl) => (
                <Grid item xs={12} sm={6} md={4} key={tl.id}>
                  <Card
                    sx={{
                      p: 2,
                      borderRadius: '12px',
                      border: `1px solid ${theme.palette.divider}`,
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Avatar sx={{ width: 38, height: 38, bgcolor: '#6366F1', fontWeight: 700 }}>
                        {tl.employeeName ? tl.employeeName[0] : 'C'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {tl.employeeName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tl.departmentName || 'Colleague'}
                        </Typography>
                      </Box>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Stack spacing={0.5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">Type:</Typography>
                        <Typography variant="caption" fontWeight={700}>{tl.leaveType}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">Away Dates:</Typography>
                        <Typography variant="caption" fontWeight={700} color="#F59E0B">
                          {tl.startDate} to {tl.endDate}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">Duration:</Typography>
                        <Typography variant="caption" fontWeight={700}>{tl.daysCount} Day(s)</Typography>
                      </Box>
                    </Stack>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Card>
      )}

      {/* TAB 2: Leave Policy Rules */}
      {activeTab === 2 && (
        <Grid container spacing={2.5}>
          {leaveTypes.map((t) => (
            <Grid item xs={12} sm={6} md={4} key={t.id}>
              <Card sx={{ p: 2.5, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                  {t.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  {t.description}
                </Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Annual Quota:</Typography>
                    <Typography variant="caption" fontWeight={700}>{t.daysPerYear} days / year</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Carry Forward Limit:</Typography>
                    <Typography variant="caption" fontWeight={700}>{t.carryForwardMax} days max</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Remuneration:</Typography>
                    <Chip label={t.paid ? 'Fully Paid' : 'Unpaid'} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Medical Proof Required:</Typography>
                    <Typography variant="caption" fontWeight={700}>{t.requiresProof ? 'Yes (>2 days)' : 'No'}</Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Apply Leave Modal */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          Apply for Leave
          <Typography variant="caption" color="text.secondary" display="block">
            Submitting as {currentEmployee?.firstName} {currentEmployee?.lastName}
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

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  select
                  label="Session / Day Type"
                  size="small"
                  value={form.dayType}
                  onChange={(e) => setForm({ ...form, dayType: e.target.value as any })}
                  fullWidth
                >
                  <MenuItem value="full">Full Day</MenuItem>
                  <MenuItem value="first_half">First Half Day (Morning)</MenuItem>
                  <MenuItem value="second_half">Second Half Day (Afternoon)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <Card sx={{ p: 1.5, bgcolor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#F0FDF4', borderRadius: '10px' }}>
                  <Typography variant="caption" color="#10B981" fontWeight={700}>
                    CALCULATED DURATION
                  </Typography>
                  <Typography variant="body1" fontWeight={800}>
                    {calculatedDays} Day(s)
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Handover colleague select */}
            <TextField
              select
              label="Handover / Backup Colleague (Team Member)"
              size="small"
              value={form.backupEmployeeId}
              onChange={(e) => setForm({ ...form, backupEmployeeId: e.target.value })}
              fullWidth
              helperText="Assign a department colleague who will cover your pending tickets/PRs"
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
              label="Handover Tasks / Notes"
              size="small"
              multiline
              rows={2}
              placeholder="e.g. Sprint PR reviews delegated to David; production releases paused."
              value={form.handoverNotes}
              onChange={(e) => setForm({ ...form, handoverNotes: e.target.value })}
              fullWidth
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Emergency Contact Phone"
                  size="small"
                  placeholder="+1 555-019-2834"
                  value={form.contactNumber}
                  onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <Card sx={{ p: 1.25, borderRadius: '10px', border: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Reviewer Route:
                  </Typography>
                  <Typography variant="caption" fontWeight={700}>
                    1. Lead: {reportingManager.firstName} {reportingManager.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    2. HR: Emily Davis
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            <TextField
              label="Reason for Absence"
              size="small"
              multiline
              rows={3}
              placeholder="Provide context for your team lead and manager..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenModal(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={loading}
            sx={{
              bgcolor: '#10B981',
              '&:hover': { bgcolor: '#059669' },
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            {loading ? 'Submitting…' : 'Submit Application'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
