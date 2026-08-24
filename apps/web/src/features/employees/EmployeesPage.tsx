import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import InventoryIcon from '@mui/icons-material/Inventory2';
import PeopleIcon from '@mui/icons-material/People';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/storeHooks';
import { usePermissions } from '../../hooks/storeHooks';
import { PageHeader } from '../../components/PageHeader';
import { SearchField } from '../../components/SearchField';
import { EmptyState } from '../../components/EmptyState';
import { getEmployeeName } from '../../utils/format';
import { employeeMatchesSearch } from '../../utils/search';
import { EmployeeFormDialog } from './EmployeeFormDialog';

export function EmployeesPage() {
  const navigate = useNavigate();
  const employees = useAppSelector((s) => s.employees.items);
  const departments = useAppSelector((s) => s.departments.items);
  const assets = useAppSelector((s) => s.assets.items);
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const deptMap = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.name])),
    [departments],
  );

  const filteredEmployees = useMemo(
    () =>
      employees.filter((emp) =>
        employeeMatchesSearch(emp, search, deptMap[emp.departmentId]),
      ),
    [employees, search, deptMap],
  );

  const assetCountByEmployee = useMemo(() => {
    const map: Record<string, number> = {};
    assets.forEach((a) => {
      if (a.assignedEmployeeId) {
        map[a.assignedEmployeeId] = (map[a.assignedEmployeeId] ?? 0) + 1;
      }
    });
    return map;
  }, [assets]);

  return (
    <Box>
      <PageHeader
        title="Employees"
        subtitle={`${filteredEmployees.length} employees · asset allocation tracking`}
        breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Employees' }]}
        actions={
          can('employee:write') ? (
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setFormOpen(true)}>
              Add Employee
            </Button>
          ) : undefined
        }
      />

      <Card sx={{ mb: 2, p: 2 }}>
        <SearchField
          placeholder="Search name, email, department, job title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: '100%', maxWidth: 480 }}
        />
      </Card>

      <Card>
        {employees.length === 0 ? (
          <EmptyState
            icon={<PeopleIcon />}
            title="No employees yet"
            description="Employees are created automatically when you import assets with assignees from Excel."
          />
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            icon={<FilterAltOffIcon />}
            title="No matching employees"
            description="Try a different search term."
            action={{ label: 'Clear search', onClick: () => setSearch(''), icon: <FilterAltOffIcon /> }}
          />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee #</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Job Title</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Assets</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEmployees.map((emp) => (
                  <TableRow
                    key={emp.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/employees/${emp.id}`)}
                  >
                    <TableCell>{emp.employeeNumber}</TableCell>
                    <TableCell>
                      <Box component="span" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {getEmployeeName(emp.firstName, emp.lastName)}
                      </Box>
                    </TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>{deptMap[emp.departmentId] ?? '—'}</TableCell>
                    <TableCell>{emp.jobTitle}</TableCell>
                    <TableCell>
                      <Chip
                        label={emp.status}
                        size="small"
                        color={emp.status === 'active' ? 'success' : 'default'}
                        variant="filled"
                        sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={assetCountByEmployee[emp.id] ?? 0}
                        size="small"
                        variant={assetCountByEmployee[emp.id] ? 'filled' : 'outlined'}
                        color={assetCountByEmployee[emp.id] ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="View assigned assets">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/employees/${emp.id}`)}
                        >
                          <InventoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <EmployeeFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </Box>
  );
}
