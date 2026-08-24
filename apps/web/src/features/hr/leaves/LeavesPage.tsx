import { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Button, Tabs, Tab, Grid, Card, CardContent, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Stack, useTheme, alpha, Divider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import PolicyIcon from '@mui/icons-material/Policy';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PieChartIcon from '@mui/icons-material/PieChart';
import PeopleIcon from '@mui/icons-material/People';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ChartTooltip, Legend } from 'recharts';

import { useAppDispatch, useAppSelector } from '../../../hooks/storeHooks';
import { fetchLeaveRequests, updateLeaveRequestStatus, createLeaveRequest, deleteLeaveRequestApi } from '../../../services/api/hr';
import {
  setLeaveRequests,
  updateLeaveRequestStatus as setStatusInStore,
  addLeaveRequest,
  deleteLeaveRequest,
  addPolicy,
  updatePolicy,
  deletePolicy,
  LeaveRequest,
  LeavePolicy
} from '../../../store/hrSlice';
import { PageHeader } from '../../../components/PageHeader';
import { startLoading, stopLoading } from '../../../store/uiSlice';
import { isApiEnabled } from '../../../services/api/config';
import { ingestChatKnowledge } from '../../../services/api/knowledge';

export function LeavesPage() {
  const dispatch = useAppDispatch();
  const theme = useTheme();

  const requests = useAppSelector(s => s.hr.leaveRequests);
  const policies = useAppSelector(s => s.hr.policies);
  const companyPolicies = useAppSelector(s => s.hr.companyPolicies);
  const employees = useAppSelector(s => s.employees.items);
  const currentUser = useAppSelector(s => s.auth.user);

  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({ employeeId: '', leaveType: '', startDate: '', endDate: '', reason: '' });
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
  const [policyForm, setPolicyForm] = useState({ name: '', code: '', maxDays: 10, description: '' });

  useEffect(() => {
    if (isApiEnabled()) {
      dispatch(startLoading('Loading leave requests…'));
      fetchLeaveRequests()
        .then(data => dispatch(setLeaveRequests(data)))
        .catch(console.error)
        .finally(() => dispatch(stopLoading()));
    }
  }, [dispatch]);

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }), [requests]);

  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown';
  };

  const filteredRequests = useMemo(() => requests.filter(req => {
    const empName = getEmployeeName(req.employeeId).toLowerCase();
    return empName.includes(searchQuery.toLowerCase())
      && (statusFilter === 'all' || req.status === statusFilter)
      && (typeFilter === 'all' || req.leaveType === typeFilter);
  }), [requests, searchQuery, statusFilter, typeFilter, employees]);

  const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const approvedBy = currentUser?.id || 'admin';
      if (isApiEnabled()) {
        const updated = await updateLeaveRequestStatus(id, status);
        dispatch(setStatusInStore({ id, status, approvedBy: updated.approvedBy || approvedBy }));
      } else {
        dispatch(setStatusInStore({ id, status, approvedBy }));
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!window.confirm('Delete this leave request?')) return;
    try {
      if (isApiEnabled()) await deleteLeaveRequestApi(id);
      dispatch(deleteLeaveRequest(id));
    } catch (e) { console.error(e); }
  };

  const calculateDaysCount = (start: string, end: string) => {
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return diff < 0 ? 0 : Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleRequestSubmit = async () => {
    const { employeeId, leaveType, startDate, endDate, reason } = newRequest;
    if (!employeeId || !leaveType || !startDate || !endDate) return alert('Please fill all required fields.');
    const daysCount = calculateDaysCount(startDate, endDate);
    if (daysCount <= 0) return alert('End date must be on or after start date.');
    const payload = { employeeId, leaveType, startDate, endDate, daysCount, reason: reason || undefined };
    try {
      if (isApiEnabled()) {
        dispatch(addLeaveRequest(await createLeaveRequest(payload)));
      } else {
        dispatch(addLeaveRequest({ ...payload, reason: reason || null, id: `lr-${Date.now()}`, status: 'pending', approvedBy: null, createdAt: new Date().toISOString() }));
      }
      setRequestDialogOpen(false);
      setNewRequest({ employeeId: '', leaveType: '', startDate: '', endDate: '', reason: '' });
    } catch (e) { console.error(e); }
  };

  const handlePolicySubmit = () => {
    const { name, code, maxDays, description } = policyForm;
    if (!name || !code || maxDays <= 0) return alert('Fill required fields.');
    if (editingPolicy) {
      dispatch(updatePolicy({ ...editingPolicy, name, code, maxDays, description }));
    } else {
      dispatch(addPolicy({ name, code, maxDays, description }));
    }
    if (isApiEnabled()) {
      const nextLeave = editingPolicy
        ? policies.map((p) => (p.id === editingPolicy.id ? { ...p, name, code, maxDays, description } : p))
        : [...policies, { id: `pol-${Date.now()}`, name, code, maxDays, description }];
      void ingestChatKnowledge({
        hrPolicies: companyPolicies
          .filter((p) => p.status === 'active')
          .map((p) => ({
            id: p.id,
            title: p.title,
            category: p.category,
            version: p.version,
            effectiveDate: p.effectiveDate,
            content: p.content,
            status: p.status,
          })),
        leavePolicies: nextLeave.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          maxDays: p.maxDays,
          description: p.description,
        })),
      }).catch(() => {});
    }
    setPolicyDialogOpen(false);
    setEditingPolicy(null);
    setPolicyForm({ name: '', code: '', maxDays: 10, description: '' });
  };

  const chartData = useMemo(() => {
    const dist: Record<string, number> = {};
    requests.forEach(r => { dist[r.leaveType] = (dist[r.leaveType] || 0) + r.daysCount; });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [requests]);

  const COLORS = [theme.palette.primary.main, theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main, '#8884d8', '#82ca9d'];
  const today = new Date().toISOString().split('T')[0];
  const currentlyOnLeave = useMemo(() => requests.filter(r => r.status === 'approved' && today >= r.startDate && today <= r.endDate), [requests, today]);
  const upcomingLeaves = useMemo(() => requests.filter(r => r.status === 'approved' && r.startDate > today).sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 5), [requests, today]);

  return (
    <Box>
      <PageHeader
        title="Leave Management"
        subtitle="Configure policies, review employee leaves, and monitor department attendance stats."
        breadcrumbs={[{ label: 'HR Portal', to: '/hr' }, { label: 'Leave Management' }]}
      />

      <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ mt: 3, borderBottom: 1, borderColor: 'divider' }} textColor="primary" indicatorColor="primary">
        <Tab icon={<PendingActionsIcon fontSize="small" />} iconPosition="start" label="Leave Approvals" />
        <Tab icon={<PolicyIcon fontSize="small" />} iconPosition="start" label="Leave Policies" />
        <Tab icon={<CalendarMonthIcon fontSize="small" />} iconPosition="start" label="Leave Insights" />
      </Tabs>

      {activeTab === 0 && (
        <Box sx={{ mt: 3 }}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              { label: 'Total Requests', value: stats.total, icon: <EventAvailableIcon />, color: 'primary' },
              { label: 'Pending Review', value: stats.pending, icon: <PendingActionsIcon />, color: 'warning' },
              { label: 'Approved Leaves', value: stats.approved, icon: <CheckCircleOutlineIcon />, color: 'success' },
              { label: 'Rejected Leaves', value: stats.rejected, icon: <HighlightOffIcon />, color: 'error' },
            ].map(stat => (
              <Grid item xs={12} sm={6} md={3} key={stat.label}>
                <Card sx={{ bgcolor: alpha(theme.palette[stat.color as 'primary'].main, 0.04), border: '1px solid', borderColor: alpha(theme.palette[stat.color as 'primary'].main, 0.12) }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette[stat.color as 'primary'].main, 0.1), color: `${stat.color}.main` }}>
                      {stat.icon}
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>{stat.label}</Typography>
                      <Typography variant="h5" fontWeight={700} color={`${stat.color}.main`}>{stat.value}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Paper sx={{ p: 2, mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', borderRadius: 2 }}>
            <Stack direction="row" spacing={2} sx={{ flex: 1, minWidth: 280 }}>
              <TextField size="small" label="Search Employee" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} sx={{ maxWidth: 300, flex: 1 }} />
              <TextField select size="small" label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ width: 130 }}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </TextField>
              <TextField select size="small" label="Leave Type" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} sx={{ width: 150 }}>
                <MenuItem value="all">All Types</MenuItem>
                {policies.map(p => <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>)}
              </TextField>
            </Stack>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setRequestDialogOpen(true)}>Submit Leave Request</Button>
          </Paper>

          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {['Employee', 'Leave Type', 'Dates', 'Days', 'Reason', 'Submitted On', 'Status', 'Actions'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 600 }} align={h === 'Actions' ? 'right' : 'left'}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No leave requests match filters.</Typography></TableCell></TableRow>
                  ) : filteredRequests.map(req => (
                    <TableRow key={req.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{getEmployeeName(req.employeeId)}</TableCell>
                      <TableCell>{req.leaveType}</TableCell>
                      <TableCell>{req.startDate} → {req.endDate}</TableCell>
                      <TableCell>{req.daysCount}d</TableCell>
                      <TableCell sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.reason || '—'}</TableCell>
                      <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip label={req.status} color={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'error' : 'warning'} size="small" sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          {req.status === 'pending' && (
                            <>
                              <IconButton color="success" onClick={() => handleStatusUpdate(req.id, 'approved')}><CheckCircleIcon fontSize="small" /></IconButton>
                              <IconButton color="error" onClick={() => handleStatusUpdate(req.id, 'rejected')}><CancelIcon fontSize="small" /></IconButton>
                            </>
                          )}
                          <IconButton onClick={() => handleDeleteRequest(req.id)}><DeleteIcon fontSize="small" /></IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {activeTab === 1 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={700}>Leave Categories</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingPolicy(null); setPolicyForm({ name: '', code: '', maxDays: 10, description: '' }); setPolicyDialogOpen(true); }}>Add Policy</Button>
          </Box>
          <Grid container spacing={3}>
            {policies.map(policy => (
              <Grid item xs={12} sm={6} md={4} key={policy.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="h6" fontWeight={700}>{policy.name}</Typography>
                      <Chip label={policy.code} color="primary" size="small" sx={{ fontWeight: 700 }} />
                    </Stack>
                    <Typography variant="body2" color="primary.main" fontWeight={600} gutterBottom>Max: {policy.maxDays} days/year</Typography>
                    <Typography variant="body2" color="text.secondary">{policy.description || 'No description.'}</Typography>
                  </CardContent>
                  <Divider />
                  <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <IconButton size="small" color="primary" onClick={() => { setEditingPolicy(policy); setPolicyForm({ name: policy.name, code: policy.code, maxDays: policy.maxDays, description: policy.description }); setPolicyDialogOpen(true); }}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => { if (window.confirm('Delete policy?')) dispatch(deletePolicy(policy.id)); }}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {activeTab === 2 && (
        <Box sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Stack spacing={3}>
                <Paper sx={{ p: 3, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                    <PeopleIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>Currently Out of Office ({currentlyOnLeave.length})</Typography>
                  </Stack>
                  {currentlyOnLeave.length === 0 ? <Typography color="text.secondary" variant="body2">No employees on leave today.</Typography> : (
                    <Table size="small">
                      <TableHead><TableRow>{['Employee', 'Leave Type', 'Until', 'Days'].map(h => <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>)}</TableRow></TableHead>
                      <TableBody>
                        {currentlyOnLeave.map(l => (
                          <TableRow key={l.id}><TableCell sx={{ fontWeight: 500 }}>{getEmployeeName(l.employeeId)}</TableCell><TableCell>{l.leaveType}</TableCell><TableCell>{l.endDate}</TableCell><TableCell>{l.daysCount}d</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Paper>
                <Paper sx={{ p: 3, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                    <CalendarMonthIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>Upcoming Leaves</Typography>
                  </Stack>
                  {upcomingLeaves.length === 0 ? <Typography color="text.secondary" variant="body2">No upcoming approved leaves.</Typography> : (
                    <Table size="small">
                      <TableHead><TableRow>{['Employee', 'Type', 'Start', 'Days'].map(h => <TableCell key={h} sx={{ fontWeight: 600 }}>{h}</TableCell>)}</TableRow></TableHead>
                      <TableBody>
                        {upcomingLeaves.map(l => (
                          <TableRow key={l.id}><TableCell sx={{ fontWeight: 500 }}>{getEmployeeName(l.employeeId)}</TableCell><TableCell>{l.leaveType}</TableCell><TableCell>{l.startDate}</TableCell><TableCell>{l.daysCount}d</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Paper>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <PieChartIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>Leave Type Distribution</Typography>
                </Stack>
                <Box sx={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="45%" innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value">
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip formatter={(v) => [`${v} Days`, 'Time Off']} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Leave Request Dialog */}
      <Dialog open={requestDialogOpen} onClose={() => setRequestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New Leave Application</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField select fullWidth label="Select Employee" value={newRequest.employeeId} onChange={e => setNewRequest(p => ({ ...p, employeeId: e.target.value }))} required>
              {employees.map(emp => <MenuItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeNumber})</MenuItem>)}
            </TextField>
            <TextField select fullWidth label="Leave Type" value={newRequest.leaveType} onChange={e => setNewRequest(p => ({ ...p, leaveType: e.target.value }))} required>
              {policies.map(p => <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>)}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="Start Date" type="date" InputLabelProps={{ shrink: true }} value={newRequest.startDate} onChange={e => setNewRequest(p => ({ ...p, startDate: e.target.value }))} required />
              <TextField fullWidth label="End Date" type="date" InputLabelProps={{ shrink: true }} value={newRequest.endDate} onChange={e => setNewRequest(p => ({ ...p, endDate: e.target.value }))} required />
            </Stack>
            {newRequest.startDate && newRequest.endDate && (
              <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1.5 }}>
                <Typography variant="body2" color="primary.main" fontWeight={600}>Duration: {calculateDaysCount(newRequest.startDate, newRequest.endDate)} days</Typography>
              </Box>
            )}
            <TextField fullWidth label="Reason" multiline rows={3} value={newRequest.reason} onChange={e => setNewRequest(p => ({ ...p, reason: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setRequestDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleRequestSubmit} variant="contained">Submit Request</Button>
        </DialogActions>
      </Dialog>

      {/* Policy Dialog */}
      <Dialog open={policyDialogOpen} onClose={() => setPolicyDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingPolicy ? 'Modify Leave Policy' : 'Create Leave Category'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField fullWidth label="Policy Name" value={policyForm.name} onChange={e => setPolicyForm(p => ({ ...p, name: e.target.value }))} required />
            <TextField fullWidth label="Policy Code" value={policyForm.code} onChange={e => setPolicyForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} required />
            <TextField fullWidth label="Max Days / Year" type="number" value={policyForm.maxDays} onChange={e => setPolicyForm(p => ({ ...p, maxDays: parseInt(e.target.value) || 0 }))} required />
            <TextField fullWidth label="Description" multiline rows={2} value={policyForm.description} onChange={e => setPolicyForm(p => ({ ...p, description: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setPolicyDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handlePolicySubmit} variant="contained">Save Policy</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default LeavesPage;
