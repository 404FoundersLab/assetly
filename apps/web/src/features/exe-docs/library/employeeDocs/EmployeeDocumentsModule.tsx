import { useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined';
import SearchIcon from '@mui/icons-material/Search';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import { useAppSelector } from '../../../../hooks/storeHooks';
import { getEmployeeName } from '../../../../utils/format';
import { employeeMatchesSearch } from '../../../../utils/search';
import { getRoleLabel } from '../../../../utils/userDisplay';
import type { UserRole } from '../../../../types';
import { useEmployeeDocuments } from './useEmployeeDocuments';
import { UploadEmployeeDocumentDialog } from './UploadEmployeeDocumentDialog';
import type { EmployeeDocStatus, EmployeeDocument } from './types';

const STATUS_TABS: { value: EmployeeDocStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Confidential', label: 'Confidential' },
];

function statusChipColor(status: EmployeeDocStatus): 'success' | 'warning' | 'info' | 'default' {
  if (status === 'Approved') return 'success';
  if (status === 'Draft') return 'warning';
  if (status === 'Confidential') return 'info';
  return 'default';
}

function formatDate(iso: string): string {
  if (iso === 'Today' || iso === 'Yesterday' || iso.includes('ago')) return iso;
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function DocumentRow({
  doc,
  onDelete,
}: {
  doc: EmployeeDocument;
  onDelete: (id: string) => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box
        sx={{
          p: 1.25,
          borderRadius: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
        }}
      >
        <DescriptionOutlinedIcon fontSize="small" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {doc.title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {doc.category} · {doc.fileName ?? doc.fileType} · {formatDate(doc.updatedAt)}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
          {doc.accessRoles.map((r) => (
            <Chip key={r} label={getRoleLabel(r as UserRole) || r} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
          ))}
        </Stack>
      </Box>
      <Chip label={doc.status} size="small" color={statusChipColor(doc.status)} variant="outlined" />
      <Tooltip title="Remove">
        <IconButton size="small" color="error" onClick={() => onDelete(doc.id)}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

export function EmployeeDocumentsModule() {
  const theme = useTheme();
  const employees = useAppSelector((s) => s.employees.items);
  const departments = useAppSelector((s) => s.departments.items);
  const deptMap = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.name])),
    [departments],
  );

  const { countsByEmployee, addDocument, deleteDocument, getForEmployee, totalCount, draftCount } =
    useEmployeeDocuments(employees);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [statusTab, setStatusTab] = useState<EmployeeDocStatus | 'all'>('all');
  const [uploadOpen, setUploadOpen] = useState(false);

  const filteredEmployees = useMemo(
    () =>
      employees
        .filter((e) => employeeMatchesSearch(e, employeeSearch, deptMap[e.departmentId]))
        .sort((a, b) =>
          getEmployeeName(a.firstName, a.lastName).localeCompare(getEmployeeName(b.firstName, b.lastName)),
        ),
    [employees, employeeSearch, deptMap],
  );

  const effectiveEmployeeId = selectedEmployeeId ?? filteredEmployees[0]?.id ?? null;
  const selectedEmployee = employees.find((e) => e.id === effectiveEmployeeId);

  const employeeDocs = useMemo(() => {
    if (!effectiveEmployeeId) return [];
    const docs = getForEmployee(effectiveEmployeeId, statusTab);
    const q = docSearch.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q),
    );
  }, [effectiveEmployeeId, statusTab, docSearch, getForEmployee]);

  if (employees.length === 0) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        No employees in the directory yet. Add employees in the <strong>Employees</strong> module (same list used for asset assignments) — documents will link to them automatically.
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      {/* Summary strip */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Card variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <BadgeOutlinedIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={800}>{employees.length}</Typography>
              <Typography variant="caption" color="text.secondary">Employees in directory</Typography>
            </Box>
          </Stack>
        </Card>
        <Card variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <FolderSharedOutlinedIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={800}>{totalCount}</Typography>
              <Typography variant="caption" color="text.secondary">Total documents</Typography>
            </Box>
          </Stack>
        </Card>
        <Card variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <DescriptionOutlinedIcon color="warning" />
            <Box>
              <Typography variant="h6" fontWeight={800}>{draftCount}</Typography>
              <Typography variant="caption" color="text.secondary">Pending approval</Typography>
            </Box>
          </Stack>
        </Card>
      </Stack>

      <Card
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '280px 1fr' },
            minHeight: 480,
          }}
        >
          {/* Employee picker */}
          <Box
            sx={{
              borderRight: { md: '1px solid' },
              borderColor: { md: 'divider' },
              bgcolor: alpha(theme.palette.primary.main, 0.02),
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Employees
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="Search employees…"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <List dense disablePadding sx={{ maxHeight: 420, overflow: 'auto' }}>
              {filteredEmployees.map((emp) => {
                const name = getEmployeeName(emp.firstName, emp.lastName);
                const count = countsByEmployee[emp.id] ?? 0;
                const selected = emp.id === effectiveEmployeeId;
                return (
                  <ListItemButton
                    key={emp.id}
                    selected={selected}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    sx={{ py: 1.25 }}
                  >
                    <ListItemAvatar sx={{ minWidth: 44 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14 }}>
                        {emp.firstName[0]}{emp.lastName[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={selected ? 700 : 600}>{name}</Typography>}
                      secondary={
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {emp.employeeNumber || emp.email}
                          {emp.departmentId && deptMap[emp.departmentId] ? ` · ${deptMap[emp.departmentId]}` : ''}
                        </Typography>
                      }
                    />
                    <Chip label={count} size="small" variant={count > 0 ? 'filled' : 'outlined'} color={count > 0 ? 'primary' : 'default'} />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>

          {/* Documents panel */}
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {selectedEmployee && (
              <>
                <Box
                  sx={{
                    p: 2.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, transparent 100%)`,
                  }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main', fontWeight: 700 }}>
                        {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight={800}>
                          {getEmployeeName(selectedEmployee.firstName, selectedEmployee.lastName)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedEmployee.jobTitle || 'Employee'}
                          {selectedEmployee.departmentId && deptMap[selectedEmployee.departmentId]
                            ? ` · ${deptMap[selectedEmployee.departmentId]}`
                            : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {selectedEmployee.email}
                        </Typography>
                      </Box>
                    </Stack>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setUploadOpen(true)}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                    >
                      Upload document
                    </Button>
                  </Stack>
                </Box>

                <Box sx={{ px: 2, pt: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Tabs
                    value={statusTab}
                    onChange={(_, v) => setStatusTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                  >
                    {STATUS_TABS.map((t) => (
                      <Tab key={t.value} value={t.value} label={t.label} sx={{ textTransform: 'none', fontWeight: 600 }} />
                    ))}
                  </Tabs>
                </Box>

                <Box sx={{ p: 2 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Search documents for this employee…"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    sx={{ mb: 1 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  {employeeDocs.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
                      <DescriptionOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
                        No documents yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Upload contracts, IDs, offer letters, and other HR files for this employee.
                      </Typography>
                      <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setUploadOpen(true)}>
                        Upload first document
                      </Button>
                    </Box>
                  ) : (
                    employeeDocs.map((doc) => (
                      <DocumentRow key={doc.id} doc={doc} onDelete={deleteDocument} />
                    ))
                  )}
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Card>

      <UploadEmployeeDocumentDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        defaultEmployeeId={effectiveEmployeeId ?? undefined}
        onSubmit={(payload) => addDocument(payload)}
      />
    </Stack>
  );
}
