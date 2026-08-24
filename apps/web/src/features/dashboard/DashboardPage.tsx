import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  alpha,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory2';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, daysUntil } from '../../utils/format';
import { useAppSelector, useAuthUser, usePermissions } from '../../hooks/storeHooks';
import { getUserDisplayName } from '../../utils/userDisplay';
import { PageHeader } from '../../components/PageHeader';
import { FeatureGrid } from './FeatureGrid';



function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  onClick,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}) {
  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        ...(onClick && {
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `0 8px 24px ${alpha(color, 0.15)}`,
          },
        }),
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={500}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2.5,
              bgcolor: alpha(color, 0.1),
              color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}



export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthUser();
  const { can } = usePermissions();
  const assets = useAppSelector((s) => s.assets.items);
  const employees = useAppSelector((s) => s.employees.items);
  const requests = useAppSelector((s) => s.requests.items);
  const pendingRequests = requests.filter((r) => r.status === 'submitted');
  const showRequests = can('request:review');


  const expiring30 = assets.filter((a) => daysUntil(a.warrantyExpiresAt) <= 30 && daysUntil(a.warrantyExpiresAt) >= 0);
  const deployed = assets.filter((a) => a.status === 'deployed').length;
  const isEmpty = assets.length === 0;

  return (
    <Box>
      <PageHeader
        title={`Welcome back, ${getUserDisplayName(user) || 'there'}`}
        subtitle="IT asset overview and operational insights"
      />

      <FeatureGrid />

      {showRequests && pendingRequests.length > 0 && (
        <Card
          sx={{
            mb: 3,
            border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.35)}`,
            bgcolor: (theme) => alpha(theme.palette.warning.main, 0.06),
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', py: 2.5 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'warning.main',
                color: 'warning.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AssignmentIcon />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                {pendingRequests.length} device request{pendingRequests.length === 1 ? '' : 's'} awaiting review
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Employees have submitted equipment requests that need your approval.
              </Typography>
            </Box>
            <Button variant="contained" color="warning" onClick={() => navigate('/requests')}>
              Review requests
            </Button>
          </CardContent>
        </Card>
      )}

      {isEmpty && (
        <Card
          sx={{
            mb: 3,
            background: (theme) =>
              `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.06)} 100%)`,
            border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', py: 2.5 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUpIcon />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Get started with your inventory
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Import assets from Excel or add them manually to populate your dashboard.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={() => navigate('/assets')}
            >
              Go to Assets
            </Button>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Assets"
            value={assets.length}
            subtitle={`${deployed} deployed`}
            icon={<InventoryIcon />}
            color="#1565C0"
            onClick={() => navigate('/assets')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Warranty Expiring"
            value={expiring30.length}
            subtitle="Within 30 days"
            icon={<WarningAmberIcon />}
            color="#ED6C02"
            onClick={() => navigate('/assets?warranty=30')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Employees"
            value={employees.length}
            subtitle={`${employees.filter((e) => e.status === 'active').length} active`}
            icon={<PeopleIcon />}
            color="#2E7D32"
            onClick={() => navigate('/employees')}
          />
        </Grid>

        {showRequests && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Device Requests"
              value={pendingRequests.length}
              subtitle={`${requests.length} total · click to review`}
              icon={<AssignmentIcon />}
              color="#6A1B9A"
              onClick={() => navigate('/requests')}
            />
          </Grid>
        )}
      </Grid>

    </Box>
  );
}
