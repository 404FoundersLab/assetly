import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import PolicyOutlinedIcon from '@mui/icons-material/PolicyOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { PageHeader } from '../../../components/PageHeader';
import {
  DEMO_COMPLIANCE_CONTROLS,
  DEMO_COMPLIANCE_POLICIES,
  type ComplianceControlStatus,
} from '../../../data/execDocsDemo';

const STATUS_META: Record<
  ComplianceControlStatus,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  compliant: { label: 'Compliant', color: 'success' },
  partial: { label: 'Partial', color: 'warning' },
  gap: { label: 'Gap', color: 'error' },
  not_applicable: { label: 'N/A', color: 'default' },
};

export function CompliancePage() {
  const theme = useTheme();
  const [framework, setFramework] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const controls = useMemo(() => {
    return DEMO_COMPLIANCE_CONTROLS.filter((c) => {
      const matchFw = framework === 'all' || c.framework === framework;
      const matchSt = statusFilter === 'all' || c.status === statusFilter;
      return matchFw && matchSt;
    });
  }, [framework, statusFilter]);

  const stats = useMemo(() => {
    const total = DEMO_COMPLIANCE_CONTROLS.length;
    const compliant = DEMO_COMPLIANCE_CONTROLS.filter((c) => c.status === 'compliant').length;
    const partial = DEMO_COMPLIANCE_CONTROLS.filter((c) => c.status === 'partial').length;
    const gap = DEMO_COMPLIANCE_CONTROLS.filter((c) => c.status === 'gap').length;
    return {
      total,
      compliant,
      partial,
      gap,
      score: Math.round((compliant / total) * 100),
    };
  }, []);

  const frameworks = [...new Set(DEMO_COMPLIANCE_CONTROLS.map((c) => c.framework))];

  return (
    <Box>
      <PageHeader
        title="Compliance"
        subtitle="Control board across ISO 27001, SOC 2, and privacy frameworks"
        breadcrumbs={[
          { label: 'Exec Docs', to: '/exec-docs' },
          { label: 'Compliance' },
        ]}
      />

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderLeft: `4px solid ${theme.palette.primary.main}` }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <VerifiedUserOutlinedIcon color="primary" fontSize="small" />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Overall score
                </Typography>
              </Stack>
              <Typography variant="h4" fontWeight={800}>
                {stats.score}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={stats.score}
                sx={{ mt: 1.5, height: 8, borderRadius: 4 }}
                color={stats.score >= 80 ? 'success' : 'warning'}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderLeft: `4px solid ${theme.palette.success.main}` }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <CheckCircleIcon color="success" fontSize="small" />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Compliant
                </Typography>
              </Stack>
              <Typography variant="h4" fontWeight={800}>
                {stats.compliant}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                of {stats.total} controls
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderLeft: `4px solid ${theme.palette.warning.main}` }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <WarningAmberIcon color="warning" fontSize="small" />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Partial
                </Typography>
              </Stack>
              <Typography variant="h4" fontWeight={800}>
                {stats.partial}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Need remediation plans
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderLeft: `4px solid ${theme.palette.error.main}` }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <ErrorOutlineIcon color="error" fontSize="small" />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Gaps
                </Typography>
              </Stack>
              <Typography variant="h4" fontWeight={800}>
                {stats.gap}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Priority for next audit
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={8}>
          <Card variant="outlined">
            <CardContent sx={{ pb: 1 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ sm: 'center' }}
                mb={2}
              >
                <Typography variant="h6" fontWeight={700}>
                  Control register
                </Typography>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    select
                    size="small"
                    label="Framework"
                    value={framework}
                    onChange={(e) => setFramework(e.target.value)}
                    sx={{ minWidth: 140 }}
                  >
                    <MenuItem value="all">All</MenuItem>
                    {frameworks.map((fw) => (
                      <MenuItem key={fw} value={fw}>
                        {fw}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label="Status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{ minWidth: 130 }}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="compliant">Compliant</MenuItem>
                    <MenuItem value="partial">Partial</MenuItem>
                    <MenuItem value="gap">Gap</MenuItem>
                  </TextField>
                </Stack>
              </Stack>
            </CardContent>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Control</TableCell>
                    <TableCell>Framework</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Evidence</TableCell>
                    <TableCell>Reviewed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {controls.map((c) => {
                    const meta = STATUS_META[c.status];
                    return (
                      <TableRow key={c.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {c.controlId} — {c.title}
                          </Typography>
                          {c.notes && (
                            <Typography variant="caption" color="text.secondary">
                              {c.notes}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={c.framework} variant="outlined" />
                        </TableCell>
                        <TableCell>{c.owner}</TableCell>
                        <TableCell>
                          <Chip size="small" label={meta.label} color={meta.color} />
                        </TableCell>
                        <TableCell>{c.evidenceCount}</TableCell>
                        <TableCell>{c.lastReviewed}</TableCell>
                      </TableRow>
                    );
                  })}
                  {controls.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                          No controls match these filters.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card variant="outlined" sx={{ mb: 2.5 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <PolicyOutlinedIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Policy acknowledgement
                </Typography>
              </Stack>
              <Stack spacing={2}>
                {DEMO_COMPLIANCE_POLICIES.map((p) => (
                  <Box key={p.id}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" fontWeight={600}>
                        {p.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={p.status}
                        color={p.status === 'active' ? 'success' : p.status === 'review' ? 'warning' : 'default'}
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>
                      v{p.version} · Effective {p.effectiveDate}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <LinearProgress
                        variant="determinate"
                        value={p.acknowledgementRate}
                        sx={{ flex: 1, height: 6, borderRadius: 3 }}
                        color={p.acknowledgementRate >= 90 ? 'success' : 'warning'}
                      />
                      <Typography variant="caption" fontWeight={700} sx={{ minWidth: 36 }}>
                        {p.acknowledgementRate}%
                      </Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card
            variant="outlined"
            sx={{ bgcolor: alpha(theme.palette.info.main, 0.04) }}
          >
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Next audit checklist
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                UI preview — evidence upload and control assignments will connect to the backend later.
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">• Close Data Retention policy draft</Typography>
                <Typography variant="body2">• Patch firmware on warning network devices</Typography>
                <Typography variant="body2">• Attach endpoint telemetry samples to CC7.2</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
