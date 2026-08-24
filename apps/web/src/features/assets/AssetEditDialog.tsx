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
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../hooks/storeHooks';

import { LoadingButton } from '../../components/Loader';
import { reloadFromApi } from '../../components/DataBootstrap';

import { patchAsset, deleteAsset as deleteAssetApi } from '../../services/api/assets';
import { CATEGORY_LABELS, STATUS_LABELS } from '../../data/demoData';
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
  const [form, setForm] = useState(asset);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(asset);
      setConfirmDelete(false);
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
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
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
            <TextField fullWidth type="number" label="Repair Charges" value={form.repairCost} onChange={(e) => set('repairCost', Number(e.target.value))} />
          </Grid>
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
