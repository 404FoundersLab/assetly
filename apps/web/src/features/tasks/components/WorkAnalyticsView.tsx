import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Stack,
  alpha,
  useTheme,
  LinearProgress,
} from '@mui/material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';
import type { EmployeeTask } from '../../../types';

interface WorkAnalyticsViewProps {
  tasks: EmployeeTask[];
}

const STATUS_COLORS: Record<string, string> = {
  todo: '#64748B',
  in_progress: '#F59E0B',
  in_review: '#8B5CF6',
  done: '#10B981',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#EF4444',
  high: '#F97316',
  medium: '#3B82F6',
  low: '#10B981',
};

export function WorkAnalyticsView({ tasks }: WorkAnalyticsViewProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Tasks by department
  const deptData = useMemo(() => {
    const map: Record<string, { total: number; done: number; inProgress: number }> = {};
    tasks.forEach((t) => {
      const dName = t.departmentName || 'General';
      if (!map[dName]) map[dName] = { total: 0, done: 0, inProgress: 0 };
      map[dName].total += 1;
      if (t.status === 'done') map[dName].done += 1;
      if (t.status === 'in_progress') map[dName].inProgress += 1;
    });
    return Object.entries(map).map(([name, val]) => ({
      name,
      total: val.total,
      completed: val.done,
      inProgress: val.inProgress,
    }));
  }, [tasks]);

  // Status breakdown
  const statusData = useMemo(() => {
    const counts: Record<string, number> = { todo: 0, in_progress: 0, in_review: 0, done: 0 };
    tasks.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return [
      { name: 'To Do', value: counts.todo, color: STATUS_COLORS.todo },
      { name: 'In Progress', value: counts.in_progress, color: STATUS_COLORS.in_progress },
      { name: 'In Review', value: counts.in_review, color: STATUS_COLORS.in_review },
      { name: 'Completed', value: counts.done, color: STATUS_COLORS.done },
    ];
  }, [tasks]);

  // Priority breakdown
  const priorityData = useMemo(() => {
    const counts: Record<string, number> = { urgent: 0, high: 0, medium: 0, low: 0 };
    tasks.forEach((t) => {
      counts[t.priority] = (counts[t.priority] || 0) + 1;
    });
    return [
      { name: 'Urgent', value: counts.urgent, color: PRIORITY_COLORS.urgent },
      { name: 'High', value: counts.high, color: PRIORITY_COLORS.high },
      { name: 'Medium', value: counts.medium, color: PRIORITY_COLORS.medium },
      { name: 'Low', value: counts.low, color: PRIORITY_COLORS.low },
    ];
  }, [tasks]);

  // Hours metrics
  const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const totalLogged = tasks.reduce((sum, t) => sum + (t.loggedHours || 0), 0);
  const completionRate =
    tasks.length > 0 ? Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100) : 0;

  return (
    <Box sx={{ mt: 1 }}>
      {/* Metric Highlights */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: 'Overall Completion Rate', value: `${completionRate}%`, color: '#10B981', sub: `${tasks.filter((t) => t.status === 'done').length} of ${tasks.length} closed` },
          { label: 'Total Hours Logged', value: `${totalLogged}h`, color: '#6366F1', sub: `${totalEstimated}h planned workload` },
          { label: 'Active In-Flight Tasks', value: tasks.filter((t) => t.status === 'in_progress').length, color: '#F59E0B', sub: 'Across 4 teams' },
          { label: 'In Review / QA Gate', value: tasks.filter((t) => t.status === 'in_review').length, color: '#8B5CF6', sub: 'Awaiting sign-off' },
        ].map((m) => (
          <Grid item xs={12} sm={6} md={3} key={m.label}>
            <Card
              sx={{
                p: 2.5,
                borderRadius: '16px',
                border: `1px solid ${alpha(m.color, 0.25)}`,
                background: isDark
                  ? `linear-gradient(135deg, ${alpha(m.color, 0.12)} 0%, rgba(15, 23, 42, 0.4) 100%)`
                  : `linear-gradient(135deg, ${alpha(m.color, 0.08)} 0%, #FFFFFF 100%)`,
              }}
            >
              <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">
                {m.label}
              </Typography>
              <Typography variant="h4" fontWeight={900} sx={{ color: m.color, my: 0.5, lineHeight: 1 }}>
                {m.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {m.sub}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={3}>
        {/* Department Workload Bar Chart */}
        <Grid item xs={12} md={7}>
          <Card
            sx={{
              p: 3,
              borderRadius: '16px',
              border: '1px solid',
              borderColor: theme.palette.divider,
              bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#FFFFFF',
              height: '100%',
            }}
          >
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>
              Department Task Deliverables
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Breakdown of total deliverables vs completed items by organizational department
            </Typography>

            <Box sx={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                  <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderRadius: 10,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="inProgress" name="In Progress" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total" name="Total Tasks" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>

        {/* Status Distribution Pie Chart */}
        <Grid item xs={12} md={5}>
          <Card
            sx={{
              p: 3,
              borderRadius: '16px',
              border: '1px solid',
              borderColor: theme.palette.divider,
              bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#FFFFFF',
              height: '100%',
            }}
          >
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>
              Task Workflow Stages
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Active pipeline distribution across stages
            </Typography>

            <Box sx={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderRadius: 10,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
