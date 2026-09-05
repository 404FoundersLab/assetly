import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  Divider,
  InputAdornment,
  IconButton,
  Stack,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DevicesIcon from '@mui/icons-material/Devices';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SecurityIcon from '@mui/icons-material/Security';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/storeHooks';
import { clearError, setSession, setLoginError, setPendingSession } from '../../store/authSlice';
import { APP_NAME, COMPANY_NAME } from '../../constants/brand';
import { ThemeModeToggle } from '../../components/ThemeModeToggle';
import { LoadingButton } from '../../components/Loader';
import { isApiEnabled } from '../../services/api/config';
import { apiLogin, changePassword } from '../../services/api/auth';
import { ApiError, checkApiHealth, loginErrorMessage } from '../../services/api/client';
import { getHomeRouteForRole } from '../../utils/routing';
import { apiUrl } from '../../services/api/config';

/** Full demo admin — only when DEMO_AUTH_ENABLED is on (do not use on a public portfolio). */
const DEMO_LOGIN = {
  email: 'admin@solumtechnologies.com',
  password: 'Demo@123456',
} as const;

const DEFAULT_PORTFOLIO_GUEST = {
  email: 'guest@assetly.demo',
  password: 'ViewOnly@2026',
} as const;

const features = [
  {
    icon: <Inventory2Icon fontSize="small" />,
    text: 'Full asset lifecycle — from procurement to retirement',
    sub: 'Track hardware, software licences & accessories in one place',
  },
  {
    icon: <QrCodeScannerIcon fontSize="small" />,
    text: 'Instant QR scanning & employee self-service',
    sub: 'Assign, transfer or audit assets with a phone camera',
  },
  {
    icon: <SecurityIcon fontSize="small" />,
    text: 'Granular role-based access control',
    sub: 'Super admin, IT manager, employee & read-only roles out of the box',
  },
  {
    icon: <NotificationsActiveIcon fontSize="small" />,
    text: 'Warranty & maintenance alerts',
    sub: 'Never miss an expiry — proactive notifications keep you ahead',
  },
  {
    icon: <AnalyticsIcon fontSize="small" />,
    text: 'Real-time dashboard & tamper-proof audit trail',
    sub: 'Full visibility into asset health, costs & every change ever made',
  },
];

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoAuthEnabled, setDemoAuthEnabled] = useState(
    import.meta.env.VITE_DEMO_AUTH === 'true',
  );
  const [portfolioGuest, setPortfolioGuest] = useState<{ email: string; password: string } | null>(
    import.meta.env.VITE_PORTFOLIO_GUEST === 'true' ? DEFAULT_PORTFOLIO_GUEST : null,
  );
  const [apiWarning, setApiWarning] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState(0);
  const [featureVisible, setFeatureVisible] = useState(true);
  const [featurePaused, setFeaturePaused] = useState(false);
  const demoAutoStarted = useRef(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up('md'));

  // Auto-slide feature carousel
  useEffect(() => {
    if (featurePaused) return;
    const timer = setInterval(() => {
      setFeatureVisible(false);
      setTimeout(() => {
        setActiveFeature((prev) => (prev + 1) % features.length);
        setFeatureVisible(true);
      }, 350);
    }, 3200);
    return () => clearInterval(timer);
  }, [featurePaused]);
  const error = useAppSelector((s) => s.auth.error);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const requirePasswordSetup = useAppSelector((s) => s.auth.requirePasswordSetup);
  const pendingUserEmail = useAppSelector((s) => s.auth.pendingUserEmail);
  const role = useAppSelector((s) => s.auth.user?.role);
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from || getHomeRouteForRole(role);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, role, location]);

  useEffect(() => {
    if (!isApiEnabled()) return;
    void checkApiHealth().then((result) => {
      setApiWarning(result.ok ? null : (result.message ?? 'Backend unavailable'));
    });
    void fetch(apiUrl('/api/auth/demo-status'))
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          enabled?: boolean;
          portfolioGuest?: { enabled?: boolean; email?: string; password?: string };
        };
        if (typeof data.enabled === 'boolean') setDemoAuthEnabled(data.enabled);
        if (data.portfolioGuest?.enabled && data.portfolioGuest.email && data.portfolioGuest.password) {
          setPortfolioGuest({
            email: data.portfolioGuest.email,
            password: data.portfolioGuest.password,
          });
        } else if (data.portfolioGuest && data.portfolioGuest.enabled === false) {
          setPortfolioGuest(null);
        }
      })
      .catch(() => {
        /* keep VITE_DEMO_AUTH fallback */
      });
  }, []);

  const completeLogin = async (loginEmail: string, loginPassword: string) => {
    const data = await apiLogin(loginEmail, loginPassword);
    if (data.requirePasswordSetup) {
      (window as any).__pendingUser = data.user;
      (window as any).__pendingTenant = data.tenant;
      (window as any).__pendingToken = data.token;
      (await import('../../services/api/auth')).storeToken(data.token);
      dispatch(setPendingSession({ user: data.user, tenant: data.tenant, token: data.token }));
      return;
    }
    dispatch(
      setSession({
        user: data.user,
        tenant: data.tenant,
        token: data.token,
      }),
    );
  };

  const handleGuestLogin = async () => {
    if (!portfolioGuest) return;
    dispatch(clearError());
    setEmail(portfolioGuest.email);
    setPassword(portfolioGuest.password);
    setDemoLoading(true);
    try {
      await completeLogin(portfolioGuest.email, portfolioGuest.password);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? loginErrorMessage(err.status, err.message)
          : 'Demo sign-in failed';
      dispatch(setLoginError(msg));
    } finally {
      setDemoLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    dispatch(clearError());
    setEmail(DEMO_LOGIN.email);
    setPassword(DEMO_LOGIN.password);
    setDemoLoading(true);
    try {
      await completeLogin(DEMO_LOGIN.email, DEMO_LOGIN.password);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? loginErrorMessage(err.status, err.message)
          : 'Demo sign-in failed';
      dispatch(setLoginError(msg));
    } finally {
      setDemoLoading(false);
    }
  };

  // Portfolio deep link: /login?demo=1 auto-enters the read-only guest (or full demo if only that is on)
  useEffect(() => {
    if (portfolioGuest) {
      if (demoAutoStarted.current || isAuthenticated || requirePasswordSetup) return;
      if (searchParams.get('demo') !== '1') return;
      demoAutoStarted.current = true;
      setSearchParams({}, { replace: true });
      void handleGuestLogin();
      return;
    }
    if (!demoAuthEnabled) return;
    if (demoAutoStarted.current || isAuthenticated || requirePasswordSetup) return;
    if (searchParams.get('demo') !== '1') return;
    demoAutoStarted.current = true;
    setSearchParams({}, { replace: true });

    let cancelled = false;
    (async () => {
      dispatch(clearError());
      setEmail(DEMO_LOGIN.email);
      setPassword(DEMO_LOGIN.password);
      setDemoLoading(true);
      try {
        const data = await apiLogin(DEMO_LOGIN.email, DEMO_LOGIN.password);
        if (cancelled) return;
        if (data.requirePasswordSetup) {
          (window as any).__pendingUser = data.user;
          (window as any).__pendingTenant = data.tenant;
          (window as any).__pendingToken = data.token;
          (await import('../../services/api/auth')).storeToken(data.token);
          dispatch(setPendingSession({ user: data.user, tenant: data.tenant, token: data.token }));
        } else {
          dispatch(
            setSession({
              user: data.user,
              tenant: data.tenant,
              token: data.token,
            }),
          );
        }
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? loginErrorMessage(err.status, err.message)
            : 'Demo sign-in failed';
        dispatch(setLoginError(msg));
      } finally {
        if (!cancelled) setDemoLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [demoAuthEnabled, searchParams, setSearchParams, isAuthenticated, requirePasswordSetup, dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    
    if (requirePasswordSetup) {
      if (password !== confirmPassword) {
        dispatch(setLoginError('Passwords do not match'));
        return;
      }
      if (password.length < 6) {
        dispatch(setLoginError('Password must be at least 6 characters'));
        return;
      }
      setLoading(true);
      try {
        await changePassword('', password);
        dispatch(setSession({
          user: (window as any).__pendingUser,
          tenant: (window as any).__pendingTenant,
          token: (window as any).__pendingToken,
        }));
      } catch (err) {
        dispatch(setLoginError(err instanceof Error ? err.message : 'Failed to set password'));
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      await completeLogin(email, password);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? loginErrorMessage(err.status, err.message)
          : 'Sign in failed';
      dispatch(setLoginError(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'stretch',
        bgcolor: 'background.default',
        position: 'relative',
      }}
    >
      <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
        <ThemeModeToggle />
      </Box>

      {isWide && (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            px: { md: 6, lg: 8 },
            py: 6,
            background: 'linear-gradient(160deg, #0a1628 0%, #0d2d6e 35%, #0f4c75 65%, #0a3d4a 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* ── Animated background orbs ── */}
          <Box sx={{
            position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
            '@keyframes float1': {
              '0%,100%': { transform: 'translate(0,0) scale(1)' },
              '50%': { transform: 'translate(30px,-40px) scale(1.08)' },
            },
            '@keyframes float2': {
              '0%,100%': { transform: 'translate(0,0) scale(1)' },
              '50%': { transform: 'translate(-20px,30px) scale(1.05)' },
            },
            '@keyframes float3': {
              '0%,100%': { transform: 'translate(0,0) scale(1)' },
              '50%': { transform: 'translate(15px,20px) scale(1.1)' },
            },
          }}>
            <Box sx={{
              position: 'absolute', width: 420, height: 420,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99,179,237,0.18) 0%, transparent 70%)',
              top: '-120px', left: '-80px',
              animation: 'float1 9s ease-in-out infinite',
            }} />
            <Box sx={{
              position: 'absolute', width: 320, height: 320,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(72,187,120,0.14) 0%, transparent 70%)',
              bottom: '-60px', right: '-40px',
              animation: 'float2 11s ease-in-out infinite',
            }} />
            <Box sx={{
              position: 'absolute', width: 200, height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(159,122,234,0.15) 0%, transparent 70%)',
              top: '40%', right: '15%',
              animation: 'float3 7s ease-in-out infinite',
            }} />
            {/* Subtle grid overlay */}
            <Box sx={{
              position: 'absolute', inset: 0,
              backgroundImage: `linear-gradient(${alpha('#fff', 0.025)} 1px, transparent 1px),
                                linear-gradient(90deg, ${alpha('#fff', 0.025)} 1px, transparent 1px)`,
              backgroundSize: '48px 48px',
            }} />
          </Box>

          {/* ── Logo badge ── */}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
              <Box sx={{
                width: 44, height: 44, borderRadius: 2,
                background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.12), 0 4px 16px rgba(59,130,246,0.4)',
              }}>
                <DevicesIcon sx={{ fontSize: 24 }} />
              </Box>
              <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.01em' }}>
                {APP_NAME}
              </Typography>
            </Box>

            {/* ── Hero headline ── */}
            <Typography
              variant="h3"
              fontWeight={800}
              sx={{
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                mb: 2,
                fontSize: { md: '2rem', lg: '2.4rem' },
                background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.75) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Every asset.<br />One source of truth.
            </Typography>

            <Typography
              variant="body1"
              sx={{ color: alpha('#fff', 0.6), lineHeight: 1.7, mb: 5, maxWidth: 380 }}
            >
              From procurement to retirement — track, assign and audit every device,
              licence and accessory across your entire organisation.
            </Typography>

            {/* ── Glassmorphism feature card ── */}
            <Box
              onMouseEnter={() => setFeaturePaused(true)}
              onMouseLeave={() => setFeaturePaused(false)}
              sx={{
                background: `linear-gradient(135deg, ${alpha('#fff', 0.07)} 0%, ${alpha('#fff', 0.03)} 100%)`,
                backdropFilter: 'blur(12px)',
                border: `1px solid ${alpha('#fff', 0.1)}`,
                borderRadius: 3,
                p: 3,
                mb: 3,
                position: 'relative',
                overflow: 'hidden',
                cursor: 'default',
                transition: 'border-color 0.3s',
                '&:hover': { borderColor: alpha('#fff', 0.2) },
              }}
            >
              {/* Shimmer top edge */}
              <Box sx={{
                position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              }} />

              {/* Slide content */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2.5,
                  minHeight: 72,
                  opacity: featureVisible ? 1 : 0,
                  transform: featureVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)',
                  transition: 'opacity 0.4s cubic-bezier(0.4,0,0.2,1), transform 0.4s cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                {/* Large icon */}
                <Box sx={{
                  width: 52, height: 52, borderRadius: 2.5, flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(99,179,237,0.25) 0%, rgba(72,187,120,0.15) 100%)',
                  border: `1px solid ${alpha('#fff', 0.15)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  '& svg': { fontSize: 26, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' },
                }}>
                  {features[activeFeature].icon}
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3,
                      color: '#fff', mb: 0.5,
                    }}
                  >
                    {features[activeFeature].text}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: alpha('#fff', 0.55), lineHeight: 1.5 }}
                  >
                    {features[activeFeature].sub}
                  </Typography>
                </Box>
              </Box>

              {/* Progress bar + dots row */}
              <Box sx={{ mt: 2.5 }}>
                {/* Thin animated progress bar */}
                <Box sx={{
                  height: 2, borderRadius: 99,
                  bgcolor: alpha('#fff', 0.1), mb: 1.5, overflow: 'hidden',
                }}>
                  <Box
                    key={`${activeFeature}-${featurePaused}`}
                    sx={{
                      height: '100%', borderRadius: 99,
                      background: 'linear-gradient(90deg, #60a5fa, #34d399)',
                      width: featurePaused ? '100%' : '0%',
                      ...(featurePaused
                        ? { transition: 'none' }
                        : {
                            animation: 'progressFill 3.2s linear forwards',
                            '@keyframes progressFill': {
                              from: { width: '0%' },
                              to: { width: '100%' },
                            },
                          }),
                    }}
                  />
                </Box>

                {/* Step dots */}
                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                  {features.map((_, i) => (
                    <Box
                      key={i}
                      onClick={() => {
                        setFeatureVisible(false);
                        setTimeout(() => { setActiveFeature(i); setFeatureVisible(true); }, 400);
                      }}
                      sx={{
                        height: 5,
                        width: i === activeFeature ? 24 : 6,
                        borderRadius: 99,
                        bgcolor: i === activeFeature
                          ? 'rgba(96,165,250,0.9)'
                          : alpha('#fff', 0.22),
                        transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: alpha('#fff', 0.5) },
                      }}
                    />
                  ))}
                  <Typography
                    variant="caption"
                    sx={{ ml: 'auto', color: alpha('#fff', 0.35), fontSize: '0.7rem' }}
                  >
                    {activeFeature + 1} / {features.length}
                  </Typography>
                </Box>
              </Box>
            </Box>

          </Box>
        </Box>
      )}

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2, sm: 4 },
          maxWidth: isWide ? 520 : '100%',
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: 440,
            borderRadius: 3,
            boxShadow: isWide
              ? (theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(0, 0, 0, 0.4)'
                : '0 8px 32px rgba(26, 35, 50, 0.08)')
              : undefined,
          }}
          elevation={isWide ? 0 : 1}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            {!isWide && (
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 2.5,
                    bgcolor: 'primary.main',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1.5,
                    boxShadow: '0 4px 12px rgba(21, 101, 192, 0.3)',
                  }}
                >
                  <DevicesIcon sx={{ color: 'white', fontSize: 28 }} />
                </Box>
                <Typography variant="h5" fontWeight={700}>
                  {APP_NAME}
                </Typography>
              </Box>
            )}

            <Typography variant={isWide ? 'h5' : 'h6'} fontWeight={700} gutterBottom>
              Sign in
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {COMPANY_NAME} portal
            </Typography>

            {apiWarning && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {apiWarning}
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {requirePasswordSetup ? (
              <Box component="form" onSubmit={handleSubmit}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Welcome, <strong>{pendingUserEmail}</strong>! Since this is your first time logging in, please set a password for your account.
                </Typography>
                <TextField
                  fullWidth
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  required
                  disabled={loading}
                />
                <TextField
                  fullWidth
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  margin="normal"
                  required
                  disabled={loading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <LoadingButton
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ mt: 3, py: 1.5 }}
                  loading={loading}
                  loadingLabel="Setting password…"
                >
                  Set Password & Sign In
                </LoadingButton>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleSubmit}>
                {portfolioGuest && (
                  <>
                    <Button
                      type="button"
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => void handleGuestLogin()}
                      disabled={loading || demoLoading || Boolean(apiWarning)}
                      sx={{ py: 1.5, mb: 2 }}
                    >
                      {demoLoading ? 'Opening read-only demo…' : 'View demo'}
                    </Button>

                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2" component="div" fontWeight={600}>
                        Recruiter / client preview — read only
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.75 }}>
                        This account can browse the app. It cannot add, edit, delete, or assign data.
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1, fontFamily: 'monospace' }}>
                        {portfolioGuest.email}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {portfolioGuest.password}
                      </Typography>
                    </Alert>

                    <Divider sx={{ my: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        or sign in with your account
                      </Typography>
                    </Divider>
                  </>
                )}

                {demoAuthEnabled && !portfolioGuest && (
                  <>
                    <Button
                      type="button"
                      fullWidth
                      variant="outlined"
                      size="large"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => void handleDemoLogin()}
                      disabled={loading || demoLoading || Boolean(apiWarning)}
                      sx={{ py: 1.5, mb: 2 }}
                    >
                      {demoLoading ? 'Opening demo…' : 'Try Demo'}
                    </Button>

                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2" component="div">
                        Portfolio visitors can skip the form — or sign in with:
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.75, fontFamily: 'monospace' }}>
                        {DEMO_LOGIN.email}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {DEMO_LOGIN.password}
                      </Typography>
                    </Alert>

                    <Divider sx={{ my: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        or sign in with your account
                      </Typography>
                    </Divider>
                  </>
                )}

                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  required
                  autoComplete="email"
                  disabled={loading || demoLoading}
                />
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  autoComplete="current-password"
                  disabled={loading || demoLoading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <LoadingButton
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ mt: 3, py: 1.5 }}
                  loading={loading}
                  loadingLabel="Signing in…"
                  disabled={demoLoading}
                >
                  Sign In
                </LoadingButton>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
