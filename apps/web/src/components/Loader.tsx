import {
  Box,
  Button,
  ButtonProps,
  CircularProgress,
  Fade,
  LinearProgress,
  Stack,
  Typography,
  keyframes,
  alpha,
  useTheme,
} from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { APP_NAME, APP_TAGLINE } from '../constants/brand';
import { useAppSelector } from '../hooks/storeHooks';

const breathe = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.06); opacity: 1; }
`;

const orbit = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const shimmer = keyframes`
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const slideDown = keyframes`
  from { opacity: 0; transform: translate(-50%, -12px); }
  to { opacity: 1; transform: translate(-50%, 0); }
`;

function BrandMark({ size = 64 }: { size?: number }) {
  const theme = useTheme();
  const ring = Math.round(size * 1.35);

  return (
    <Box
      sx={{
        position: 'relative',
        width: ring,
        height: ring,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `2px dashed ${alpha(theme.palette.primary.main, 0.35)}`,
          animation: `${orbit} 10s linear infinite`,
        }}
      />
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: 3.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'primary.contrastText',
          background: `linear-gradient(145deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.35)}`,
          animation: `${breathe} 2.4s ease-in-out infinite`,
        }}
      >
        <Inventory2OutlinedIcon sx={{ fontSize: size * 0.42 }} />
      </Box>
      <CircularProgress
        size={ring}
        thickness={2.2}
        sx={{
          position: 'absolute',
          color: alpha(theme.palette.primary.main, 0.55),
          '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
        }}
      />
    </Box>
  );
}

/** Compact spinner for inline / dialog use */
export function LoaderSpinner({
  size = 36,
  label,
  hint,
}: {
  size?: number;
  label?: string;
  hint?: string;
}) {
  return (
    <Stack alignItems="center" spacing={1.5} sx={{ px: 2, py: 1 }}>
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <CircularProgress
          size={size}
          thickness={3.5}
          sx={{
            color: (t) => alpha(t.palette.primary.main, 0.2),
            position: 'absolute',
          }}
          variant="determinate"
          value={100}
        />
        <CircularProgress
          size={size}
          thickness={3.5}
          sx={{
            position: 'absolute',
            '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
          }}
        />
      </Box>
      {label && (
        <Typography variant="body2" fontWeight={600} textAlign="center">
          {label}
        </Typography>
      )}
      {hint && (
        <Typography variant="caption" color="text.secondary" textAlign="center" maxWidth={280}>
          {hint}
        </Typography>
      )}
    </Stack>
  );
}

/** Full-page / route bootstrap loader */
export function PageLoader({
  message = 'Getting things ready…',
  hint = 'This usually takes just a moment.',
}: {
  message?: string;
  hint?: string;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-busy="true"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 6,
        position: 'relative',
        overflow: 'hidden',
        background: isDark
          ? `radial-gradient(ellipse at 50% 30%, ${alpha(theme.palette.primary.main, 0.18)} 0%, transparent 55%), ${theme.palette.background.default}`
          : `radial-gradient(ellipse at 50% 30%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 55%), ${theme.palette.background.default}`,
      }}
    >
      <Stack alignItems="center" spacing={3} sx={{ maxWidth: 420, width: '100%', zIndex: 1 }}>
        <BrandMark size={68} />

        <Stack alignItems="center" spacing={0.75}>
          <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">
            {APP_NAME}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            {APP_TAGLINE}
          </Typography>
        </Stack>

        <Box
          sx={{
            width: '100%',
            maxWidth: 320,
            p: 2.5,
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
            bgcolor: (t) => alpha(t.palette.background.paper, isDark ? 0.7 : 0.9),
            backdropFilter: 'blur(10px)',
            boxShadow: (t) =>
              isDark ? '0 8px 32px rgba(0,0,0,0.35)' : `0 8px 32px ${alpha(t.palette.common.black, 0.06)}`,
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} textAlign="center" gutterBottom>
            {message}
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
            {hint}
          </Typography>
          <LinearProgress
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                background: (t) =>
                  `linear-gradient(90deg, ${t.palette.primary.light}, ${t.palette.primary.main}, ${t.palette.secondary.main})`,
                backgroundSize: '200% 100%',
                animation: `${shimmer} 1.8s linear infinite`,
              },
            }}
          />
        </Box>

        <Typography variant="caption" color="text.secondary" textAlign="center">
          Tip: keep this tab open while we sync your inventory.
        </Typography>
      </Stack>
    </Box>
  );
}

/**
 * Non-blocking global progress: soft top bar + floating status chip.
 * Prefer this over a full-screen block for background refreshes.
 */
export function GlobalLoadingBar() {
  const theme = useTheme();
  const loading = useAppSelector((s) => s.ui.loadingCount > 0);
  const message = useAppSelector((s) => s.ui.loadingMessage);
  const displayMessage = message || 'Working on it…';

  return (
    <Fade in={loading} unmountOnExit>
      <Box
        role="status"
        aria-live="polite"
        aria-busy="true"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: (t) => t.zIndex.modal + 2,
          pointerEvents: 'none',
        }}
      >
        <LinearProgress
          sx={{
            height: 3,
            bgcolor: 'transparent',
            '& .MuiLinearProgress-bar': {
              borderRadius: 0,
              background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.primary.light})`,
              backgroundSize: '200% 100%',
              animation: `${shimmer} 1.4s linear infinite`,
            },
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            animation: `${slideDown} 0.28s ease-out`,
            pointerEvents: 'none',
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.25}
            sx={{
              px: 2,
              py: 1,
              borderRadius: 999,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              boxShadow: (t) =>
                t.palette.mode === 'dark'
                  ? '0 8px 28px rgba(0,0,0,0.45)'
                  : `0 8px 28px ${alpha(t.palette.common.black, 0.12)}`,
              maxWidth: 'min(92vw, 420px)',
            }}
          >
            <CircularProgress size={16} thickness={5} />
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              sx={{ color: 'text.primary', pr: 0.5 }}
            >
              {displayMessage}
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Fade>
  );
}

/** Overlay for dialogs / cards while a mutation runs */
export function DialogLoader({
  message = 'Please wait…',
  hint,
}: {
  message?: string;
  hint?: string;
}) {
  return (
    <Fade in>
      <Box
        role="status"
        aria-live="polite"
        aria-busy="true"
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: (t) => alpha(t.palette.background.default, 0.55),
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          borderRadius: 'inherit',
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2.5,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            boxShadow: (t) =>
              t.palette.mode === 'dark'
                ? '0 12px 40px rgba(0,0,0,0.5)'
                : `0 12px 40px ${alpha(t.palette.common.black, 0.12)}`,
            minWidth: 200,
          }}
        >
          <LoaderSpinner label={message} hint={hint} size={32} />
        </Box>
      </Box>
    </Fade>
  );
}

/** Lightweight panel placeholder (lists, side panels) */
export function PanelLoader({
  message = 'Loading…',
  minHeight = 160,
}: {
  message?: string;
  minHeight?: number;
}) {
  return (
    <Box
      role="status"
      aria-busy="true"
      sx={{
        minHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <LoaderSpinner size={28} label={message} />
    </Box>
  );
}

type LoadingButtonProps = ButtonProps & {
  loading?: boolean;
  loadingLabel?: string;
};

export function LoadingButton({
  loading = false,
  loadingLabel,
  disabled,
  children,
  startIcon,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      startIcon={
        loading ? (
          <CircularProgress
            size={16}
            thickness={5}
            color="inherit"
            sx={{ '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }}
          />
        ) : (
          startIcon
        )
      }
      sx={{
        ...props.sx,
        ...(loading
          ? {
              opacity: 0.92,
            }
          : {}),
      }}
    >
      {loading && loadingLabel ? loadingLabel : children}
    </Button>
  );
}
