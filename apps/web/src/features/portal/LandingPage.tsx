import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Divider,
  alpha,
  useTheme,
  AppBar,
  Toolbar,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory2';
import FolderIcon from '@mui/icons-material/Folder';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DevicesIcon from '@mui/icons-material/Devices';
import { useAppDispatch, useAuthUser, usePermissions, useTenant } from '../../hooks/storeHooks';
import { getUserDisplayName, getUserInitials } from '../../utils/userDisplay';
import { logout } from '../../store/authSlice';
import { ThemeModeToggle } from '../../components/ThemeModeToggle';
import { APP_NAME } from '../../constants/brand';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
}

function ModuleCard({ title, description, icon, path }: ModuleCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(path)}
      elevation={0}
      sx={{
        height: '100%',
        cursor: 'pointer',
        bgcolor: '#f5f6f8',
        borderRadius: 3,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          bgcolor: '#eeeef2',
          boxShadow: '0 12px 24px rgba(0,0,0,0.05)',
        },
      }}
    >
      <CardContent sx={{ p: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ color: '#1565C0', mb: 2 }}>
          {icon}
        </Box>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: '#1a1a1a' }}>
          {title}
        </Typography>
        
        <Divider sx={{ my: 2, width: '80%', mx: 'auto', borderColor: alpha('#000', 0.1) }} />
        
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, lineHeight: 1.6 }}>
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function LandingPage() {
  const user = useAuthUser();
  const tenant = useTenant();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const { can } = usePermissions();
  const isDarkMode = theme.palette.mode === 'dark';

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const initials = getUserInitials(user);
  const displayName = getUserDisplayName(user);

  const handleLogout = () => {
    setAnchorEl(null);
    dispatch(logout());
    navigate('/login');
  };

  const allModules = [
    ...(user?.role === 'platform_admin'
      ? [
          {
            title: 'Assetly System Admin',
            description: 'Manage all organizations, global users, and platform configuration.',
            icon: <AdminPanelSettingsIcon sx={{ fontSize: 48 }} />,
            path: '/system-admin/organizations',
            permission: undefined,
          },
        ]
      : []),
    ...(user?.role === 'employee'
      ? [
          {
            title: 'Employee Device Requests',
            description: 'Request new devices, replacements, accessories, and view request status.',
            icon: <DevicesIcon sx={{ fontSize: 48 }} />,
            path: '/portal',
            permission: undefined,
          },
        ]
      : []),
    {
      title: 'Asset Management',
      description: 'Track hardware, software, procurement, and asset lifecycle.',
      icon: <InventoryIcon sx={{ fontSize: 48 }} />,
      path: '/dashboard',
      permission: 'module:assets' as const,
    },
    {
      title: 'HR Policy & Management',
      description: 'Streamline payroll, attendance, leave policies, and employee management.',
      icon: <PeopleIcon sx={{ fontSize: 48 }} />,
      path: '/hr',
      permission: 'module:hr' as const,
    },
    {
      title: 'Employee Doc Management',
      description: 'Securely manage employee documents, onboarding checklists, and verification.',
      icon: <FolderIcon sx={{ fontSize: 48 }} />,
      path: '/exec-docs',
      permission: 'module:docs' as const,
    },
    {
      title: 'IT Spend',
      description: 'Asset valuation, CapEx budgets, and expense claim approvals.',
      icon: <AccountBalanceIcon sx={{ fontSize: 48 }} />,
      path: '/it-spend',
      permission: 'module:finance' as const,
    },
  ];

  const modules = allModules.filter((m) => !m.permission || can(m.permission));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ width: '100%', px: { xs: 2, md: 4 }, display: 'flex', alignItems: 'center' }}>
          <Box 
            component="img"
            src="/logo.png"
            alt="Assetly Logo"
            sx={{ 
              height: 38, 
              width: 38,
              objectFit: 'contain', 
              mr: 1.5,
              mixBlendMode: isDarkMode ? 'screen' : 'multiply',
              filter: isDarkMode ? 'invert(1) hue-rotate(180deg)' : 'none',
            }}
          />
          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
            {APP_NAME}
          </Typography>
          
          <ThemeModeToggle />

          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 1.5 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: '0.8rem' }}>
              {initials}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{
              paper: {
                sx: { minWidth: 200, mt: 1, borderRadius: 2 },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                {displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            <Divider />
            {user?.role === 'employee' ? (
              <MenuItem onClick={() => { setAnchorEl(null); navigate('/portal'); }}>
                <ListItemIcon>
                  <DevicesIcon fontSize="small" />
                </ListItemIcon>
                Employee Portal
              </MenuItem>
            ) : (
              <MenuItem onClick={() => { setAnchorEl(null); navigate('/'); }}>
                <ListItemIcon>
                  <DashboardIcon fontSize="small" />
                </ListItemIcon>
                Module Portal
              </MenuItem>
            )}
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 4 } }}>
        <Box sx={{ mb: 5, textAlign: 'center', pt: { xs: 3, md: 5 } }}>
          <Typography
            variant="h3"
            fontWeight={800}
            gutterBottom
            sx={{ letterSpacing: '-0.02em', color: 'text.primary' }}
          >
            Welcome back, {displayName.split(' ')[0]}
          </Typography>
          {tenant?.name && (
            <Typography variant="subtitle1" color="text.secondary" fontWeight={600} sx={{ mb: 1 }}>
              {tenant.name}
            </Typography>
          )}
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto' }}>
            {modules.length === 1
              ? '1 module available — select it below to get started.'
              : `${modules.length} modules available — select one below to get started.`}
          </Typography>
        </Box>

        <Grid container spacing={4} justifyContent="center">
          {modules.map((mod) => (
            <Grid item xs={12} sm={6} md={4} key={mod.title}>
              <ModuleCard {...mod} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
