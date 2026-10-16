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
import { createDepartment, updateDepartment as updateDepartmentApi } from '../../services/api/entities';
import type { Department } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  department?: Department;
  onSaved?: (dept: Department) => void;
}

export function DepartmentFormDialog({ open, onClose, department, onSaved }: Props) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [costCenter, setCostCenter] = useState('');

  useEffect(() => {
    if (open && department) {
      setName(department.name);
      setCostCenter(department.costCenter);
    } else if (open) {
      setName('');
      setCostCenter('');
    }
    setError(null);
  }, [open, department]);

  const handleSave = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const payload = { name: name.trim(), costCenter: costCenter.trim() };
      let savedDept: Department;
      if (department) {
        savedDept = await updateDepartmentApi(department.id, payload);
      } else {
        savedDept = await createDepartment(payload);
      }
      await reloadFromApi(dispatch);
      if (onSaved) onSaved(savedDept);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{department ? 'Edit Department' : 'Add Department'}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mt: 1, mb: 1 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <TextField
          fullWidth
          required
          label="Department name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mt: 1, mb: 2 }}
          autoFocus
        />
        <TextField
          fullWidth
          label="Cost center"
          value={costCenter}
          onChange={(e) => setCostCenter(e.target.value)}
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
