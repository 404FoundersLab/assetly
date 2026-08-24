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
  Toolbar,
  Chip,
  Avatar,
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import RuleFolderOutlinedIcon from '@mui/icons-material/RuleFolderOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import { NavLink, useLocation } from 'react-router-dom';
import { APP_NAME } from '../../constants/brand';
import { useAuthUser, useTenant } from '../../hooks/storeHooks';
import { getUserDisplayName, getUserInitials } from '../../utils/userDisplay';

const DRAWER_WIDTH = 268;

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Executive',
    items: [
      { to: '/exec-docs', label: 'Dashboard', icon: <DashboardOutlinedIcon fontSize="small" /> },
      { to: '/exec-docs/library', label: 'Library', icon: <DescriptionOutlinedIcon fontSize="small" /> },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/exec-docs/finance', label: 'IT Finance', icon: <AccountBalanceWalletOutlinedIcon fontSize="small" /> },
      { to: '/exec-docs/meetings', label: 'Meetings', icon: <CalendarMonthOutlinedIcon fontSize="small" /> },
      { to: '/exec-docs/compliance', label: 'Compliance', icon: <RuleFolderOutlinedIcon fontSize="small" /> },
    ],
  },
  {
    label: 'Navigation',
    items: [
      { to: '/', label: 'Back to Portal', icon: <HomeOutlinedIcon fontSize="small" /> },
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
            Executive Docs
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: '0.7rem' }}>
            {tenant?.name}
          </Typography>
        </Box>
      </Toolbar>

      <Box sx={{ px: 2.5, pb: 1.5 }}>
        <Chip
          label="Documents Module"
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
