import { alpha, createTheme, type PaletteMode } from '@mui/material/styles';

export function createAppTheme(mode: PaletteMode) {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#5E92F3' : '#1565C0',
        light: isDark ? '#8BB4FF' : '#5E92F3',
        dark: isDark ? '#1565C0' : '#0D47A1',
      },
      secondary: {
        main: isDark ? '#4DB6AC' : '#00897B',
        light: isDark ? '#80CBC4' : '#4DB6AC',
        dark: isDark ? '#00897B' : '#00695C',
      },
      background: isDark
        ? { default: '#0B0F14', paper: '#151B24' }
        : { default: '#F0F2F5', paper: '#FFFFFF' },
      text: isDark
        ? { primary: '#E8EDF4', secondary: '#9AA8BC' }
        : { primary: '#1A2332', secondary: '#5F6B7A' },
      divider: isDark ? alpha('#E8EDF4', 0.1) : alpha('#1A2332', 0.08),
      success: { main: isDark ? '#66BB6A' : '#2E7D32' },
      warning: { main: isDark ? '#FFA726' : '#ED6C02' },
      error: { main: isDark ? '#EF5350' : '#D32F2F' },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 600, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 600 },
      button: { fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    transitions: {
      duration: { short: 200 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: (theme) => ({
          html: { scrollBehavior: 'smooth' },
          body: { WebkitFontSmoothing: 'antialiased' },
          'input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus': {
            WebkitBoxShadow: `0 0 0 100px ${theme.palette.background.paper} inset`,
            WebkitTextFillColor: theme.palette.text.primary,
            caretColor: theme.palette.text.primary,
            transition: 'background-color 9999s ease-out 0s',
          },
        }),
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 10,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          contained: ({ theme }) => ({
            '&:hover': {
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.35)}`,
            },
          }),
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            boxShadow: isDark
              ? '0 1px 2px rgba(0, 0, 0, 0.4)'
              : '0 1px 2px rgba(26, 35, 50, 0.06)',
            border: `1px solid ${theme.palette.divider}`,
            transition: 'box-shadow 0.2s ease, transform 0.2s ease, background-color 0.2s ease',
            backgroundImage: 'none',
          }),
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: 'none',
            ...(isDark && {
              bgcolor: alpha(theme.palette.background.paper, 0.85),
            }),
          }),
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: ({ theme }) => ({
            borderRight: `1px solid ${theme.palette.divider}`,
            backgroundImage: 'none',
          }),
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: ({ theme }) => ({
            '& .MuiTableCell-head': {
              fontWeight: 600,
              bgcolor: alpha(theme.palette.primary.main, isDark ? 0.12 : 0.04),
              color: 'text.secondary',
              fontSize: '0.8125rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              borderBottom: `1px solid ${theme.palette.divider}`,
              whiteSpace: 'nowrap',
            },
          }),
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: ({ theme }) => ({
            '&:last-child td': { borderBottom: 0 },
            '&.MuiTableRow-hover:hover': {
              bgcolor: alpha(theme.palette.primary.main, isDark ? 0.08 : 0.03),
            },
          }),
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderColor: theme.palette.divider,
            py: 1.5,
          }),
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500 },
          outlined: ({ theme }) => ({
            borderColor: alpha(theme.palette.text.primary, isDark ? 0.2 : 0.15),
          }),
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            transition: 'background-color 0.15s ease, transform 0.15s ease',
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 10 },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });
}
