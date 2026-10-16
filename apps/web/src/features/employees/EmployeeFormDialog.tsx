import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Alert,
  Typography,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useAppDispatch, useAppSelector } from '../../hooks/storeHooks';
import { LoadingButton } from '../../components/Loader';
import { reloadFromApi } from '../../components/DataBootstrap';
import { createEmployee, updateEmployee as updateEmployeeApi } from '../../services/api/entities';
import { safeRandomUUID } from '../../utils/uuid';
import { DepartmentFormDialog } from '../departments/DepartmentFormDialog';
import type { Employee, EmployeeStatus } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  employee?: Employee;
}

export function EmployeeFormDialog({ open, onClose, employee }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const departments = useAppSelector((s) => s.departments.items);
  const [loading, setLoading] = useState(false);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [form, setForm] = useState({
    employeeNumber: '',
    firstName: '',
    lastName: '',
    joiningEmail: '',
    officialEmail: '',
    jobTitle: '',
    departmentId: '',
    status: 'active' as EmployeeStatus,
    //@ts-ignore
    hireDate: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && employee) {
      setForm({
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        joiningEmail: employee.joiningEmail || employee.email,
        officialEmail: employee.officialEmail ?? '',
        jobTitle: employee.jobTitle,
        departmentId: employee.departmentId ?? '',
        status: employee.status,
        hireDate: employee.hireDate,
      });
    } else if (open) {
      setForm({
        employeeNumber: '',
        firstName: '',
        lastName: '',
        joiningEmail: '',
        officialEmail: '',
        jobTitle: '',
        departmentId: departments[0]?.id ?? '',
        status: 'active',
        hireDate: new Date().toISOString().split('T')[0],
      });
    }
    setError(null);
  }, [open, employee, departments]);

  const handleSave = async () => {
    if (!user || loading || !form.firstName || !form.joiningEmail) return;
    setLoading(true);
    try {
      if (employee) {
        await updateEmployeeApi(employee.id, {
          employeeNumber: form.employeeNumber.trim() || undefined,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          joiningEmail: form.joiningEmail.trim().toLowerCase(),
          officialEmail: form.officialEmail.trim() || undefined,
          jobTitle: form.jobTitle.trim() || undefined,
          departmentId: form.departmentId.trim() || undefined,
          status: form.status,
          hireDate: form.hireDate || undefined,
        });
      } else {
        await createEmployee({
          ...form,
          joiningEmail: form.joiningEmail.trim().toLowerCase(),
          email: form.joiningEmail.trim().toLowerCase(),
          departmentId: form.departmentId.trim() || '',
          id: safeRandomUUID(),
        });
      }
      await reloadFromApi(dispatch);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  const signInEmail = form.officialEmail.trim() || form.joiningEmail.trim();

  return (
    <>
      <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{employee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mt: 1, mb: 1 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="First name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Primary / Joining email"
                type="email"
                value={form.joiningEmail}
                onChange={(e) => setForm({ ...form, joiningEmail: e.target.value })}
                helperText={
                  employee
                    ? 'Main contact or joining email. Sign-in uses this unless an official email is set below.'
                    : 'Use the email the employee provided when joining. They sign in with this until an official company email is assigned.'
                }
              />
            </Grid>

            {employee && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Official company email"
                  type="email"
                  value={form.officialEmail}
                  onChange={(e) => setForm({ ...form, officialEmail: e.target.value })}
                  helperText="When saved, this becomes the only sign-in email. The joining email loses portal access."
                />
              </Grid>
            )}

            {employee && signInEmail && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ py: 0.5 }}>
                  <Typography variant="body2">
                    Current sign-in email: <strong>{signInEmail}</strong>
                    {!form.officialEmail.trim() && ' (joining email until official email is set)'}
                  </Typography>
                </Alert>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Employee #"
                value={form.employeeNumber}
                onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Job title"
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  select
                  fullWidth
                  label="Department"
                  value={form.departmentId}
                  onChange={(e) => {
                    if (e.target.value === '__ADD_NEW__') {
                      setDeptDialogOpen(true);
                    } else {
                      setForm({ ...form, departmentId: e.target.value });
                    }
                  }}
                >
                  <MenuItem value="">
                    <em>None / Unassigned</em>
                  </MenuItem>
                  {form.departmentId && !departments.some((d) => d.id === form.departmentId) && (
                    <MenuItem value={form.departmentId}>
                      <em>Current ({form.departmentId})</em>
                    </MenuItem>
                  )}
                  {departments.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name}
                    </MenuItem>
                  ))}
                  <MenuItem value="__ADD_NEW__" sx={{ color: 'primary.main', fontWeight: 600 }}>
                    + Add New Department...
                  </MenuItem>
                </TextField>
                <Tooltip title="Add new department">
                  <IconButton
                    color="primary"
                    onClick={() => setDeptDialogOpen(true)}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1.1,
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Hire date"
                InputLabelProps={{ shrink: true }}
                value={form.hireDate}
                onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            onClick={() => void handleSave()}
            loading={loading}
            disabled={!form.firstName || !form.joiningEmail}
          >
            Save
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <DepartmentFormDialog
        open={deptDialogOpen}
        onClose={() => setDeptDialogOpen(false)}
        onSaved={(newDept) => {
          setForm((prev) => ({ ...prev, departmentId: newDept.id }));
        }}
      />
    </>
  );
}
