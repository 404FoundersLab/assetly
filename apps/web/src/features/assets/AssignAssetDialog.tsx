import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../hooks/storeHooks';

import { getEmployeeName } from '../../utils/format';
import { LoadingButton } from '../../components/Loader';
import { reloadFromApi } from '../../components/DataBootstrap';

import { assignAssetApi, returnAssetApi } from '../../services/api/assets';

interface AssignProps {
  open: boolean;
  onClose: () => void;
  assetId: string;
  assetTag: string;
}

export function AssignAssetDialog({ open, onClose, assetId, assetTag }: AssignProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const employees = useAppSelector((s) => s.employees.items);
  const [employeeId, setEmployeeId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    if (!employeeId || !user || loading) return;
    const emp = employees.find((e) => e.id === employeeId)!;
    const assignedBy = `${user.firstName} ${user.lastName}`;
    setLoading(true);
    try {
      await assignAssetApi({
        assetId,
        employeeId,
        assignedBy,
        notes,
        audit: {
          userId: user.id,
          userName: assignedBy,
          action: 'ASSIGN',
          entityType: 'asset',
          entityId: assetId,
          entityLabel: assetTag,
          details: `Assigned to ${getEmployeeName(emp.firstName, emp.lastName)}`,
        },
      });
      await reloadFromApi(dispatch);
      setEmployeeId('');
      setNotes('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign Asset {assetTag}</DialogTitle>
      <DialogContent>
        <TextField
          select
          fullWidth
          label="Employee"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          sx={{ mt: 1, mb: 2 }}
        >
          {employees
            .filter((e) => e.status === 'active')
            .map((e) => (
              <MenuItem key={e.id} value={e.id}>
                {getEmployeeName(e.firstName, e.lastName)} ({e.employeeNumber})
              </MenuItem>
            ))}
        </TextField>
        <TextField
          fullWidth
          multiline
          rows={2}
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          onClick={() => void handleAssign()}
          disabled={!employeeId}
          loading={loading}
          loadingLabel="Assigning…"
        >
          Assign
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

interface ReturnProps {
  open: boolean;
  onClose: () => void;
  assetId: string;
  assetTag: string;
}

export function ReturnAssetDialog({ open, onClose, assetId, assetTag }: ReturnProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [condition, setCondition] = useState('Good condition');
  const [loading, setLoading] = useState(false);

  const handleReturn = async () => {
    if (!user || loading) return;
    const performedBy = `${user.firstName} ${user.lastName}`;
    setLoading(true);
    try {
      await returnAssetApi({
        assetId,
        performedBy,
        returnCondition: condition,
        audit: {
          userId: user.id,
          userName: performedBy,
          action: 'RETURN',
          entityType: 'asset',
          entityId: assetId,
          entityLabel: assetTag,
          details: `Returned — ${condition}`,
        },
      });
      await reloadFromApi(dispatch);
      setCondition('Good condition');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Return Asset {assetTag}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Return Condition"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          color="warning"
          onClick={() => void handleReturn()}
          loading={loading}
          loadingLabel="Processing…"
        >
          Process Return
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
