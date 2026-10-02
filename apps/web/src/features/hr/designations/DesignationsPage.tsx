import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  alpha,
  useTheme,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BadgeIcon from '@mui/icons-material/Badge';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { PageHeader } from '../../../components/PageHeader';

interface Designation {
  id: string;
  title: string;
  department: string;
  level: string;
  headcount: number;
  salaryBand: string;
  track: 'Engineering' | 'Management' | 'Product' | 'Operations' | 'Finance' | 'People';
}

const INITIAL_DESIGNATIONS: Designation[] = [
  { id: 'des-1', title: 'Principal Software Architect', department: 'Engineering', level: 'L6 - Staff/Principal', headcount: 2, salaryBand: '$160k - $210k', track: 'Engineering' },
  { id: 'des-2', title: 'Senior Fullstack Engineer', department: 'Engineering', level: 'L4 - Senior', headcount: 8, salaryBand: '$120k - $155k', track: 'Engineering' },
  { id: 'des-3', title: 'Frontend Software Engineer', department: 'Engineering', level: 'L3 - Mid-Level', headcount: 12, salaryBand: '$90k - $120k', track: 'Engineering' },
  { id: 'des-4', title: 'Director of Human Resources', department: 'Human Resources', level: 'L7 - Executive', headcount: 1, salaryBand: '$150k - $190k', track: 'People' },
  { id: 'des-5', title: 'Senior HR Business Partner', department: 'Human Resources', level: 'L4 - Senior', headcount: 3, salaryBand: '$85k - $115k', track: 'People' },
  { id: 'des-6', title: 'Chief Financial Officer', department: 'Finance', level: 'L8 - C-Level', headcount: 1, salaryBand: '$200k - $280k', track: 'Finance' },
  { id: 'des-7', title: 'Lead Financial Analyst', department: 'Finance', level: 'L5 - Lead', headcount: 4, salaryBand: '$105k - $135k', track: 'Finance' },
  { id: 'des-8', title: 'Senior IT Systems Administrator', department: 'IT Operations', level: 'L4 - Senior', headcount: 5, salaryBand: '$95k - $125k', track: 'Operations' },
  { id: 'des-9', title: 'Enterprise Product Manager', department: 'Product', level: 'L5 - Lead', headcount: 3, salaryBand: '$130k - $165k', track: 'Product' },
];

export function DesignationsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [designations, setDesignations] = useState<Designation[]>(INITIAL_DESIGNATIONS);
  const [openModal, setOpenModal] = useState(false);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const [form, setForm] = useState({
    title: '',
    department: 'Engineering',
    level: 'L3 - Mid-Level',
    salaryBand: '$90k - $120k',
    track: 'Engineering' as Designation['track'],
  });

  const filtered = useMemo(() => {
    return designations.filter((d) => {
      const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) || d.level.toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter === 'all' || d.department.toLowerCase() === deptFilter.toLowerCase();
      return matchSearch && matchDept;
    });
  }, [designations, search, deptFilter]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;

    const newDes: Designation = {
      id: `des-${Date.now()}`,
      title: form.title,
      department: form.department,
      level: form.level,
      headcount: 0,
      salaryBand: form.salaryBand,
      track: form.track,
    };

    setDesignations([newDes, ...designations]);
    setOpenModal(false);
    setForm({ title: '', department: 'Engineering', level: 'L3 - Mid-Level', salaryBand: '$90k - $120k', track: 'Engineering' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this designation?')) {
      setDesignations(designations.filter((d) => d.id !== id));
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Job Designations & Roles"
        subtitle="Manage career progression levels, salary bands, and organizational role hierarchies"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenModal(true)}
            sx={{
              bgcolor: '#10B981',
              '&:hover': { bgcolor: '#059669' },
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            Add Designation
          </Button>
        }
      />

      {/* Stats Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4, mt: 1 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4', border: `1px solid ${alpha('#10B981', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#10B981">TOTAL ROLES</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>{designations.length}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF', border: `1px solid ${alpha('#6366F1', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#6366F1">FILLED POSITIONS</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
              {designations.reduce((a, b) => a + b.headcount, 0)}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: '16px', bgcolor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB', border: `1px solid ${alpha('#F59E0B', 0.25)}` }}>
            <Typography variant="caption" fontWeight={700} color="#F59E0B">LEVEL TIERS</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
              {new Set(designations.map((d) => d.level)).size}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Search */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search job title or level..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: { sm: 380 } }}
        />
        <TextField
          select
          size="small"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="all">All Departments</MenuItem>
          <MenuItem value="Engineering">Engineering</MenuItem>
          <MenuItem value="Human Resources">Human Resources</MenuItem>
          <MenuItem value="Finance">Finance</MenuItem>
          <MenuItem value="IT Operations">IT Operations</MenuItem>
          <MenuItem value="Product">Product</MenuItem>
        </TextField>
      </Stack>

      {/* Table */}
      <Card sx={{ borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Job Designation</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Career Level</TableCell>
                <TableCell>Salary Band</TableCell>
                <TableCell>Current Headcount</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <BadgeIcon color="action" />
                      <Typography variant="body2" fontWeight={700}>{item.title}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{item.department}</TableCell>
                  <TableCell>
                    <Chip label={item.level} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.72rem' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} color="text.secondary">{item.salaryBand}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${item.headcount} employees`}
                      size="small"
                      sx={{ bgcolor: item.headcount > 0 ? alpha('#10B981', 0.15) : undefined, color: item.headcount > 0 ? '#10B981' : undefined, fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreate}>
          <DialogTitle sx={{ fontWeight: 800 }}>Add New Designation</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                required
                fullWidth
                label="Designation Title"
                placeholder="e.g. Lead Cloud Security Engineer"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <TextField
                select
                required
                fullWidth
                label="Department"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                <MenuItem value="Engineering">Engineering</MenuItem>
                <MenuItem value="Human Resources">Human Resources</MenuItem>
                <MenuItem value="Finance">Finance</MenuItem>
                <MenuItem value="IT Operations">IT Operations</MenuItem>
                <MenuItem value="Product">Product</MenuItem>
              </TextField>
              <TextField
                select
                required
                fullWidth
                label="Career Level"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
              >
                <MenuItem value="L1 - Associate">L1 - Associate</MenuItem>
                <MenuItem value="L2 - Junior">L2 - Junior</MenuItem>
                <MenuItem value="L3 - Mid-Level">L3 - Mid-Level</MenuItem>
                <MenuItem value="L4 - Senior">L4 - Senior</MenuItem>
                <MenuItem value="L5 - Lead">L5 - Lead</MenuItem>
                <MenuItem value="L6 - Staff/Principal">L6 - Staff/Principal</MenuItem>
                <MenuItem value="L7 - Executive">L7 - Executive</MenuItem>
                <MenuItem value="L8 - C-Level">L8 - C-Level</MenuItem>
              </TextField>
              <TextField
                fullWidth
                label="Salary Band Benchmark"
                placeholder="e.g. $110k - $145k"
                value={form.salaryBand}
                onChange={(e) => setForm({ ...form, salaryBand: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}>
              Save Designation
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
