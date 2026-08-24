import { useMemo } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Stack, Chip, Avatar,
  LinearProgress, Button, Divider, alpha, useTheme, Paper
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GavelIcon from '@mui/icons-material/Gavel';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LaptopIcon from '@mui/icons-material/Laptop';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/storeHooks';
import { PageHeader } from '../../components/PageHeader';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

const RATING_LABELS: Record<number, string> = { 1: 'Poor', 2: 'Below Avg', 3: 'Average', 4: 'Good', 5: 'Excellent' };
const RATING_COLORS: Record<number, string> = { 1: '#ef5350', 2: '#ff9800', 3: '#ffc107', 4: '#66bb6a', 5: '#42a5f5' };
const STATUS_COLORS = {
  present: '#4caf50', absent: '#f44336', wfh: '#2196f3', half_day: '#ff9800', on_leave: '#9c27b0',
};

export function HRPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const employees = useAppSelector(s => s.employees.items);
  const departments = useAppSelector(s => s.departments.items);
  const leaveRequests = useAppSelector(s => s.hr.leaveRequests);
  const companyPolicies = useAppSelector(s => s.hr.companyPolicies);
  const reviews = useAppSelector(s => s.performance.reviews);
  const goals = useAppSelector(s => s.performance.goals);
  const attendanceRecords = useAppSelector(s => s.attendance.records);
  const timesheets = useAppSelector(s => s.attendance.timesheets);
  const onboardings = useAppSelector(s => s.onboarding.onboardings);
  const expenses = useAppSelector(s => s.expenses.claims);
  const assets = useAppSelector(s => s.assets.items);

  const today = new Date().toISOString().split('T')[0];

  // Stats
  const stats = useMemo(() => {
    const activeEmp = employees.filter(e => e.status === 'active').length;
    const pendingLeaves = leaveRequests.filter(r => r.status === 'pending').length;
    const onLeaveToday = leaveRequests.filter(r => r.status === 'approved' && today >= r.startDate && today <= r.endDate).length;
    const pendingTimesheets = timesheets.filter(t => t.status === 'submitted').length;
    const activeOnboardings = onboardings.filter(o => o.status === 'in_progress').length;
    const pendingExpenses = expenses.filter(e => e.status === 'submitted').length;
    const pendingReviews = reviews.filter(r => r.status === 'in_progress').length;
    const policiesNeedingAck = companyPolicies.filter(p => p.requiresAcknowledgement && p.status === 'active').length;
    const assignedAssets = assets.filter(a => a.assignedEmployeeId).length;
    return { activeEmp, pendingLeaves, onLeaveToday, pendingTimesheets, activeOnboardings, pendingExpenses, pendingReviews, policiesNeedingAck, assignedAssets };
  }, [employees, leaveRequests, timesheets, onboardings, expenses, reviews, companyPolicies, assets, today]);

  // Today's attendance summary
  const todayAttendance = useMemo(() => {
    const todayRecs = attendanceRecords.filter(r => r.date === today);
    const counts = { present: 0, absent: 0, wfh: 0, half_day: 0, on_leave: 0 };
    todayRecs.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return counts;
  }, [attendanceRecords, today]);

  // Department headcount
  const deptData = useMemo(() => {
    return departments.map(d => ({
      name: d.name.length > 12 ? d.name.substring(0, 12) + '…' : d.name,
      count: employees.filter(e => e.departmentId === d.id && e.status === 'active').length,
    })).filter(d => d.count > 0);
  }, [departments, employees]);

  // Leave type distribution
  const leaveChartData = useMemo(() => {
    const dist: Record<string, number> = {};
    leaveRequests.forEach(r => { dist[r.leaveType] = (dist[r.leaveType] || 0) + r.daysCount; });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [leaveRequests]);

  // Performance rating distribution
  const ratingDist = useMemo(() => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.filter(r => r.rating !== null).forEach(r => { if (r.rating) dist[r.rating]++; });
    return Object.entries(dist).map(([rating, count]) => ({ rating: RATING_LABELS[Number(rating)], count, fill: RATING_COLORS[Number(rating)] }));
  }, [reviews]);

  const CHART_COLORS = [theme.palette.primary.main, theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main, '#8884d8', '#82ca9d'];

  const modules = [
    { label: 'Leave Management', desc: `${stats.pendingLeaves} pending approvals`, icon: <EventAvailableIcon />, color: '#667eea', to: '/hr/leaves', badge: stats.pendingLeaves },
    { label: 'Attendance', desc: `${stats.pendingTimesheets} timesheets pending`, icon: <AccessTimeIcon />, color: '#f093fb', to: '/hr/attendance', badge: stats.pendingTimesheets },
    { label: 'Onboarding', desc: `${stats.activeOnboardings} active onboardings`, icon: <RocketLaunchIcon />, color: '#4facfe', to: '/hr/onboarding', badge: stats.activeOnboardings },
    { label: 'Performance', desc: `${stats.pendingReviews} reviews in progress`, icon: <EmojiEventsIcon />, color: '#43e97b', to: '/hr/performance', badge: stats.pendingReviews },
    { label: 'Company Policies', desc: `${stats.policiesNeedingAck} active policies`, icon: <GavelIcon />, color: '#fa709a', to: '/hr/policies', badge: 0 },
    { label: 'Expense Claims', desc: `${stats.pendingExpenses} awaiting approval`, icon: <AttachMoneyIcon />, color: '#f7971e', to: '/it-spend?tab=expenses', badge: stats.pendingExpenses },
    { label: 'Employees', desc: `${stats.activeEmp} active employees`, icon: <PeopleIcon />, color: '#a18cd1', to: '/hr/employees', badge: 0 },
    { label: 'IT Assets', desc: `${stats.assignedAssets} assigned assets`, icon: <LaptopIcon />, color: '#0ba360', to: '/assets', badge: 0 },
  ];

  return (
    <Box>
      <PageHeader
        title="HR Dashboard"
        subtitle="Real-time overview of workforce, leave, performance, compliance and more."
        breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: 'HR Portal' }]}
      />

      {/* KPI Row */}
      <Grid container spacing={2.5} sx={{ mt: 2, mb: 3 }}>
        {[
          { label: 'Active Employees', value: stats.activeEmp, icon: <PeopleIcon />, color: '#667eea', sub: `${employees.length} total` },
          { label: 'On Leave Today', value: stats.onLeaveToday, icon: <EventAvailableIcon />, color: '#f093fb', sub: 'Approved absences' },
          { label: 'Pending Reviews', value: stats.pendingReviews, icon: <EmojiEventsIcon />, color: '#43e97b', sub: 'Performance reviews' },
          { label: 'Expense Claims', value: stats.pendingExpenses, icon: <AttachMoneyIcon />, color: '#f7971e', sub: 'Awaiting approval' },
        ].map(kpi => (
          <Grid item xs={12} sm={6} md={3} key={kpi.label}>
            <Card sx={{
              background: `linear-gradient(135deg, ${kpi.color}22 0%, ${kpi.color}08 100%)`,
              border: `1px solid ${kpi.color}33`,
              borderRadius: 3,
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${kpi.color}22` },
            }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: kpi.color, width: 48, height: 48, boxShadow: `0 4px 12px ${kpi.color}44` }}>
                    {kpi.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                      {kpi.label}
                    </Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ color: kpi.color, lineHeight: 1 }}>
                      {kpi.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{kpi.sub}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Today's Attendance + Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Attendance Summary */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
              <AccessTimeIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>Today's Attendance</Typography>
            </Stack>
            <Stack spacing={1.5}>
              {Object.entries(todayAttendance).map(([status, count]) => (
                <Box key={status}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_COLORS[status as keyof typeof STATUS_COLORS] }} />
                      <Typography variant="body2" textTransform="capitalize" fontWeight={500}>{status.replace('_', ' ')}</Typography>
                    </Stack>
                    <Typography variant="body2" fontWeight={700}>{count}</Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={employees.length > 0 ? (count / employees.length) * 100 : 0}
                    sx={{
                      height: 6, borderRadius: 3,
                      bgcolor: alpha(STATUS_COLORS[status as keyof typeof STATUS_COLORS], 0.15),
                      '& .MuiLinearProgress-bar': { bgcolor: STATUS_COLORS[status as keyof typeof STATUS_COLORS], borderRadius: 3 }
                    }}
                  />
                </Box>
              ))}
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/hr/attendance')} sx={{ fontWeight: 600 }}>
              View Full Attendance
            </Button>
          </Paper>
        </Grid>

        {/* Department Headcount */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
              <TrendingUpIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>Headcount by Department</Typography>
            </Stack>
            <Box sx={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Employees" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Leave Distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
              <EventAvailableIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>Leave Distribution</Typography>
            </Stack>
            <Box sx={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={leaveChartData} cx="50%" cy="45%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {leaveChartData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} days`, '']} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Module Quick Access Grid */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Quick Access</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {modules.map(mod => (
          <Grid item xs={12} sm={6} md={3} key={mod.label}>
            <Card
              onClick={() => navigate(mod.to)}
              sx={{
                cursor: 'pointer',
                borderRadius: 3,
                border: `1px solid ${alpha(mod.color, 0.2)}`,
                background: `linear-gradient(135deg, ${alpha(mod.color, 0.08)} 0%, ${alpha(mod.color, 0.03)} 100%)`,
                transition: 'all 0.2s',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 8px 24px ${alpha(mod.color, 0.25)}`, borderColor: mod.color },
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Avatar sx={{ bgcolor: mod.color, width: 40, height: 40 }}>
                    {mod.icon}
                  </Avatar>
                  {mod.badge > 0 && (
                    <Chip label={mod.badge} size="small" sx={{ bgcolor: mod.color, color: '#fff', fontWeight: 700, height: 22 }} />
                  )}
                </Stack>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1.5, mb: 0.5 }}>{mod.label}</Typography>
                <Typography variant="caption" color="text.secondary">{mod.desc}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Bottom: Performance Ratings + Recent Goals */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
              <EmojiEventsIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>Performance Rating Distribution</Typography>
            </Stack>
            <Box sx={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingDist} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="rating" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Employees" radius={[4, 4, 0, 0]}>
                    {ratingDist.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <CheckCircleIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>Active Goals</Typography>
              </Stack>
              <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/hr/performance')} sx={{ fontWeight: 600 }}>
                View All
              </Button>
            </Stack>
            <Stack spacing={1.5}>
              {goals.filter(g => g.status === 'in_progress').slice(0, 4).map(goal => (
                <Box key={goal.id}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: '70%' }}>{goal.title}</Typography>
                    <Typography variant="caption" fontWeight={700} color={goal.progress >= 80 ? 'success.main' : goal.progress >= 50 ? 'primary.main' : 'warning.main'}>
                      {goal.progress}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={goal.progress}
                    sx={{
                      height: 6, borderRadius: 3,
                      '& .MuiLinearProgress-bar': { borderRadius: 3 }
                    }}
                    color={goal.progress >= 80 ? 'success' : goal.progress >= 50 ? 'primary' : 'warning'}
                  />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default HRPage;
