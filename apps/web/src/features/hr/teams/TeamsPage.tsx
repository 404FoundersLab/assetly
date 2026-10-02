import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Avatar,
  Chip,
  AvatarGroup,
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
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { PageHeader } from '../../../components/PageHeader';
import { useAppSelector } from '../../../hooks/storeHooks';

interface Team {
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
  leadName: string;
  leadRole: string;
  leadEmail: string;
  description: string;
  memberCount: number;
  color: string;
  focusArea: string;
}

const INITIAL_TEAMS: Team[] = [
  {
    id: 'team-1',
    name: 'Core Platform Engineering',
    departmentId: 'dept-1',
    departmentName: 'Engineering',
    leadName: 'Alex Thompson',
    leadRole: 'Principal Architect',
    leadEmail: 'alex.t@company.com',
    description: 'High-availability infrastructure, multi-tenant databases, microservices & distributed telemetry.',
    memberCount: 8,
    color: '#6366F1',
    focusArea: 'Cloud Backend & APIs',
  },
  {
    id: 'team-2',
    name: 'Frontend & UI Architecture',
    departmentId: 'dept-1',
    departmentName: 'Engineering',
    leadName: 'Sarah Chen',
    leadRole: 'Staff Frontend Engineer',
    leadEmail: 'sarah.c@company.com',
    description: 'Design systems, responsive dashboards, high-fidelity micro-interactions and performance optimization.',
    memberCount: 6,
    color: '#06B6D4',
    focusArea: 'Web Application & Design System',
  },
  {
    id: 'team-3',
    name: 'Talent Acquisition & People Ops',
    departmentId: 'dept-2',
    departmentName: 'Human Resources',
    leadName: 'Emily Davis',
    leadRole: 'Lead HR Partner',
    leadEmail: 'emily.d@company.com',
    description: 'Global candidate sourcing, executive hiring, onboarding experiences and culture initiatives.',
    memberCount: 4,
    color: '#10B981',
    focusArea: 'Recruitment & Culture',
  },
  {
    id: 'team-4',
    name: 'Financial Planning & Accounting',
    departmentId: 'dept-3',
    departmentName: 'Finance',
    leadName: 'Priya Patel',
    leadRole: 'Director of Finance',
    leadEmail: 'priya.p@company.com',
    description: 'CapEx/OpEx forecasting, payroll reconciliations, vendor procurement audits and statutory audits.',
    memberCount: 5,
    color: '#F59E0B',
    focusArea: 'Budgeting & Compliance',
  },
  {
    id: 'team-5',
    name: 'IT Security & Fleet Infrastructure',
    departmentId: 'dept-4',
    departmentName: 'IT Operations',
    leadName: 'Pavan Kumar',
    leadRole: 'Head of IT & SecOps',
    leadEmail: 'pavan.k@company.com',
    description: 'Device endpoint telemetry, MDM provisioning, Zero-Trust network access and perimeter security.',
    memberCount: 7,
    color: '#EC4899',
    focusArea: 'Cybersecurity & Endpoint Fleet',
  },
  {
    id: 'team-6',
    name: 'Enterprise Customer Success',
    departmentId: 'dept-5',
    departmentName: 'Operations',
    leadName: 'Michael Chang',
    leadRole: 'VP of Customer Success',
    leadEmail: 'michael.c@company.com',
    description: 'Enterprise account onboarding, SLA compliance, customer satisfaction and renewal management.',
    memberCount: 9,
    color: '#8B5CF6',
    focusArea: 'Client Enablement & Support',
  },
];

export function TeamsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const departments = useAppSelector((s) => s.departments.items);
  const employees = useAppSelector((s) => s.employees.items);

  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [openModal, setOpenModal] = useState(false);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const [form, setForm] = useState({
    name: '',
    departmentName: 'Engineering',
    leadName: '',
    focusArea: '',
    description: '',
    color: '#6366F1',
  });

  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      const matchQuery =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.leadName.toLowerCase().includes(search.toLowerCase()) ||
        t.focusArea.toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter === 'all' || t.departmentName.toLowerCase() === deptFilter.toLowerCase();
      return matchQuery && matchDept;
    });
  }, [teams, search, deptFilter]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.leadName) return;

    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name: form.name,
      departmentId: 'dept-custom',
      departmentName: form.departmentName,
      leadName: form.leadName,
      leadRole: 'Team Lead',
      leadEmail: `${form.leadName.toLowerCase().replace(/\s+/g, '.')}@company.com`,
      description: form.description || 'Specialized cross-functional squad focused on strategic enterprise deliverables.',
      memberCount: 4,
      color: form.color,
      focusArea: form.focusArea || 'General Operations',
    };

    setTeams([newTeam, ...teams]);
    setOpenModal(false);
    setForm({ name: '', departmentName: 'Engineering', leadName: '', focusArea: '', description: '', color: '#6366F1' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this team?')) {
      setTeams(teams.filter((t) => t.id !== id));
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Teams & Squads"
        subtitle="Manage cross-functional squads, team leaders, and operational focus areas"
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
            Create Team
          </Button>
        }
      />

      {/* Stats row */}
      <Grid container spacing={2.5} sx={{ mb: 4, mt: 1 }}>
        <Grid item xs={12} sm={4}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: '16px',
              bgcolor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#F0FDF4',
              border: `1px solid ${alpha('#10B981', 0.25)}`,
            }}
          >
            <Typography variant="caption" fontWeight={700} color="#10B981" sx={{ letterSpacing: '0.04em' }}>
              TOTAL SQUADS
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
              {teams.length}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: '16px',
              bgcolor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF',
              border: `1px solid ${alpha('#6366F1', 0.25)}`,
            }}
          >
            <Typography variant="caption" fontWeight={700} color="#6366F1" sx={{ letterSpacing: '0.04em' }}>
              ACTIVE MEMBERS
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
              {teams.reduce((acc, t) => acc + t.memberCount, 0)}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card
            sx={{
              p: 2.5,
              borderRadius: '16px',
              bgcolor: isDark ? 'rgba(6, 182, 212, 0.08)' : '#ECFEFF',
              border: `1px solid ${alpha('#06B6D4', 0.25)}`,
            }}
          >
            <Typography variant="caption" fontWeight={700} color="#06B6D4" sx={{ letterSpacing: '0.04em' }}>
              DEPARTMENTS REPRESENTED
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
              {new Set(teams.map((t) => t.departmentName)).size}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filter bar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search teams, leaders, or focus areas..."
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
          <MenuItem value="Operations">Operations</MenuItem>
        </TextField>
      </Stack>

      {/* Teams Grid */}
      <Grid container spacing={3}>
        {filteredTeams.map((team) => (
          <Grid item xs={12} md={6} lg={4} key={team.id}>
            <Card
              sx={{
                height: '100%',
                borderRadius: '16px',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: `0 12px 24px -8px ${alpha(team.color, 0.25)}`,
                  borderColor: alpha(team.color, 0.5),
                },
              }}
            >
              {/* Top accent beam */}
              <Box sx={{ height: 4, bgcolor: team.color }} />

              <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: 'calc(100% - 4px)' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                      {team.name}
                    </Typography>
                    <Chip
                      label={team.departmentName}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        bgcolor: alpha(team.color, isDark ? 0.2 : 0.1),
                        color: team.color,
                        borderRadius: '6px',
                        mt: 0.5,
                      }}
                    />
                  </Box>
                  <Tooltip title="Delete Team">
                    <IconButton size="small" onClick={() => handleDelete(team.id)} sx={{ color: 'text.secondary' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', lineHeight: 1.5, mb: 2.5 }}>
                  {team.description}
                </Typography>

                {/* Team Lead capsule */}
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: '12px',
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                    border: `1px solid ${theme.palette.divider}`,
                    mb: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: alpha(team.color, 0.2),
                      color: team.color,
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    {team.leadName[0]}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                      LEAD: {team.leadName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: '0.72rem' }}>
                      {team.leadRole}
                    </Typography>
                  </Box>
                </Box>

                {/* Footer with members and focus area */}
                <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.7rem' } }}>
                    <Avatar sx={{ bgcolor: '#6366F1' }}>A</Avatar>
                    <Avatar sx={{ bgcolor: '#10B981' }}>B</Avatar>
                    <Avatar sx={{ bgcolor: '#F59E0B' }}>C</Avatar>
                    <Avatar sx={{ bgcolor: '#EC4899' }}>D</Avatar>
                    <Avatar sx={{ bgcolor: '#06B6D4' }}>E</Avatar>
                  </AvatarGroup>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    {team.memberCount} Members
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create Team Dialog */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreate}>
          <DialogTitle sx={{ fontWeight: 800 }}>Create New Team / Squad</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                required
                fullWidth
                label="Team / Squad Name"
                placeholder="e.g. AI Workflow Innovations"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <TextField
                select
                required
                fullWidth
                label="Department"
                value={form.departmentName}
                onChange={(e) => setForm({ ...form, departmentName: e.target.value })}
              >
                <MenuItem value="Engineering">Engineering</MenuItem>
                <MenuItem value="Human Resources">Human Resources</MenuItem>
                <MenuItem value="Finance">Finance</MenuItem>
                <MenuItem value="IT Operations">IT Operations</MenuItem>
                <MenuItem value="Operations">Operations</MenuItem>
              </TextField>
              <TextField
                required
                fullWidth
                label="Team Leader"
                placeholder="e.g. Rachel Adams"
                value={form.leadName}
                onChange={(e) => setForm({ ...form, leadName: e.target.value })}
              />
              <TextField
                fullWidth
                label="Focus Area"
                placeholder="e.g. Natural Language Processing & Search"
                value={form.focusArea}
                onChange={(e) => setForm({ ...form, focusArea: e.target.value })}
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                placeholder="Key goals, deliverables, and operational charters..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <TextField
                select
                fullWidth
                label="Squad Color Tag"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              >
                <MenuItem value="#6366F1">Indigo (Platform / Tech)</MenuItem>
                <MenuItem value="#10B981">Emerald (People & Culture)</MenuItem>
                <MenuItem value="#06B6D4">Cyan (UI & Product)</MenuItem>
                <MenuItem value="#F59E0B">Amber (Finance & Budget)</MenuItem>
                <MenuItem value="#EC4899">Pink (Security & Fleet)</MenuItem>
                <MenuItem value="#8B5CF6">Purple (Operations)</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}>
              Create Squad
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
