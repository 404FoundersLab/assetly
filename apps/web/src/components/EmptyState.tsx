import { Box, Button, Typography } from '@mui/material';

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
  return (
    <Box
      sx={{
        py: 6,
        px: 3,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: 3,
          bgcolor: 'action.hover',
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
          '& .MuiSvgIcon-root': { fontSize: 36 },
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 420, mb: action ? 2.5 : 0 }}
      >
        {description}
      </Typography>
      {action && (
        <Button variant="contained" startIcon={action.icon} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Box>
  );
}
