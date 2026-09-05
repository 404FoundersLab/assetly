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
  useTheme,
  Chip,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import LayersIcon from '@mui/icons-material/Layers';
import { Outlet, useNavigate } from 'react-router-dom';
import { ThemeModeToggle } from '../ThemeModeToggle';
import { useAppDispatch, useAuthUser, useTenant } from '../../hooks/storeHooks';
import { logout } from '../../store/authSlice';
import { APP_NAME } from '../../constants/brand';
import { getUserDisplayName, getUserInitials, getRoleLabel } from '../../utils/userDisplay';
import { ChatbotWidget } from '../ChatbotWidget';

export function EmployeePortalLayout() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAuthUser();
  const tenant = useTenant();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const initials = getUserInitials(user);
  const displayName = getUserDisplayName(user);

  const handleLogout = () => {
    setAnchorEl(null);
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        backgroundImage: isDark
          ? 'radial-gradient(ellipse 90% 50% at 50% -10%, rgba(99, 102, 241, 0.08), transparent)'
          : 'radial-gradient(ellipse 90% 50% at 50% -10%, rgba(79, 70, 229, 0.03), transparent)',
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
        <Toolbar sx={{ maxWidth: 1080, width: '100%', mx: 'auto', px: { xs: 2, sm: 3 } }}>
          <Box
            onClick={() => navigate('/')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flex: 1,
              minWidth: 0,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              '&:hover': { opacity: 0.85 },
            }}
          >
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '11px',
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                flexShrink: 0,
              }}
            >
              <LayersIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" fontWeight={800} noWrap sx={{ letterSpacing: '-0.02em' }}>
                  {APP_NAME}
                </Typography>
                <Chip
                  label="PORTAL"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    bgcolor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.08)',
                    color: 'primary.main',
                    borderRadius: '6px',
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: '0.72rem' }}>
                Device Request & Self-Service · {tenant?.name || 'Workspace'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ThemeModeToggle />
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5, ml: 0.5 }}>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
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
            slotProps={{
              paper: {
                sx: {
                  borderRadius: '16px',
                  minWidth: 220,
                  mt: 1.5,
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
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate('/');
              }}
              sx={{ borderRadius: '10px' }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <HomeIcon fontSize="small" />
              </ListItemIcon>
              Corporate Portal
            </MenuItem>
            <MenuItem
              onClick={handleLogout}
              sx={{ borderRadius: '10px', color: 'error.main', '& .MuiListItemIcon-root': { color: 'error.main' } }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          maxWidth: 1080,
          width: '100%',
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 2.5, md: 3.5 },
        }}
      >
        <Outlet />
      </Box>
      <ChatbotWidget />
    </Box>
  );
}
