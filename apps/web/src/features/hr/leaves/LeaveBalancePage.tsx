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
  Avatar,
  Stack,
  TextField,
  MenuItem,
  alpha,
  useTheme,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import TuneIcon from '@mui/icons-material/Tune';
import { PageHeader } from '../../../components/PageHeader';
import { useAppDispatch, useAppSelector, useAuthUser } from '../../../hooks/storeHooks';
import {
  adjustEmployeeBalance,
  initialLeaveBalances,
  type EmployeeLeaveBalance,
} from '../../../store/hrSlice';

export function LeaveBalancePage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dispatch = useAppDispatch();
  const user = useAuthUser();

  const rawBalances = useAppSelector((s) => s.hr?.leaveBalances);
  const balances = rawBalances && rawBalances.length > 0 ? rawBalances : initialLeaveBalances;
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  // Adjust dialog state
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<EmployeeLeaveBalance | null>(null);
  const [adjustType, setAdjustType] = useState('Casual Leave (CL)');
  const [adjustDays, setAdjustDays] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isHrAdmin =
    user?.role === 'tenant_admin' ||
    user?.role === 'hr_admin' ||
    user?.role === 'platform_admin';

  const filtered = useMemo(() => {
    return balances.filter((b) => {
      if (deptFilter !== 'all' && b.departmentName !== deptFilter) return false;
      const matchSearch =
        (b.employeeName || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.jobTitle || '').toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [balances, deptFilter, search]);

  const handleOpenAdjust = (emp: EmployeeLeaveBalance) => {
    setSelectedEmp(emp);
    setAdjustType('Casual Leave (CL)');
    setAdjustDays(1);
    setAdjustReason('');
    setAdjustOpen(true);
  };

  const handleSaveAdjustment = () => {
    if (!selectedEmp) return;
    dispatch(
      adjustEmployeeBalance({
        employeeId: selectedEmp.employeeId,
        leaveType: adjustType,
        deltaDays: adjustDays,
      }),
    );
    setSuccessMsg(
      `Adjusted ${adjustType} for ${selectedEmp.employeeName} by ${adjustDays > 0 ? `+${adjustDays}` : adjustDays} days.`,
    );
    setAdjustOpen(false);
  };

  const handleExportCSV = () => {
    const headers = [
      'Employee Name',
      'Department',
      'Job Title',
      'Casual Quota',
      'Casual Used',
      'Sick Quota',
      'Sick Used',
      'Privilege Quota',
      'Privilege Used',
      'Comp-Off Quota',
      'Optional Quota',
      'Optional Used',
      'Total Remaining',
    ];
    const rows = filtered.map((b) => {
      const remaining =
        b.casualTotal -
        b.casualUsed +
        (b.sickTotal - b.sickUsed) +
        (b.earnedTotal - b.earnedUsed) +
        (b.compOffTotal - b.compOffUsed) +
        ((b.optionalTotal ?? 3) - (b.optionalUsed ?? 1));
      return [
        b.employeeName,
        b.departmentName,
        b.jobTitle,
        b.casualTotal,
        b.casualUsed,
        b.sickTotal,
        b.sickUsed,
        b.earnedTotal,
        b.earnedUsed,
        b.compOffTotal,
        b.optionalTotal ?? 3,
        b.optionalUsed ?? 1,
        remaining,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leave_balances_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Employee Leave Balances & Quotas"
        subtitle="Annual quota entitlement tracking, usage progress, and HR balance adjustments"
        actions={
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            sx={{
              bgcolor: '#10B981',
              '&:hover': { bgcolor: '#059669' },
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            Export Balances CSV
          </Button>
        }
      />

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* Filter bar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3, mt: 1 }}>
        <TextField
          size="small"
          placeholder="Search employee by name or job title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: 380 }}
        />
        <TextField
          select
          size="small"
          label="Department"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">All Departments</MenuItem>
          <MenuItem value="Engineering">Engineering</MenuItem>
          <MenuItem value="Human Resources">Human Resources</MenuItem>
          <MenuItem value="Sales">Sales</MenuItem>
          <MenuItem value="Finance">Finance</MenuItem>
          <MenuItem value="Operations">Operations</MenuItem>
        </TextField>
      </Stack>

      {/* Table */}
      <Card sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee & Department</TableCell>
                <TableCell>Casual (CL)</TableCell>
                <TableCell>Privilege (PL)</TableCell>
                <TableCell>Optional (OL)</TableCell>
                <TableCell>Comp-Off</TableCell>
                <TableCell>Sick (SL)</TableCell>
                <TableCell>Total Remaining</TableCell>
                <TableCell>Annual Quota Progress</TableCell>
                {isHrAdmin && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((emp) => {
                const totalQuota =
                  emp.casualTotal +
                  emp.sickTotal +
                  emp.earnedTotal +
                  emp.compOffTotal +
                  (emp.optionalTotal ?? 3);
                const totalUsed =
                  emp.casualUsed +
                  emp.sickUsed +
                  emp.earnedUsed +
                  emp.compOffUsed +
                  (emp.optionalUsed ?? 1);
                const remaining = Math.max(0, totalQuota - totalUsed);
                const utilPercent = totalQuota > 0 ? Math.round((totalUsed / totalQuota) * 100) : 0;

                return (
                  <TableRow key={emp.employeeId} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: '#10B981', fontSize: '0.85rem', fontWeight: 700 }}>
                          {emp.employeeName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>
                            {emp.employeeName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {emp.departmentName} · {emp.jobTitle}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ fontWeight: 600 }}>
                      {emp.casualTotal - emp.casualUsed} / {emp.casualTotal}
                      {emp.casualPending > 0 && (
                        <Typography variant="caption" color="#F59E0B" display="block">
                          ({emp.casualPending} pending)
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 600 }}>
                      {emp.earnedTotal - emp.earnedUsed} / {emp.earnedTotal}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 600 }}>
                      {(emp.optionalTotal ?? 3) - (emp.optionalUsed ?? 1)} / {emp.optionalTotal ?? 3}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 600 }}>
                      {emp.compOffTotal - emp.compOffUsed} / {emp.compOffTotal}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 600 }}>
                      {emp.sickTotal - emp.sickUsed} / {emp.sickTotal}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 800, color: '#10B981' }}>
                      {remaining} Days Left
                    </TableCell>

                    <TableCell sx={{ minWidth: 160 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <LinearProgress
                          variant="determinate"
                          value={utilPercent}
                          sx={{
                            flexGrow: 1,
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha('#10B981', 0.15),
                            '& .MuiLinearProgress-bar': {
                              bgcolor: utilPercent > 75 ? '#F59E0B' : '#10B981',
                            },
                          }}
                        />
                        <Typography variant="caption" fontWeight={700}>
                          {utilPercent}%
                        </Typography>
                      </Box>
                    </TableCell>

                    {isHrAdmin && (
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<TuneIcon sx={{ fontSize: 14 }} />}
                          onClick={() => handleOpenAdjust(emp)}
                          sx={{ textTransform: 'none', borderRadius: '8px', fontSize: '0.75rem' }}
                        >
                          Adjust
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Adjust Dialog */}
      <Dialog open={adjustOpen} onClose={() => setAdjustOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '20px' } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Adjust Leave Quota
          <Typography variant="caption" color="text.secondary" display="block">
            {selectedEmp?.employeeName} ({selectedEmp?.departmentName})
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              select
              label="Leave Type"
              size="small"
              value={adjustType}
              onChange={(e) => setAdjustType(e.target.value)}
              fullWidth
            >
              <MenuItem value="Casual Leave (CL)">Casual Leave (CL)</MenuItem>
              <MenuItem value="Privilege Leave (PL / EL)">Privilege Leave (PL / EL)</MenuItem>
              <MenuItem value="Optional Leave / Floating Holiday (OL)">Optional Leave / Floating Holiday (OL)</MenuItem>
              <MenuItem value="Compensatory Off (Compensation Leave)">Compensatory Off (Compensation Leave)</MenuItem>
              <MenuItem value="Sick / Medical Leave (SL)">Sick / Medical Leave (SL)</MenuItem>
              <MenuItem value="Maternity Leave (ML)">Maternity Leave (ML)</MenuItem>
              <MenuItem value="Paternity Leave (PL)">Paternity Leave (PL)</MenuItem>
              <MenuItem value="Bereavement / Compassionate Leave (BL)">Bereavement / Compassionate Leave (BL)</MenuItem>
              <MenuItem value="Marriage / Wedding Leave (WL)">Marriage / Wedding Leave (WL)</MenuItem>
              <MenuItem value="Adoption Leave (AL)">Adoption Leave (AL)</MenuItem>
              <MenuItem value="Leave Without Pay / Loss of Pay (LWP)">Leave Without Pay / Loss of Pay (LWP)</MenuItem>
              <MenuItem value="Sabbatical / Study Leave (SAB)">Sabbatical / Study Leave (SAB)</MenuItem>
            </TextField>

            <TextField
              label="Credit / Debit Days"
              type="number"
              size="small"
              helperText="Use positive numbers to add days (e.g. +2 for comp-off reward); negative numbers to deduct."
              value={adjustDays}
              onChange={(e) => setAdjustDays(Number(e.target.value))}
              fullWidth
            />

            <TextField
              label="Audit Reason"
              size="small"
              multiline
              rows={2}
              placeholder="e.g. Granted comp-off for Sunday emergency deployment."
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAdjustOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAdjustment}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            Apply Adjustment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
