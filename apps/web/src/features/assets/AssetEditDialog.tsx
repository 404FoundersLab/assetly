import { useEffect, useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Stack,
  Alert,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import LaunchIcon from '@mui/icons-material/Launch';
import { useAppDispatch, useAppSelector } from '../../hooks/storeHooks';

import { LoadingButton } from '../../components/Loader';
import { reloadFromApi } from '../../components/DataBootstrap';

import { patchAsset, deleteAsset as deleteAssetApi } from '../../services/api/assets';
import { lookupWarranty } from '../../services/api/warranty';
import { STATUS_LABELS } from '../../data/demoData';
import { useAssetCategories } from '../../hooks/useAssetCategories';
import { LIFECYCLE_LABELS } from '../../utils/assetUtils';
import type { Asset } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  asset: Asset;
  onDeleted?: () => void;
}

export function AssetEditDialog({ open, onClose, asset, onDeleted }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const vendors = useAppSelector((s) => s.vendors.items);
  const { slugs, labelOf } = useAssetCategories();
  const [form, setForm] = useState(asset);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [syncingWarranty, setSyncingWarranty] = useState(false);
  const [warrantyMsg, setWarrantyMsg] = useState<{ text: string; severity: 'success' | 'info' | 'error' } | null>(null);

  const isLaptop = form.category?.toLowerCase() === 'laptop';
  const mfg = (form.manufacturer || '').toLowerCase();
  const isLenovo = isLaptop && (mfg.includes('lenovo') || form.model?.toLowerCase().includes('thinkpad') || form.serialNumber?.startsWith('1S') || !form.manufacturer);
  const isDell = isLaptop && (mfg.includes('dell') || (form.serialNumber?.length === 7 && /^[A-Z0-9]{7}$/i.test(form.serialNumber ?? '')) || !form.manufacturer);

  const handleFetchLenovo = async () => {
    if (!form.serialNumber?.trim()) {
      setWarrantyMsg({ text: 'Please enter a Serial Number first', severity: 'error' });
      return;
    }
    setSyncingWarranty(true);
    setWarrantyMsg(null);
    try {
      const data = await lookupWarranty(form.serialNumber, 'lenovo');
      if (data.endDate) {
        set('warrantyExpiresAt', data.endDate);
        if (data.productName && !form.model) {
          set('model', data.productName);
        }
        setWarrantyMsg({
          text: `Fetched! Warranty: ${data.endDate} (${data.planName || 'Active'}). You can still edit this date manually.`,
          severity: 'success',
        });
      } else {
        setWarrantyMsg({ text: 'Lenovo responded but no expiration date found.', severity: 'info' });
      }
    } catch (err: any) {
      setWarrantyMsg({ text: err?.message || 'Failed to fetch Lenovo warranty', severity: 'error' });
    } finally {
      setSyncingWarranty(false);
    }
  };

  const handleOpenDell = () => {
    if (form.serialNumber?.trim()) {
      navigator.clipboard.writeText(form.serialNumber.trim());
      setWarrantyMsg({
        text: `Service Tag "${form.serialNumber.trim()}" copied to clipboard! Paste it into Dell Support Services.`,
        severity: 'info',
      });
    }
    window.open('https://www.dell.com/support/contractservices/en-in', '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    if (open) {
      setForm(asset);
      setConfirmDelete(false);
      setWarrantyMsg(null);
    }
  }, [open, asset]);

  const set = (field: keyof Asset, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user || loading) return;
    setLoading(true);
    const userName = `${user.firstName} ${user.lastName}`;
    try {
      await patchAsset(asset.id, {
        ...form,
        audit: {
          userId: user.id,
          userName,
          action: 'UPDATE',
          entityType: 'asset',
          entityId: asset.id,
          entityLabel: form.assetTag,
          details: `Updated ${form.name}`,
        },
      });
      await reloadFromApi(dispatch);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || loading) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setLoading(true);
    const userName = `${user.firstName} ${user.lastName}`;
    try {
      await deleteAssetApi(asset.id);
      await reloadFromApi(dispatch);
      onClose();
      onDeleted?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Asset — {asset.assetTag}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Asset Tag" value={form.assetTag} onChange={(e) => set('assetTag', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="Category" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {slugs.map((k) => (
                <MenuItem key={k} value={k}>{labelOf(k)}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="Status" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="Lifecycle Stage" value={form.lifecycleStage} onChange={(e) => set('lifecycleStage', e.target.value)}>
              {Object.entries(LIFECYCLE_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Manufacturer" value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Model" value={form.model} onChange={(e) => set('model', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Serial Number" value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Location" value={form.location} onChange={(e) => set('location', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="Vendor" value={form.vendorId} onChange={(e) => set('vendorId', e.target.value)}>
              {vendors.map((v) => (
                <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="number" label="Purchase Cost" value={form.purchaseCost} onChange={(e) => set('purchaseCost', Number(e.target.value))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="number" label="Current Value" value={form.currentValue} onChange={(e) => set('currentValue', Number(e.target.value))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Purchase Date"
              InputLabelProps={{ shrink: true }}
              value={form.purchaseDate ? form.purchaseDate.split('T')[0] : ''}
              onChange={(e) => set('purchaseDate', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Warranty Expires"
              InputLabelProps={{ shrink: true }}
              value={form.warrantyExpiresAt ? form.warrantyExpiresAt.split('T')[0] : ''}
              onChange={(e) => set('warrantyExpiresAt', e.target.value)}
            />
          </Grid>
          {isLaptop && (isLenovo || isDell) && (
            <Grid item xs={12}>
              <Stack direction="row" spacing={1} alignItems="center">
                {isLenovo && (
                  <LoadingButton
                    size="small"
                    variant="outlined"
                    startIcon={<SyncIcon />}
                    loading={syncingWarranty}
                    onClick={handleFetchLenovo}
                  >
                    Fetch Lenovo Warranty
                  </LoadingButton>
                )}
                {isDell && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<LaunchIcon />}
                    onClick={handleOpenDell}
                  >
                    Check Dell Support ↗
                  </Button>
                )}
              </Stack>
              {warrantyMsg && (
                <Alert severity={warrantyMsg.severity} sx={{ mt: 1, py: 0 }} onClose={() => setWarrantyMsg(null)}>
                  {warrantyMsg.text}
                </Alert>
              )}
            </Grid>
          )}
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={2} label="Notes" value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <LoadingButton color="error" variant={confirmDelete ? 'contained' : 'outlined'} onClick={() => void handleDelete()} loading={loading} disabled={loading}>
          {confirmDelete ? 'Confirm delete' : 'Delete'}
        </LoadingButton>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <LoadingButton variant="contained" onClick={() => void handleSave()} loading={loading} loadingLabel="Saving…" disabled={!form.assetTag || !form.name}>
            Save changes
          </LoadingButton>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
