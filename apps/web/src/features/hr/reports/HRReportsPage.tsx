import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Stack,
  alpha,
  useTheme,
  LinearProgress,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupsIcon from '@mui/icons-material/Groups';
import PieChartIcon from '@mui/icons-material/PieChart';
import { PageHeader } from '../../../components/PageHeader';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const GROWTH_DATA = [
  { month: 'May 26', headcount: 38 },
  { month: 'Jun 26', headcount: 42 },
  { month: 'Jul 26', headcount: 45 },
  { month: 'Aug 26', headcount: 49 },
  { month: 'Sep 26', headcount: 52 },
  { month: 'Oct 26', headcount: 55 },
];

const DEPT_DISTRIBUTION = [
  { name: 'Engineering', value: 24, color: '#6366F1' },
  { name: 'Operations', value: 10, color: '#06B6D4' },
  { name: 'Finance', value: 8, color: '#F59E0B' },
  { name: 'IT Infrastructure', value: 7, color: '#EC4899' },
  { name: 'Human Resources', value: 6, color: '#10B981' },
];

export function HRReportsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleExport = () => {
    alert('Generating & downloading comprehensive HR Executive Analytics Dossier (PDF/Excel)...');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="HR Analytics & Executive Reports"
        subtitle="Deep-dive telemetry on organization headcount growth, attrition rates, gender diversity, and team allocations"
        actions={
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            Export Dossier
          </Button>
        }
      />

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4, mt: 1 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4', border: `1px solid ${alpha('#10B981', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#10B981">TOTAL HEADCOUNT</Typography>
            <Typography variant="h3" fontWeight={800} sx={{ mt: 0.5 }}>55</Typography>
            <Typography variant="caption" color="text.secondary">+17 new hires in last 6 months</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF', border: `1px solid ${alpha('#6366F1', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#6366F1">ANNUAL ATTRITION</Typography>
            <Typography variant="h3" fontWeight={800} sx={{ mt: 0.5 }}>4.2%</Typography>
            <Typography variant="caption" color="text.secondary">Well below tech benchmark (12%)</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(6, 182, 212, 0.08)' : '#ECFEFF', border: `1px solid ${alpha('#06B6D4', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#06B6D4">AVG TENURE</Typography>
            <Typography variant="h3" fontWeight={800} sx={{ mt: 0.5 }}>2.8 yrs</Typography>
            <Typography variant="caption" color="text.secondary">Strong retention rate</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB', border: `1px solid ${alpha('#F59E0B', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#F59E0B">OFFER ACCEPTANCE</Typography>
            <Typography variant="h3" fontWeight={800} sx={{ mt: 0.5 }}>92%</Typography>
            <Typography variant="caption" color="text.secondary">11 of 12 candidate offers accepted</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={7}>
          <Card sx={{ p: 3, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
              Organization Headcount Trajectory
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={GROWTH_DATA}>
                  <defs>
                    <linearGradient id="headcountGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
                  <XAxis dataKey="month" stroke={theme.palette.text.secondary} />
                  <YAxis stroke={theme.palette.text.secondary} domain={[30, 65]} />
                  <ChartTooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                      borderRadius: 12,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Area type="monotone" dataKey="headcount" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#headcountGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card sx={{ p: 3, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
              Department Headcount Share
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={DEPT_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {DEPT_DISTRIBUTION.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                      borderRadius: 12,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
