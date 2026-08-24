import {
  Autocomplete,
  Avatar,
  Box,
  Chip,
  TextField,
  Typography,
} from '@mui/material';
import { useEmployeeOptions } from '../hooks/useEmployees';
import { getEmployeeName } from '../utils/format';

interface EmployeeMultiSelectProps {
  value: string[];
  onChange: (employeeIds: string[]) => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/** Pick employees from centralized Redux store (backend sync). */
export function EmployeeMultiSelect({
  value,
  onChange,
  label = 'Employees',
  helperText = 'Select from your organization directory',
  disabled = false,
}: EmployeeMultiSelectProps) {
  const options = useEmployeeOptions();
  const selected = options.filter((o) => value.includes(o.id));

  return (
    <Autocomplete
      multiple
      disabled={disabled}
      options={options}
      value={selected}
      onChange={(_, newValue) => onChange(newValue.map((o) => o.id))}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>
            {initials(option.employee.firstName, option.employee.lastName)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {option.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {option.email}{option.jobTitle ? ` · ${option.jobTitle}` : ''}
            </Typography>
          </Box>
        </Box>
      )}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip
            {...getTagProps({ index })}
            key={option.id}
            avatar={
              <Avatar sx={{ width: 24, height: 24, fontSize: 10 }}>
                {initials(option.employee.firstName, option.employee.lastName)}
              </Avatar>
            }
            label={option.label}
            size="small"
          />
        ))
      }
      renderInput={(params) => (
        <TextField {...params} label={label} helperText={helperText} placeholder="Search employees…" />
      )}
      noOptionsText="No employees found — add them in Employees module first"
    />
  );
}

/** Map stored participant strings (legacy names or IDs) to display labels. */
export function participantLabels(participants: string[] | undefined, employees: { id: string; firstName: string; lastName: string }[]): string[] {
  if (!participants?.length) return [];
  return participants.map((p) => {
    const match = employees.find((e) => e.id === p);
    if (match) return getEmployeeName(match.firstName, match.lastName);
    return p;
  });
}
