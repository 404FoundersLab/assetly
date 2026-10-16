import { useEffect, useState } from 'react';
import {
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import { useAppDispatch } from '../../hooks/storeHooks';
import { LoadingButton } from '../../components/Loader';
import { reloadFromApi } from '../../components/DataBootstrap';
import { createVendor, updateVendor as updateVendorApi } from '../../services/api/entities';
import { safeRandomUUID } from '../../utils/uuid';
import type { Vendor } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  vendor?: Vendor;
}

export function VendorFormDialog({ open, onClose, vendor }: Props) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    if (open && vendor) {
      setName(vendor.name);
      setContactEmail(vendor.contactEmail);
      setWebsite(vendor.website);
    } else if (open) {
      setName('');
      setContactEmail('');
      setWebsite('');
    }
    setError(null);
  }, [open, vendor]);

  const handleSave = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const payload = { name: name.trim(), contactEmail: contactEmail.trim(), website: website.trim() };
      if (vendor) await updateVendorApi(vendor.id, payload);
      else await createVendor({ ...payload, id: safeRandomUUID() });
      await reloadFromApi(dispatch);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vendor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{vendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mt: 1, mb: 1 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <TextField
          fullWidth
          required
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mt: 1, mb: 2 }}
          autoFocus
        />
        <TextField
          fullWidth
          label="Contact email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          onClick={() => void handleSave()}
          loading={loading}
          disabled={!name.trim()}
        >
          Save
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
