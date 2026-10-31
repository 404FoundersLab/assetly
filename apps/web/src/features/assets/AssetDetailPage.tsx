import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Breadcrumbs,
  Link,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  Stack,
  LinearProgress,
  alpha,
  useTheme,
  Chip,
  Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import QrCodeIcon from '@mui/icons-material/QrCode';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SyncIcon from '@mui/icons-material/Sync';
import LaunchIcon from '@mui/icons-material/Launch';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/storeHooks';
import { usePermissions } from '../../hooks/storeHooks';
import { StatusChip } from '../../components/StatusChip';
import { AssetQrPanel } from '../../components/AssetQrPanel';
import { AssignAssetDialog, ReturnAssetDialog } from './AssignAssetDialog';
import { AssetEditDialog } from './AssetEditDialog';
import { formatCurrency, formatDate, formatDateTime, getEmployeeName } from '../../utils/format';
import { assetFinancials } from '../finance/itSpendMetrics';
import { itSpendUrl } from '../../constants/routes';
import { useAssetCategories } from '../../hooks/useAssetCategories';
import { DEVICE_FAMILY_META } from '../../constants/deviceFamilies';
import { lookupWarranty, type WarrantyLookupResult } from '../../services/api/warranty';
import { patchAsset } from '../../services/api/assets';
import { reloadFromApi } from '../../components/DataBootstrap';
import { LoadingButton } from '../../components/Loader';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Grid container spacing={2} sx={{ py: 1 }}>
      <Grid item xs={4}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Grid>
      <Grid item xs={8}>
        <Typography variant="body2" fontWeight={500}>
          {value}
        </Typography>
      </Grid>
    </Grid>
  );
}

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const asset = useAppSelector((s) => s.assets.items.find((a) => a.id === id));
  const employees = useAppSelector((s) => s.employees.items);
  const vendors = useAppSelector((s) => s.vendors.items);
  const history = useAppSelector((s) => s.assets.ownershipHistory.filter((h) => h.assetId === id));
  const assignments = useAppSelector((s) => s.assets.assignments.filter((a) => a.assetId === id));

  const [assignOpen, setAssignOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [syncingWarranty, setSyncingWarranty] = useState(false);
  const [warrantyInfo, setWarrantyInfo] = useState<WarrantyLookupResult | null>(null);
  const [warrantyToast, setWarrantyToast] = useState<{ message: string; severity: 'success' | 'info' | 'error' } | null>(null);

  const { pathOf, metaOf, labelOf } = useAssetCategories();
  const listPath = asset ? pathOf(asset.category) : DEVICE_FAMILY_META.it_asset.path;
  const listLabel = asset ? metaOf(asset.category).menu : DEVICE_FAMILY_META.it_asset.menu;

  const isLaptop = asset?.category?.toLowerCase() === 'laptop';
  const mfg = (asset?.manufacturer || '').toLowerCase();
  const isLenovo = isLaptop && (mfg.includes('lenovo') || (asset?.model?.toLowerCase().includes('thinkpad') ?? false) || (asset?.serialNumber?.startsWith('1S') ?? false) || !asset?.manufacturer);
  const isDell = isLaptop && (mfg.includes('dell') || (asset?.serialNumber?.length === 7 && /^[A-Z0-9]{7}$/i.test(asset?.serialNumber ?? '')));

  const handleSyncLenovoWarranty = async () => {
    if (!asset?.serialNumber) {
      setWarrantyToast({ message: 'Serial number is required to look up Lenovo warranty.', severity: 'error' });
      return;
    }
    setSyncingWarranty(true);
    try {
      const data = await lookupWarranty(asset.serialNumber, 'lenovo');
      setWarrantyInfo(data);
      if (data.endDate) {
        await patchAsset(asset.id, {
          warrantyExpiresAt: data.endDate,
        });
        await reloadFromApi(dispatch);
        setWarrantyToast({
          message: `Synced with Lenovo! Warranty updated to ${formatDate(data.endDate)} (${data.planName || 'Active'}).`,
          severity: 'success',
        });
      } else {
        setWarrantyToast({
          message: 'Lenovo data retrieved, but no expiration date was returned.',
          severity: 'info',
        });
      }
    } catch (err: any) {
      setWarrantyToast({
        message: err?.message || 'Failed to fetch warranty from Lenovo.',
        severity: 'error',
      });
    } finally {
      setSyncingWarranty(false);
    }
  };

  const handleOpenDellSupport = () => {
    if (asset?.serialNumber) {
      navigator.clipboard.writeText(asset.serialNumber);
      setWarrantyToast({
        message: `Service Tag "${asset.serialNumber}" copied to clipboard! Opening Dell Support...`,
        severity: 'info',
      });
    }
    window.open('https://www.dell.com/support/contractservices/en-in', '_blank', 'noopener,noreferrer');
  };

  if (!asset) {
    return (
      <Box>
        <Alert severity="error">Asset not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(listPath)} sx={{ mt: 2 }}>
          Back to {listLabel}
        </Button>
      </Box>
    );
  }

  const employee = asset.assignedEmployeeId
    ? employees.find((e) => e.id === asset.assignedEmployeeId)
    : null;
  const vendor = vendors.find((v) => v.id === asset.vendorId);
  const financials = assetFinancials(asset);
  const canViewItSpend = can('module:finance');

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to={listPath} underline="hover" color="inherit">
          {listLabel}
        </Link>
        <Typography color="text.primary">{asset.assetTag}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {asset.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              {asset.assetTag}
            </Typography>
            <StatusChip status={asset.status} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button startIcon={<QrCodeIcon />} variant="outlined" onClick={() => setShowQr(!showQr)}>
            QR Code
          </Button>
          {can('asset:write') && (
            <Button startIcon={<EditIcon />} variant="outlined" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          )}
          {can('asset:assign') && asset.status !== 'deployed' && (
            <Button startIcon={<AssignmentIndIcon />} variant="contained" onClick={() => setAssignOpen(true)}>
              Assign
            </Button>
          )}
          {can('asset:assign') && asset.status === 'deployed' && (
            <Button startIcon={<KeyboardReturnIcon />} variant="contained" color="warning" onClick={() => setReturnOpen(true)}>
              Return
            </Button>
          )}
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(listPath)}>
            Back
          </Button>
        </Box>
      </Box>

      {showQr && (
        <Card sx={{ mb: 3, py: 3 }}>
          <CardContent>
            <AssetQrPanel
              assetId={asset.id}
              assetTag={asset.assetTag}
              size={180}
              showDownload
              caption="Scan to open asset lookup page"
            />
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        {asset.imageUrl && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Device Image
                </Typography>
                <Box
                  component="img"
                  src={asset.imageUrl}
                  alt={asset.name}
                  sx={{ maxHeight: 280, maxWidth: '100%', borderRadius: 2, objectFit: 'contain' }}
                />
              </CardContent>
            </Card>
          </Grid>
        )}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Asset Details
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <DetailRow label="Category" value={labelOf(asset.category)} />
              <DetailRow label="Manufacturer" value={asset.manufacturer} />
              <DetailRow label="Model" value={asset.model} />
              <DetailRow label="Serial Number" value={asset.serialNumber} />
              <DetailRow label="Location" value={asset.location} />
              {asset.department && <DetailRow label="Department" value={asset.department} />}
              <DetailRow label="Vendor" value={vendor?.name ?? '—'} />
              <DetailRow label="Lifecycle" value={asset.lifecycleStage} />
              {asset.specs && <DetailRow label="Specs" value={asset.specs} />}
              <DetailRow
                label="Assigned To"
                value={
                  employee ? (
                    <Link component={RouterLink} to={`/employees/${employee.id}`} underline="hover">
                      {getEmployeeName(employee.firstName, employee.lastName)}
                    </Link>
                  ) : (
                    'Unassigned'
                  )
                }
              />
              {asset.notes && <DetailRow label="Notes" value={asset.notes} />}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6">Financials</Typography>
                {canViewItSpend && (
                  <Button
                    size="small"
                    endIcon={<OpenInNewIcon />}
                    onClick={() => navigate(itSpendUrl('valuation'))}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    IT Spend
                  </Button>
                )}
              </Stack>
              <Divider sx={{ mb: 1 }} />
              <DetailRow label="Purchase Date" value={formatDate(asset.purchaseDate)} />
              <DetailRow label="Purchase Cost" value={formatCurrency(asset.purchaseCost)} />
              <DetailRow label="Current Value" value={formatCurrency(asset.currentValue)} />
              <DetailRow label="Repair Charges" value={formatCurrency(financials.repairCost)} />
              <DetailRow label="Total Cost (TCO)" value={formatCurrency(financials.totalCostOfOwnership)} />
              <Box sx={{ py: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
                  <Typography variant="body2" color="text.secondary">
                    Depreciation
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <TrendingDownIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                    <Typography variant="body2" fontWeight={600}>
                      {financials.depreciationPct}%
                    </Typography>
                  </Stack>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={financials.depreciationPct}
                  color="warning"
                  sx={{ height: 6, borderRadius: 3 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {formatCurrency(financials.depreciation)} written down from purchase cost
                </Typography>
              </Box>
              {canViewItSpend && (
                <Box
                  sx={{
                    mt: 1,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                    border: '1px solid',
                    borderColor: alpha(theme.palette.primary.main, 0.15),
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Portfolio reports, budgets, and expense approvals live in the{' '}
                    <Link
                      component={RouterLink}
                      to={itSpendUrl()}
                      underline="hover"
                      fontWeight={600}
                    >
                      IT Spend module
                    </Link>
                    .
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6">
                  Warranty
                </Typography>
                {isLaptop && (
                  <Stack direction="row" spacing={1}>
                    {isLenovo && (
                      <LoadingButton
                        size="small"
                        variant="outlined"
                        color="primary"
                        loading={syncingWarranty}
                        startIcon={<SyncIcon />}
                        onClick={handleSyncLenovoWarranty}
                      >
                        Sync Lenovo
                      </LoadingButton>
                    )}
                    {isDell && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<LaunchIcon />}
                        onClick={handleOpenDellSupport}
                      >
                        Check Dell
                      </Button>
                    )}
                  </Stack>
                )}
              </Box>
              <Divider sx={{ mb: 1.5 }} />

              <DetailRow label="Expires" value={formatDate(asset.warrantyExpiresAt)} />

              {warrantyInfo && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {warrantyInfo.planName || 'Manufacturer Warranty'}
                    </Typography>
                    <Chip
                      label={warrantyInfo.status || 'Active'}
                      color={warrantyInfo.status === 'Active' ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  {warrantyInfo.startDate && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Start: {formatDate(warrantyInfo.startDate)}
                    </Typography>
                  )}
                  {warrantyInfo.deliveryType && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Coverage: {warrantyInfo.deliveryType === 'on_site' ? 'On Site Support' : warrantyInfo.deliveryType}
                    </Typography>
                  )}
                  {warrantyInfo.supportUrl && (
                    <Link
                      href={warrantyInfo.supportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 1, fontSize: '0.8rem' }}
                    >
                      View on Lenovo Support <LaunchIcon sx={{ fontSize: 13 }} />
                    </Link>
                  )}
                </Box>
              )}

              {!warrantyInfo && isLaptop && isLenovo && (
                <Box sx={{ mt: 1.5 }}>
                  <Link
                    href="https://pcsupport.lenovo.com/in/en/warranty-lookup#/"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.8rem' }}
                  >
                    Lenovo Warranty Lookup Portal <LaunchIcon sx={{ fontSize: 13 }} />
                  </Link>
                </Box>
              )}

              {isLaptop && isDell && (
                <Box sx={{ mt: 1.5 }}>
                  <Link
                    href="https://www.dell.com/support/contractservices/en-in"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      if (asset.serialNumber) navigator.clipboard.writeText(asset.serialNumber);
                    }}
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.8rem' }}
                  >
                    Dell Support Services & Warranty <LaunchIcon sx={{ fontSize: 13 }} />
                  </Link>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ownership History
              </Typography>
              <List dense>
                {history.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    No history yet
                  </Typography>
                ) : (
                  history.map((h) => (
                    <ListItem key={h.id} sx={{ px: 0 }}>
                      <ListItemText
                        primary={h.eventType}
                        secondary={`${h.description} · ${h.performedBy} · ${formatDateTime(h.createdAt)}`}
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assignment Records
              </Typography>
              <List dense>
                {assignments.map((a) => {
                  const emp = employees.find((e) => e.id === a.employeeId);
                  return (
                    <ListItem key={a.id} sx={{ px: 0 }}>
                      <ListItemText
                        primary={emp ? getEmployeeName(emp.firstName, emp.lastName) : 'Unknown'}
                        secondary={`${formatDateTime(a.assignedAt)}${a.returnedAt ? ` → ${formatDateTime(a.returnedAt)}` : ' (active)'}`}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <AssignAssetDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        assetId={asset.id}
        assetTag={asset.assetTag}
      />
      <ReturnAssetDialog
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        assetId={asset.id}
        assetTag={asset.assetTag}
      />
      <AssetEditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        asset={asset}
        onDeleted={() => navigate(listPath)}
      />

      <Snackbar
        open={Boolean(warrantyToast)}
        autoHideDuration={6000}
        onClose={() => setWarrantyToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={warrantyToast?.severity || 'info'}
          onClose={() => setWarrantyToast(null)}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {warrantyToast?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
