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
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory2';
import StoreIcon from '@mui/icons-material/Store';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DevicesOtherIcon from '@mui/icons-material/DevicesOther';
import LanIcon from '@mui/icons-material/Lan';
import SecurityIcon from '@mui/icons-material/Security';
import SyncIcon from '@mui/icons-material/Sync';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import HomeIcon from '@mui/icons-material/Home';
import { NavLink, useLocation } from 'react-router-dom';
import { useTenant, useAuthUser, usePermissions } from '../../hooks/storeHooks';
import { getUserDisplayName, getUserInitials } from '../../utils/userDisplay';
import type { Permission } from '../../types';
import { APP_NAME } from '../../constants/brand';

const DRAWER_WIDTH = 268;

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
    label: 'Inventory',
    items: [
      { to: '/assets', label: 'Assets', icon: <InventoryIcon fontSize="small" />, permission: 'module:assets' },
      { to: '/lifecycle', label: 'Lifecycle', icon: <SyncIcon fontSize="small" />, permission: 'module:assets' },
      { to: '/devices', label: 'Devices', icon: <DevicesOtherIcon fontSize="small" />, permission: 'module:assets' },
      { to: '/network-devices', label: 'Network Devices', icon: <LanIcon fontSize="small" />, permission: 'module:assets' },
      { to: '/mobile', label: 'Mobile & Field', icon: <PhoneIphoneIcon fontSize="small" />, permission: 'module:assets' },
    ],
  },
  {
    label: 'Spend & Maintenance',
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
    label: 'System',
    items: [
      { to: '/endpoints', label: 'Endpoint Security', icon: <SecurityIcon fontSize="small" />, permission: 'module:assets' },
      { to: '/audit', label: 'Audit Logs', icon: <HistoryIcon fontSize="small" />, permission: 'audit:read' },
      { to: '/settings/users', label: 'Team accounts', icon: <ManageAccountsIcon fontSize="small" />, permission: 'user:manage' },
      { to: '/settings', label: 'Settings', icon: <SettingsIcon fontSize="small" />, permission: 'settings:write' },
    ],
  },
  {
    label: 'Navigation',
    items: [
      { to: '/', label: 'Back to Portal', icon: <HomeIcon fontSize="small" /> },
    ],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

function isNavActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const tenant = useTenant();
  const user = useAuthUser();
  const { can } = usePermissions();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const initials = getUserInitials(user);
  const displayName = getUserDisplayName(user);

  const isDarkMode = theme.palette.mode === 'dark';

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2.5, gap: 1.5, minHeight: { xs: 64, md: 72 } }}>
        <Box
          component="img"
          src="/logo.png"
          alt="App Logo"
          sx={{ 
            width: 64, height: 64, objectFit: 'contain', 
            mixBlendMode: isDarkMode ? 'screen' : 'multiply', 
            filter: isDarkMode ? 'invert(1) hue-rotate(180deg)' : 'none',
            transform: 'scale(1.3)' 
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={600} lineHeight={1.2} noWrap sx={{ fontSize: '0.95rem', color: 'text.primary' }}>
            {APP_NAME}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: '0.7rem' }}>
            {tenant?.name}
          </Typography>
        </Box>
      </Toolbar>

      <Box sx={{ px: 2.5, pb: 1.5 }}>
        <Chip
          label={tenant?.plan ?? 'Professional'}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      </Box>

      <Divider />

      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {navGroups.map((group) => (
          <Box key={group.label} sx={{ px: 1.5, mb: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                px: 1.5,
                py: 0.75,
                display: 'block',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontSize: '0.6875rem',
              }}
            >
              {group.label}
            </Typography>
            <List disablePadding>
              {group.items
                .filter((item) => (!item.permission || can(item.permission)) && (!item.role || item.role === user?.role))
                .map((item) => {
                const active = isNavActive(location.pathname, item.to);
                return (
                  <ListItemButton
                    key={item.to}
                    component={NavLink}
                    to={item.to}
                    onClick={isMobile ? onClose : undefined}
                    selected={active}
                    sx={{
                      borderRadius: 2.5,
                      mb: 0.25,
                      py: 1,
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        boxShadow: '0 2px 8px rgba(21, 101, 192, 0.35)',
                        '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                        '&:hover': { bgcolor: 'primary.dark' },
                      },
                      '&:not(.Mui-selected):hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 36,
                        color: active ? 'inherit' : 'text.secondary',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: active ? 600 : 500,
                        fontSize: '0.9375rem',
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Divider />

      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: 'secondary.main',
            fontSize: '0.875rem',
            fontWeight: 700,
          }}
        >
          {initials}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {user?.email}
          </Typography>
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
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
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
