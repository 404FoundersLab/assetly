import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Alert, Chip } from '@mui/material';
import DevicesIcon from '@mui/icons-material/Devices';
import { useParams } from 'react-router-dom';
import { useAppSelector } from '../../hooks/storeHooks';
import { StatusChip } from '../../components/StatusChip';
import { PageLoader } from '../../components/Loader';
import { formatCurrency, formatDate, getEmployeeName } from '../../utils/format';
import { CATEGORY_LABELS } from '../../data/demoData';
import { APP_NAME } from '../../constants/brand';
import { isApiEnabled } from '../../services/api/config';
import { apiFetch } from '../../services/api/client';
import type { Asset } from '../../types';

export function AssetLookupPage() {
  const { id: rawParam } = useParams<{ id: string }>();
  const idStr = rawParam ? decodeURIComponent(rawParam).trim() : '';

  let parsedId = idStr;
  if (idStr.includes('/lookup/')) {
    parsedId = idStr.split('/lookup/')[1]?.split('?')[0]?.split('#')[0]?.replace(/\/$/, '') || idStr;
  } else if (idStr.startsWith('ASSET:')) {
    const parts = idStr.split(':');
    parsedId = parts[2] || parts[1] || idStr;
  }

  const reduxAsset = useAppSelector((s) => s.assets.items.find((a) => a.id === parsedId || a.assetTag === parsedId));
  const employees = useAppSelector((s) => s.employees.items);
  const vendors = useAppSelector((s) => s.vendors.items);
  const tenant = useAppSelector((s) => s.auth.tenant);
  const [remoteAsset, setRemoteAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(isApiEnabled());
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!parsedId || !isApiEnabled()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const asset = await apiFetch<Asset>(`/api/assets/${encodeURIComponent(parsedId)}`);
        if (!cancelled) setRemoteAsset(asset);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [parsedId]);

  const asset = isApiEnabled() ? remoteAsset : reduxAsset;

  if (loading) {
    return (
      <PageLoader
        message="Looking up this asset…"
        hint="Fetching tag, warranty, and assignment details."
      />
    );
  }

  if (!asset || notFound) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 2,
        }}
      >
        <Alert severity="warning">Asset not found. Scan a valid QR code.</Alert>
      </Box>
    );
  }

  const employee = asset.assignedEmployeeId
    ? employees.find((e) => e.id === asset.assignedEmployeeId)
    : null;
  const vendor = vendors.find((v) => v.id === asset.vendorId);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 4,
        px: 2,
      }}
    >
      <Box sx={{ maxWidth: 480, mx: 'auto' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1,
            }}
          >
            <DevicesIcon sx={{ color: 'white' }} />
          </Box>
          <Typography variant="h6" fontWeight={700}>
            {tenant ? tenant.name : 'Company Asset'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Asset Lookup
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {asset.assetTag}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {asset.name}
                </Typography>
              </Box>
              <StatusChip status={asset.status} />
            </Box>

            <Chip label={CATEGORY_LABELS[asset.category]} size="small" sx={{ mb: 2 }} />

            {asset.imageUrl && (
              <Box
                component="img"
                src={asset.imageUrl}
                alt={asset.name}
                sx={{
                  width: '100%',
                  maxHeight: 200,
                  objectFit: 'cover',
                  borderRadius: 2,
                  mb: 2,
                }}
              />
            )}

            <Box sx={{ display: 'grid', gap: 1.5 }}>
              <Row label="Serial" value={asset.serialNumber} />
              <Row label="Manufacturer" value={`${asset.manufacturer} ${asset.model}`.trim()} />
              {asset.specs && <Row label="Specs" value={asset.specs} />}
              <Row label="Location" value={asset.location} />
              {asset.department && <Row label="Department" value={asset.department} />}
              <Row label="Vendor" value={vendor?.name ?? '—'} />
              <Row
                label="Assigned To"
                value={employee ? getEmployeeName(employee.firstName, employee.lastName) : 'Unassigned'}
              />
              <Row label="Warranty Until" value={formatDate(asset.warrantyExpiresAt)} />
              <Row label="Current Value" value={formatCurrency(asset.currentValue)} />
            </Box>
          </CardContent>
        </Card>

        <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={2}>
          {APP_NAME} · Mobile QR Lookup
        </Typography>
      </Box>
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value}
      </Typography>
    </Box>
  );
}
