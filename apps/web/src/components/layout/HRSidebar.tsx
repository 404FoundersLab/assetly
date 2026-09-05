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
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import HomeIcon from '@mui/icons-material/Home';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GavelIcon from '@mui/icons-material/Gavel';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import { NavLink, useLocation } from 'react-router-dom';
import { useTenant, useAuthUser, usePermissions } from '../../hooks/storeHooks';
import { getUserDisplayName, getUserInitials, getRoleLabel } from '../../utils/userDisplay';
import type { Permission } from '../../types';

const DRAWER_WIDTH = 276;

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
      { to: '/hr', label: 'HR Dashboard', icon: <DashboardIcon sx={{ fontSize: 19 }} /> },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/hr/employees', label: 'Employees', icon: <PeopleIcon sx={{ fontSize: 19 }} /> },
      { to: '/hr/departments', label: 'Departments', icon: <BusinessIcon sx={{ fontSize: 19 }} /> },
    ],
  },
  {
    label: 'Leave & Attendance',
    items: [
      { to: '/hr/leaves', label: 'Leave Management', icon: <EventAvailableIcon sx={{ fontSize: 19 }} /> },
      { to: '/hr/attendance', label: 'Attendance', icon: <AccessTimeIcon sx={{ fontSize: 19 }} /> },
    ],
  },
  {
    label: 'Lifecycle & Growth',
    items: [
      { to: '/hr/onboarding', label: 'Onboarding', icon: <RocketLaunchIcon sx={{ fontSize: 19 }} /> },
      { to: '/hr/performance', label: 'Performance Reviews', icon: <EmojiEventsIcon sx={{ fontSize: 19 }} /> },
    ],
  },
  {
    label: 'Policy & Governance',
    items: [
      { to: '/hr/policies', label: 'Company Policies', icon: <GavelIcon sx={{ fontSize: 19 }} /> },
    ],
  },
  {
    label: 'Navigation',
    items: [
      { to: '/', label: 'Back to Portal', icon: <HomeIcon sx={{ fontSize: 19 }} /> },
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
              background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              flexShrink: 0,
            }}
          >
            <Diversity3Icon sx={{ fontSize: 22 }} />
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
              HR Portal
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              display="block"
              sx={{ fontSize: '0.72rem', fontWeight: 600 }}
            >
              {tenant?.name || 'Workspace People'}
            </Typography>
          </Box>
        </Box>

        <Chip
          label="PEOPLE OPERATIONS"
          size="small"
          sx={{
            height: 22,
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            bgcolor: isDark ? 'rgba(16, 185, 129, 0.14)' : 'rgba(16, 185, 129, 0.08)',
            color: '#10B981',
            border: '1px solid',
            borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
            borderRadius: '6px',
          }}
        />
      </Box>

      <Divider sx={{ mx: 2, borderColor: theme.palette.divider }} />

      {/* Nav List */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1.5 }}>
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
                        borderRadius: '10px',
                        mb: 0.35,
                        py: 0.9,
                        px: 1.5,
                        position: 'relative',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        bgcolor: active
                          ? isDark
                            ? 'rgba(16, 185, 129, 0.14)'
                            : 'rgba(16, 185, 129, 0.08)'
                          : 'transparent',
                        color: active ? '#10B981' : 'text.secondary',
                        boxShadow: active
                          ? isDark
                            ? 'inset 0 0 0 1px rgba(16, 185, 129, 0.25)'
                            : 'inset 0 0 0 1px rgba(16, 185, 129, 0.2)'
                          : 'none',
                        '&:hover': {
                          bgcolor: active
                            ? isDark
                              ? 'rgba(16, 185, 129, 0.2)'
                              : 'rgba(16, 185, 129, 0.12)'
                            : isDark
                            ? 'rgba(255, 255, 255, 0.04)'
                            : 'rgba(15, 23, 42, 0.04)',
                          color: active ? '#10B981' : 'text.primary',
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
                            bgcolor: '#10B981',
                            borderRadius: '0 4px 4px 0',
                            boxShadow: '0 0 8px rgba(16, 185, 129, 0.7)',
                          }}
                        />
                      )}
                      <ListItemIcon
                        sx={{
                          minWidth: 32,
                          color: active ? '#10B981' : 'inherit',
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontWeight: active ? 700 : 500,
                          fontSize: '0.85rem',
                        }}
                      />
                    </ListItemButton>
                  );
                })}
            </List>
          </Box>
        ))}
      </Box>

      {/* User Capsule */}
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
          <Avatar
            sx={{
              width: 36,
              height: 36,
              background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
              fontSize: '0.8125rem',
              fontWeight: 700,
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: '0.82rem' }}>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: '0.68rem' }}>
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
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
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
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
        open
      >
        {drawer}
      </Drawer>
    </>
  );
}

export { DRAWER_WIDTH };
