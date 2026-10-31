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
  alpha,
} from '@mui/material';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import LaptopMacOutlinedIcon from '@mui/icons-material/LaptopMacOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ChecklistIcon from '@mui/icons-material/Checklist';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthUser, useTenant } from '../../hooks/storeHooks';
import { getUserDisplayName, getUserInitials, getRoleLabel } from '../../utils/userDisplay';

export const DRAWER_WIDTH = 276;

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Task Workspace',
    items: [
      { to: '/tasks', label: 'Kanban & Tasks', icon: <ViewKanbanOutlinedIcon sx={{ fontSize: 19 }} /> },
      { to: '/tasks/product-ideas', label: 'Product Ideas & Validation', icon: <ChecklistIcon sx={{ fontSize: 19 }} /> },
    ],
  },
  {
    label: 'Portals & Modules',
    items: [
      { to: '/', label: 'Main Portal Launcher', icon: <HomeOutlinedIcon sx={{ fontSize: 19 }} /> },
      { to: '/hr', label: 'HR People & Culture', icon: <Diversity3Icon sx={{ fontSize: 19 }} /> },
      { to: '/dashboard', label: 'IT Asset Intelligence', icon: <LaptopMacOutlinedIcon sx={{ fontSize: 19 }} /> },
    ],
  },
];

interface TasksSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function TasksSidebar({ mobileOpen, onClose }: TasksSidebarProps) {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';
  const tenant = useTenant();
  const user = useAuthUser();

  const initials = getUserInitials(user);
  const displayName = getUserDisplayName(user);

  const isNavActive = (to: string): boolean => {
    if (to === '/tasks') return location.pathname === '/tasks';
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand Header */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, mb: 1.5 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
              flexShrink: 0,
            }}
          >
            <TaskAltIcon sx={{ fontSize: 24 }} />
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
              Work & Tasks
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              display="block"
              sx={{ fontSize: '0.72rem', fontWeight: 600 }}
            >
              {tenant?.name || 'Deliverables & Tickets'}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: theme.palette.divider }} />

      {/* Nav Groups */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1.5 }}>
        {navGroups.map((group) => (
          <Box key={group.label} sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              sx={{
                px: 1.5,
                mb: 0.75,
                display: 'block',
                fontWeight: 700,
                letterSpacing: '0.08em',
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              {group.label}
            </Typography>

            <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {group.items.map((item) => {
                const active = isNavActive(item.to);
                return (
                  <ListItemButton
                    key={item.to}
                    component={NavLink}
                    to={item.to}
                    onClick={() => isMobile && onClose()}
                    sx={{
                      borderRadius: '10px',
                      py: 1,
                      px: 1.5,
                      minHeight: 40,
                      position: 'relative',
                      bgcolor: active
                        ? isDark
                          ? 'rgba(139, 92, 246, 0.16)'
                          : 'rgba(139, 92, 246, 0.1)'
                        : 'transparent',
                      color: active ? '#8B5CF6' : 'text.primary',
                      fontWeight: active ? 700 : 500,
                      '&:hover': {
                        bgcolor: active
                          ? isDark
                            ? 'rgba(139, 92, 246, 0.22)'
                            : 'rgba(139, 92, 246, 0.14)'
                          : isDark
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'rgba(15, 23, 42, 0.04)',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 32,
                        color: active ? '#8B5CF6' : 'text.secondary',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.825rem',
                        fontWeight: active ? 700 : 500,
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* User Footer Profile */}
      <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: theme.palette.divider }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            p: 1.25,
            borderRadius: '12px',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
          }}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: '0.8rem' }}>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: '0.7rem' }}>
              {getRoleLabel(user?.role)}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              bgcolor: isDark ? '#0F172A' : '#FFFFFF',
              borderRight: '1px solid',
              borderColor: theme.palette.divider,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              bgcolor: isDark ? '#0B1120' : '#FAFAFA',
              borderRight: '1px solid',
              borderColor: theme.palette.divider,
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      )}
    </Box>
  );
}
