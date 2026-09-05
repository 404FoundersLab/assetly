import { InputAdornment, TextField, TextFieldProps, useTheme } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

type SearchFieldProps = Omit<TextFieldProps, 'size'> & {
  minWidth?: number;
};

export function SearchField({ minWidth = 280, ...props }: SearchFieldProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <TextField
      size="small"
      {...props}
      sx={{
        minWidth,
        '& .MuiOutlinedInput-root': {
          borderRadius: '12px',
          bgcolor: isDark ? 'rgba(255, 255, 255, 0.025)' : 'rgba(15, 23, 42, 0.025)',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.045)' : 'rgba(15, 23, 42, 0.045)',
          },
          '&.Mui-focused': {
            bgcolor: isDark ? 'rgba(15, 23, 42, 0.9)' : '#FFFFFF',
          },
        },
        ...props.sx,
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ fontSize: 18, color: 'text.secondary', ml: 0.25 }} />
          </InputAdornment>
        ),
        ...props.InputProps,
      }}
    />
  );
}
