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
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { PageHeader } from '../../../components/PageHeader';
import { useAppSelector } from '../../../hooks/storeHooks';

interface LeaveRequestItem {
  id: string;
  employeeName: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  appliedDate: string;
  status: 'pending' | 'approved' | 'rejected';
}

const INITIAL_REQUESTS: LeaveRequestItem[] = [
  { id: 'req-1', employeeName: 'Jordan Smith', department: 'Human Resources', leaveType: 'Casual Leave', startDate: '2026-10-08', endDate: '2026-10-09', days: 2, reason: 'Family celebration', appliedDate: '2026-10-01', status: 'pending' },
  { id: 'req-2', employeeName: 'Alex Thompson', department: 'Engineering', leaveType: 'Sick Leave', startDate: '2026-10-03', endDate: '2026-10-04', days: 2, reason: 'Viral fever recovery', appliedDate: '2026-10-02', status: 'pending' },
  { id: 'req-3', employeeName: 'Lisa Viewer', department: 'Operations', leaveType: 'Earned Leave', startDate: '2026-10-15', endDate: '2026-10-22', days: 6, reason: 'Personal holiday trip', appliedDate: '2026-09-28', status: 'pending' },
  { id: 'req-4', employeeName: 'Mike Johnson', department: 'Engineering', leaveType: 'Casual Leave', startDate: '2026-09-25', endDate: '2026-09-25', days: 1, reason: 'Bank work', appliedDate: '2026-09-22', status: 'approved' },
  { id: 'req-5', employeeName: 'Sarah Chen', department: 'Engineering', leaveType: 'Maternity / Parental', startDate: '2026-11-01', endDate: '2027-01-30', days: 90, reason: 'Maternity leave plan', appliedDate: '2026-09-15', status: 'approved' },
];

export function LeaveRequestsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [requests, setRequests] = useState<LeaveRequestItem[]>(INITIAL_REQUESTS);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  const handleUpdateStatus = (id: string, newStatus: 'approved' | 'rejected') => {
    setRequests(requests.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
  };

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchSearch = r.employeeName.toLowerCase().includes(search.toLowerCase()) || r.leaveType.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [requests, search, filterStatus]);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Leave Requests & Approvals"
        subtitle="Manage employee time-off approval workflow and review pending leave applications"
      />

      {/* Stats */}
      <Grid container spacing={2.5} sx={{ mb: 4, mt: 1 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB', border: `1px solid ${alpha('#F59E0B', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#F59E0B">PENDING APPROVALS</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>{pendingCount}</Typography>
            <Typography variant="caption" color="text.secondary">Requires immediate review</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4', border: `1px solid ${alpha('#10B981', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#10B981">APPROVED THIS MONTH</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
              {requests.filter((r) => r.status === 'approved').length}
            </Typography>
            <Typography variant="caption" color="text.secondary">Total 98 days sanctioned</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF', border: `1px solid ${alpha('#6366F1', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#6366F1">TOTAL APPLICATIONS</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>{requests.length}</Typography>
            <Typography variant="caption" color="text.secondary">Across all business units</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Row */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search employee name or leave type..."
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
          <MenuItem value="all">All Request Status</MenuItem>
          <MenuItem value="pending">Pending Review</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
        </TextField>
      </Stack>

      {/* Requests Table */}
      <Card sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Leave Type</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Days</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Decision</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((req) => (
                <TableRow key={req.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 34, height: 34, bgcolor: '#6366F1', fontSize: '0.8rem', fontWeight: 700 }}>
                        {req.employeeName[0]}
                      </Avatar>
                      <Typography variant="body2" fontWeight={700}>{req.employeeName}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{req.department}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{req.leaveType}</TableCell>
                  <TableCell>{req.startDate} to {req.endDate}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{req.days} Day(s)</TableCell>
                  <TableCell>{req.reason}</TableCell>
                  <TableCell>
                    <Chip
                      label={req.status.toUpperCase()}
                      size="small"
                      color={req.status === 'approved' ? 'success' : req.status === 'pending' ? 'warning' : 'error'}
                      sx={{ fontWeight: 700, fontSize: '0.65rem' }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {req.status === 'pending' ? (
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="Approve Leave">
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateStatus(req.id, 'approved')}
                            sx={{ bgcolor: alpha('#10B981', 0.1), color: '#10B981', '&:hover': { bgcolor: alpha('#10B981', 0.2) } }}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject Leave">
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateStatus(req.id, 'rejected')}
                            sx={{ bgcolor: alpha('#EF4444', 0.1), color: '#EF4444', '&:hover': { bgcolor: alpha('#EF4444', 0.2) } }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.secondary">Decided</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
