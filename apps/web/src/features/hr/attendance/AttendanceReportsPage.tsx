import { useState } from 'react';
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
  Stack,
  TextField,
  MenuItem,
  alpha,
  useTheme,
  LinearProgress,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { PageHeader } from '../../../components/PageHeader';
import { BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

const CHART_DATA = [
  { name: 'Mon', present: 42, wfh: 6, onLeave: 2 },
  { name: 'Tue', present: 45, wfh: 4, onLeave: 1 },
  { name: 'Wed', present: 44, wfh: 5, onLeave: 1 },
  { name: 'Thu', present: 43, wfh: 6, onLeave: 1 },
  { name: 'Fri', present: 38, wfh: 10, onLeave: 2 },
];

const DEPT_SUMMARY = [
  { department: 'Engineering', total: 24, avgAttendance: '97.2%', wfhRatio: '18%', overtimeHours: '42h' },
  { department: 'Human Resources', total: 6, avgAttendance: '98.5%', wfhRatio: '12%', overtimeHours: '8h' },
  { department: 'Finance & Accounting', total: 8, avgAttendance: '96.8%', wfhRatio: '10%', overtimeHours: '15h' },
  { department: 'IT & Infrastructure', total: 7, avgAttendance: '99.1%', wfhRatio: '15%', overtimeHours: '28h' },
  { department: 'Customer Operations', total: 10, avgAttendance: '95.4%', wfhRatio: '22%', overtimeHours: '19h' },
];

export function AttendanceReportsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [period, setPeriod] = useState('October 2026');

  const handleExport = () => {
    alert('Exporting attendance report as CSV/PDF spreadsheet...');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Attendance & Timesheet Reports"
        subtitle="Comprehensive monthly work-hour aggregates, departmental attendance trends, and overtime logs"
        actions={
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            sx={{
              bgcolor: '#10B981',
              '&:hover': { bgcolor: '#059669' },
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            Export Attendance CSV
          </Button>
        }
      />

      {/* Filter and Period */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, mt: 1 }}>
        <TextField
          select
          size="small"
          label="Report Period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="October 2026">October 2026 (Current)</MenuItem>
          <MenuItem value="September 2026">September 2026</MenuItem>
          <MenuItem value="August 2026">August 2026</MenuItem>
          <MenuItem value="Q3 2026">Q3 2026 Summary</MenuItem>
        </TextField>
      </Stack>

      {/* Chart and Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ p: 3, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
              Weekly Presence & Distribution
            </Typography>
            <Box sx={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={CHART_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
                  <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
                  <YAxis stroke={theme.palette.text.secondary} />
                  <ChartTooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                      borderRadius: 12,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Legend />
                  <Bar dataKey="present" name="In Office" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="wfh" name="Remote / WFH" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="onLeave" name="On Leave" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={2}>
            <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4', border: `1px solid ${alpha('#10B981', 0.25)}` }}>
              <Typography variant="caption" fontWeight={700} color="#10B981">AVERAGE COMPLIANCE</Typography>
              <Typography variant="h3" fontWeight={800} sx={{ mt: 0.5 }}>97.4%</Typography>
              <Typography variant="caption" color="text.secondary">+1.2% compared to last cycle</Typography>
            </Card>
            <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF', border: `1px solid ${alpha('#6366F1', 0.25)}` }}>
              <Typography variant="caption" fontWeight={700} color="#6366F1">TOTAL LOGGED HOURS</Typography>
              <Typography variant="h3" fontWeight={800} sx={{ mt: 0.5 }}>8,420h</Typography>
              <Typography variant="caption" color="text.secondary">Across 55 active employees</Typography>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Department Breakdown Table */}
      <Card sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={800}>Department Attendance Metrics</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Department</TableCell>
                <TableCell>Headcount</TableCell>
                <TableCell>Average Attendance</TableCell>
                <TableCell>WFH Ratio</TableCell>
                <TableCell>Overtime Logged</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {DEPT_SUMMARY.map((row) => (
                <TableRow key={row.department} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{row.department}</TableCell>
                  <TableCell>{row.total} members</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="body2" fontWeight={700} color="#10B981">{row.avgAttendance}</Typography>
                      <LinearProgress variant="determinate" value={parseFloat(row.avgAttendance)} sx={{ width: 80, height: 6, borderRadius: 3, bgcolor: alpha('#10B981', 0.2), '& .MuiLinearProgress-bar': { bgcolor: '#10B981' } }} />
                    </Box>
                  </TableCell>
                  <TableCell>{row.wfhRatio}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{row.overtimeHours}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
