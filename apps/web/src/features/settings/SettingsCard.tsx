import type { ReactNode } from 'react';
import {
  Box,
  Card,
  CardContent,
  Divider,
  Grid,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';

export const SETTINGS_GRID_ITEM = { xs: 12, md: 6 } as const;

export function SettingsSection({ title, description }: { title: string; description?: string }) {
  return (
    <Grid item xs={12}>
      <Box sx={{ pt: 0.5 }}>
        <Typography
          variant="overline"
          color="text.secondary"
          fontWeight={700}
          letterSpacing={1.2}
          display="block"
        >
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {description}
          </Typography>
        )}
      </Box>
    </Grid>
  );
}

interface SettingsCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function SettingsCard({ title, subtitle, icon, children }: SettingsCardProps) {
  const theme = useTheme();

  return (
    <Card
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: { xs: 2, sm: 3 },
          '&:last-child': { pb: { xs: 2, sm: 3 } },
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          {icon && (
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                display: 'flex',
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700} lineHeight={1.3}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" display="block">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>{children}</Box>
      </CardContent>
    </Card>
  );
}

export function SettingRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500} component="div" sx={{ textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  );
}

export function SettingsCardGridItem({ children }: { children: ReactNode }) {
  return (
    <Grid item {...SETTINGS_GRID_ITEM} sx={{ display: 'flex' }}>
      {children}
    </Grid>
  );
}
