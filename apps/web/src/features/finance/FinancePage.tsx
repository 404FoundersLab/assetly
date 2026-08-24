import { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Typography,
  Tabs,
  Tab,
  Grid,
  LinearProgress,
  Stack,
  alpha,
  Divider,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Button,
  Avatar,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BuildIcon from '@mui/icons-material/Build';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import PaidIcon from '@mui/icons-material/Paid';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/storeHooks';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { formatCurrency, formatDate, getEmployeeName } from '../../utils/format';
import { CATEGORY_LABELS } from '../../data/demoData';
import { updateExpenseStatus } from '../../store/expensesSlice';
import { IT_SPEND_TABS, type ItSpendTab } from '../../constants/routes';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Realistic target budgets for the demo organization
const YEARLY_BUDGETS: Record<number, number> = {
  2026: 80000,
  2025: 75000,
  2024: 60000,
  2023: 50000,
  2022: 45000,
};
const DEFAULT_BUDGET = 50000;

export function FinancePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const assets = useAppSelector((s) => s.assets.items);
  const employees = useAppSelector((s) => s.employees.items);
  const expenses = useAppSelector((s) => s.expenses.claims);

  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [expenseFilter, setExpenseFilter] = useState<string>('all');

  useEffect(() => {
    const tab = searchParams.get('tab') as ItSpendTab | null;
    if (tab && tab in IT_SPEND_TABS) {
      setActiveTab(IT_SPEND_TABS[tab]);
    }
  }, [searchParams]);

  const handleTabChange = (_: React.SyntheticEvent, val: number) => {
    setActiveTab(val);
    const tabKey = (Object.entries(IT_SPEND_TABS).find(([, idx]) => idx === val)?.[0] ?? 'valuation') as ItSpendTab;
    setSearchParams({ tab: tabKey }, { replace: true });
  };

  const employeeMap = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees],
  );

  // Asset Valuation Tab Calculations
  const paginated = useMemo(() => {
    return assets.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [assets, page, rowsPerPage]);

  const totalPurchaseCost = useMemo(() => assets.reduce((sum, a) => sum + a.purchaseCost, 0), [assets]);

  // Annual Budget & Expenditure Tab Calculations
  const yearlyData = useMemo(() => {
    const groups: Record<number, { year: number; count: number; purchaseCost: number; repairCost: number }> = {};

    assets.forEach((a) => {
      if (!a.purchaseDate) return;
      const year = new Date(a.purchaseDate).getFullYear();
      if (isNaN(year)) return;

      if (!groups[year]) {
        groups[year] = { year, count: 0, purchaseCost: 0, repairCost: 0 };
      }

      groups[year].count += 1;
      groups[year].purchaseCost += a.purchaseCost;
      groups[year].repairCost += a.repairCost ?? 0;
    });

    return Object.values(groups)
      .map((g) => {
        const budget = YEARLY_BUDGETS[g.year] ?? DEFAULT_BUDGET;
        const totalExpenditure = g.purchaseCost + g.repairCost;
        const utilization = budget > 0 ? (totalExpenditure / budget) * 100 : 0;
        return {
          ...g,
          budget,
          totalExpenditure,
          utilization,
        };
      })
      .sort((a, b) => b.year - a.year);
  }, [assets]);

  const cumulativeMetrics = useMemo(() => {
    let totalPurchased = 0;
    let totalPurchasesCost = 0;
    let totalRepairsCost = 0;
    let compliantYears = 0;

    yearlyData.forEach((d) => {
      totalPurchased += d.count;
      totalPurchasesCost += d.purchaseCost;
      totalRepairsCost += d.repairCost;
      if (d.totalExpenditure <= d.budget) {
        compliantYears += 1;
      }
    });

    const totalExpenditures = totalPurchasesCost + totalRepairsCost;
    const repairRatio = totalPurchasesCost > 0 ? (totalRepairsCost / totalPurchasesCost) * 100 : 0;

    return {
      totalPurchased,
      totalPurchasesCost,
      totalRepairsCost,
      totalExpenditures,
      repairRatio,
      compliantYears,
      totalYears: yearlyData.length,
    };
  }, [yearlyData]);

  // Dropdown filter data
  const selectedYearAssets = useMemo(() => {
    if (selectedYear === 'all') return [];
    const yearNum = Number(selectedYear);
    return assets.filter((a) => {
      if (!a.purchaseDate) return false;
      const year = new Date(a.purchaseDate).getFullYear();
      return year === yearNum;
    });
  }, [assets, selectedYear]);

  // Total expenditures sums for selected year
  const selectedYearSums = useMemo(() => {
    let totalProcured = 0;
    let totalRepairs = 0;
    selectedYearAssets.forEach((a) => {
      totalProcured += a.purchaseCost;
      totalRepairs += a.repairCost ?? 0;
    });
    return {
      procured: totalProcured,
      repairs: totalRepairs,
      total: totalProcured + totalRepairs,
    };
  }, [selectedYearAssets]);

  // Category wise spend breakdown for selected year
  const categorySpending = useMemo(() => {
    if (selectedYear === 'all') return [];
    const yearNum = Number(selectedYear);
    const yearAssets = assets.filter((a) => a.purchaseDate && new Date(a.purchaseDate).getFullYear() === yearNum);

    const catGroups: Record<string, { name: string; value: number }> = {};
    yearAssets.forEach((a) => {
      const catLabel = CATEGORY_LABELS[a.category] || a.category;
      if (!catGroups[catLabel]) {
        catGroups[catLabel] = { name: catLabel, value: 0 };
      }
      catGroups[catLabel].value += a.purchaseCost + (a.repairCost ?? 0);
    });
    return Object.values(catGroups).sort((a, b) => b.value - a.value);
  }, [assets, selectedYear]);

  // Calculate active metrics depending on selected year
  const activeMetrics = useMemo(() => {
    if (selectedYear === 'all') {
      return {
        totalExpenditures: cumulativeMetrics.totalExpenditures,
        procuredCost: cumulativeMetrics.totalPurchasesCost,
        repairCost: cumulativeMetrics.totalRepairsCost,
        ratio: cumulativeMetrics.repairRatio,
        complianceLabel: "Compliance Rate",
        complianceValue: `${cumulativeMetrics.compliantYears} / ${cumulativeMetrics.totalYears}`,
        complianceSub: "Fiscal years within spending limit",
      };
    }

    const yearNum = Number(selectedYear);
    const targetData = yearlyData.find(d => d.year === yearNum);
    if (!targetData) {
      return {
        totalExpenditures: 0,
        procuredCost: 0,
        repairCost: 0,
        ratio: 0,
        complianceLabel: "Target Budget",
        complianceValue: formatCurrency(0),
        complianceSub: "No target set",
      };
    }

    const ratio = targetData.purchaseCost > 0 ? (targetData.repairCost / targetData.purchaseCost) * 100 : 0;
    return {
      totalExpenditures: targetData.totalExpenditure,
      procuredCost: targetData.purchaseCost,
      repairCost: targetData.repairCost,
      ratio,
      complianceLabel: "Target Budget",
      complianceValue: formatCurrency(targetData.budget),
      complianceSub: `Utilization: ${targetData.utilization.toFixed(0)}% of limit`,
    };
  }, [selectedYear, yearlyData, cumulativeMetrics]);

  // Utility to determine the utilization indicator color and icon
  const getUtilizationStyles = (utilization: number) => {
    if (utilization > 100) {
      return {
        color: 'error.main',
        bgColor: 'error.light',
        barColor: 'error' as const,
        icon: <ErrorIcon fontSize="small" color="error" />,
        label: 'Over Budget',
      };
    } else if (utilization > 80) {
      return {
        color: 'warning.main',
        bgColor: 'warning.light',
        barColor: 'warning' as const,
        icon: <WarningIcon fontSize="small" color="warning" />,
        label: 'Warning threshold',
      };
    } else {
      return {
        color: 'success.main',
        bgColor: 'success.light',
        barColor: 'success' as const,
        icon: <CheckCircleIcon fontSize="small" color="success" />,
        label: 'Under Budget',
      };
    }
  };

  return (
    <Box>
      <PageHeader
        title="IT Spend"
        subtitle="Asset valuation, CapEx budgets, and expense approvals"
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'IT Spend' },
        ]}
      />

      {assets.length === 0 ? (
        <Card sx={{ mt: 2 }}>
          <EmptyState
            icon={<AttachMoneyIcon />}
            title="No financial data"
            description="Add assets with purchase costs to see financial tracking."
          />
        </Card>
      ) : (
        <>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{ mt: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Asset Valuation" icon={<AttachMoneyIcon fontSize="small" />} iconPosition="start" />
            <Tab label="Annual Budget & Expenditures" icon={<TrendingUpIcon fontSize="small" />} iconPosition="start" />
            <Tab label="Employee Expenses" icon={<ReceiptIcon fontSize="small" />} iconPosition="start" />
          </Tabs>

          {/* TAB 0: ASSET VALUATION */}
          {activeTab === 0 && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Card sx={{ p: 2, flex: 1, borderLeft: '4px solid #1565C0' }}>
                  <Typography variant="body2" color="text.secondary">Total Purchase Cost</Typography>
                  <Typography variant="h5" fontWeight={700}>{formatCurrency(totalPurchaseCost)}</Typography>
                </Card>
              </Box>

              <Card>
                <TableContainer sx={{ maxHeight: 'calc(100vh - 360px)' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Asset</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Purchase Date</TableCell>
                        <TableCell align="right">Purchase Cost</TableCell>
                        <TableCell align="right">Repair Cost</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginated.map((asset) => (
                          <TableRow
                            key={asset.id}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/assets/${asset.id}`)}
                          >
                            <TableCell>
                              <Box component="span" sx={{ fontWeight: 600, fontSize: '0.875rem', display: 'block' }}>
                                {asset.assetTag}
                              </Box>
                              <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                {asset.name}
                              </Box>
                            </TableCell>
                            <TableCell>{CATEGORY_LABELS[asset.category] || asset.category}</TableCell>
                            <TableCell>{formatDate(asset.purchaseDate) || '—'}</TableCell>
                            <TableCell align="right">{formatCurrency(asset.purchaseCost)}</TableCell>
                            <TableCell align="right">{formatCurrency(asset.repairCost ?? 0)}</TableCell>
                            <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                              <Tooltip title="View asset">
                                <IconButton size="small" onClick={() => navigate(`/assets/${asset.id}`)}>
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={assets.length}
                  page={page}
                  onPageChange={(_, p) => setPage(p)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                  rowsPerPageOptions={[10, 25, 50]}
                />
              </Card>
            </Box>
          )}

          {/* TAB 1: ANNUAL BUDGET & EXPENDITURES */}
          {activeTab === 1 && (
            <Box sx={{ mt: 3 }}>
              {/* Summary Cards */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <Card sx={{
                    p: 2.5,
                    borderLeft: '4px solid',
                    borderColor: 'primary.main',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02)
                  }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      {selectedYear === 'all' ? 'Total Lifecycle Spending' : `${selectedYear} Total Spending`}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ my: 0.5 }}>
                      {formatCurrency(activeMetrics.totalExpenditures)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatCurrency(activeMetrics.procuredCost)} hardware / {formatCurrency(activeMetrics.repairCost)} repairs
                    </Typography>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Card sx={{
                    p: 2.5,
                    borderLeft: '4px solid',
                    borderColor: 'warning.main',
                    bgcolor: (theme) => alpha(theme.palette.warning.main, 0.02)
                  }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      Maintenance Cost Ratio
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ my: 0.5 }}>
                      {activeMetrics.ratio.toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Repair charges compared to hardware purchase value
                    </Typography>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Card sx={{
                    p: 2.5,
                    borderLeft: '4px solid',
                    borderColor: 'success.main',
                    bgcolor: (theme) => alpha(theme.palette.success.main, 0.02)
                  }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      {activeMetrics.complianceLabel}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ my: 0.5 }}>
                      {activeMetrics.complianceValue}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {activeMetrics.complianceSub}
                    </Typography>
                  </Card>
                </Grid>
              </Grid>

              {/* Data Table & Recharts Chart */}
              <Grid container spacing={3}>
                {/* Aggregated Yearly Table */}
                <Grid item xs={12} md={7}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            {selectedYear === 'all' ? 'Annual Expenditures & Budget Utilization' : `${selectedYear} Fiscal Expenditures`}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {selectedYear === 'all' 
                              ? 'Summary of capital expenditures on asset procurement combined with maintenance costs.' 
                              : `Detailed list of assets procured and repaired in the year ${selectedYear}.`}
                          </Typography>
                        </Box>
                        
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                          <Select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            displayEmpty
                            sx={{
                              borderRadius: 2,
                              bgcolor: 'background.paper',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                              fontWeight: 600,
                            }}
                          >
                            <MenuItem value="all">📅 All Fiscal Years</MenuItem>
                            {yearlyData.map((d) => (
                              <MenuItem key={d.year} value={String(d.year)}>
                                📅 Fiscal Year {d.year}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>

                      <TableContainer sx={{ maxHeight: 380 }}>
                        {selectedYear === 'all' ? (
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Year</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Purchases</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Procured Cost</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Repair Cost</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Total Spending</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Target Budget</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, width: '150px' }}>Budget Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {yearlyData.map((row) => {
                                const statusStyles = getUtilizationStyles(row.utilization);
                                return (
                                  <TableRow key={row.year} hover>
                                    <TableCell sx={{ fontWeight: 600 }}>{row.year}</TableCell>
                                    <TableCell align="center">{row.count}</TableCell>
                                    <TableCell align="right">{formatCurrency(row.purchaseCost)}</TableCell>
                                    <TableCell align="right">{formatCurrency(row.repairCost)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                                      {formatCurrency(row.totalExpenditure)}
                                    </TableCell>
                                    <TableCell align="right" color="text.secondary">
                                      {formatCurrency(row.budget)}
                                    </TableCell>
                                    <TableCell align="right">
                                      <Stack spacing={0.5} alignItems="flex-end">
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                          {statusStyles.icon}
                                          <Typography variant="caption" fontWeight={600} color={statusStyles.color}>
                                            {row.utilization.toFixed(0)}%
                                          </Typography>
                                        </Stack>
                                        <Box sx={{ width: '100px' }}>
                                          <LinearProgress
                                            variant="determinate"
                                            value={Math.min(row.utilization, 100)}
                                            color={statusStyles.barColor}
                                            sx={{ height: 6, borderRadius: 3 }}
                                          />
                                        </Box>
                                      </Stack>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        ) : (
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Asset</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Purchase Date</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Purchase Cost</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Repair Cost</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Assigned To</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedYearAssets.map((asset) => {
                                const emp = asset.assignedEmployeeId ? employeeMap[asset.assignedEmployeeId] : null;
                                return (
                                  <TableRow 
                                    key={asset.id} 
                                    hover 
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/assets/${asset.id}`)}
                                  >
                                    <TableCell>
                                      <Box component="span" sx={{ fontWeight: 600, fontSize: '0.875rem', display: 'block' }}>
                                        {asset.assetTag}
                                      </Box>
                                      <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                        {asset.name}
                                      </Box>
                                    </TableCell>
                                    <TableCell sx={{ textTransform: 'capitalize' }}>
                                      {asset.category}
                                    </TableCell>
                                    <TableCell>{formatDate(asset.purchaseDate)}</TableCell>
                                    <TableCell align="right">{formatCurrency(asset.purchaseCost)}</TableCell>
                                    <TableCell align="right">{formatCurrency(asset.repairCost ?? 0)}</TableCell>
                                    <TableCell align="right" sx={{ textTransform: 'capitalize' }}>
                                      {asset.status.replace('_', ' ')}
                                    </TableCell>
                                    <TableCell align="right">
                                      {emp ? getEmployeeName(emp.firstName, emp.lastName) : '—'}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                              {selectedYearAssets.length > 0 && (
                                <TableRow sx={{ bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'grey.100', '& td': { fontWeight: 700 } }}>
                                  <TableCell colSpan={3}>Total Spent</TableCell>
                                  <TableCell align="right">{formatCurrency(selectedYearSums.procured)}</TableCell>
                                  <TableCell align="right">{formatCurrency(selectedYearSums.repairs)}</TableCell>
                                  <TableCell colSpan={2} align="right">
                                    Total: {formatCurrency(selectedYearSums.total)}
                                  </TableCell>
                                </TableRow>
                              )}
                              {selectedYearAssets.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                    No assets registered in this year.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        )}
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Expenditure Trend Chart */}
                <Grid item xs={12} md={5}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        {selectedYear === 'all' ? 'Procurement vs. Repair Trends' : `${selectedYear} Category Breakdown`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {selectedYear === 'all'
                          ? 'Comparison of procurement expenditure and repair charges over fiscal years.'
                          : `Total capital spending broken down by category in fiscal year ${selectedYear}.`}
                      </Typography>
                      <Box sx={{ width: '100%', height: 300, flexGrow: 1, mt: 1 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          {selectedYear === 'all' ? (
                            <BarChart
                              data={yearlyData.slice().reverse()}
                              margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                            >
                              <XAxis dataKey="year" stroke="#888888" tickLine={false} tick={{ fontSize: 12 }} />
                              <YAxis
                                stroke="#888888"
                                tickLine={false}
                                tickFormatter={(val) => `₹${val}`}
                                tick={{ fontSize: 11 }}
                              />
                              <ChartTooltip
                                formatter={(value: number) => [formatCurrency(value), '']}
                                contentStyle={{
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #e0e0e0',
                                  borderRadius: '8px',
                                  boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: '12px' }} />
                              <Bar name="Procurement Cost" dataKey="purchaseCost" fill="#1565C0" radius={[4, 4, 0, 0]} />
                              <Bar name="Repair Charges" dataKey="repairCost" fill="#ED6C02" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          ) : (
                            <BarChart
                              data={categorySpending}
                              margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                            >
                              <XAxis dataKey="name" stroke="#888888" tickLine={false} tick={{ fontSize: 12 }} />
                              <YAxis
                                stroke="#888888"
                                tickLine={false}
                                tickFormatter={(val) => `₹${val}`}
                                tick={{ fontSize: 11 }}
                              />
                              <ChartTooltip
                                formatter={(value: number) => [formatCurrency(value), '']}
                                contentStyle={{
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #e0e0e0',
                                  borderRadius: '8px',
                                  boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
                                }}
                              />
                              <Bar name="Procured + Repair Cost" dataKey="value" fill="#8E24AA" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* TAB 2: EMPLOYEE EXPENSES */}
          {activeTab === 2 && (
            <Box sx={{ mt: 3 }}>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                {[
                  { label: 'Total Submitted', value: formatCurrency(expenses.reduce((s, e) => s + e.amount, 0)), color: '#1565C0' },
                  { label: 'Pending Approval', value: String(expenses.filter(e => e.status === 'submitted').length), color: '#E65100' },
                  { label: 'Approved & Paid', value: formatCurrency(expenses.filter(e => e.status === 'paid' || e.status === 'approved').reduce((s, e) => s + e.amount, 0)), color: '#2E7D32' },
                  { label: 'Rejected', value: String(expenses.filter(e => e.status === 'rejected').length), color: '#C62828' },
                ].map(s => (
                  <Grid item xs={12} sm={6} md={3} key={s.label}>
                    <Card sx={{ p: 2, borderLeft: `4px solid ${s.color}` }}>
                      <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                      <Typography variant="h5" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h6" fontWeight={700}>Expense Claims</Typography>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <Select value={expenseFilter} onChange={e => setExpenseFilter(e.target.value)} displayEmpty>
                        <MenuItem value="all">All Statuses</MenuItem>
                        <MenuItem value="submitted">Pending</MenuItem>
                        <MenuItem value="approved">Approved</MenuItem>
                        <MenuItem value="paid">Paid</MenuItem>
                        <MenuItem value="rejected">Rejected</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {expenses.filter(e => expenseFilter === 'all' || e.status === expenseFilter).map(exp => {
                          const emp = employeeMap[exp.employeeId];
                          return (
                            <TableRow key={exp.id} hover>
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: '0.7rem' }}>
                                    {emp ? `${emp.firstName[0]}${emp.lastName[0]}` : '?'}
                                  </Avatar>
                                  <Typography variant="body2" fontWeight={600} sx={{ cursor: 'pointer', color: 'primary.main' }} onClick={() => navigate(`/hr/employees/${exp.employeeId}`)}>
                                    {emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown'}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>{exp.title}</Typography></TableCell>
                              <TableCell><Chip label={exp.category.replace('_', ' ')} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} /></TableCell>
                              <TableCell>{exp.date}</TableCell>
                              <TableCell align="right"><Typography variant="body2" fontWeight={700}>{formatCurrency(exp.amount)}</Typography></TableCell>
                              <TableCell>
                                <Chip label={exp.status} size="small"
                                  color={exp.status === 'paid' ? 'success' : exp.status === 'approved' ? 'primary' : exp.status === 'submitted' ? 'warning' : exp.status === 'rejected' ? 'error' : 'default'}
                                  sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
                              </TableCell>
                              <TableCell align="right">
                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                  {exp.status === 'submitted' && (
                                    <>
                                      <Tooltip title="Approve">
                                        <IconButton size="small" color="success" onClick={() => dispatch(updateExpenseStatus({ id: exp.id, status: 'approved', approvedBy: 'finance-admin' }))}><ThumbUpIcon fontSize="small" /></IconButton>
                                      </Tooltip>
                                      <Tooltip title="Reject">
                                        <IconButton size="small" color="error" onClick={() => dispatch(updateExpenseStatus({ id: exp.id, status: 'rejected', rejectionReason: 'Not approved.' }))}><ThumbDownIcon fontSize="small" /></IconButton>
                                      </Tooltip>
                                    </>
                                  )}
                                  {exp.status === 'approved' && (
                                    <Tooltip title="Mark as Paid">
                                      <IconButton size="small" color="primary" onClick={() => dispatch(updateExpenseStatus({ id: exp.id, status: 'paid' }))}><PaidIcon fontSize="small" /></IconButton>
                                    </Tooltip>
                                  )}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
