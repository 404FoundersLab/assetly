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
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import HomeIcon from '@mui/icons-material/Home';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GavelIcon from '@mui/icons-material/Gavel';
import { NavLink, useLocation } from 'react-router-dom';
import { useTenant, useAuthUser, usePermissions } from '../../hooks/storeHooks';
import { getUserDisplayName, getUserInitials } from '../../utils/userDisplay';
import type { Permission } from '../../types';

const DRAWER_WIDTH = 268;

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  permission?: Permission;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { to: '/hr', label: 'HR Dashboard', icon: <DashboardIcon fontSize="small" /> },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/hr/employees', label: 'Employees', icon: <PeopleIcon fontSize="small" /> },
      { to: '/hr/departments', label: 'Departments', icon: <BusinessIcon fontSize="small" /> },
    ],
  },
  {
    label: 'Leave & Attendance',
    items: [
      { to: '/hr/leaves', label: 'Leave Management', icon: <EventAvailableIcon fontSize="small" /> },
      { to: '/hr/attendance', label: 'Attendance', icon: <AccessTimeIcon fontSize="small" /> },
    ],
  },
  {
    label: 'Lifecycle',
    items: [
      { to: '/hr/onboarding', label: 'Onboarding', icon: <RocketLaunchIcon fontSize="small" /> },
    ],
  },
  {
    label: 'Performance',
    items: [
      { to: '/hr/performance', label: 'Performance Reviews', icon: <EmojiEventsIcon fontSize="small" /> },
    ],
  },
  {
    label: 'Policy & Compliance',
    items: [
      { to: '/hr/policies', label: 'Company Policies', icon: <GavelIcon fontSize="small" /> },
    ],
  },
  {
    label: 'Navigation',
    items: [
      { to: '/', label: 'Back to Portal', icon: <HomeIcon fontSize="small" /> },
    ],
  },
];

interface HRSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

function isNavActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  if (to === '/hr') return pathname === '/hr';
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function HRSidebar({ mobileOpen, onClose }: HRSidebarProps) {
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
            HR Policy App
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: '0.7rem' }}>
            {tenant?.name}
          </Typography>
        </Box>
      </Toolbar>

      <Box sx={{ px: 2.5, pb: 1.5 }}>
        <Chip
          label="HR Module"
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
                .filter((item) => !item.permission || can(item.permission))
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
