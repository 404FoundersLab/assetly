import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import StarOutlinedIcon from '@mui/icons-material/StarOutlined';
import type { BillingOverview, PlanTier, SubscriptionPlan } from '../../types';
import { fetchBillingOverview, openBillingPortal, startCheckout } from '../../services/api/billing';
import { ApiError } from '../../services/api/client';
import { LoadingButton } from '../../components/Loader';
import { usePermissions } from '../../hooks/storeHooks';

function usagePercent(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.round((current / max) * 100));
}

function statusColor(status: string): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'active') return 'success';
  if (status === 'trial') return 'warning';
  if (status === 'past_due') return 'error';
  return 'default';
}

function trialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function UsageMeter({
  icon,
  label,
  current,
  max,
}: {
  icon: React.ReactNode;
  label: string;
  current: number;
  max: number;
}) {
  const pct = usagePercent(current, max);
  const color = pct >= 90 ? 'warning' : 'primary';

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        height: '100%',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        {icon}
        <Typography variant="body2" fontWeight={600}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
        {current}
        <Typography component="span" variant="body2" color="text.secondary" fontWeight={500}>
          {' '}/ {max >= 999999 ? '∞' : max}
        </Typography>
      </Typography>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={color}
        sx={{ height: 8, borderRadius: 4 }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        {pct}% used{pct >= 90 ? ' — consider upgrading' : ''}
      </Typography>
    </Box>
  );
}

function PlanPricingCard({
  plan,
  isCurrent,
  isEnterprise,
  billingEnabled,
  loading,
  onSelect,
}: {
  plan: SubscriptionPlan;
  isCurrent: boolean;
  isEnterprise: boolean;
  billingEnabled: boolean;
  loading: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();
  const highlighted = plan.tier === 'professional';

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        position: 'relative',
        border: '2px solid',
        borderColor: isCurrent ? 'primary.main' : highlighted ? alpha(theme.palette.primary.main, 0.35) : 'divider',
        bgcolor: isCurrent ? alpha(theme.palette.primary.main, 0.04) : 'background.paper',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: isCurrent ? 'primary.main' : alpha(theme.palette.primary.main, 0.5),
          boxShadow: isCurrent ? undefined : `0 8px 24px ${alpha(theme.palette.common.black, 0.06)}`,
        },
      }}
    >
      {highlighted && !isCurrent && (
        <Chip
          icon={<StarOutlinedIcon sx={{ fontSize: '14px !important' }} />}
          label="Popular"
          color="primary"
          size="small"
          sx={{ position: 'absolute', top: 12, right: 12 }}
        />
      )}
      {isCurrent && (
        <Chip label="Current plan" color="primary" size="small" sx={{ position: 'absolute', top: 12, right: 12 }} />
      )}
      <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          {plan.name}
        </Typography>
        <Box sx={{ mb: 2 }}>
          {isEnterprise ? (
            <Typography variant="h5" fontWeight={700}>
              Custom
            </Typography>
          ) : (
            <>
              <Typography variant="h4" fontWeight={800} color="primary.main" component="span">
                {plan.priceLabel?.split('/')[0] ?? `$${plan.pricePerUnit}`}
              </Typography>
              <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 0.5 }}>
                / asset / mo
              </Typography>
            </>
          )}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Up to {plan.maxAssets >= 999999 ? 'unlimited' : plan.maxAssets} assets · {plan.maxAdmins >= 999999 ? 'unlimited' : plan.maxAdmins} admins
          </Typography>
        </Box>

        <Stack spacing={0.75} sx={{ flex: 1, mb: 2 }}>
          {plan.featureLabels.slice(0, 5).map((feature) => (
            <Stack key={feature} direction="row" spacing={1} alignItems="flex-start">
              <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'success.main', mt: 0.15 }} />
              <Typography variant="body2" color="text.secondary">
                {feature}
              </Typography>
            </Stack>
          ))}
        </Stack>

        {isEnterprise ? (
          <Button variant="outlined" fullWidth disabled>
            Contact sales
          </Button>
        ) : isCurrent ? (
          <Button variant="outlined" fullWidth disabled>
            Active plan
          </Button>
        ) : (
          <LoadingButton
            fullWidth
            variant={highlighted ? 'contained' : 'outlined'}
            loading={loading}
            disabled={!billingEnabled}
            startIcon={<RocketLaunchIcon />}
            onClick={onSelect}
          >
            Upgrade
          </LoadingButton>
        )}
      </CardContent>
    </Card>
  );
}

function billingEnabled(mode: string): boolean {
  return mode !== 'demo';
}

export function BillingCard() {
  const theme = useTheme();
  const { role } = usePermissions();
  const canManage = role === 'tenant_admin' || role === 'platform_admin';
  const [data, setData] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionTier, setActionTier] = useState<PlanTier | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await fetchBillingOverview();
      setData(overview);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load billing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpgrade = async (tier: PlanTier) => {
    setActionTier(tier);
    setError(null);
    try {
      const result = await startCheckout(tier);
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setError('Checkout is unavailable. Configure Razorpay or Stripe billing.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Checkout failed');
    } finally {
      setActionTier(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const { url } = await openBillingPortal();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={140} />
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Skeleton variant="rounded" height={120} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Skeleton variant="rounded" height={120} />
          </Grid>
        </Grid>
        <Grid container spacing={2}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} md={4} key={i}>
              <Skeleton variant="rounded" height={280} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    );
  }

  if (!data) {
    return <Alert severity="error">{error ?? 'Billing unavailable'}</Alert>;
  }

  const { subscription, plans, mode, provider, billingRegion } = data;
  const daysLeft = trialDaysLeft(subscription.trialEndsAt);
  const paymentsEnabled = billingEnabled(mode);
  const providerLabel = provider === 'razorpay' ? 'Razorpay' : 'Stripe';

  return (
    <Stack spacing={3}>
      {/* Hero — current plan */}
      <Card
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.2),
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={2}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <CreditCardIcon color="primary" />
                <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1}>
                  Subscription
                </Typography>
              </Stack>
              <Typography variant="h4" fontWeight={800} gutterBottom>
                {subscription.plan.name} Plan
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {subscription.plan.priceLabel ?? `$${subscription.plan.pricePerUnit}/asset/month`}
                {billingRegion === 'IN' ? ' · billed in INR' : ' · billed in USD'}
              </Typography>
            </Box>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <Chip label={subscription.status} color={statusColor(subscription.status)} />
              <Chip
                icon={<PublicOutlinedIcon sx={{ fontSize: '16px !important' }} />}
                label={billingRegion === 'IN' ? 'India' : 'Global'}
                variant="outlined"
              />
              {paymentsEnabled && (
                <Chip label={providerLabel} variant="outlined" />
              )}
            </Stack>
          </Stack>

          {subscription.status === 'trial' && daysLeft !== null && (
            <Alert
              severity={daysLeft <= 3 ? 'warning' : 'info'}
              sx={{ mt: 2, borderRadius: 2 }}
            >
              {daysLeft === 0
                ? 'Your trial ends today. Upgrade to keep full access to all features.'
                : `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining in your free trial.`}
            </Alert>
          )}

          {!paymentsEnabled && (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
              Payment provider is not configured. Set up {billingRegion === 'IN' ? 'Razorpay' : 'Stripe'} to enable plan upgrades.
            </Alert>
          )}
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Usage */}
      <Box>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Usage this period
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <UsageMeter
              icon={<Inventory2OutlinedIcon fontSize="small" color="primary" />}
              label="Assets"
              current={subscription.usage.assets}
              max={subscription.plan.maxAssets}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <UsageMeter
              icon={<GroupsOutlinedIcon fontSize="small" color="primary" />}
              label="Admin seats"
              current={subscription.usage.admins}
              max={subscription.plan.maxAdmins}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Plans */}
      {canManage && (
        <Box>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Available plans
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {paymentsEnabled
              ? mode === 'dual'
                ? `Payments routed via ${providerLabel} for your region.`
                : 'Compare features and upgrade when you need more capacity.'
              : 'Plan upgrades require a configured payment provider.'}
          </Typography>
          <Grid container spacing={2}>
            {plans.map((plan) => (
              <Grid item xs={12} md={4} key={plan.tier}>
                <PlanPricingCard
                  plan={plan}
                  isCurrent={plan.tier === subscription.plan.tier}
                  isEnterprise={plan.tier === 'enterprise'}
                  billingEnabled={paymentsEnabled}
                  loading={actionTier === plan.tier}
                  onSelect={() => void handleUpgrade(plan.tier)}
                />
              </Grid>
            ))}
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            {paymentsEnabled && provider === 'stripe' && subscription.hasStripeSubscription && (
              <Button variant="outlined" onClick={() => void handlePortal()} disabled={portalLoading}>
                Manage payment & invoices
              </Button>
            )}
          </Stack>

          {paymentsEnabled && provider === 'razorpay' && subscription.hasRazorpaySubscription && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              UPI/card mandates are managed through Razorpay. Contact support to change or cancel.
            </Typography>
          )}
        </Box>
      )}

      {!canManage && (
        <Alert severity="info">
          Contact your tenant admin to change the subscription plan.
        </Alert>
      )}
    </Stack>
  );
}
