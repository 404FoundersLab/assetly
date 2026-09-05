import { Box, Breadcrumbs, Link, Typography, IconButton, useTheme, alpha } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        mb: { xs: 2.5, md: 3.5 },
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, minWidth: 0, flex: '1 1 auto' }}>
        {showBack && (
          <IconButton
            onClick={onBack}
            sx={{
              mt: breadcrumbs && breadcrumbs.length > 0 ? 3 : 0.5,
              p: 1,
              borderRadius: '12px',
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
              '&:hover': {
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                transform: 'translateX(-2px)',
              },
              transition: 'all 0.18s ease',
            }}
          >
            <ArrowBack fontSize="small" />
          </IconButton>
        )}
        <Box sx={{ minWidth: 0 }}>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumbs
              separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.6 }} />}
              sx={{ mb: 1 }}
            >
              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;
                if (isLast || !item.to) {
                  return (
                    <Typography
                      key={item.label}
                      variant="body2"
                      sx={{
                        color: isLast ? 'text.primary' : 'text.secondary',
                        fontWeight: isLast ? 600 : 500,
                        fontSize: '0.8125rem',
                      }}
                    >
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
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 500,
                      fontSize: '0.8125rem',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </Breadcrumbs>
          )}

          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
              mb: subtitle ? 0.5 : 0,
            }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: '0.9rem',
                maxWidth: 720,
                lineHeight: 1.5,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      {actions && (
        <Box
          sx={{
            display: 'flex',
            gap: 1.25,
            flexWrap: 'wrap',
            alignItems: 'center',
            alignSelf: { xs: 'stretch', sm: 'center' },
            justifyContent: { xs: 'flex-start', sm: 'flex-end' },
          }}
        >
          {actions}
        </Box>
      )}
    </Box>
  );
}
