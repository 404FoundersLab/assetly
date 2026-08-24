import { Box, Card, CardContent, Grid, Typography, Alert, AlertTitle, Stack, Button, alpha, List, ListItem, ListItemText } from '@mui/material';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import MemoryIcon from '@mui/icons-material/Memory';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useAppSelector } from '../../hooks/storeHooks';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { CATEGORY_LABELS, STATUS_LABELS } from '../../data/demoData';
import { daysUntil } from '../../utils/format';
import { useNavigate } from 'react-router-dom';

const CHART_COLORS = ['#1565C0', '#2E7D32', '#ED6C02', '#757575', '#D32F2F', '#8E24AA', '#00ACC1', '#F4511E'];

export function AnalyticsPage() {
  const assets = useAppSelector((s) => s.assets.items);
  const auditLogs = useAppSelector((s) => s.audit.items);
  const navigate = useNavigate();

  const byStatus = Object.entries(
    assets.reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name: STATUS_LABELS[name] ?? name, value }));

  const valueByCategory = Object.entries(
    assets.reduce<Record<string, number>>((acc, a) => {
      acc[a.category] = (acc[a.category] ?? 0) + a.currentValue;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name: CATEGORY_LABELS[name] ?? name, value }));

  const countByCategory = Object.entries(
    assets.reduce<Record<string, number>>((acc, a) => {
      acc[a.category] = (acc[a.category] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, count]) => ({ name: CATEGORY_LABELS[name] ?? name, count }));

  return (
    <Box>
      <PageHeader
        title="AI & Analytics"
        subtitle="Smart insights and reporting on your asset inventory"
      />

      {assets.length === 0 ? (
        <Card sx={{ mt: 2 }}>
          <EmptyState
            icon={<AutoGraphIcon />}
            title="No data to analyze"
            description="Add assets to your inventory to generate analytics and insights."
          />
        </Card>
      ) : (
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Smart AI Insights Section */}
          <Grid item xs={12}>
            <Card sx={{ 
              borderLeft: '4px solid', 
              borderColor: 'secondary.main',
              bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.03) 
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                  <MemoryIcon color="secondary" />
                  <Typography variant="h6" fontWeight={700}>
                    AI-Powered Insights
                  </Typography>
                </Box>
                
                <Stack spacing={2}>
                  {/* Predictive Maintenance */}
                  {assets.filter(a => a.status === 'in_repair' || (daysUntil(a.warrantyExpiresAt) <= 30 && daysUntil(a.warrantyExpiresAt) >= 0)).length > 0 ? (
                    <Alert severity="warning" icon={<WarningAmberIcon />}>
                      <AlertTitle sx={{ fontWeight: 700 }}>Predictive Maintenance Risk Detected</AlertTitle>
                      Our models indicate that <strong>{assets.filter(a => a.status === 'in_repair' || (daysUntil(a.warrantyExpiresAt) <= 30 && daysUntil(a.warrantyExpiresAt) >= 0)).length} assets</strong> have an elevated risk of failure soon due to expiring warranties or recent repair cycles. 
                      <Button size="small" onClick={() => navigate('/maintenance')} sx={{ ml: 2, mt: { xs: 1, sm: 0 } }}>View At-Risk Assets</Button>
                    </Alert>
                  ) : (
                    <Alert severity="success">
                      <AlertTitle sx={{ fontWeight: 700 }}>Asset Health Optimal</AlertTitle>
                      No immediate predictive maintenance risks detected in your active inventory.
                    </Alert>
                  )}

                  {/* Purchasing Suggestions */}
                  {(() => {
                    const laptops = assets.filter(a => a.category === 'laptop');
                    const inStockLaptops = laptops.filter(a => a.status === 'in_stock').length;
                    
                    if (laptops.length > 0 && inStockLaptops < 3) {
                      return (
                        <Alert severity="info" icon={<TipsAndUpdatesIcon />} sx={{ bgcolor: 'info.main', color: 'white', '& .MuiAlert-icon': { color: 'white' } }}>
                          <AlertTitle sx={{ fontWeight: 700 }}>Automated Purchasing Suggestion</AlertTitle>
                          You only have <strong>{inStockLaptops} laptops in stock</strong>. Based on your organization's typical onboarding velocity, we suggest procuring 5 additional laptops within the next 2 weeks to avoid hardware shortages.
                        </Alert>
                      );
                    }
                    return null;
                  })()}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: 400 }}>
              <CardContent sx={{ height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Assets by Status
                </Typography>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={byStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      label={({ name, percent }) =>
                        percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''
                      }
                    >
                      {byStatus.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ height: 400 }}>
              <CardContent sx={{ height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Total Value by Category
                </Typography>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={valueByCategory} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(val) => `₹${val}`} />
                    <Tooltip formatter={(val: number) => `₹${val.toLocaleString()}`} />
                    <Bar dataKey="value" fill="#8E24AA" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: 400 }}>
              <CardContent sx={{ height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Assets by Category (Count)
                </Typography>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={countByCategory} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1565C0" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: 400 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Recent Activity</Typography>
                  <Button size="small" onClick={() => navigate('/audit')}>
                    View audit log
                  </Button>
                </Box>
                {auditLogs.length === 0 ? (
                  <EmptyState
                    icon={<TrendingUpIcon />}
                    title="No activity yet"
                    description="Changes to assets, assignments, and imports will show up here."
                  />
                ) : (
                  <List dense disablePadding>
                    {auditLogs.slice(0, 5).map((log) => (
                      <ListItem key={log.id} sx={{ px: 0, py: 0.75 }}>
                        <ListItemText
                          primary={`${log.action} — ${log.entityLabel}`}
                          secondary={`${log.userName} · ${new Date(log.createdAt).toLocaleString()}`}
                          primaryTypographyProps={{ fontWeight: 500, fontSize: '0.875rem' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
