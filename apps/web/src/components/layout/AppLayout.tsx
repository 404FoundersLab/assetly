import { useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Tooltip,
  useMediaQuery,
  useTheme,
  Chip,
  alpha,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar, DRAWER_WIDTH } from './Sidebar';
import { GlobalSearch } from '../GlobalSearch';
import { ThemeModeToggle } from '../ThemeModeToggle';
import { useAppDispatch, useAuthUser, useTenant } from '../../hooks/storeHooks';
import { logout } from '../../store/authSlice';
import { getRoleLabel, getUserDisplayName, getUserInitials } from '../../utils/userDisplay';
import { ChatbotWidget } from '../ChatbotWidget';

export function AppLayout() {
  const theme = useTheme();
  const showGlobalSearch = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAuthUser();
  const tenant = useTenant();
  const isDark = theme.palette.mode === 'dark';

  const initials = getUserInitials(user);
  const displayName = getUserDisplayName(user);

  const handleLogout = () => {
    setAnchorEl(null);
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: isDark ? 'rgba(9, 14, 23, 0.78)' : 'rgba(255, 255, 255, 0.85)',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: theme.palette.divider,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: (t) => t.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 58, md: 68 }, px: { xs: 2, md: 3 }, gap: 2 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{
              display: { md: 'none' },
              borderRadius: '10px',
              border: `1px solid ${theme.palette.divider}`,
            }}
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </IconButton>

          {showGlobalSearch ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <GlobalSearch />
              {tenant?.name && (
                <Chip
                  icon={<CorporateFareIcon sx={{ fontSize: 16 }} />}
                  label={tenant.name}
                  size="small"
                  sx={{
                    display: { xs: 'none', lg: 'inline-flex' },
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)',
                    border: '1px solid',
                    borderColor: theme.palette.divider,
                    borderRadius: '8px',
                    height: 28,
                  }}
                />
              )}
            </Box>
          ) : (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={800} noWrap sx={{ letterSpacing: '-0.02em' }}>
                {tenant?.name || 'Assetly Workspace'}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ThemeModeToggle />

            <Tooltip title="Account menu">
              <IconButton
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{
                  p: 0.5,
                  borderRadius: '12px',
                  transition: 'transform 0.18s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                }}
                aria-label="Open account menu"
              >
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                    }}
                  >
                    {initials}
                  </Avatar>
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -1,
                      right: -1,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: '#10B981',
                      border: `2px solid ${isDark ? '#090E17' : '#FFFFFF'}`,
                    }}
                  />
                </Box>
              </IconButton>
            </Tooltip>
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
                  minWidth: 240,
                  mt: 1.5,
                  borderRadius: '16px',
                  p: 1,
                  boxShadow: isDark
                    ? '0 20px 40px -8px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)'
                    : '0 20px 40px -8px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.08)',
                  backdropFilter: 'blur(20px)',
                  bgcolor: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.94)',
                },
              },
            }}
          >
            <Box sx={{ px: 1.5, py: 1.25, mb: 0.5 }}>
              <Typography variant="body2" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
                {displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
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
            <Divider sx={{ my: 0.75, borderColor: theme.palette.divider }} />
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate('/settings');
              }}
              sx={{ borderRadius: '10px', py: 1 }}
            >
              <ListItemIcon sx={{ color: 'text.secondary', minWidth: 32 }}>
                <SettingsOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2" fontWeight={600}>
                Settings
              </Typography>
            </MenuItem>
            <MenuItem
              onClick={handleLogout}
              sx={{
                borderRadius: '10px',
                py: 1,
                color: 'error.main',
                '& .MuiListItemIcon-root': { color: 'error.main' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2" fontWeight={600}>
                Sign out
              </Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: { xs: '100%', md: 'auto' },
          bgcolor: 'background.default',
          backgroundImage: isDark
            ? 'radial-gradient(ellipse 90% 50% at 50% -10%, rgba(99, 102, 241, 0.07), transparent)'
            : 'radial-gradient(ellipse 90% 50% at 50% -10%, rgba(79, 70, 229, 0.03), transparent)',
          minHeight: '100vh',
          overflowX: 'hidden',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 58, md: 68 } }} />
        <Box
          sx={{
            p: { xs: 2, sm: 3, md: 4 },
            maxWidth: 1680,
            mx: 'auto',
            width: '100%',
          }}
        >
          <Outlet />
        </Box>
      </Box>
      <ChatbotWidget />
    </Box>
  );
}
