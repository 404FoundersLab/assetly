import { useEffect, useState } from 'react';
import {
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
import { isApiEnabled } from '../../services/api/config';
import { createDepartment, updateDepartment as updateDepartmentApi } from '../../services/api/entities';
import type { Department } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  department?: Department;
}

export function DepartmentFormDialog({ open, onClose, department }: Props) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
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
  }, [open, department]);

  const handleSave = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      const payload = { name: name.trim(), costCenter: costCenter.trim() };
      if (department) await updateDepartmentApi(department.id, payload);
      else await createDepartment({ ...payload, id: crypto.randomUUID() });
      await reloadFromApi(dispatch);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{department ? 'Edit Department' : 'Add Department'}</DialogTitle>
      <DialogContent>
        <TextField fullWidth label="Name" value={name} onChange={(e) => setName(e.target.value)} sx={{ mt: 1, mb: 2 }} />
        <TextField fullWidth label="Cost center" value={costCenter} onChange={(e) => setCostCenter(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <LoadingButton variant="contained" onClick={() => void handleSave()} loading={loading} disabled={!name.trim()}>Save</LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
