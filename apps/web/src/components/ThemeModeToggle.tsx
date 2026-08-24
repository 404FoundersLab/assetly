import { IconButton, Tooltip } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useThemeMode } from '../context/ThemeModeContext';

interface ThemeModeToggleProps {
  size?: 'small' | 'medium';
}

export function ThemeModeToggle({ size = 'medium' }: ThemeModeToggleProps) {
  const { mode, toggleMode } = useThemeMode();
  const isDark = mode === 'dark';

  return (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton
        color="inherit"
        onClick={toggleMode}
        size={size}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <LightModeOutlinedIcon fontSize={size} /> : <DarkModeOutlinedIcon fontSize={size} />}
      </IconButton>
    </Tooltip>
  );
}
