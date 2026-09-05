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
  Chip,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SecurityIcon from '@mui/icons-material/Security';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LayersIcon from '@mui/icons-material/Layers';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
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
    text: 'Full Asset Lifecycle & Hardware Telemetry',
    sub: 'Track laptops, mobile fleets, servers, and SAM licences from purchase to decommission',
  },
  {
    icon: <QrCodeScannerIcon fontSize="small" />,
    text: 'Instant QR Scanning & Employee Self-Service',
    sub: 'Audit, verify, or transfer physical assets with any mobile camera',
  },
  {
    icon: <SecurityIcon fontSize="small" />,
    text: 'Zero-Trust Role-Based Access Control',
    sub: 'Platform admin, tenant admin, HR manager, and employee scopes out of the box',
  },
  {
    icon: <NotificationsActiveIcon fontSize="small" />,
    text: 'Automated Warranty & Maintenance Alerts',
    sub: 'Predictive notifications keep your IT operations months ahead of contract expiries',
  },
  {
    icon: <AnalyticsIcon fontSize="small" />,
    text: 'Real-Time Valuation & Tamper-Proof Audit Trail',
    sub: 'Cryptographic accountability into every device change, cost center, and assignment',
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
  const isDark = theme.palette.mode === 'dark';

  // Auto-slide feature carousel
  useEffect(() => {
    if (featurePaused) return;
    const timer = setInterval(() => {
      setFeatureVisible(false);
      setTimeout(() => {
        setActiveFeature((prev) => (prev + 1) % features.length);
        setFeatureVisible(true);
      }, 350);
    }, 3600);
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

  // Portfolio deep link: /login?demo=1
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
  }, [demoAuthEnabled, portfolioGuest, isAuthenticated, requirePasswordSetup, searchParams, setSearchParams, dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());

    if (requirePasswordSetup) {
      if (password.length < 8) {
        dispatch(setLoginError('Password must be at least 8 characters'));
        return;
      }
      if (password !== confirmPassword) {
        dispatch(setLoginError('Passwords do not match'));
        return;
      }
      setLoading(true);
      try {
        const token = (window as any).__pendingToken;
        if (!token) throw new Error('Session expired, please refresh');
        const user = (window as any).__pendingUser;
        const tenant = (window as any).__pendingTenant;

        await changePassword(token, password);
        delete (window as any).__pendingUser;
        delete (window as any).__pendingTenant;
        delete (window as any).__pendingToken;

        dispatch(setSession({ user, tenant, token }));
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Failed to set password';
        dispatch(setLoginError(msg));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password) {
      dispatch(setLoginError('Please fill in all fields'));
      return;
    }

    setLoading(true);
    try {
      await completeLogin(email.trim(), password);
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
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
        <ThemeModeToggle />
      </Box>

      {/* ── Left Showcase Panel (Aurora & Feature Glass) ── */}
      {isWide && (
        <Box
          sx={{
            flex: '1 1 55%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            px: { md: 7, lg: 9 },
            py: 7,
            background: 'radial-gradient(circle at 15% 20%, #312E81 0%, transparent 45%), radial-gradient(circle at 85% 75%, #0E7490 0%, transparent 45%), #060911',
            color: '#FFFFFF',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Cyber Grid Overlay */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
              backgroundSize: '54px 54px',
            }}
          />

          {/* Glowing Ambient Orbs */}
          <Box
            sx={{
              position: 'absolute',
              width: 500,
              height: 500,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, transparent 70%)',
              top: '-150px',
              left: '-100px',
              filter: 'blur(30px)',
              pointerEvents: 'none',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.14) 0%, transparent 70%)',
              bottom: '-100px',
              right: '-50px',
              filter: 'blur(30px)',
              pointerEvents: 'none',
            }}
          />

          {/* Top Brand Tag */}
          <Box sx={{ position: 'relative', zIndex: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #06B6D4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 18px rgba(99, 102, 241, 0.45)',
                }}
              >
                <LayersIcon sx={{ fontSize: 24, color: '#FFFFFF' }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                  {APP_NAME}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>
                  IT Fleet Intelligence Platform
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Middle Hero Content */}
          <Box sx={{ position: 'relative', zIndex: 2, my: 'auto', py: 4, maxWidth: 520 }}>
            <Typography
              variant="h2"
              fontWeight={800}
              sx={{
                letterSpacing: '-0.035em',
                lineHeight: 1.12,
                mb: 2,
                fontSize: { md: '2.4rem', lg: '2.9rem' },
                background: 'linear-gradient(135deg, #FFFFFF 0%, #CBD5E1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Unified IT Operations.
              <br />
              Zero Blindspots.
            </Typography>

            <Typography
              variant="body1"
              sx={{ color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.65, mb: 4.5, fontSize: '1rem' }}
            >
              From provisioning to retirement — oversee every laptop, cloud license,
              network switch, and store device with cryptographic clarity.
            </Typography>

            {/* Feature Carousel Glassmorphic Card */}
            <Box
              onMouseEnter={() => setFeaturePaused(true)}
              onMouseLeave={() => setFeaturePaused(false)}
              sx={{
                background: 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '18px',
                p: 3,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5)',
                transition: 'border-color 0.25s ease',
                '&:hover': { borderColor: 'rgba(255, 255, 255, 0.22)' },
              }}
            >
              {/* Highlight line */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: '15%',
                  right: '15%',
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.6), transparent)',
                }}
              />

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  minHeight: 72,
                  opacity: featureVisible ? 1 : 0,
                  transform: featureVisible ? 'translateY(0)' : 'translateY(8px)',
                  transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    bgcolor: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    color: '#818CF8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {features[activeFeature].icon}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#FFFFFF', mb: 0.25, fontSize: '0.95rem' }}>
                    {features[activeFeature].text}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.825rem' }}>
                    {features[activeFeature].sub}
                  </Typography>
                </Box>
              </Box>

              {/* Progress & Indicators */}
              <Box sx={{ mt: 2.5 }}>
                <Box sx={{ height: 2.5, borderRadius: 99, bgcolor: 'rgba(255, 255, 255, 0.1)', mb: 1.5, overflow: 'hidden' }}>
                  <Box
                    key={`${activeFeature}-${featurePaused}`}
                    sx={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #6366F1, #06B6D4)',
                      width: featurePaused ? '100%' : '0%',
                      ...(featurePaused
                        ? { transition: 'none' }
                        : {
                            animation: 'progressFill 3.6s linear forwards',
                            '@keyframes progressFill': {
                              from: { width: '0%' },
                              to: { width: '100%' },
                            },
                          }),
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                  {features.map((_, i) => (
                    <Box
                      key={i}
                      onClick={() => {
                        setFeatureVisible(false);
                        setTimeout(() => {
                          setActiveFeature(i);
                          setFeatureVisible(true);
                        }, 350);
                      }}
                      sx={{
                        height: 4,
                        width: i === activeFeature ? 22 : 6,
                        borderRadius: 99,
                        bgcolor: i === activeFeature ? '#6366F1' : 'rgba(255, 255, 255, 0.25)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.6)' },
                      }}
                    />
                  ))}
                  <Typography variant="caption" sx={{ ml: 'auto', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.7rem' }}>
                    {activeFeature + 1} / {features.length}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Bottom Security Trust Row */}
          <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <VerifiedUserIcon sx={{ fontSize: 16, color: '#10B981' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.55)', fontWeight: 600 }}>
                SOC-2 Type II
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <LockOutlinedIcon sx={{ fontSize: 16, color: '#38BDF8' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.55)', fontWeight: 600 }}>
                Zero-Trust Encryption
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.35)', ml: 'auto' }}>
              © 2026 {COMPANY_NAME}
            </Typography>
          </Box>
        </Box>
      )}

      {/* ── Right Auth Form Panel ── */}
      <Box
        sx={{
          flex: isWide ? '1 1 45%' : '1 1 100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2.5, sm: 4, md: 6 },
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: 440,
            borderRadius: '24px',
            p: { xs: 2, sm: 3 },
            boxShadow: isDark
              ? '0 24px 48px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08)'
              : '0 24px 48px -12px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(15, 23, 42, 0.06)',
            bgcolor: isDark ? 'rgba(15, 23, 42, 0.75)' : '#FFFFFF',
            backdropFilter: 'blur(20px)',
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Mobile Header Logo */}
            {!isWide && (
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1.25,
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                    color: '#FFFFFF',
                  }}
                >
                  <LayersIcon sx={{ fontSize: 26 }} />
                </Box>
                <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em' }}>
                  {APP_NAME}
                </Typography>
              </Box>
            )}

            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.025em', mb: 0.5 }}>
                Sign in to your account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter your credentials or test the interactive portfolio demo.
              </Typography>
            </Box>

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
                  sx={{ mt: 3, py: 1.5, borderRadius: '12px' }}
                  loading={loading}
                  loadingLabel="Setting password…"
                >
                  Set Password & Sign In
                </LoadingButton>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleSubmit}>
                {portfolioGuest && (
                  <Box sx={{ mb: 2.5 }}>
                    <Button
                      type="button"
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => void handleGuestLogin()}
                      disabled={loading || demoLoading || Boolean(apiWarning)}
                      sx={{
                        py: 1.4,
                        mb: 1.5,
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                        boxShadow: '0 4px 14px rgba(6, 182, 212, 0.35)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
                          boxShadow: '0 6px 18px rgba(6, 182, 212, 0.45)',
                        },
                      }}
                    >
                      {demoLoading ? 'Launching live preview…' : 'Enter Recruiter Demo (Read-Only)'}
                    </Button>

                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: '12px',
                        bgcolor: isDark ? 'rgba(6, 182, 212, 0.08)' : 'rgba(8, 145, 178, 0.06)',
                        border: '1px solid',
                        borderColor: isDark ? 'rgba(6, 182, 212, 0.25)' : 'rgba(8, 145, 178, 0.2)',
                      }}
                    >
                      <Typography variant="caption" fontWeight={700} color="secondary.main" display="block">
                        RECRUITER & CLIENT PREVIEW
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        Instant exploration with pre-seeded enterprise fleet telemetry.
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 2.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        or sign in with credentials
                      </Typography>
                    </Divider>
                  </Box>
                )}

                {demoAuthEnabled && !portfolioGuest && (
                  <Box sx={{ mb: 2.5 }}>
                    <Button
                      type="button"
                      fullWidth
                      variant="outlined"
                      size="large"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => void handleDemoLogin()}
                      disabled={loading || demoLoading || Boolean(apiWarning)}
                      sx={{ py: 1.4, mb: 1.5, borderRadius: '12px' }}
                    >
                      {demoLoading ? 'Opening demo…' : 'Quick Demo Sign-In'}
                    </Button>

                    <Divider sx={{ my: 2.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        or sign in with credentials
                      </Typography>
                    </Divider>
                  </Box>
                )}

                <TextField
                  fullWidth
                  label="Email address"
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
                  sx={{
                    mt: 3,
                    py: 1.4,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                      boxShadow: '0 6px 18px rgba(99, 102, 241, 0.45)',
                    },
                  }}
                  loading={loading}
                  loadingLabel="Signing in…"
                  disabled={demoLoading}
                >
                  Sign In to Console
                </LoadingButton>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
