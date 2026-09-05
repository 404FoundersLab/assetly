import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
  Divider,
  Chip,
  Avatar,
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import RuleFolderOutlinedIcon from '@mui/icons-material/RuleFolderOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthUser, useTenant } from '../../hooks/storeHooks';
import { getUserDisplayName, getUserInitials, getRoleLabel } from '../../utils/userDisplay';

const DRAWER_WIDTH = 276;

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Executive',
    items: [
      { to: '/exec-docs', label: 'Dashboard', icon: <DashboardOutlinedIcon sx={{ fontSize: 19 }} /> },
      { to: '/exec-docs/library', label: 'Library', icon: <DescriptionOutlinedIcon sx={{ fontSize: 19 }} /> },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/exec-docs/finance', label: 'IT Finance', icon: <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 19 }} /> },
      { to: '/exec-docs/meetings', label: 'Meetings', icon: <CalendarMonthOutlinedIcon sx={{ fontSize: 19 }} /> },
      { to: '/exec-docs/compliance', label: 'Compliance', icon: <RuleFolderOutlinedIcon sx={{ fontSize: 19 }} /> },
    ],
  },
  {
    label: 'Navigation',
    items: [
      { to: '/', label: 'Back to Portal', icon: <HomeOutlinedIcon sx={{ fontSize: 19 }} /> },
    ],
  },
];

interface ExecDocsSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

function isNavActive(pathname: string, to: string): boolean {
  if (to === '/exec-docs') return pathname === '/exec-docs';
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function ExecDocsSidebar({ mobileOpen, onClose }: ExecDocsSidebarProps) {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const user = useAuthUser();
  const tenant = useTenant();
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
              background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
              flexShrink: 0,
            }}
          >
            <AutoStoriesIcon sx={{ fontSize: 22 }} />
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
              Executive Docs
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              display="block"
              sx={{ fontSize: '0.72rem', fontWeight: 600 }}
            >
              {tenant?.name || 'Knowledge Vault'}
            </Typography>
          </Box>
        </Box>

        <Chip
          label="DOCS & GOVERNANCE"
          size="small"
          sx={{
            height: 22,
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            bgcolor: isDark ? 'rgba(59, 130, 246, 0.14)' : 'rgba(59, 130, 246, 0.08)',
            color: '#3B82F6',
            border: '1px solid',
            borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
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
              {group.items.map((item) => {
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
                          ? 'rgba(59, 130, 246, 0.14)'
                          : 'rgba(59, 130, 246, 0.08)'
                        : 'transparent',
                      color: active ? '#3B82F6' : 'text.secondary',
                      boxShadow: active
                        ? isDark
                          ? 'inset 0 0 0 1px rgba(59, 130, 246, 0.25)'
                          : 'inset 0 0 0 1px rgba(59, 130, 246, 0.2)'
                        : 'none',
                      '&:hover': {
                        bgcolor: active
                          ? isDark
                            ? 'rgba(59, 130, 246, 0.2)'
                            : 'rgba(59, 130, 246, 0.12)'
                          : isDark
                          ? 'rgba(255, 255, 255, 0.04)'
                          : 'rgba(15, 23, 42, 0.04)',
                        color: active ? '#3B82F6' : 'text.primary',
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
                          bgcolor: '#3B82F6',
                          borderRadius: '0 4px 4px 0',
                          boxShadow: '0 0 8px rgba(59, 130, 246, 0.7)',
                        }}
                      />
                    )}
                    <ListItemIcon
                      sx={{
                        minWidth: 32,
                        color: active ? '#3B82F6' : 'inherit',
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
              background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
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
