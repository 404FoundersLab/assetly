import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BusinessIcon from '@mui/icons-material/Business';
import { useAppSelector } from '../../hooks/storeHooks';
import { usePermissions } from '../../hooks/storeHooks';
import { PageHeader } from '../../components/PageHeader';
import { DepartmentFormDialog } from './DepartmentFormDialog';
import type { Department } from '../../types';

export function DepartmentsPage() {
  const departments = useAppSelector((s) => s.departments.items);
  const employees = useAppSelector((s) => s.employees.items);
  const { can } = usePermissions();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | undefined>();

  const countByDept = employees.reduce<Record<string, number>>((acc, e) => {
    acc[e.departmentId] = (acc[e.departmentId] ?? 0) + 1;
    return acc;
  }, {});

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setFormOpen(true);
  };

  return (
    <Box>
      <PageHeader
        title="Departments"
        subtitle="Organizational structure and cost centers"
        breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Departments' }]}
        actions={
          can('employee:write') ? (
            <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
              Add Department
            </Button>
          ) : undefined
        }
      />

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <BusinessIcon fontSize="inherit" sx={{ opacity: 0.6 }} />
                    Department
                  </Box>
                </TableCell>
                <TableCell>Cost Center</TableCell>
                <TableCell align="right">Employees</TableCell>
                {can('employee:write') && <TableCell align="center">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id} hover>
                  <TableCell>
                    <Box component="span" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {dept.name}
                    </Box>
                  </TableCell>
                  <TableCell>{dept.costCenter}</TableCell>
                  <TableCell align="right">{countByDept[dept.id] ?? 0}</TableCell>
                  {can('employee:write') && (
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => openEdit(dept)} aria-label="Edit department">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <DepartmentFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        department={editing}
      />
    </Box>
  );
}
