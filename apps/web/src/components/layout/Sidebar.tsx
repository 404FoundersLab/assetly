import {
  Box,
  Chip,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Divider,
  useMediaQuery,
  useTheme,
  alpha,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StoreIcon from '@mui/icons-material/Store';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DevicesOtherIcon from '@mui/icons-material/DevicesOther';
import CategoryIcon from '@mui/icons-material/Category';
import LanIcon from '@mui/icons-material/Lan';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SecurityIcon from '@mui/icons-material/Security';
import SyncIcon from '@mui/icons-material/Sync';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import HomeIcon from '@mui/icons-material/Home';
import LayersIcon from '@mui/icons-material/Layers';
import { NavLink, useLocation } from 'react-router-dom';
import { useTenant, useAuthUser, usePermissions } from '../../hooks/storeHooks';
import { getUserDisplayName, getUserInitials, getRoleLabel } from '../../utils/userDisplay';
import type { Permission } from '../../types';
import { APP_NAME } from '../../constants/brand';

const DRAWER_WIDTH = 276;

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  permission?: Permission;
  role?: string;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon fontSize="small" />, permission: 'module:assets' },
      { to: '/analytics', label: 'AI & Analytics', icon: <AutoGraphIcon fontSize="small" />, permission: 'module:assets' },
      { to: '/requests', label: 'Requests', icon: <AssignmentIcon fontSize="small" />, permission: 'request:review' },
    ],
  },
  {
    label: 'Inventory & Fleet',
    items: [
      { to: '/assets', label: 'IT Assets', icon: <LaptopMacIcon fontSize="small" />, permission: 'module:assets' },
      { to: '/devices', label: 'Peripherals', icon: <DevicesOtherIcon fontSize="small" />, permission: 'module:assets' },
      { to: '/network-devices', label: 'Network devices', icon: <LanIcon fontSize="small" />, permission: 'module:assets' },
      { to: '/store-devices', label: 'Store devices', icon: <StorefrontIcon fontSize="small" />, permission: 'module:assets' },
      { to: '/assets/types', label: 'Device types', icon: <CategoryIcon fontSize="small" />, permission: 'asset_type:write' },
      { to: '/lifecycle', label: 'Lifecycle', icon: <SyncIcon fontSize="small" />, permission: 'module:assets' },
      { to: '/mobile', label: 'Mobile & Field', icon: <PhoneIphoneIcon fontSize="small" />, permission: 'module:assets' },
    ],
  },
  {
    label: 'Finance & Maintenance',
    items: [
      { to: '/it-spend', label: 'IT Spend', icon: <AttachMoneyIcon fontSize="small" />, permission: 'module:finance' },
      { to: '/software', label: 'Software SAM', icon: <CodeIcon fontSize="small" />, permission: 'module:assets' },
      { to: '/maintenance', label: 'Maintenance', icon: <BuildIcon fontSize="small" />, permission: 'module:assets' },
    ],
  },
  {
    label: 'Organization',
    items: [
      { to: '/employees', label: 'Employees', icon: <PeopleIcon fontSize="small" />, permission: 'employee:read' },
      { to: '/departments', label: 'Departments', icon: <BusinessIcon fontSize="small" />, permission: 'employee:read' },
      { to: '/vendors', label: 'Vendors', icon: <StoreIcon fontSize="small" />, permission: 'vendor:write' },
    ],
  },
  {
    label: 'System & Security',
    items: [
      { to: '/endpoints', label: 'Endpoint Security', icon: <SecurityIcon fontSize="small" />, permission: 'module:assets' },
      { to: '/audit', label: 'Audit Logs', icon: <HistoryIcon fontSize="small" />, permission: 'audit:read' },
      { to: '/settings/users', label: 'Team Accounts', icon: <ManageAccountsIcon fontSize="small" />, permission: 'user:manage' },
      { to: '/settings', label: 'Settings', icon: <SettingsIcon fontSize="small" />, permission: 'settings:write' },
    ],
  },
  {
    label: 'Navigation',
    items: [
      { to: '/', label: 'Employee Portal', icon: <HomeIcon fontSize="small" /> },
    ],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

function isNavActive(pathname: string, search: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  const family = new URLSearchParams(search).get('family');
  const menuFamily: Record<string, string> = {
    '/assets': 'it_asset',
    '/devices': 'peripheral',
    '/network-devices': 'network',
    '/store-devices': 'store',
  };
  if (pathname === '/assets/new' && menuFamily[to]) {
    return (family ?? 'it_asset') === menuFamily[to];
  }
  if (to === '/assets') {
    if (pathname === '/assets/types' || pathname.startsWith('/assets/types/')) return false;
    if (pathname === '/assets/new') return false;
    return pathname === '/assets' || pathname.startsWith('/assets/');
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const tenant = useTenant();
  const user = useAuthUser();
  const { can } = usePermissions();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';

  const initials = getUserInitials(user);
  const displayName = getUserDisplayName(user);

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand Header */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, mb: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #06B6D4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              flexShrink: 0,
            }}
          >
            <LayersIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              fontWeight={800}
              lineHeight={1.15}
              noWrap
              sx={{
                fontSize: '1.05rem',
                letterSpacing: '-0.02em',
                background: isDark
                  ? 'linear-gradient(90deg, #FFFFFF 0%, #CBD5E1 100%)'
                  : 'linear-gradient(90deg, #0F172A 0%, #334155 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {APP_NAME}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: '#10B981',
                  boxShadow: '0 0 6px rgba(16, 185, 129, 0.8)',
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ fontSize: '0.72rem', fontWeight: 500 }}
              >
                {tenant?.name || 'Default Organization'}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Chip
            label={tenant?.plan ? `${tenant.plan.toUpperCase()} PLAN` : 'ENTERPRISE PLAN'}
            size="small"
            sx={{
              height: 22,
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              bgcolor: isDark ? 'rgba(99, 102, 241, 0.14)' : 'rgba(79, 70, 229, 0.08)',
              color: 'primary.main',
              border: '1px solid',
              borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(79, 70, 229, 0.2)',
              borderRadius: '6px',
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.68rem',
              color: 'text.secondary',
              fontWeight: 600,
            }}
          >
            v2.4 Pro
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mx: 2, borderColor: theme.palette.divider }} />

      {/* Nav List */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1.5,
          py: 1.5,
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            borderRadius: '10px',
          },
        }}
      >
        {navGroups.map((group) => (
          <Box key={group.label} sx={{ mb: 1.75 }}>
            <Typography
              variant="caption"
              sx={{
                px: 1.5,
                pb: 0.75,
                display: 'block',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontSize: '0.65rem',
                color: isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.8)',
              }}
            >
              {group.label}
            </Typography>
            <List disablePadding>
              {group.items
                .filter((item) => (!item.permission || can(item.permission)) && (!item.role || item.role === user?.role))
                .map((item) => {
                  const active = isNavActive(location.pathname, location.search, item.to);
                  return (
                    <ListItemButton
                      key={item.to}
                      component={NavLink}
                      to={item.to}
                      onClick={isMobile ? onClose : undefined}
                      selected={active}
                      sx={{
                        borderRadius: '10px',
                        mb: 0.35,
                        py: 0.9,
                        px: 1.5,
                        position: 'relative',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        bgcolor: active
                          ? isDark
                            ? 'rgba(99, 102, 241, 0.16)'
                            : 'rgba(79, 70, 229, 0.08)'
                          : 'transparent',
                        color: active ? 'primary.main' : 'text.secondary',
                        boxShadow: active
                          ? isDark
                            ? 'inset 0 0 0 1px rgba(99, 102, 241, 0.25)'
                            : 'inset 0 0 0 1px rgba(79, 70, 229, 0.2)'
                          : 'none',
                        '&:hover': {
                          bgcolor: active
                            ? isDark
                              ? 'rgba(99, 102, 241, 0.22)'
                              : 'rgba(79, 70, 229, 0.12)'
                            : isDark
                            ? 'rgba(255, 255, 255, 0.04)'
                            : 'rgba(15, 23, 42, 0.04)',
                          color: active ? 'primary.main' : 'text.primary',
                          transform: 'translateX(2px)',
                        },
                      }}
                    >
                      {active && (
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 0,
                            top: '20%',
                            bottom: '20%',
                            width: 3.5,
                            bgcolor: 'primary.main',
                            borderRadius: '0 4px 4px 0',
                            boxShadow: '0 0 8px rgba(99, 102, 241, 0.7)',
                          }}
                        />
                      )}
                      <ListItemIcon
                        sx={{
                          minWidth: 32,
                          color: active ? 'primary.main' : 'inherit',
                          transition: 'color 0.18s ease',
                          '& .MuiSvgIcon-root': {
                            fontSize: 19,
                          },
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontWeight: active ? 700 : 500,
                          fontSize: '0.85rem',
                          letterSpacing: '-0.01em',
                        }}
                      />
                    </ListItemButton>
                  );
                })}
            </List>
          </Box>
        ))}
      </Box>

      {/* User Capsule Footer */}
      <Box sx={{ p: 1.75, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.25,
            borderRadius: '12px',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.025)' : 'rgba(15, 23, 42, 0.025)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)',
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
                fontSize: '0.8125rem',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
              }}
            >
              {initials}
            </Avatar>
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 9,
                height: 9,
                borderRadius: '50%',
                bgcolor: '#10B981',
                border: `2px solid ${isDark ? '#090E17' : '#FFFFFF'}`,
              }}
            />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: '0.82rem' }}>
              {displayName}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              display="block"
              sx={{ fontSize: '0.68rem', lineHeight: 1.2 }}
            >
              {getRoleLabel(user?.role)}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        anchor="left"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </>
  );
}

export { DRAWER_WIDTH };
