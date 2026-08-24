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
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import { Outlet, useNavigate } from 'react-router-dom';
import { SystemAdminSidebar, DRAWER_WIDTH } from './SystemAdminSidebar';
import { GlobalSearch } from '../GlobalSearch';
import { ThemeModeToggle } from '../ThemeModeToggle';
import { useAppDispatch, useAuthUser } from '../../hooks/storeHooks';
import { logout } from '../../store/authSlice';
import { getRoleLabel, getUserDisplayName, getUserInitials } from '../../utils/userDisplay';

export function SystemAdminLayout() {
  const theme = useTheme();
  const showGlobalSearch = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAuthUser();

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
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, md: 64 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 1.5, display: { md: 'none' } }}
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </IconButton>

          {showGlobalSearch ? (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <GlobalSearch />
            </Box>
          ) : (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                Administration
              </Typography>
            </Box>
          )}

          <ThemeModeToggle />

          <Tooltip title="Account">
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ p: 0.5 }}
              aria-label="Open account menu"
            >
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
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{
              paper: {
                sx: { minWidth: 220, mt: 1, borderRadius: 2 },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="body2" fontWeight={600}>
                {displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {getRoleLabel(user?.role)}
              </Typography>
            </Box>
            <Divider />
            {/* 
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/settings'); }}>
              <ListItemIcon><SettingsOutlinedIcon fontSize="small" /></ListItemIcon>
              Settings
            </MenuItem>
            */}
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <SystemAdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: { xs: '100%', md: 'auto' },
          bgcolor: 'background.default',
          minHeight: '100vh',
          overflowX: 'hidden',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, md: 64 } }} />
        <Box
          sx={{
            p: { xs: 2, sm: 2.5, md: 3 },
            maxWidth: 1600,
            mx: 'auto',
            width: '100%',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
