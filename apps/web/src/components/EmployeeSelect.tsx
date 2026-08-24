import { MenuItem, TextField, type TextFieldProps } from '@mui/material';
import { useAppSelector } from '../hooks/storeHooks';
import { getEmployeeName } from '../utils/format';

interface EmployeeSelectProps {
  value: string;
  onChange: (employeeId: string) => void;
  label?: string;
  /** When true, only active employees appear (same as Assign Asset dialog). */
  activeOnly?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  sx?: TextFieldProps['sx'];
}

/** Single employee picker — same Redux source as Assets (`employeesSlice` + `/api/sync`). */
export function EmployeeSelect({
  value,
  onChange,
  label = 'Employee',
  activeOnly = false,
  required = false,
  fullWidth = true,
  disabled = false,
  sx,
}: EmployeeSelectProps) {
  const employees = useAppSelector((s) => s.employees.items);
  const options = activeOnly ? employees.filter((e) => e.status === 'active') : employees;

  return (
    <TextField
      select
      fullWidth={fullWidth}
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={disabled}
      sx={sx}
    >
      <MenuItem value="">
        <em>Select employee…</em>
      </MenuItem>
      {options.map((e) => (
        <MenuItem key={e.id} value={e.id}>
          {getEmployeeName(e.firstName, e.lastName)}
          {e.employeeNumber ? ` (${e.employeeNumber})` : ''}
        </MenuItem>
      ))}
    </TextField>
  );
}
