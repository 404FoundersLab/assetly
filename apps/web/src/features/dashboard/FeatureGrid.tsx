import { Box, Card, Typography, Grid, alpha, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import InventoryIcon from '@mui/icons-material/Inventory2';
import SyncIcon from '@mui/icons-material/Sync';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import SecurityIcon from '@mui/icons-material/Security';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const features = [
  {
    title: 'Fleet Inventory',
    description: 'Hardware, specs & tags',
    icon: <InventoryIcon sx={{ fontSize: 20 }} />,
    color: '#6366F1', // Electric Indigo
    path: '/assets',
  },
  {
    title: 'Lifecycle Ops',
    description: 'Procurement to decommission',
    icon: <SyncIcon sx={{ fontSize: 20 }} />,
    color: '#8B5CF6', // Purple
    path: '/lifecycle',
  },
  {
    title: 'Spend & Budgets',
    description: 'Valuation & cost centers',
    icon: <AttachMoneyIcon sx={{ fontSize: 20 }} />,
    color: '#F59E0B', // Amber
    path: '/it-spend',
  },
  {
    title: 'Software SAM',
    description: 'SaaS seats & compliance',
    icon: <CodeIcon sx={{ fontSize: 20 }} />,
    color: '#3B82F6', // Blue
    path: '/software',
  },
  {
    title: 'Maintenance',
    description: 'Repairs & tickets',
    icon: <BuildIcon sx={{ fontSize: 20 }} />,
    color: '#EF4444', // Red
    path: '/maintenance',
  },
  {
    title: 'Audit & Compliance',
    description: 'Tamper-proof logs',
    icon: <SecurityIcon sx={{ fontSize: 20 }} />,
    color: '#10B981', // Emerald
    path: '/audit',
  },
  {
    title: 'AI Intelligence',
    description: 'Smart fleet predictions',
    icon: <AutoGraphIcon sx={{ fontSize: 20 }} />,
    color: '#EC4899', // Pink
    path: '/analytics',
  },
  {
    title: 'Mobile & Field',
    description: 'QR scanner & remote ops',
    icon: <PhoneIphoneIcon sx={{ fontSize: 20 }} />,
    color: '#06B6D4', // Cyan
    path: '/mobile',
  },
];

export function FeatureGrid() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.02em',
            fontSize: '1.05rem',
          }}
        >
          Management Ecosystem
        </Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          8 Core Modules
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {features.map((feature, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card
              onClick={() => navigate(feature.path)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 2,
                cursor: 'pointer',
                bgcolor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#FFFFFF',
                border: '1px solid',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.07)',
                borderRadius: '14px',
                transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                '&:hover': {
                  borderColor: alpha(feature.color, 0.5),
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 24px -4px ${alpha(feature.color, isDark ? 0.25 : 0.15)}`,
                  '& .feature-arrow': {
                    transform: 'translateX(3px)',
                    color: feature.color,
                  },
                  '& .feature-icon-box': {
                    transform: 'scale(1.08)',
                    boxShadow: `0 4px 14px ${alpha(feature.color, 0.35)}`,
                  },
                },
              }}
            >
              <Box
                className="feature-icon-box"
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: alpha(feature.color, isDark ? 0.16 : 0.1),
                  color: feature.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1.75,
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}
              >
                {feature.icon}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.85rem' }}>
                  {feature.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.72rem' }}>
                  {feature.description}
                </Typography>
              </Box>
              <ArrowForwardIosIcon
                className="feature-arrow"
                sx={{
                  fontSize: 12,
                  color: 'text.secondary',
                  opacity: 0.5,
                  transition: 'all 0.2s ease',
                  ml: 1,
                  flexShrink: 0,
                }}
              />
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
