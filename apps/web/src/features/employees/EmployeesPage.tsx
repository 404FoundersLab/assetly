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
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Checkbox,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import InventoryIcon from '@mui/icons-material/Inventory2';
import PeopleIcon from '@mui/icons-material/People';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector, usePermissions } from '../../hooks/storeHooks';
import { PageHeader } from '../../components/PageHeader';
import { SearchField } from '../../components/SearchField';
import { EmptyState } from '../../components/EmptyState';
import { getEmployeeName } from '../../utils/format';
import { employeeMatchesSearch } from '../../utils/search';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import { deleteEmployee, deleteEmployees, deleteAllEmployees } from '../../services/api/entities';
import { reloadFromApi } from '../../components/DataBootstrap';
import type { Employee } from '../../types';

export function EmployeesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const isHR = location.pathname.startsWith('/hr');
  const employees = useAppSelector((s) => s.employees.items);
  const departments = useAppSelector((s) => s.departments.items);
  const assets = useAppSelector((s) => s.assets.items);
  const { can, role } = usePermissions();
  const canManage =
    can('employee:write') ||
    role === 'tenant_admin' ||
    role === 'platform_admin' ||
    role === 'it_admin' ||
    role === 'hr_admin';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);

  // Selection & delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const getDetailRoute = (empId: string) => (isHR ? `/hr/employees/${empId}` : `/employees/${empId}`);

  const paginated = filteredEmployees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const isAllPageSelected = paginated.length > 0 && paginated.every((e) => selectedIds.has(e.id));
  const isSomePageSelected = paginated.some((e) => selectedIds.has(e.id)) && !isAllPageSelected;

  const handleToggleSelectAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        paginated.forEach((e) => next.delete(e.id));
      } else {
        paginated.forEach((e) => next.add(e.id));
      }
      return next;
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds(new Set(filteredEmployees.map((e) => e.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  return (
    <Box>
      <PageHeader
        title="Employees"
        subtitle={`${filteredEmployees.length} employees · asset allocation tracking`}
        breadcrumbs={isHR ? [{ label: 'HR Portal', to: '/hr' }, { label: 'Employees' }] : [{ label: 'Dashboard', to: '/' }, { label: 'Employees' }]}
        actions={
          canManage ? (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {employees.length > 0 && (
                <Button
                  startIcon={<DeleteSweepIcon />}
                  variant="outlined"
                  color="error"
                  onClick={() => setDeleteAllOpen(true)}
                >
                  Delete All ({employees.length})
                </Button>
              )}
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => {
                  setEditingEmployee(undefined);
                  setFormOpen(true);
                }}
              >
                Add Employee
              </Button>
            </Box>
          ) : undefined
        }
      />

      <Card sx={{ mb: 2, p: 2 }}>
        <SearchField
          placeholder="Search name, email, department, job title..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          sx={{ width: '100%', maxWidth: 480 }}
        />
      </Card>

      {/* Selected Action Toolbar */}
      {selectedIds.size > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            mb: 2,
            bgcolor: 'primary.50',
            border: 1,
            borderColor: 'primary.200',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`${selectedIds.size} employee(s) selected`}
              color="primary"
              size="small"
              sx={{ fontWeight: 700 }}
            />
            {selectedIds.size < filteredEmployees.length && (
              <Button size="small" onClick={handleSelectAllFiltered}>
                Select all {filteredEmployees.length} employees
              </Button>
            )}
            <Button size="small" color="inherit" onClick={handleClearSelection}>
              Clear selection
            </Button>
          </Box>

          {canManage && (
            <Button
              variant="contained"
              color="error"
              size="small"
              startIcon={<DeleteSweepIcon />}
              onClick={() => {
                setEmployeeToDelete(null);
                setDeleteConfirmOpen(true);
              }}
            >
              Delete {selectedIds.size} Selected
            </Button>
          )}
        </Paper>
      )}

      <Card>
        {employees.length === 0 ? (
          <EmptyState
            icon={<PeopleIcon />}
            title="No employees yet"
            description="Employees are created automatically when you import assets with assignees from Excel, or click 'Add Employee'."
          />
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            icon={<FilterAltOffIcon />}
            title="No matching employees"
            description="Try a different search term."
            action={{ label: 'Clear search', onClick: () => setSearch(''), icon: <FilterAltOffIcon /> }}
          />
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {canManage && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={isSomePageSelected}
                          checked={isAllPageSelected}
                          onChange={handleToggleSelectAllPage}
                          inputProps={{ 'aria-label': 'Select all employees on page' }}
                        />
                      </TableCell>
                    )}
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
                  {paginated.map((emp) => {
                    const isSelected = selectedIds.has(emp.id);
                    return (
                      <TableRow
                        key={emp.id}
                        hover
                        selected={isSelected}
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(getDetailRoute(emp.id))}
                      >
                        {canManage && (
                          <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleToggleSelect(emp.id)}
                              inputProps={{ 'aria-label': `Select employee ${emp.employeeNumber}` }}
                            />
                          </TableCell>
                        )}
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
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            <Tooltip title="View assigned assets">
                              <IconButton
                                size="small"
                                onClick={() => navigate(getDetailRoute(emp.id))}
                              >
                                <InventoryIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {canManage && (
                              <>
                                <Tooltip title="Edit employee">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => {
                                      setEditingEmployee(emp);
                                      setFormOpen(true);
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete employee">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      setEmployeeToDelete(emp);
                                      setDeleteConfirmOpen(true);
                                    }}
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredEmployees.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </Card>

      <EmployeeFormDialog
        open={formOpen}
        employee={editingEmployee}
        onClose={() => {
          setFormOpen(false);
          setEditingEmployee(undefined);
        }}
      />

      {/* Delete Single or Selected Employees Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !isDeleting && setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteOutlineIcon />
          {employeeToDelete ? 'Delete Employee' : `Delete ${selectedIds.size} Selected Employee(s)`}
        </DialogTitle>
        <DialogContent>
          {employeeToDelete ? (
            <>
              <Typography variant="body2">
                Are you sure you want to delete{' '}
                <strong>{getEmployeeName(employeeToDelete.firstName, employeeToDelete.lastName)}</strong>?
              </Typography>
              {(assetCountByEmployee[employeeToDelete.id] ?? 0) > 0 && (
                <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1 }}>
                  Warning: This employee currently has {assetCountByEmployee[employeeToDelete.id]} assigned asset(s). Those assets will become unassigned.
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="body2">
              Are you sure you want to permanently delete <strong>{selectedIds.size}</strong> selected employee(s)? Any assigned assets will become unassigned.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={isDeleting}
            onClick={async () => {
              setIsDeleting(true);
              try {
                if (employeeToDelete) {
                  await deleteEmployee(employeeToDelete.id);
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(employeeToDelete.id);
                    return next;
                  });
                } else {
                  await deleteEmployees(Array.from(selectedIds));
                  setSelectedIds(new Set());
                }
                await reloadFromApi(dispatch);
                setDeleteConfirmOpen(false);
                setEmployeeToDelete(null);
              } finally {
                setIsDeleting(false);
              }
            }}
          >
            {isDeleting ? 'Deleting…' : employeeToDelete ? 'Delete Employee' : `Delete ${selectedIds.size} Employees`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete All Employees Confirmation Dialog */}
      <Dialog
        open={deleteAllOpen}
        onClose={() => !isDeleting && setDeleteAllOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteSweepIcon /> Delete All Employees
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Are you sure you want to delete all <strong>{employees.length}</strong> employees from the database?
          </Typography>
          <Typography variant="caption" color="text.secondary">
            This will unlink all assets and clear employee records for a fresh start. Admin accounts are preserved.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={isDeleting}
            onClick={async () => {
              setIsDeleting(true);
              try {
                await deleteAllEmployees();
                await reloadFromApi(dispatch);
                setSelectedIds(new Set());
                setDeleteAllOpen(false);
              } finally {
                setIsDeleting(false);
              }
            }}
          >
            {isDeleting ? 'Deleting…' : 'Delete All Employees'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
