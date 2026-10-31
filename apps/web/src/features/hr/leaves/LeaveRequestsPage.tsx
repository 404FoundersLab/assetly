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
  Avatar,
  Stack,
  TextField,
  MenuItem,
  alpha,
  useTheme,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Alert,
  Divider,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import GroupsIcon from '@mui/icons-material/Groups';
import BusinessIcon from '@mui/icons-material/Business';
import HandshakeIcon from '@mui/icons-material/Handshake';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SecurityIcon from '@mui/icons-material/Security';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import { PageHeader } from '../../../components/PageHeader';
import { useAppDispatch, useAppSelector, useAuthUser } from '../../../hooks/storeHooks';
import {
  managerReviewLeaveRequest,
  updateLeaveRequestStatus,
  type LeaveRequest,
  initialLeaveRequests,
} from '../../../store/hrSlice';
import {
  managerReviewLeaveRequest as apiManagerReview,
  updateLeaveRequestStatus as apiHrReview,
} from '../../../services/api/hr';
import { isApiEnabled } from '../../../services/api/config';

export function LeaveRequestsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dispatch = useAppDispatch();
  const user = useAuthUser();

  const rawRequests = useAppSelector((s) => s.hr?.leaveRequests);
  const requests = rawRequests || [];
  const employees = useAppSelector((s) => s.employees.items);
  const departments = useAppSelector((s) => s.departments.items);

  const [activeTab, setActiveTab] = useState(0); // 0 = Team Approvals, 1 = All Company Requests
  const [filterStatus, setFilterStatus] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  // Review Dialog state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<{
    id: string;
    type: 'manager' | 'hr';
    decision: 'approved' | 'rejected';
    req: LeaveRequest;
  } | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check user role
  const isHrOrAdmin =
    user?.role === 'tenant_admin' ||
    user?.role === 'hr_admin' ||
    user?.role === 'platform_admin';

  // Manager's own department / team
  const managerDept = useMemo(() => {
    if (!user) return 'Engineering';
    if (user.email.includes('itadmin') || user.email.includes('alex')) return 'Engineering';
    if (user.email.includes('hr')) return 'Human Resources';
    if (user.email.includes('finance')) return 'Finance';
    return 'Engineering';
  }, [user]);

  // Overlap detection: find requests where 2+ people in the same department overlap on dates!
  const overlapMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (let i = 0; i < requests.length; i++) {
      for (let j = i + 1; j < requests.length; j++) {
        const r1 = requests[i];
        const r2 = requests[j];
        if (
          r1.departmentName &&
          r1.departmentName === r2.departmentName &&
          r1.employeeId !== r2.employeeId &&
          r1.status !== 'rejected' &&
          r1.status !== 'cancelled' &&
          r2.status !== 'rejected' &&
          r2.status !== 'cancelled'
        ) {
          // Check date overlap
          const start1 = new Date(r1.startDate).getTime();
          const end1 = new Date(r1.endDate).getTime();
          const start2 = new Date(r2.startDate).getTime();
          const end2 = new Date(r2.endDate).getTime();

          if (start1 <= end2 && start2 <= end1) {
            map[r1.id] = map[r1.id] || [];
            map[r1.id].push(`${r2.employeeName || 'Colleague'} (${r2.startDate} to ${r2.endDate})`);

            map[r2.id] = map[r2.id] || [];
            map[r2.id].push(`${r1.employeeName || 'Colleague'} (${r1.startDate} to ${r1.endDate})`);
          }
        }
      }
    }
    return map;
  }, [requests]);

  // Filter requests based on tab
  const displayedRequests = useMemo(() => {
    return requests.filter((r) => {
      // Tab filter
      if (activeTab === 0) {
        // Team view: show requests in manager's department or where manager_id matches
        const inTeam =
          (r.departmentName && r.departmentName.toLowerCase() === managerDept.toLowerCase()) ||
          r.managerId === user?.id ||
          r.managerId === user?.employeeId;
        if (!inTeam) return false;
      }

      // Department dropdown
      if (departmentFilter !== 'all' && r.departmentName !== departmentFilter) {
        return false;
      }

      // Status filter
      if (filterStatus === 'pending') {
        if (r.status !== 'pending' && r.status !== 'pending_manager' && r.status !== 'pending_hr') return false;
      } else if (filterStatus !== 'all' && r.status !== filterStatus) {
        return false;
      }

      // Search query
      if (search) {
        const q = search.toLowerCase();
        const matchesName = r.employeeName?.toLowerCase().includes(q);
        const matchesType = r.leaveType?.toLowerCase().includes(q);
        const matchesReason = r.reason?.toLowerCase().includes(q);
        if (!matchesName && !matchesType && !matchesReason) return false;
      }

      return true;
    });
  }, [requests, activeTab, managerDept, user, departmentFilter, filterStatus, search]);

  const stats = useMemo(() => {
    return {
      pending: requests.filter((r) => r.status === 'pending' || r.status === 'pending_manager' || r.status === 'pending_hr').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
      conflicts: Object.keys(overlapMap).length,
    };
  }, [requests, overlapMap]);

  const handleOpenReview = (req: LeaveRequest, type: 'manager' | 'hr', decision: 'approved' | 'rejected') => {
    setReviewAction({ id: req.id, type, decision, req });
    setReviewComment('');
    setReviewModalOpen(true);
  };

  const handleConfirmReview = async () => {
    if (!reviewAction) return;
    setSubmitting(true);
    const { id, type, decision } = reviewAction;
    const reviewerName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Reviewer';

    try {
      if (type === 'manager') {
        if (isApiEnabled()) {
          await apiManagerReview(id, decision, reviewComment);
        }
        dispatch(managerReviewLeaveRequest({ id, status: decision, managerName: reviewerName, comment: reviewComment }));
        setSuccessMsg(`Team request ${decision === 'approved' ? 'recommended & forwarded to HR' : 'rejected'}.`);
      } else {
        if (isApiEnabled()) {
          await apiHrReview(id, decision, reviewComment);
        }
        dispatch(updateLeaveRequestStatus({ id, status: decision, approvedBy: reviewerName, hrComment: reviewComment }));
        setSuccessMsg(`Leave request marked as ${decision.toUpperCase()} with final HR sign-off.`);
      }
      setReviewModalOpen(false);
    } catch (err) {
      alert('Review update failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBadge = (status: LeaveRequest['status']) => {
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
        return <Chip label="Cancelled" size="small" sx={{ bgcolor: alpha('#6B7280', 0.15), color: '#6B7280', fontWeight: 700 }} />;
      default:
        return <Chip label="Pending" size="small" sx={{ bgcolor: alpha('#F59E0B', 0.15), color: '#F59E0B', fontWeight: 700 }} />;
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Leave Requests & Approvals"
        subtitle="Manage employee time-off approval workflow, review team overlap warnings, and sanction leave requests"
      />

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* KPI Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3, mt: 1 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB', border: `1px solid ${alpha('#F59E0B', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#F59E0B">PENDING APPROVALS</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>{stats.pending}</Typography>
            <Typography variant="caption" color="text.secondary">Requires Lead or HR review</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4', border: `1px solid ${alpha('#10B981', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#10B981">SANCTIONED LEAVES</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>{stats.approved}</Typography>
            <Typography variant="caption" color="text.secondary">Active & approved this quarter</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2', border: `1px solid ${alpha('#EF4444', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#EF4444">TEAM OVERLAP WARNINGS</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>{stats.conflicts}</Typography>
            <Typography variant="caption" color="text.secondary">Simultaneous team absences detected</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF', border: `1px solid ${alpha('#6366F1', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#6366F1">ACTIVE WORKFLOW</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>2-Tier</Typography>
            <Typography variant="caption" color="text.secondary">Lead review + HR final sanction</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs: My Team vs All Company */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.92rem' },
        }}
      >
        <Tab icon={<SupervisorAccountIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`My Team Approvals (${managerDept})`} />
        <Tab icon={<BusinessIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`All Company Requests (${requests.length})`} />
      </Tabs>

      {/* Filter and Search Bar */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search by employee, reason, or leave type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1 }}
        />
        <TextField
          select
          size="small"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          sx={{ minWidth: 160 }}
          label="Status"
        >
          <MenuItem value="all">All Statuses</MenuItem>
          <MenuItem value="pending">Pending Only</MenuItem>
          <MenuItem value="pending_manager">Pending Lead</MenuItem>
          <MenuItem value="pending_hr">Pending HR</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
        </TextField>
        {activeTab === 1 && (
          <TextField
            select
            size="small"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            sx={{ minWidth: 180 }}
            label="Department"
          >
            <MenuItem value="all">All Departments</MenuItem>
            <MenuItem value="Engineering">Engineering</MenuItem>
            <MenuItem value="Human Resources">Human Resources</MenuItem>
            <MenuItem value="Sales">Sales</MenuItem>
            <MenuItem value="Finance">Finance</MenuItem>
            <MenuItem value="Operations">Operations</MenuItem>
          </TextField>
        )}
      </Stack>

      {/* Requests Table */}
      <Card sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee & Department</TableCell>
                <TableCell>Leave Type & Duration</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Team Coverage / Overlap</TableCell>
                <TableCell>Workflow Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    <GroupsIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography variant="body1" fontWeight={700}>No leave requests matching criteria</Typography>
                    <Typography variant="caption">All team applications have been reviewed and approved.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                displayedRequests.map((req) => {
                  const overlaps = overlapMap[req.id];
                  const needsLead = req.status === 'pending' || req.status === 'pending_manager';
                  const needsHr = req.status === 'pending_hr';

                  return (
                    <TableRow key={req.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 36, height: 36, bgcolor: '#10B981', fontWeight: 700 }}>
                            {req.employeeName ? req.employeeName[0] : 'E'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={700}>
                              {req.employeeName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {req.departmentName || 'Engineering'} · {req.employeeEmail}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

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
                          {req.startDate} to {req.endDate}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Applied {new Date(req.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ maxWidth: 260 }}>
                        {overlaps && overlaps.length > 0 ? (
                          <Tooltip title={`Simultaneous absence: ${overlaps.join(', ')}`} arrow>
                            <Chip
                              icon={<WarningAmberIcon sx={{ fontSize: 14 }} />}
                              label="⚠️ Team Overlap Alert"
                              size="small"
                              sx={{
                                bgcolor: alpha('#EF4444', 0.15),
                                color: '#EF4444',
                                fontWeight: 700,
                                cursor: 'help',
                              }}
                            />
                          </Tooltip>
                        ) : (
                          <Chip label="✓ Clear Coverage" size="small" sx={{ bgcolor: alpha('#10B981', 0.1), color: '#10B981', fontWeight: 600 }} />
                        )}
                        {req.backupEmployeeName && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Backup: {req.backupEmployeeName}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Stack spacing={0.5}>
                          {renderStatusBadge(req.status)}
                          {req.managerComment && (
                            <Typography variant="caption" color="text.secondary">
                              Lead: {req.managerComment}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="View Request Details" arrow>
                            <IconButton size="small" onClick={() => setSelectedRequest(req)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {/* Reporting Lead action */}
                          {needsLead && (
                            <>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<CheckIcon />}
                                onClick={() => handleOpenReview(req, 'manager', 'approved')}
                                sx={{ textTransform: 'none', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}
                              >
                                Recommend
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => handleOpenReview(req, 'manager', 'rejected')}
                                sx={{ textTransform: 'none', borderRadius: '8px', fontSize: '0.75rem' }}
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {/* HR Sanction action */}
                          {needsHr && isHrOrAdmin && (
                            <>
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => handleOpenReview(req, 'hr', 'approved')}
                                sx={{
                                  bgcolor: '#10B981',
                                  '&:hover': { bgcolor: '#059669' },
                                  textTransform: 'none',
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                }}
                              >
                                Sanction
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => handleOpenReview(req, 'hr', 'rejected')}
                                sx={{ textTransform: 'none', borderRadius: '8px', fontSize: '0.75rem' }}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewModalOpen} onClose={() => setReviewModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {reviewAction?.type === 'manager' ? 'Reporting Lead Review' : 'HR Final Leave Sanction'}
          <Typography variant="caption" color="text.secondary" display="block">
            {reviewAction?.decision === 'approved' ? 'Approve' : 'Reject'} time-off request for {reviewAction?.req.employeeName}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {reviewAction && (
            <Stack spacing={2.5}>
              <Box sx={{ p: 2, borderRadius: '12px', bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F9FAFB' }}>
                <Typography variant="body2" fontWeight={700}>
                  {reviewAction.req.leaveType} · {reviewAction.req.daysCount} Day(s)
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {reviewAction.req.startDate} to {reviewAction.req.endDate}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Reason: &ldquo;{reviewAction.req.reason}&rdquo;
                </Typography>
              </Box>

              {overlapMap[reviewAction.req.id] && (
                <Alert severity="warning" sx={{ borderRadius: '12px' }}>
                  <strong>Team Overlap Notice:</strong> Another member of {reviewAction.req.departmentName} is also on leave during this timeframe:
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {overlapMap[reviewAction.req.id].map((ov, idx) => (
                      <li key={idx}>{ov}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              <TextField
                label={reviewAction.type === 'manager' ? 'Lead Feedback / Handoff Confirmation' : 'HR Notes / Sanction Remarks'}
                size="small"
                multiline
                rows={3}
                placeholder="Optional notes regarding project coverage, deliverables, or return date..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                fullWidth
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setReviewModalOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={reviewAction?.decision === 'approved' ? 'success' : 'error'}
            onClick={handleConfirmReview}
            disabled={submitting}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            {submitting ? 'Updating…' : `Confirm ${reviewAction?.decision === 'approved' ? 'Approval' : 'Rejection'}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={Boolean(selectedRequest)} onClose={() => setSelectedRequest(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Leave Application Details
        </DialogTitle>
        <DialogContent dividers>
          {selectedRequest && (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" fontWeight={800}>{selectedRequest.employeeName}</Typography>
                  <Typography variant="caption" color="text.secondary">{selectedRequest.departmentName} · {selectedRequest.employeeEmail}</Typography>
                </Box>
                {renderStatusBadge(selectedRequest.status)}
              </Box>

              <Divider />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Leave Type</Typography>
                  <Typography variant="body2" fontWeight={700}>{selectedRequest.leaveType}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Total Days</Typography>
                  <Typography variant="body2" fontWeight={700}>{selectedRequest.daysCount} Day(s)</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Start Date</Typography>
                  <Typography variant="body2" fontWeight={700}>{selectedRequest.startDate}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">End Date</Typography>
                  <Typography variant="body2" fontWeight={700}>{selectedRequest.endDate}</Typography>
                </Grid>
              </Grid>

              <Box>
                <Typography variant="caption" color="text.secondary">Reason for Leave</Typography>
                <Typography variant="body2" sx={{ bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F9FAFB', p: 1.5, borderRadius: '8px', mt: 0.5 }}>
                  {selectedRequest.reason || 'None provided'}
                </Typography>
              </Box>

              {selectedRequest.backupEmployeeName && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Handover / Backup Colleague</Typography>
                  <Typography variant="body2" fontWeight={700}>{selectedRequest.backupEmployeeName}</Typography>
                  {selectedRequest.handoverNotes && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Notes: {selectedRequest.handoverNotes}
                    </Typography>
                  )}
                </Box>
              )}

              {selectedRequest.contactNumber && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Emergency Contact During Leave</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedRequest.contactNumber}</Typography>
                </Box>
              )}

              <Box sx={{ p: 1.5, borderRadius: '10px', border: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="caption" fontWeight={700} color="primary.main" display="block" gutterBottom>
                  Approval Timeline
                </Typography>
                <Typography variant="caption" display="block">
                  1. Applied: {new Date(selectedRequest.createdAt).toLocaleString()}
                </Typography>
                <Typography variant="caption" display="block">
                  2. Reporting Lead: {selectedRequest.managerStatus ? `${selectedRequest.managerStatus.toUpperCase()} (${selectedRequest.managerName || 'Lead'})` : 'Pending review'}
                </Typography>
                <Typography variant="caption" display="block">
                  3. HR Sanction: {selectedRequest.hrStatus ? `${selectedRequest.hrStatus.toUpperCase()} (${selectedRequest.approvedBy || 'HR'})` : 'Pending final sign-off'}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedRequest(null)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
