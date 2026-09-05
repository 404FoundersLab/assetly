import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  MenuItem,
} from '@mui/material';
import { useAppDispatch } from '../../hooks/storeHooks';
import { LoadingButton } from '../../components/Loader';
import { reloadFromApi } from '../../components/DataBootstrap';
import { createAssetCategory, updateAssetCategory } from '../../services/api/entities';
import { slugifyDeviceType } from '../../constants/deviceTypes';
import { DEVICE_FAMILIES, DEVICE_FAMILY_LABELS } from '../../constants/deviceFamilies';
import type { AssetDeviceType, DeviceFamily } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  deviceType?: AssetDeviceType;
}

export function DeviceTypeFormDialog({ open, onClose, deviceType }: Props) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [label, setLabel] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [showInRequests, setShowInRequests] = useState(false);
  const [family, setFamily] = useState<DeviceFamily>('it_asset');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (deviceType) {
      setLabel(deviceType.label);
      setSlug(deviceType.slug);
      setSlugTouched(true);
      setShowInRequests(deviceType.showInRequests);
      setFamily(deviceType.family);
      setIsActive(deviceType.isActive);
    } else {
      setLabel('');
      setSlug('');
      setSlugTouched(false);
      setShowInRequests(false);
      setFamily('it_asset');
      setIsActive(true);
    }
  }, [open, deviceType]);

  const handleLabel = (value: string) => {
    setLabel(value);
    if (!deviceType && !slugTouched) setSlug(slugifyDeviceType(value));
  };

  const handleSave = async () => {
    if (!label.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        label: label.trim(),
        slug: slugifyDeviceType(slug || label),
        showInRequests,
        family,
        isPeripheral: family === 'peripheral',
        isActive,
      };
      if (deviceType) await updateAssetCategory(deviceType.id, payload);
      else await createAssetCategory(payload);
      await reloadFromApi(dispatch);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save device type');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{deviceType ? 'Edit device type' : 'Add device type'}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Name"
          value={label}
          onChange={(e) => handleLabel(e.target.value)}
          sx={{ mt: 1, mb: 2 }}
          placeholder="e.g. Electronic Shelf Label"
        />
        <TextField
          fullWidth
          label="Code"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          sx={{ mb: 2 }}
          helperText="Used on assets and imports. Lowercase, no spaces."
          disabled={Boolean(deviceType)}
        />
        <TextField
          select
          fullWidth
          label="Inventory menu"
          value={family}
          onChange={(e) => setFamily(e.target.value as DeviceFamily)}
          sx={{ mb: 1 }}
          helperText="Which sidebar list this type appears in."
        >
          {DEVICE_FAMILIES.map((f) => (
            <MenuItem key={f} value={f}>
              {DEVICE_FAMILY_LABELS[f]}
            </MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          control={<Switch checked={showInRequests} onChange={(e) => setShowInRequests(e.target.checked)} />}
          label="Show in employee device requests"
        />
        {deviceType && (
          <FormControlLabel
            control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
            label="Active"
          />
        )}
        {error ? (
          <Box component="p" sx={{ color: 'error.main', typography: 'body2', mt: 1, mb: 0 }}>
            {error}
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <LoadingButton variant="contained" onClick={() => void handleSave()} loading={loading} disabled={!label.trim()}>
          Save
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
