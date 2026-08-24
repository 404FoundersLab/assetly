import { useState, useMemo } from 'react';
import {
  Box, Breadcrumbs, Button, Card, CardContent, Chip, Grid, Link, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography, Alert, Divider, Tabs,
  Tab, Stack, Avatar, LinearProgress, alpha, Paper
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InventoryIcon from '@mui/icons-material/Inventory2';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import GavelIcon from '@mui/icons-material/Gavel';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import StarIcon from '@mui/icons-material/Star';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { useAppSelector } from '../../hooks/storeHooks';
import { StatusChip } from '../../components/StatusChip';
import { formatCurrency, formatDate, getEmployeeName } from '../../utils/format';
import { CATEGORY_LABELS } from '../../data/demoData';

const EXPENSE_STATUS_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error' | 'primary' | 'info'> = {
  draft: 'default', submitted: 'warning', approved: 'primary', rejected: 'error', paid: 'success',
};

const RATING_COLORS: Record<number, string> = { 1: '#ef5350', 2: '#ff9800', 3: '#ffc107', 4: '#66bb6a', 5: '#42a5f5' };

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Grid container spacing={2} sx={{ py: 1 }}>
      <Grid item xs={4}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Grid>
      <Grid item xs={8}>
        <Typography variant="body2" fontWeight={500}>{value}</Typography>
      </Grid>
    </Grid>
  );
}

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  const employee = useAppSelector(s => s.employees.items.find(e => e.id === id));
  const departments = useAppSelector(s => s.departments.items);
  const assets = useAppSelector(s => s.assets.items.filter(a => a.assignedEmployeeId === id));
  const expenses = useAppSelector(s => s.expenses.claims.filter(c => c.employeeId === id));
  const companyPolicies = useAppSelector(s => s.hr.companyPolicies.filter(p => p.status === 'active' && p.requiresAcknowledgement));
  const reviews = useAppSelector(s => s.performance.reviews.filter(r => r.employeeId === id));
  const goals = useAppSelector(s => s.performance.goals.filter(g => g.employeeId === id));

  if (!employee) {
    return (
      <Box>
        <Alert severity="error">Employee not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>Back</Button>
      </Box>
    );
  }

  const department = departments.find(d => d.id === employee.departmentId);

  const totalExpensesApproved = useMemo(() =>
    expenses.filter(e => e.status === 'approved' || e.status === 'paid').reduce((s, e) => s + e.amount, 0),
    [expenses]
  );

  const latestReview = reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/employees" underline="hover" color="inherit">Employees</Link>
        <Typography color="text.primary">{getEmployeeName(employee.firstName, employee.lastName)}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ width: 60, height: 60, bgcolor: 'primary.main', fontSize: '1.4rem', fontWeight: 700 }}>
            {employee.firstName[0]}{employee.lastName[0]}
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight={700}>{getEmployeeName(employee.firstName, employee.lastName)}</Typography>
            <Typography variant="body2" color="text.secondary">{employee.employeeNumber} · {employee.jobTitle}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <Chip label={department?.name || 'No Dept'} size="small" variant="outlined" />
              <Chip label={employee.status} size="small" color={employee.status === 'active' ? 'success' : 'default'} />
              {latestReview?.rating && (
                <Chip
                  label={`⭐ ${latestReview.rating}/5`}
                  size="small"
                  sx={{ bgcolor: alpha(RATING_COLORS[latestReview.rating], 0.15), color: RATING_COLORS[latestReview.rating], fontWeight: 700 }}
                />
              )}
            </Stack>
          </Box>
        </Stack>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Back</Button>
      </Stack>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="Profile" />
        <Tab icon={<InventoryIcon fontSize="small" />} iconPosition="start" label={`Assets (${assets.length})`} />
        <Tab icon={<AttachMoneyIcon fontSize="small" />} iconPosition="start" label={`Expenses (${expenses.length})`} />
        <Tab icon={<GavelIcon fontSize="small" />} iconPosition="start" label="Compliance" />
      </Tabs>

      {/* TAB 0: PROFILE */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={700}>Employee Details</Typography>
                <Divider sx={{ mb: 1 }} />
                <DetailRow label="Joining email" value={employee.joiningEmail || employee.email} />
                <DetailRow
                  label="Official email"
                  value={employee.officialEmail ?? 'Not assigned yet — joining email used for sign-in'}
                />
                <DetailRow label="Sign-in email" value={employee.email} />
                <DetailRow label="Department" value={department?.name ?? '—'} />
                <DetailRow label="Hire Date" value={formatDate(employee.hireDate)} />
                <DetailRow label="Status" value={<Chip label={employee.status} size="small" color={employee.status === 'active' ? 'success' : 'default'} variant="outlined" />} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={7}>
            {/* Performance Summary */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>Performance Summary</Typography>
                <Divider sx={{ mb: 2 }} />
                {latestReview ? (
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Latest Review Period</Typography>
                      <Typography variant="body2" fontWeight={600}>{latestReview.period}</Typography>
                    </Stack>
                    {latestReview.rating && (
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">Manager Rating</Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <StarIcon sx={{ color: RATING_COLORS[latestReview.rating], fontSize: 18 }} />
                          <Typography variant="body2" fontWeight={700} sx={{ color: RATING_COLORS[latestReview.rating] }}>{latestReview.rating}/5</Typography>
                        </Stack>
                      </Stack>
                    )}
                    {goals.filter(g => g.status === 'in_progress').slice(0, 2).map(goal => (
                      <Box key={goal.id}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" noWrap sx={{ maxWidth: '70%' }}>{goal.title}</Typography>
                          <Typography variant="body2" fontWeight={600}>{goal.progress}%</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={goal.progress} sx={{ height: 5, borderRadius: 3, mt: 0.5 }} />
                      </Box>
                    ))}
                    <Button size="small" onClick={() => navigate('/hr/performance')} sx={{ alignSelf: 'flex-start' }}>View Performance →</Button>
                  </Stack>
                ) : (
                  <Typography color="text.secondary" variant="body2">No reviews yet. <Button size="small" onClick={() => navigate('/hr/performance')}>Schedule one →</Button></Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: ASSETS */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <InventoryIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>Assigned Assets ({assets.length})</Typography>
              </Stack>
              <Button size="small" onClick={() => navigate('/assets')}>Manage Assets →</Button>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            {assets.length === 0 ? (
              <Typography color="text.secondary">No assets currently assigned to this employee.</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Asset Tag</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assets.map(asset => (
                      <TableRow key={asset.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/assets/${asset.id}`)}>
                        <TableCell><Typography variant="body2" fontWeight={600}>{asset.assetTag}</Typography></TableCell>
                        <TableCell>{asset.name}</TableCell>
                        <TableCell>{CATEGORY_LABELS[asset.category]}</TableCell>
                        <TableCell><StatusChip status={asset.status} /></TableCell>
                        <TableCell align="right">{formatCurrency(asset.currentValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: EXPENSES */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AttachMoneyIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>Expense Claims ({expenses.length})</Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip label={`Total Approved: ${formatCurrency(totalExpensesApproved)}`} color="success" variant="outlined" />
                <Button size="small" onClick={() => navigate('/it-spend?tab=expenses')}>View IT Spend →</Button>
              </Stack>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            {expenses.length === 0 ? (
              <Typography color="text.secondary">No expense claims submitted by this employee.</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expenses.map(exp => (
                      <TableRow key={exp.id} hover>
                        <TableCell><Typography variant="body2" fontWeight={500}>{exp.title}</Typography></TableCell>
                        <TableCell><Chip label={exp.category.replace('_', ' ')} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} /></TableCell>
                        <TableCell>{exp.date}</TableCell>
                        <TableCell align="right"><Typography variant="body2" fontWeight={700}>{formatCurrency(exp.amount)}</Typography></TableCell>
                        <TableCell>
                          <Chip label={exp.status} color={EXPENSE_STATUS_COLOR[exp.status]} size="small" sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: COMPLIANCE */}
      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <GavelIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>Policy Compliance</Typography>
              </Stack>
              <Button size="small" onClick={() => navigate('/hr/policies')}>Manage Policies →</Button>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            {companyPolicies.length === 0 ? (
              <Typography color="text.secondary">No policies requiring acknowledgement.</Typography>
            ) : (
              <Stack spacing={1.5}>
                {companyPolicies.map(policy => {
                  const ack = policy.acknowledgements.find(a => a.employeeId === id);
                  return (
                    <Paper key={policy.id} sx={{
                      p: 2, borderRadius: 2,
                      border: `1px solid ${ack ? alpha('#4caf50', 0.3) : alpha('#f44336', 0.2)}`,
                      bgcolor: ack ? alpha('#4caf50', 0.04) : alpha('#f44336', 0.03),
                    }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          {ack ? (
                            <CheckCircleIcon color="success" />
                          ) : (
                            <PendingIcon sx={{ color: 'error.main' }} />
                          )}
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{policy.title}</Typography>
                            <Typography variant="caption" color="text.secondary">v{policy.version} · Effective {policy.effectiveDate}</Typography>
                          </Box>
                        </Stack>
                        {ack ? (
                          <Chip label={`Signed ${new Date(ack.acknowledgedAt).toLocaleDateString()}`} color="success" size="small" />
                        ) : (
                          <Chip label="Not Signed" color="error" size="small" />
                        )}
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
