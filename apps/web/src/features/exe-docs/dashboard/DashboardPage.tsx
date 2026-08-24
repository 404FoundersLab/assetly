import { useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import RuleFolderOutlinedIcon from '@mui/icons-material/RuleFolderOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { useAppSelector, useAuthUser } from '../../../hooks/storeHooks';
import { getUserDisplayName } from '../../../utils/userDisplay';
import { formatCurrency } from '../../../utils/format';
import { computeItSpendSummary } from '../../finance/itSpendMetrics';
import {
  DEMO_COMPLIANCE_CONTROLS,
  DEMO_LIBRARY_DOCUMENTS,
  generateDemoMeetings,
} from '../../../data/execDocsDemo';

function StatTile({
  label,
  value,
  sub,
  icon,
  color,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}) {
  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: `4px solid ${color}`,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': onClick
          ? {
              transform: 'translateY(-2px)',
              boxShadow: (t) => `0 8px 24px ${alpha(color, 0.18)}`,
            }
          : undefined,
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>
              {label}
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
              {value}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {sub}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: alpha(color, 0.12),
              color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const user = useAuthUser();
  const assets = useAppSelector((s) => s.assets.items);
  const expenses = useAppSelector((s) => s.expenses.claims);

  const meetings = useMemo(() => generateDemoMeetings(), []);
  const upcoming = meetings.filter((m) => m.status !== 'COMPLETED');
  const docCount = Object.values(DEMO_LIBRARY_DOCUMENTS).reduce((n, rows) => n + rows.length, 0);
  const recentDocs = Object.entries(DEMO_LIBRARY_DOCUMENTS)
    .flatMap(([folder, docs]) => docs.map((d) => ({ ...d, folder })))
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified))
    .slice(0, 5);

  const gaps = DEMO_COMPLIANCE_CONTROLS.filter((c) => c.status === 'gap' || c.status === 'partial');
  const compliantPct = Math.round(
    (DEMO_COMPLIANCE_CONTROLS.filter((c) => c.status === 'compliant').length /
      DEMO_COMPLIANCE_CONTROLS.length) *
      100,
  );

  const spend = useMemo(() => computeItSpendSummary(assets, expenses), [assets, expenses]);

  return (
    <Box>
      <PageHeader
        title={`Welcome, ${getUserDisplayName(user) || 'Executive'}`}
        subtitle="Executive workspace — documents, meetings, compliance, and IT finance at a glance"
        breadcrumbs={[{ label: 'Exec Docs' }]}
      />

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label="Library documents"
            value={docCount}
            sub="Across company folders"
            icon={<DescriptionOutlinedIcon />}
            color={theme.palette.primary.main}
            onClick={() => navigate('/exec-docs/library')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label="Upcoming meetings"
            value={upcoming.length}
            sub={upcoming[0] ? `Next: ${upcoming[0].title}` : 'Agenda clear'}
            icon={<CalendarMonthOutlinedIcon />}
            color="#7C4DFF"
            onClick={() => navigate('/exec-docs/meetings')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label="Compliance score"
            value={`${compliantPct}%`}
            sub={`${gaps.length} controls need attention`}
            icon={<RuleFolderOutlinedIcon />}
            color={gaps.length ? theme.palette.warning.main : theme.palette.success.main}
            onClick={() => navigate('/exec-docs/compliance')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile
            label="IT book value"
            value={formatCurrency(spend.totalCurrentValue)}
            sub={`${spend.currentYearUtilization}% of ${spend.currentYear} budget used`}
            icon={<AccountBalanceWalletOutlinedIcon />}
            color={theme.palette.secondary.main}
            onClick={() => navigate('/exec-docs/finance')}
          />
        </Grid>
      </Grid>

      {gaps.length > 0 && (
        <Card
          sx={{
            mb: 3,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}`,
            bgcolor: alpha(theme.palette.warning.main, 0.06),
          }}
        >
          <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <WarningAmberIcon color="warning" />
            <Box sx={{ flex: 1, minWidth: 220 }}>
              <Typography fontWeight={700}>
                {gaps.length} compliance control{gaps.length === 1 ? '' : 's'} need attention
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {gaps
                  .slice(0, 2)
                  .map((g) => g.title)
                  .join(' · ')}
                {gaps.length > 2 ? ` · +${gaps.length - 2} more` : ''}
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="warning"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/exec-docs/compliance')}
            >
              Review compliance
            </Button>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6" fontWeight={700}>
                  Upcoming agenda
                </Typography>
                <Button size="small" onClick={() => navigate('/exec-docs/meetings')}>
                  View all
                </Button>
              </Stack>
              <List disablePadding>
                {upcoming.slice(0, 4).map((m) => (
                  <ListItemButton
                    key={m.id}
                    onClick={() => navigate('/exec-docs/meetings')}
                    sx={{ px: 1, borderRadius: 1.5, mb: 0.5 }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={600} variant="body2">
                            {m.title}
                          </Typography>
                          <Chip
                            size="small"
                            label={m.status}
                            color={m.status === 'CONFIRMED' ? 'success' : 'warning'}
                            variant="outlined"
                          />
                        </Stack>
                      }
                      secondary={`${m.date} · ${m.time} · ${m.location}`}
                    />
                  </ListItemButton>
                ))}
                {upcoming.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No upcoming meetings.
                  </Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6" fontWeight={700}>
                  Recently updated docs
                </Typography>
                <Button size="small" onClick={() => navigate('/exec-docs/library')}>
                  Open library
                </Button>
              </Stack>
              <List disablePadding>
                {recentDocs.map((d) => (
                  <ListItemButton
                    key={d.id}
                    onClick={() => navigate('/exec-docs/library')}
                    sx={{ px: 1, borderRadius: 1.5, mb: 0.5 }}
                  >
                    <ListItemText
                      primary={
                        <Typography fontWeight={600} variant="body2">
                          {d.title}
                        </Typography>
                      }
                      secondary={`${d.folder} · ${d.owner} · ${d.lastModified}`}
                    />
                    <Chip size="small" label={d.status} variant="outlined" />
                  </ListItemButton>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                {spend.currentYear} IT budget pulse
              </Typography>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography variant="h4" fontWeight={800}>
                  {spend.currentYearUtilization}%
                </Typography>
                <Typography variant="body2" color="text.secondary" alignSelf="flex-end">
                  {formatCurrency(spend.currentYearSpend)} / {formatCurrency(spend.currentYearBudget)}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, spend.currentYearUtilization)}
                color={
                  spend.currentYearUtilization >= 100
                    ? 'error'
                    : spend.currentYearUtilization >= 80
                      ? 'warning'
                      : 'success'
                }
                sx={{ height: 10, borderRadius: 5, mb: 2 }}
              />
              <Button
                variant="outlined"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/exec-docs/finance')}
              >
                Open executive IT finance
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              bgcolor: alpha(theme.palette.success.main, 0.04),
            }}
          >
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <CheckCircleOutlineIcon color="success" />
                <Typography variant="h6" fontWeight={700}>
                  Quick actions
                </Typography>
              </Stack>
              <Stack spacing={1.25}>
                <Button fullWidth variant="contained" onClick={() => navigate('/exec-docs/meetings')}>
                  Schedule / review meetings
                </Button>
                <Button fullWidth variant="outlined" onClick={() => navigate('/exec-docs/library')}>
                  Browse document library
                </Button>
                <Button fullWidth variant="outlined" onClick={() => navigate('/exec-docs/compliance')}>
                  Compliance control board
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
