import { useState } from 'react';
import {
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
import { createAsset as createAssetApi } from '../../services/api/assets';
import { lookupWarranty } from '../../services/api/warranty';
import type { AssetCategory, AssetStatus, LifecycleStage } from '../../types';
import { useAssetCategories } from '../../hooks/useAssetCategories';
import { safeRandomUUID } from '../../utils/uuid';

interface Props {
  open: boolean;
  onClose: () => void;
}

const defaultForm = {
  assetTag: '',
  name: '',
  category: 'laptop' as AssetCategory,
  manufacturer: '',
  model: '',
  serialNumber: '',
  status: 'in_stock' as AssetStatus,
  lifecycleStage: 'procurement' as LifecycleStage,
  purchaseDate: new Date().toISOString().split('T')[0],
  purchaseCost: 1299,
  currentValue: 1299,
  repairCost: 0,
  location: 'HQ',
  vendorId: '',
  warrantyExpiresAt: '',
  notes: '',
};

export function AssetFormDialog({ open, onClose }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const vendors = useAppSelector((s) => s.vendors.items);
  const { slugs, labelOf } = useAssetCategories();
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
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
        handleChange('warrantyExpiresAt', data.endDate);
        if (data.productName && !form.model) {
          handleChange('model', data.productName);
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

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.assetTag || !form.name || loading) return;
    setLoading(true);
    try {
      const created = await createAssetApi({
        id: safeRandomUUID(),
        tenantId: user!.tenantId,
        assetTag: form.assetTag.trim(),
        name: form.name.trim(),
        category: form.category,
        manufacturer: form.manufacturer.trim(),
        model: form.model.trim(),
        serialNumber: form.serialNumber.trim(),
        status: form.status,
        lifecycleStage: form.lifecycleStage,
        purchaseDate: form.purchaseDate,
        purchaseCost: form.purchaseCost,
        currentValue: form.currentValue,
        repairCost: form.repairCost,
        location: form.location.trim(),
        vendorId: form.vendorId,
        warrantyExpiresAt: form.warrantyExpiresAt,
        notes: form.notes,
        qrOrigin: window.location.origin,
        audit: {
          userId: user!.id,
          userName: `${user!.firstName} ${user!.lastName}`,
          action: 'CREATE',
          entityType: 'asset',
          entityId: 'new',
          entityLabel: form.assetTag,
          details: `Created ${form.name}`,
        },
      });
      await reloadFromApi(dispatch);
      setForm(defaultForm);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add New Asset</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="Asset Tag"
              value={form.assetTag}
              onChange={(e) => handleChange('assetTag', e.target.value)}
              placeholder="LAP-051"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="Name"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              label="Category"
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
            >
              {slugs.map((c) => (
                <MenuItem key={c} value={c}>
                  {labelOf(c)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Manufacturer"
              value={form.manufacturer}
              onChange={(e) => handleChange('manufacturer', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Model"
              value={form.model}
              onChange={(e) => handleChange('model', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Serial Number"
              value={form.serialNumber}
              onChange={(e) => handleChange('serialNumber', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Vendor"
              value={form.vendorId}
              onChange={(e) => handleChange('vendorId', e.target.value)}
            >
              <MenuItem value="">None</MenuItem>
              {vendors.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {v.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Purchase Cost (₹)"
              value={form.purchaseCost}
              onChange={(e) => {
                const cost = Number(e.target.value);
                handleChange('purchaseCost', cost);
                if (!form.currentValue || form.currentValue === form.purchaseCost) {
                  handleChange('currentValue', cost);
                }
              }}
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Current Value (₹)"
              value={form.currentValue}
              onChange={(e) => handleChange('currentValue', Number(e.target.value))}
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Repair Cost (₹)"
              value={form.repairCost}
              onChange={(e) => handleChange('repairCost', Number(e.target.value))}
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Purchase Date"
              InputLabelProps={{ shrink: true }}
              value={form.purchaseDate}
              onChange={(e) => handleChange('purchaseDate', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Warranty Expires"
              InputLabelProps={{ shrink: true }}
              value={form.warrantyExpiresAt}
              onChange={(e) => handleChange('warrantyExpiresAt', e.target.value)}
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
            <TextField
              fullWidth
              label="Location"
              value={form.location}
              onChange={(e) => handleChange('location', e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Notes"
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={!form.assetTag || !form.name}
          loading={loading}
          loadingLabel="Creating…"
        >
          Create Asset
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
