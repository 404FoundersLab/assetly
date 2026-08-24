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

const features = [
  {
    title: 'Inventory',
    description: 'Track assets',
    icon: <InventoryIcon fontSize="small" />,
    color: '#00BFA5', // Teal/Green color from image
    path: '/assets',
  },
  {
    title: 'Lifecycle',
    description: 'From buy to retire',
    icon: <SyncIcon fontSize="small" />,
    color: '#7C4DFF', // Purple color
    path: '/lifecycle',
  },
  {
    title: 'IT Spend',
    description: 'Valuation & budgets',
    icon: <AttachMoneyIcon fontSize="small" />,
    color: '#FFB300', // Amber/Gold color
    path: '/it-spend',
  },
  {
    title: 'Software SAM',
    description: 'Licenses & SaaS',
    icon: <CodeIcon fontSize="small" />,
    color: '#2979FF', // Blue color
    path: '/software',
  },
  {
    title: 'Maintenance',
    description: 'Work orders',
    icon: <BuildIcon fontSize="small" />,
    color: '#FF5252', // Red color
    path: '/maintenance',
  },
  {
    title: 'Compliance',
    description: 'Audit & policy',
    icon: <SecurityIcon fontSize="small" />,
    color: '#64DD17', // Light green
    path: '/audit', // Map compliance to audit
  },
  {
    title: 'AI & analytics',
    description: 'Smart insights',
    icon: <AutoGraphIcon fontSize="small" />,
    color: '#F50057', // Pink/Magenta
    path: '/analytics',
  },
  {
    title: 'Mobile & field',
    description: 'On-the-go',
    icon: <PhoneIphoneIcon fontSize="small" />,
    color: '#9E9E9E', // Grey
    path: '/mobile',
  },
];

export function FeatureGrid() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Asset Management Modules
      </Typography>
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
                bgcolor: isDark ? '#1E1E1E' : 'background.paper',
                border: '1px solid',
                borderColor: isDark ? alpha('#fff', 0.1) : 'divider',
                borderRadius: 2,
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: feature.color,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 12px ${alpha(feature.color, 0.15)}`,
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: feature.color,
                  mr: 2,
                }}
              >
                {feature.icon}
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  {feature.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {feature.description}
                </Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
