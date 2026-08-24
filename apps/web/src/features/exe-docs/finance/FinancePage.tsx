import { useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { Link as RouterLink } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { useAppSelector } from '../../../hooks/storeHooks';
import { formatCurrency } from '../../../utils/format';
import { computeItSpendSummary } from '../../finance/itSpendMetrics';
import { itSpendUrl } from '../../../constants/routes';

function MetricCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderLeft: `4px solid ${accent}`,
        borderRadius: 2,
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
          <Box sx={{ color: accent, display: 'flex' }}>{icon}</Box>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {label}
          </Typography>
        </Stack>
        <Typography variant="h5" fontWeight={800}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export function FinancePage() {
  const theme = useTheme();
  const assets = useAppSelector((s) => s.assets.items);
  const expenses = useAppSelector((s) => s.expenses.claims);

  const summary = useMemo(() => computeItSpendSummary(assets, expenses), [assets, expenses]);

  const budgetColor =
    summary.currentYearUtilization >= 100
      ? 'error'
      : summary.currentYearUtilization >= 80
        ? 'warning'
        : 'success';

  return (
    <Box>
      <PageHeader
        title="Executive IT Finance"
        subtitle="Read-only rollup from the IT Spend module — one source of truth for asset financials"
        breadcrumbs={[
          { label: 'Exec Docs', to: '/exec-docs' },
          { label: 'IT Finance' },
        ]}
        actions={
          <Button
            component={RouterLink}
            to={itSpendUrl()}
            variant="contained"
            endIcon={<OpenInNewIcon />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Open IT Spend module
          </Button>
        }
      />

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            icon={<Inventory2OutlinedIcon fontSize="small" />}
            label="Book value"
            value={formatCurrency(summary.totalCurrentValue)}
            sub={`${summary.assetCount} assets tracked`}
            accent={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            icon={<TrendingUpIcon fontSize="small" />}
            label="Total depreciation"
            value={formatCurrency(summary.totalDepreciation)}
            sub={`${summary.depreciationPct}% of purchase cost`}
            accent={theme.palette.warning.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            icon={<AccountBalanceWalletOutlinedIcon fontSize="small" />}
            label={`${summary.currentYear} IT spend`}
            value={formatCurrency(summary.currentYearSpend)}
            sub={`${summary.currentYearUtilization}% of ${formatCurrency(summary.currentYearBudget)} budget`}
            accent={theme.palette.info.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            icon={<ReceiptLongOutlinedIcon fontSize="small" />}
            label="Pending expenses"
            value={String(summary.pendingExpenseCount)}
            sub={
              summary.pendingExpenseAmount > 0
                ? `${formatCurrency(summary.pendingExpenseAmount)} awaiting approval`
                : 'No claims in queue'
            }
            accent={theme.palette.error.main}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                {summary.currentYear} CapEx budget utilization
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Purchases and repairs booked against the annual IT asset budget.
              </Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1}>
                <Typography variant="h4" fontWeight={800}>
                  {summary.currentYearUtilization}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatCurrency(summary.currentYearSpend)} / {formatCurrency(summary.currentYearBudget)}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, summary.currentYearUtilization)}
                color={budgetColor}
                sx={{ height: 10, borderRadius: 5, mb: 2 }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  component={RouterLink}
                  to={itSpendUrl('budget')}
                  variant="outlined"
                  size="small"
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  View budget details
                </Button>
                <Button
                  component={RouterLink}
                  to={itSpendUrl('valuation')}
                  variant="outlined"
                  size="small"
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Asset valuation report
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              height: '100%',
              bgcolor: alpha(theme.palette.primary.main, 0.03),
            }}
          >
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Portfolio snapshot
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Total purchase cost</Typography>
                  <Typography variant="body2" fontWeight={700}>{formatCurrency(summary.totalPurchaseCost)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Repair spend (lifetime)</Typography>
                  <Typography variant="body2" fontWeight={700}>{formatCurrency(summary.totalRepairCost)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Total cost of ownership</Typography>
                  <Typography variant="body2" fontWeight={700}>{formatCurrency(summary.totalTco)}</Typography>
                </Stack>
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Button
                  component={RouterLink}
                  to={itSpendUrl('expenses')}
                  variant="contained"
                  fullWidth
                  endIcon={<OpenInNewIcon />}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  Review expense claims
                </Button>
                <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ mt: 1.5 }}>
                  Approvals and detailed reports are managed in IT Spend — not duplicated here.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
