import { IconButton, Tooltip, useTheme } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useThemeMode } from '../context/ThemeModeContext';

interface ThemeModeToggleProps {
  size?: 'small' | 'medium';
}

export function ThemeModeToggle({ size = 'medium' }: ThemeModeToggleProps) {
  const { mode, toggleMode } = useThemeMode();
  const theme = useTheme();
  const isDark = mode === 'dark';

  return (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton
        color="inherit"
        onClick={toggleMode}
        size={size}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        sx={{
          borderRadius: '10px',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
          bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.02)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          '&:hover': {
            transform: 'rotate(15deg) scale(1.05)',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.16)',
          },
        }}
      >
        {isDark ? (
          <LightModeOutlinedIcon sx={{ fontSize: size === 'small' ? 18 : 20, color: '#FBBF24' }} />
        ) : (
          <DarkModeOutlinedIcon sx={{ fontSize: size === 'small' ? 18 : 20, color: '#6366F1' }} />
        )}
      </IconButton>
    </Tooltip>
  );
}
