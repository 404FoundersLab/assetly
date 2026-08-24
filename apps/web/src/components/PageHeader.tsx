import { Box, Breadcrumbs, Link, Typography, IconButton } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}

export function PageHeader({ title, subtitle, breadcrumbs, actions, showBack, onBack }: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        mb: 3,
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        {showBack && (
          <IconButton onClick={onBack} sx={{ mt: breadcrumbs && breadcrumbs.length > 0 ? 3.5 : -0.5 }}>
            <ArrowBack />
          </IconButton>
        )}
        <Box sx={{ minWidth: 0 }}>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumbs sx={{ mb: 1 }}>
              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;
              if (isLast || !item.to) {
                return (
                  <Typography key={item.label} variant="body2" color="text.secondary">
                    {item.label}
                  </Typography>
                );
              }
              return (
                <Link
                  key={item.label}
                  component={RouterLink}
                  to={item.to}
                  underline="hover"
                  variant="body2"
                  color="text.secondary"
                >
                  {item.label}
                </Link>
              );
            })}
          </Breadcrumbs>
        )}
        <Typography variant="h4" fontWeight={700} gutterBottom={Boolean(subtitle)}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        </Box>
      </Box>
      {actions && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {actions}
        </Box>
      )}
    </Box>
  );
}
