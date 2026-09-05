import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Divider,
  alpha,
  useTheme,
  AppBar,
  Toolbar,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Chip,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory2';
import FolderIcon from '@mui/icons-material/Folder';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DevicesIcon from '@mui/icons-material/Devices';
import LayersIcon from '@mui/icons-material/Layers';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import { useAppDispatch, useAuthUser, usePermissions, useTenant } from '../../hooks/storeHooks';
import { getUserDisplayName, getUserInitials, getRoleLabel } from '../../utils/userDisplay';
import { logout } from '../../store/authSlice';
import { ThemeModeToggle } from '../../components/ThemeModeToggle';
import { APP_NAME } from '../../constants/brand';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  tag: string;
}

function ModuleCard({ title, description, icon, path, color, tag }: ModuleCardProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Card
      onClick={() => navigate(path)}
      sx={{
        height: '100%',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: isDark ? 'rgba(15, 23, 42, 0.65)' : '#FFFFFF',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
        borderRadius: '20px',
        backdropFilter: 'blur(16px)',
        transition: 'all 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: alpha(color, 0.5),
          boxShadow: `0 20px 36px -10px ${alpha(color, isDark ? 0.3 : 0.16)}`,
          '& .module-icon-container': {
            transform: 'scale(1.08)',
            boxShadow: `0 8px 20px ${alpha(color, 0.4)}`,
          },
          '& .module-arrow': {
            transform: 'translateX(4px)',
            color: color,
          },
        },
      }}
    >
      {/* Top accent beam */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
      />

      <CardContent sx={{ p: { xs: 3, sm: 3.5 }, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <Box
            className="module-icon-container"
            sx={{
              width: 54,
              height: 54,
              borderRadius: '16px',
              bgcolor: alpha(color, isDark ? 0.16 : 0.1),
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 14px ${alpha(color, 0.2)}`,
              transition: 'all 0.25s ease',
            }}
          >
            {icon}
          </Box>
          <Chip
            label={tag}
            size="small"
            sx={{
              height: 22,
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              bgcolor: alpha(color, isDark ? 0.14 : 0.08),
              color: color,
              border: `1px solid ${alpha(color, 0.25)}`,
              borderRadius: '6px',
            }}
          />
        </Box>

        <Typography variant="h6" fontWeight={800} gutterBottom sx={{ letterSpacing: '-0.02em', fontSize: '1.1rem' }}>
          {title}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, lineHeight: 1.6, mb: 3, fontSize: '0.85rem' }}>
          {description}
        </Typography>

        <Divider sx={{ mb: 2, borderColor: theme.palette.divider }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography
            className="module-arrow"
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'text.secondary',
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              fontSize: '0.78rem',
              transition: 'all 0.2s ease',
            }}
          >
            Launch Workspace <ArrowForwardIcon sx={{ fontSize: 14 }} />
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export function LandingPage() {
  const user = useAuthUser();
  const tenant = useTenant();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const { can } = usePermissions();
  const isDark = theme.palette.mode === 'dark';

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const initials = getUserInitials(user);
  const displayName = getUserDisplayName(user);

  const handleLogout = () => {
    setAnchorEl(null);
    dispatch(logout());
    navigate('/login');
  };

  const allModules = [
    ...(user?.role === 'platform_admin'
      ? [
          {
            title: 'System Admin Console',
            description: 'Supervise multi-tenant organizations, global user access, and infrastructure nodes.',
            icon: <AdminPanelSettingsIcon sx={{ fontSize: 28 }} />,
            path: '/system-admin/organizations',
            permission: undefined,
            color: '#EC4899',
            tag: 'PLATFORM ADMIN',
          },
        ]
      : []),
    ...(user?.role === 'employee'
      ? [
          {
            title: 'Employee Self-Service',
            description: 'Request laptops, peripherals, workstation upgrades, and track ticket approvals in real-time.',
            icon: <DevicesIcon sx={{ fontSize: 28 }} />,
            path: '/portal',
            permission: undefined,
            color: '#06B6D4',
            tag: 'SELF-SERVICE',
          },
        ]
      : []),
    {
      title: 'IT Asset Intelligence',
      description: 'Comprehensive hardware telemetry, inventory life-cycles, device types, and assignments.',
      icon: <InventoryIcon sx={{ fontSize: 28 }} />,
      path: '/dashboard',
      permission: 'module:assets' as const,
      color: '#6366F1',
      tag: 'CORE INVENTORY',
    },
    {
      title: 'HR People & Governance',
      description: 'Streamline headcount, departmental allocations, attendance records, and policy frameworks.',
      icon: <PeopleIcon sx={{ fontSize: 28 }} />,
      path: '/hr',
      permission: 'module:hr' as const,
      color: '#10B981',
      tag: 'PEOPLE OPS',
    },
    {
      title: 'Executive Doc Vault',
      description: 'Secure corporate governance, compliance charters, board reviews, and onboarding archives.',
      icon: <FolderIcon sx={{ fontSize: 28 }} />,
      path: '/exec-docs',
      permission: 'module:docs' as const,
      color: '#3B82F6',
      tag: 'COMPLIANCE',
    },
    {
      title: 'IT Spend & Financials',
      description: 'Asset valuation schedules, CapEx amortization, and cost center budget monitoring.',
      icon: <AccountBalanceIcon sx={{ fontSize: 28 }} />,
      path: '/it-spend',
      permission: 'module:finance' as const,
      color: '#F59E0B',
      tag: 'FINANCE & CAPEX',
    },
  ];

  const modules = allModules.filter((m) => !m.permission || can(m.permission));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        backgroundImage: isDark
          ? 'radial-gradient(ellipse 90% 50% at 50% -10%, rgba(99, 102, 241, 0.09), transparent)'
          : 'radial-gradient(ellipse 90% 50% at 50% -10%, rgba(79, 70, 229, 0.04), transparent)',
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: isDark ? 'rgba(9, 14, 23, 0.8)' : 'rgba(255, 255, 255, 0.85)',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: theme.palette.divider,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <Toolbar sx={{ width: '100%', px: { xs: 2, md: 4 }, display: 'flex', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '11px',
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #06B6D4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                color: '#FFFFFF',
              }}
            >
              <LayersIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
              {APP_NAME}
            </Typography>
            {tenant?.name && (
              <Chip
                icon={<CorporateFareIcon sx={{ fontSize: 14 }} />}
                label={tenant.name}
                size="small"
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  height: 24,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '6px',
                  ml: 1,
                }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ThemeModeToggle />

            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 1, p: 0.5 }}>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                }}
              >
                {initials}
              </Avatar>
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{
              paper: {
                sx: {
                  minWidth: 220,
                  mt: 1.5,
                  borderRadius: '16px',
                  p: 1,
                  boxShadow: isDark
                    ? '0 20px 40px -8px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)'
                    : '0 20px 40px -8px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.08)',
                  backdropFilter: 'blur(20px)',
                },
              },
            }}
          >
            <Box sx={{ px: 1.5, py: 1.25 }}>
              <Typography variant="body2" fontWeight={700}>
                {displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {user?.email}
              </Typography>
              <Chip
                label={getRoleLabel(user?.role)}
                size="small"
                sx={{
                  mt: 0.75,
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  bgcolor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.08)',
                  color: 'primary.main',
                }}
              />
            </Box>
            <Divider sx={{ my: 0.75 }} />
            {user?.role === 'employee' ? (
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  navigate('/portal');
                }}
                sx={{ borderRadius: '10px' }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <DevicesIcon fontSize="small" />
                </ListItemIcon>
                Employee Portal
              </MenuItem>
            ) : (
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  navigate('/');
                }}
                sx={{ borderRadius: '10px' }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <DashboardIcon fontSize="small" />
                </ListItemIcon>
                Workspace Home
              </MenuItem>
            )}
            <MenuItem
              onClick={handleLogout}
              sx={{
                borderRadius: '10px',
                color: 'error.main',
                '& .MuiListItemIcon-root': { color: 'error.main' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: 1280, mx: 'auto', p: { xs: 2.5, sm: 4, md: 6 } }}>
        <Box sx={{ mb: 6, textAlign: 'center', pt: { xs: 2, md: 4 } }}>
          <Chip
            label="ENTERPRISE WORKSPACE"
            size="small"
            sx={{
              height: 24,
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              bgcolor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.08)',
              color: 'primary.main',
              border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(79, 70, 229, 0.2)'}`,
              borderRadius: '6px',
              mb: 2,
            }}
          />
          <Typography
            variant="h3"
            fontWeight={800}
            gutterBottom
            sx={{
              letterSpacing: '-0.03em',
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              background: isDark
                ? 'linear-gradient(135deg, #FFFFFF 0%, #94A3B8 100%)'
                : 'linear-gradient(135deg, #0F172A 0%, #475569 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Welcome back, {displayName.split(' ')[0]}
          </Typography>
          {tenant?.name && (
            <Typography variant="subtitle1" color="text.secondary" fontWeight={600} sx={{ mb: 1 }}>
              {tenant.name}
            </Typography>
          )}
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 580, mx: 'auto', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Access your authorized operational modules and infrastructure workflows below.
          </Typography>
        </Box>

        <Grid container spacing={3.5} justifyContent="center">
          {modules.map((mod) => (
            <Grid item xs={12} sm={6} md={4} key={mod.title}>
              <ModuleCard {...mod} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
