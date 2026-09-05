import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory2';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ShieldIcon from '@mui/icons-material/Shield';
import { useNavigate } from 'react-router-dom';
import { daysUntil } from '../../utils/format';
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
  badgeText,
  onClick,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  badgeText?: string;
  onClick?: () => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.08)',
        bgcolor: isDark ? 'rgba(15, 23, 42, 0.65)' : '#FFFFFF',
        backdropFilter: 'blur(16px)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        '&:hover': {
          transform: onClick ? 'translateY(-3px)' : 'none',
          borderColor: alpha(color, 0.4),
          boxShadow: `0 12px 28px -6px ${alpha(color, isDark ? 0.25 : 0.15)}`,
        },
      }}
      onClick={onClick}
    >
      {/* Top subtle glow line */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
      />
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: '12px',
              bgcolor: alpha(color, isDark ? 0.16 : 0.1),
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${alpha(color, 0.2)}`,
            }}
          >
            {icon}
          </Box>
          {badgeText && (
            <Chip
              label={badgeText}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.68rem',
                fontWeight: 700,
                borderRadius: '6px',
                bgcolor: alpha(color, isDark ? 0.14 : 0.08),
                color: color,
                border: `1px solid ${alpha(color, 0.25)}`,
              }}
            />
          )}
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.72rem' }}
        >
          {title}
        </Typography>

        <Typography
          variant="h3"
          fontWeight={800}
          sx={{
            letterSpacing: '-0.03em',
            mt: 0.5,
            mb: 0.5,
            lineHeight: 1.1,
          }}
        >
          {value}
        </Typography>

        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthUser();
  const { can } = usePermissions();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

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
        title={`Welcome back, ${getUserDisplayName(user) || 'Admin'}`}
        subtitle="Real-time IT fleet metrics, life-cycle operations & security posture"
      />

      {/* Quick Stat Cards */}
      <Grid container spacing={2.5} mb={3.5}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Assets"
            value={assets.length}
            subtitle={`${deployed} currently deployed`}
            icon={<InventoryIcon />}
            color="#6366F1"
            badgeText={`${deployed} active`}
            onClick={() => navigate('/assets')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Warranty Expiry"
            value={expiring30.length}
            subtitle="Expiring within 30 days"
            icon={<WarningAmberIcon />}
            color="#F59E0B"
            badgeText={expiring30.length > 0 ? 'Action needed' : 'All clear'}
            onClick={() => navigate('/assets?warranty=30')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Workforce"
            value={employees.length}
            subtitle={`${employees.filter((e) => e.status === 'active').length} assigned members`}
            icon={<PeopleIcon />}
            color="#10B981"
            badgeText="Team fleet"
            onClick={() => navigate('/employees')}
          />
        </Grid>

        {showRequests && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Device Requests"
              value={pendingRequests.length}
              subtitle={`${requests.length} total logged tickets`}
              icon={<AssignmentIcon />}
              color="#EC4899"
              badgeText={pendingRequests.length > 0 ? `${pendingRequests.length} pending` : 'Reviewed'}
              onClick={() => navigate('/requests')}
            />
          </Grid>
        )}
      </Grid>

      {/* Actionable Request Notice if any */}
      {showRequests && pendingRequests.length > 0 && (
        <Card
          sx={{
            mb: 3.5,
            p: 0.5,
            background: isDark
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(236, 72, 153, 0.08) 100%)'
              : 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(236, 72, 153, 0.05) 100%)',
            border: '1px solid',
            borderColor: alpha('#F59E0B', isDark ? 0.35 : 0.25),
            borderRadius: '16px',
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap', py: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                bgcolor: '#F59E0B',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
              }}
            >
              <AssignmentIcon />
            </Box>
            <Box sx={{ flex: 1, minWidth: 220 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
                {pendingRequests.length} equipment request{pendingRequests.length === 1 ? '' : 's'} awaiting approval
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Employees have requested devices or peripherals that require administrative review.
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => navigate('/requests')}
              endIcon={<ArrowForwardIcon />}
              sx={{
                bgcolor: '#F59E0B',
                color: '#FFFFFF',
                '&:hover': { bgcolor: '#D97706' },
              }}
            >
              Review Requests
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State Banner if no assets */}
      {isEmpty && (
        <Card
          sx={{
            mb: 3.5,
            background: isDark
              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.14) 0%, rgba(6, 182, 212, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(8, 145, 178, 0.05) 100%)',
            border: '1px solid',
            borderColor: alpha('#6366F1', isDark ? 0.3 : 0.2),
            borderRadius: '16px',
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap', py: 2.5 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              }}
            >
              <TrendingUpIcon />
            </Box>
            <Box sx={{ flex: 1, minWidth: 220 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Get started with your enterprise fleet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Import existing inventories via Excel or provision devices manually to unlock live analytics.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={() => navigate('/assets')}
            >
              Go to Inventory
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modules Feature Grid */}
      <FeatureGrid />
    </Box>
  );
}
