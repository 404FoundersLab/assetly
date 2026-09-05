import { Box, Button, Typography, useTheme, alpha } from '@mui/material';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        py: 7,
        px: 3,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '20px',
          bgcolor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(79, 70, 229, 0.08)',
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2.5,
          border: '1px solid',
          borderColor: isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(79, 70, 229, 0.15)',
          boxShadow: `0 8px 24px -4px ${alpha(theme.palette.primary.main, isDark ? 0.25 : 0.12)}`,
          '& .MuiSvgIcon-root': { fontSize: 34 },
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" fontWeight={800} gutterBottom sx={{ letterSpacing: '-0.02em' }}>
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 440, mb: action ? 3 : 0, lineHeight: 1.6 }}
      >
        {description}
      </Typography>
      {action && (
        <Button
          variant="contained"
          startIcon={action.icon}
          onClick={action.onClick}
          sx={{ borderRadius: '12px', px: 2.5, py: 1 }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
}
