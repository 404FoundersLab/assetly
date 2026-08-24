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
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import { Outlet, useNavigate } from 'react-router-dom';
import { ThemeModeToggle } from '../ThemeModeToggle';
import { useAppDispatch, useAuthUser, useTenant } from '../../hooks/storeHooks';
import { logout } from '../../store/authSlice';
import { APP_NAME } from '../../constants/brand';
import { getUserDisplayName, getUserInitials } from '../../utils/userDisplay';
import { ChatbotWidget } from '../ChatbotWidget';

export function EmployeePortalLayout() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAuthUser();
  const tenant = useTenant();
  const theme = useTheme();

  const initials = getUserInitials(user);
  const displayName = getUserDisplayName(user);
  const isDarkMode = theme.palette.mode === 'dark';

  const handleLogout = () => {
    setAnchorEl(null);
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar sx={{ maxWidth: 960, width: '100%', mx: 'auto' }}>
          <Box 
            component="img"
            src="/logo.png"
            alt="Assetly Logo"
            onClick={() => navigate('/')}
            sx={{ 
              height: 38, 
              width: 38,
              objectFit: 'contain', 
              mr: 1.5, 
              cursor: 'pointer', 
              transition: 'opacity 0.2s',
              mixBlendMode: isDarkMode ? 'screen' : 'multiply',
              filter: isDarkMode ? 'invert(1) hue-rotate(180deg)' : 'none',
              '&:hover': { opacity: 0.8 } 
            }}
          />
          <Box 
            onClick={() => navigate('/')}
            sx={{ 
              flex: 1, 
              minWidth: 0, 
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              '&:hover': { opacity: 0.8 } 
            }}
          >
            <Typography variant="h6" fontWeight={700} noWrap>
              {APP_NAME}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              Device Request Portal · {tenant?.name}
            </Typography>
          </Box>
          <ThemeModeToggle />
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: '0.8rem' }}>
              {initials}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <Box sx={{ px: 2, py: 1, minWidth: 200 }}>
              <Typography variant="body2" fontWeight={600}>
                {displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/'); }}>
              <ListItemIcon>
                <HomeIcon fontSize="small" />
              </ListItemIcon>
              Corporate Portal
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ maxWidth: 960, width: '100%', mx: 'auto', px: { xs: 2, sm: 3 }, py: 3 }}>
        <Outlet />
      </Box>
      <ChatbotWidget />
    </Box>
  );
}
