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
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import DownloadIcon from '@mui/icons-material/Download';
import { PageHeader } from '../../../components/PageHeader';
import { useAppSelector } from '../../../hooks/storeHooks';

export function LeaveBalancePage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const employees = useAppSelector((s) => s.employees.items);
  const [search, setSearch] = useState('');

  const balances = useMemo(() => {
    return employees.map((emp) => ({
      ...emp,
      casualTotal: 12,
      casualUsed: Math.floor(Math.random() * 6) + 1,
      sickTotal: 12,
      sickUsed: Math.floor(Math.random() * 4) + 1,
      earnedTotal: 18,
      earnedUsed: Math.floor(Math.random() * 8) + 2,
    }));
  }, [employees]);

  const filtered = useMemo(() => {
    return balances.filter((b) =>
      `${b.firstName} ${b.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      b.jobTitle.toLowerCase().includes(search.toLowerCase())
    );
  }, [balances, search]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Employee Leave Balances"
        subtitle="Annual quota utilization, accrued entitlements, and remaining leave bank by employee"
        actions={
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            Export Balances CSV
          </Button>
        }
      />

      {/* Search filter */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, mt: 1 }}>
        <TextField
          size="small"
          placeholder="Search employee by name or job title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: 380 }}
        />
      </Stack>

      {/* Table */}
      <Card sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Casual Leave (CL)</TableCell>
                <TableCell>Sick Leave (SL)</TableCell>
                <TableCell>Earned Leave (EL)</TableCell>
                <TableCell>Total Remaining</TableCell>
                <TableCell>Annual Quota Utilization</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((emp) => {
                const totalDays = emp.casualTotal + emp.sickTotal + emp.earnedTotal;
                const totalUsed = emp.casualUsed + emp.sickUsed + emp.earnedUsed;
                const remaining = totalDays - totalUsed;
                const utilPercent = Math.round((totalUsed / totalDays) * 100);

                return (
                  <TableRow key={emp.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 34, height: 34, bgcolor: '#10B981', fontSize: '0.8rem', fontWeight: 700 }}>
                          {emp.firstName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>{emp.firstName} {emp.lastName}</Typography>
                          <Typography variant="caption" color="text.secondary">{emp.jobTitle}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{emp.casualTotal - emp.casualUsed} / {emp.casualTotal}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{emp.sickTotal - emp.sickUsed} / {emp.sickTotal}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{emp.earnedTotal - emp.earnedUsed} / {emp.earnedTotal}</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#10B981' }}>{remaining} Days Left</TableCell>
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
                            '& .MuiLinearProgress-bar': { bgcolor: utilPercent > 70 ? '#F59E0B' : '#10B981' },
                          }}
                        />
                        <Typography variant="caption" fontWeight={700}>{utilPercent}%</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
