import { alpha, createTheme, type PaletteMode } from '@mui/material/styles';

export function createAppTheme(mode: PaletteMode) {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#6366F1' : '#4F46E5', // Electric Indigo
        light: isDark ? '#818CF8' : '#6366F1',
        dark: isDark ? '#4F46E5' : '#3730A3',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: isDark ? '#06B6D4' : '#0891B2', // Cyan Aurora
        light: isDark ? '#22D3EE' : '#06B6D4',
        dark: isDark ? '#0891B2' : '#0E7490',
        contrastText: '#FFFFFF',
      },
      background: isDark
        ? { default: '#070A11', paper: '#0F172A' } // Deep slate-950 obsidian
        : { default: '#F8FAFC', paper: '#FFFFFF' }, // Soft alabaster
      text: isDark
        ? { primary: '#F8FAFC', secondary: '#94A3B8' }
        : { primary: '#0F172A', secondary: '#64748B' },
      divider: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.07)',
      success: { main: isDark ? '#10B981' : '#059669', light: '#34D399', dark: '#047857' },
      warning: { main: isDark ? '#F59E0B' : '#D97706', light: '#FBBF24', dark: '#B45309' },
      error: { main: isDark ? '#EF4444' : '#DC2626', light: '#F87171', dark: '#B91C1C' },
      info: { main: isDark ? '#38BDF8' : '#0284C7', light: '#7DD3FC', dark: '#0369A1' },
    },
    typography: {
      fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h1: { fontWeight: 800, letterSpacing: '-0.035em' },
      h2: { fontWeight: 800, letterSpacing: '-0.03em' },
      h3: { fontWeight: 700, letterSpacing: '-0.025em' },
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, letterSpacing: '-0.015em' },
      h6: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle2: { fontWeight: 600 },
      body1: { letterSpacing: '-0.005em' },
      body2: { letterSpacing: '-0.005em' },
      button: { fontWeight: 600, letterSpacing: '-0.005em', textTransform: 'none' },
    },
    shape: { borderRadius: 14 },
    transitions: {
      duration: { short: 180, standard: 260 },
      easing: {
        easeInOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
        easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: (theme) => ({
          html: { scrollBehavior: 'smooth' },
          body: {
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          '::selection': {
            backgroundColor: alpha(theme.palette.primary.main, 0.25),
            color: theme.palette.text.primary,
          },
          '::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '::-webkit-scrollbar-thumb': {
            background: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.15)',
            borderRadius: '10px',
            transition: 'background 0.2s ease',
          },
          '::-webkit-scrollbar-thumb:hover': {
            background: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.3)',
          },
          'input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus': {
            WebkitBoxShadow: `0 0 0 100px ${theme.palette.background.paper} inset`,
            WebkitTextFillColor: theme.palette.text.primary,
            caretColor: theme.palette.text.primary,
            transition: 'background-color 9999s ease-out 0s',
          },
        }),
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 10,
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          },
          contained: ({ theme }) => ({
            boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}`,
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: `0 6px 18px ${alpha(theme.palette.primary.main, 0.38)}`,
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          }),
          outlined: ({ theme }) => ({
            borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(15, 23, 42, 0.12)',
            '&:hover': {
              borderColor: alpha(theme.palette.primary.main, 0.5),
              backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.08 : 0.04),
            },
          }),
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 16,
            boxShadow: isDark
              ? '0 4px 20px -2px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.06)'
              : '0 1px 3px rgba(15, 23, 42, 0.03), 0 8px 24px -4px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.06)',
            border: 'none',
            backgroundImage: isDark
              ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%)'
              : 'none',
            transition: 'box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease',
          }),
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          rounded: {
            borderRadius: 16,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: 'none',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.78 : 0.85),
            borderBottom: `1px solid ${theme.palette.divider}`,
          }),
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: ({ theme }) => ({
            borderRight: `1px solid ${theme.palette.divider}`,
            backgroundImage: isDark
              ? 'linear-gradient(180deg, #090E17 0%, #070A11 100%)'
              : 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
            backgroundColor: isDark ? '#090E17' : '#FFFFFF',
          }),
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: ({ theme }) => ({
            '& .MuiTableCell-head': {
              fontWeight: 700,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.025)' : 'rgba(15, 23, 42, 0.02)',
              color: theme.palette.text.secondary,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              borderBottom: `1px solid ${theme.palette.divider}`,
              whiteSpace: 'nowrap',
              py: 1.75,
            },
          }),
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: ({ theme }) => ({
            transition: 'background-color 0.15s ease',
            '&:last-child td': { borderBottom: 0 },
            '&.MuiTableRow-hover:hover': {
              backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.06 : 0.03),
            },
          }),
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderColor: theme.palette.divider,
            py: 1.6,
          }),
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined' },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 12,
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha(theme.palette.primary.main, 0.45),
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main,
                borderWidth: '1.5px',
              },
              boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.15)}`,
            },
          }),
          notchedOutline: {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: 8,
            fontSize: '0.75rem',
          },
          outlined: ({ theme }) => ({
            borderColor: alpha(theme.palette.divider, 1),
          }),
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            fontWeight: 500,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: ({ theme }) => ({
            borderRadius: 20,
            backgroundImage: 'none',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: isDark
              ? '0 24px 48px -12px rgba(0, 0, 0, 0.7)'
              : '0 24px 48px -12px rgba(15, 23, 42, 0.18)',
          }),
        },
      },
    },
  });
}
