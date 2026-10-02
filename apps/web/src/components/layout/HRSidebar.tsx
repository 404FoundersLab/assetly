import { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Divider,
  Collapse,
  useMediaQuery,
  useTheme,
  alpha,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import GroupsIcon from '@mui/icons-material/Groups';
import BadgeIcon from '@mui/icons-material/Badge';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PolicyIcon from '@mui/icons-material/Policy';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssignmentIcon from '@mui/icons-material/Assignment';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import FolderIcon from '@mui/icons-material/Folder';
import CampaignIcon from '@mui/icons-material/Campaign';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import HomeIcon from '@mui/icons-material/Home';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import DescriptionIcon from '@mui/icons-material/Description';
import { NavLink, useLocation } from 'react-router-dom';
import { useTenant, useAuthUser, usePermissions } from '../../hooks/storeHooks';
import { getUserDisplayName, getUserInitials, getRoleLabel } from '../../utils/userDisplay';

const DRAWER_WIDTH = 280;

interface NavItemSingle {
  type: 'single';
  to: string;
  label: string;
  icon: React.ReactNode;
}

interface NavItemDropdown {
  type: 'group';
  id: string;
  label: string;
  icon: React.ReactNode;
  children: {
    to: string;
    label: string;
    icon: React.ReactNode;
  }[];
}

type HRNavItem = NavItemSingle | NavItemDropdown;

const HR_NAVIGATION: HRNavItem[] = [
  {
    type: 'single',
    to: '/hr',
    label: 'Dashboard',
    icon: <DashboardIcon sx={{ fontSize: 20 }} />,
  },
  {
    type: 'group',
    id: 'employees',
    label: 'Employees',
    icon: <PeopleIcon sx={{ fontSize: 20 }} />,
    children: [
      { to: '/hr/employees', label: 'All Employees', icon: <PeopleIcon sx={{ fontSize: 18 }} /> },
      { to: '/hr/departments', label: 'Departments', icon: <BusinessIcon sx={{ fontSize: 18 }} /> },
      { to: '/hr/teams', label: 'Teams', icon: <GroupsIcon sx={{ fontSize: 18 }} /> },
      { to: '/hr/designations', label: 'Designations', icon: <BadgeIcon sx={{ fontSize: 18 }} /> },
    ],
  },
  {
    type: 'group',
    id: 'attendance',
    label: 'Attendance',
    icon: <AccessTimeIcon sx={{ fontSize: 20 }} />,
    children: [
      { to: '/hr/attendance/my', label: 'My Attendance', icon: <PersonIcon sx={{ fontSize: 18 }} /> },
      { to: '/hr/attendance/team', label: 'Team Attendance', icon: <GroupsIcon sx={{ fontSize: 18 }} /> },
      { to: '/hr/attendance/reports', label: 'Attendance Reports', icon: <AssessmentIcon sx={{ fontSize: 18 }} /> },
    ],
  },
  {
    type: 'group',
    id: 'leave',
    label: 'Leave',
    icon: <BeachAccessIcon sx={{ fontSize: 20 }} />,
    children: [
      { to: '/hr/leaves/my', label: 'My Leaves', icon: <PersonIcon sx={{ fontSize: 18 }} /> },
      { to: '/hr/leaves/requests', label: 'Leave Requests', icon: <PendingActionsIcon sx={{ fontSize: 18 }} /> },
      { to: '/hr/leaves/balance', label: 'Leave Balance', icon: <AccountBalanceWalletIcon sx={{ fontSize: 18 }} /> },
      { to: '/hr/leaves/types', label: 'Leave Types', icon: <PolicyIcon sx={{ fontSize: 18 }} /> },
    ],
  },
  {
    type: 'single',
    to: '/hr/wfh',
    label: 'Work From Home',
    icon: <HomeWorkIcon sx={{ fontSize: 20 }} />,
  },
  {
    type: 'single',
    to: '/hr/holidays',
    label: 'Holidays',
    icon: <CalendarMonthIcon sx={{ fontSize: 20 }} />,
  },
  {
    type: 'group',
    id: 'hr_ops',
    label: 'HR',
    icon: <DescriptionIcon sx={{ fontSize: 20 }} />,
    children: [
      { to: '/hr/requests', label: 'HR Requests', icon: <AssignmentIcon sx={{ fontSize: 18 }} /> },
      { to: '/hr/onboarding', label: 'Onboarding', icon: <RocketLaunchIcon sx={{ fontSize: 18 }} /> },
      { to: '/hr/offboarding', label: 'Offboarding', icon: <ExitToAppIcon sx={{ fontSize: 18 }} /> },
      { to: '/hr/documents', label: 'Documents', icon: <FolderIcon sx={{ fontSize: 18 }} /> },
    ],
  },
  {
    type: 'single',
    to: '/hr/announcements',
    label: 'Announcements',
    icon: <CampaignIcon sx={{ fontSize: 20 }} />,
  },
  {
    type: 'single',
    to: '/hr/reports',
    label: 'Reports',
    icon: <BarChartIcon sx={{ fontSize: 20 }} />,
  },
  {
    type: 'single',
    to: '/hr/settings',
    label: 'Settings',
    icon: <SettingsIcon sx={{ fontSize: 20 }} />,
  },
];

interface HRSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function HRSidebar({ mobileOpen, onClose }: HRSidebarProps) {
  const location = useLocation();
  const tenant = useTenant();
  const user = useAuthUser();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    employees: true,
    attendance: true,
    leave: true,
    hr_ops: true,
  });

  // Auto-expand group if on a child route
  useEffect(() => {
    HR_NAVIGATION.forEach((item) => {
      if (item.type === 'group') {
        const isChildActive = item.children.some((c) =>
          location.pathname === c.to || location.pathname.startsWith(`${c.to}/`)
        );
        if (isChildActive) {
          setOpenGroups((prev) => ({ ...prev, [item.id]: true }));
        }
      }
    });
  }, [location.pathname]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isNavActive = (to: string): boolean => {
    if (to === '/hr') return location.pathname === '/hr';
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const initials = getUserInitials(user);
  const displayName = getUserDisplayName(user);

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand Header */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, mb: 1.5 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              flexShrink: 0,
            }}
          >
            <Diversity3Icon sx={{ fontSize: 24 }} />
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
              {tenant?.name || 'People & Culture'}
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
        <List disablePadding>
          {HR_NAVIGATION.map((item) => {
            if (item.type === 'single') {
              const active = isNavActive(item.to);
              return (
                <ListItemButton
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  onClick={isMobile ? onClose : undefined}
                  selected={active}
                  sx={{
                    borderRadius: '10px',
                    mb: 0.4,
                    py: 0.85,
                    px: 1.5,
                    position: 'relative',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    bgcolor: active
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.16)'
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
                          ? 'rgba(16, 185, 129, 0.22)'
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
                  <ListItemIcon sx={{ minWidth: 32, color: active ? '#10B981' : 'inherit' }}>
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
            }

            // Group / Accordion item
            const isOpen = Boolean(openGroups[item.id]);
            const isGroupActive = item.children.some((c) => isNavActive(c.to));

            return (
              <Box key={item.id} sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => toggleGroup(item.id)}
                  sx={{
                    borderRadius: '10px',
                    py: 0.85,
                    px: 1.5,
                    color: isGroupActive ? '#10B981' : 'text.primary',
                    '&:hover': {
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: isGroupActive ? '#10B981' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isGroupActive ? 700 : 600,
                      fontSize: '0.85rem',
                      letterSpacing: '-0.01em',
                    }}
                  />
                  {isOpen ? <ExpandLess sx={{ fontSize: 18, color: 'text.secondary' }} /> : <ExpandMore sx={{ fontSize: 18, color: 'text.secondary' }} />}
                </ListItemButton>

                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                  <List disablePadding sx={{ pl: 2, pt: 0.25 }}>
                    {item.children.map((child) => {
                      const childActive = isNavActive(child.to);
                      return (
                        <ListItemButton
                          key={child.to}
                          component={NavLink}
                          to={child.to}
                          onClick={isMobile ? onClose : undefined}
                          selected={childActive}
                          sx={{
                            borderRadius: '8px',
                            mb: 0.25,
                            py: 0.65,
                            px: 1.5,
                            position: 'relative',
                            transition: 'all 0.15s ease',
                            bgcolor: childActive
                              ? isDark
                                ? 'rgba(16, 185, 129, 0.14)'
                                : 'rgba(16, 185, 129, 0.08)'
                              : 'transparent',
                            color: childActive ? '#10B981' : 'text.secondary',
                            '&:hover': {
                              bgcolor: childActive
                                ? isDark
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : 'rgba(16, 185, 129, 0.12)'
                                : isDark
                                ? 'rgba(255, 255, 255, 0.03)'
                                : 'rgba(15, 23, 42, 0.03)',
                              color: childActive ? '#10B981' : 'text.primary',
                              transform: 'translateX(2px)',
                            },
                          }}
                        >
                          {childActive && (
                            <Box
                              sx={{
                                position: 'absolute',
                                left: 0,
                                top: '25%',
                                bottom: '25%',
                                width: 3,
                                bgcolor: '#10B981',
                                borderRadius: '0 4px 4px 0',
                              }}
                            />
                          )}
                          <ListItemIcon sx={{ minWidth: 28, color: childActive ? '#10B981' : 'inherit' }}>
                            {child.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={child.label}
                            primaryTypographyProps={{
                              fontWeight: childActive ? 700 : 500,
                              fontSize: '0.8rem',
                            }}
                          />
                        </ListItemButton>
                      );
                    })}
                  </List>
                </Collapse>
              </Box>
            );
          })}

          <Divider sx={{ my: 1.5, mx: 1, borderColor: theme.palette.divider }} />

          <ListItemButton
            component={NavLink}
            to="/"
            onClick={isMobile ? onClose : undefined}
            sx={{
              borderRadius: '10px',
              py: 0.85,
              px: 1.5,
              color: 'text.secondary',
              '&:hover': {
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)',
                color: 'text.primary',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
              <HomeIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText
              primary="Back to Workspace"
              primaryTypographyProps={{ fontWeight: 600, fontSize: '0.85rem' }}
            />
          </ListItemButton>
        </List>
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
          <Avatar
            sx={{
              width: 36,
              height: 36,
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
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
