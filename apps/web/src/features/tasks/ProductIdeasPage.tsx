import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import PlaylistAddCheckOutlinedIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import { PageHeader } from '../../components/PageHeader';
import { useAppDispatch, useAppSelector, useAuthUser, usePermissions } from '../../hooks/storeHooks';
import { fetchUsers } from '../../store/usersSlice';
import { addOpportunity, addTodo, assignOpportunityAndStart, deleteTodo, replaceOpportunityAssignments, updateOpportunity, updateTodoStatus } from '../../store/productIdeasSlice';
import { getUserDisplayName } from '../../utils/userDisplay';
import { MARKET_COMPARISON, PRICING_TIERS, PRODUCT_CATEGORIES, OpportunityValidationStatus, OpportunityWorkStatus, ProductOpportunity, ProjectTodo } from './productIdeasData';
import { fetchProductOpportunityAssignments, saveProductOpportunityAssignments } from '../../services/api/productOpportunities';
import { isApiEnabled } from '../../services/api/config';

const ACCENT = '#176B5B';
const CATEGORY_COLORS = ['#176B5B', '#DF835A', '#D0A13A', '#547D9B', '#745D4D'];
const DIFFICULTIES = ['Easy', 'Easy–Medium', 'Medium', 'Medium–High', 'High', 'Very High'];
const VALIDATION_STATUSES: { value: OpportunityValidationStatus; label: string }[] = [
  { value: 'not_validated', label: 'Not validated' },
  { value: 'interviews', label: 'Customer interviews' },
  { value: 'pilot', label: 'Pilot / waitlist' },
  { value: 'validated', label: 'Validated' },
  { value: 'parked', label: 'Parked' },
];
const WORK_STATUSES: { value: OpportunityWorkStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];
const WORK_STATUS_META: Record<OpportunityWorkStatus, { label: string; color: 'default' | 'warning' | 'success' }> = {
  not_started: { label: 'Not started', color: 'default' },
  in_progress: { label: 'In progress', color: 'warning' },
  done: { label: 'Done', color: 'success' },
};

interface OpportunityFormValues {
  name: string;
  category: string;
  targetCustomers: string;
  competitors: string;
  difficulty: string;
  mvpTime: string;
  suggestedPrice: string;
  problemStatement: string;
  differentiator: string;
  validationStatus: OpportunityValidationStatus;
  customerEvidence: string;
  mvpScope: string;
  investmentEstimate: string;
  revenuePotential: string;
  salesDifficulty: string;
  teamFit: string;
  nextStep: string;
  assigneeIds: string[];
  workStatus: OpportunityWorkStatus;
}

const EMPTY_OPPORTUNITY: OpportunityFormValues = {
  name: '', category: PRODUCT_CATEGORIES[0], targetCustomers: '', competitors: '',
  difficulty: 'Medium', mvpTime: '', suggestedPrice: '', problemStatement: '',
  differentiator: '', validationStatus: 'not_validated', customerEvidence: '',
  mvpScope: '', investmentEstimate: '', revenuePotential: '', salesDifficulty: '',
  teamFit: '', nextStep: '', assigneeIds: [], workStatus: 'not_started',
};

function Metric({ label, value, note, icon, tint }: Readonly<{ label: string; value: string; note: React.ReactNode; icon: React.ReactNode; tint: string }>) {
  return (
    <Paper variant="outlined" sx={{ p: 2.25, height: '100%', borderRadius: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>{label}</Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.75 }}>{value}</Typography>
          <Typography variant="caption" color="text.secondary">{note}</Typography>
        </Box>
        <Box sx={{ width: 38, height: 38, display: 'grid', placeItems: 'center', color: tint, bgcolor: alpha(tint, 0.1), borderRadius: 1.25, flexShrink: 0 }}>
          {icon}
        </Box>
      </Stack>
    </Paper>
  );
}

function getTodoNextStatus(status: ProjectTodo['status']): ProjectTodo['status'] {
  if (status === 'todo') return 'doing';
  if (status === 'doing') return 'done';
  return 'todo';
}

export function ProductIdeasPage() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const currentUser = useAuthUser();
  const { can } = usePermissions();
  const opportunities = useAppSelector((state) => state.productIdeas.opportunities);
  const todos = useAppSelector((state) => state.productIdeas.todos);
  const users = useAppSelector((state) => state.users.items);
  const canManageUsers = can('user:manage') || currentUser?.role === 'tenant_admin' || currentUser?.role === 'platform_admin';
  const usersFetchStarted = useRef(false);
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [opportunityDialogOpen, setOpportunityDialogOpen] = useState(false);
  const [editingOpportunityId, setEditingOpportunityId] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<ProductOpportunity | null>(null);
  const [todoDialogOpen, setTodoDialogOpen] = useState(false);
  const [opportunityForm, setOpportunityForm] = useState<OpportunityFormValues>(EMPTY_OPPORTUNITY);
  const [newTodo, setNewTodo] = useState({ title: '', dueDate: '' });
  const [assignmentSyncError, setAssignmentSyncError] = useState('');
  const assignmentPeople = useAppSelector((state) => state.productIdeas.assignments);

  useEffect(() => {
    if (canManageUsers && !usersFetchStarted.current) {
      usersFetchStarted.current = true;
      void dispatch(fetchUsers());
    }
  }, [canManageUsers, dispatch]);

  useEffect(() => {
    if (!isApiEnabled()) return;
    let active = true;
    void fetchProductOpportunityAssignments()
      .then((assignments) => {
        if (!active) return;
        dispatch(replaceOpportunityAssignments({ assignments }));
        setAssignmentSyncError('');
      })
      .catch((error: unknown) => {
        if (active) setAssignmentSyncError(error instanceof Error ? error.message : 'Assignments could not be loaded from the server.');
      });
    return () => { active = false; };
  }, [dispatch]);

  const assignableUsers = useMemo(() => {
    const tenantUsers = users.filter(
      (user) => !currentUser?.tenantId || !user.tenantId || user.tenantId === currentUser.tenantId
    );
    if (currentUser && !tenantUsers.some((user) => user.id === currentUser.id)) {
      return [...tenantUsers, currentUser];
    }
    return tenantUsers.length > 0 ? tenantUsers : (currentUser ? [currentUser] : []);
  }, [currentUser, users]);

  const [reassignOpportunity, setReassignOpportunity] = useState<ProductOpportunity | null>(null);
  const [reassignUserIds, setReassignUserIds] = useState<string[]>([]);
  const [reassignWorkStatus, setReassignWorkStatus] = useState<OpportunityWorkStatus>('not_started');
  const [reassignNextStep, setReassignNextStep] = useState<string>('');

  const handleOpenReassignModal = (opportunity: ProductOpportunity) => {
    setReassignOpportunity(opportunity);
    setReassignUserIds(opportunity.assigneeIds ? [...opportunity.assigneeIds] : []);
    setReassignWorkStatus(opportunity.workStatus ?? 'not_started');
    setReassignNextStep(opportunity.nextStep ?? '');
  };

  const handleSaveReassign = () => {
    if (!reassignOpportunity) return;
    const newAssigneeIds = reassignUserIds;
    const newWorkStatus = newAssigneeIds.length === 0 ? 'not_started' : reassignWorkStatus;
    const updated: ProductOpportunity = {
      ...reassignOpportunity,
      assigneeIds: newAssigneeIds,
      workStatus: newWorkStatus,
      nextStep: reassignNextStep.trim(),
    };
    dispatch(updateOpportunity(updated));
    if (selectedOpportunity?.id === reassignOpportunity.id) {
      setSelectedOpportunity(updated);
    }
    if (isApiEnabled()) {
      void saveProductOpportunityAssignments({
        opportunityId: updated.id,
        assigneeIds: newAssigneeIds,
        workStatus: newWorkStatus,
        nextStep: reassignNextStep.trim(),
      })
        .then((assignments) => {
          dispatch(replaceOpportunityAssignments({ opportunityId: updated.id, assignments }));
          setAssignmentSyncError('');
        })
        .catch((error: unknown) => {
          setAssignmentSyncError(error instanceof Error ? error.message : 'Assignment changes could not be saved to server.');
        });
    }
    setReassignOpportunity(null);
  };

  const handleMakeUnassigned = (opportunity: ProductOpportunity) => {
    const updated: ProductOpportunity = {
      ...opportunity,
      assigneeIds: [],
      workStatus: 'not_started',
    };
    dispatch(updateOpportunity(updated));
    if (selectedOpportunity?.id === opportunity.id) {
      setSelectedOpportunity(updated);
    }
    if (isApiEnabled()) {
      void saveProductOpportunityAssignments({
        opportunityId: updated.id,
        assigneeIds: [],
        workStatus: 'not_started',
        nextStep: opportunity.nextStep ?? '',
      })
        .then((assignments) => {
          dispatch(replaceOpportunityAssignments({ opportunityId: updated.id, assignments }));
          setAssignmentSyncError('');
        })
        .catch((error: unknown) => {
          setAssignmentSyncError(error instanceof Error ? error.message : 'Could not unassign on server.');
        });
    }
  };

  const doneCount = todos.filter((todo) => todo.status === 'done').length;
  const doingCount = todos.filter((todo) => todo.status === 'doing').length;
  const progress = todos.length ? Math.round((doneCount / todos.length) * 100) : 0;
  const shortlist = useMemo(
    () => opportunities.filter((item) => item.shortlistRank).sort((a, b) => (a.shortlistRank ?? 0) - (b.shortlistRank ?? 0)),
    [opportunities],
  );
  const categoryCounts = useMemo(
    () => PRODUCT_CATEGORIES.map((category, index) => ({
      category,
      count: opportunities.filter((item) => item.category === category).length,
      color: CATEGORY_COLORS[index],
    })),
    [opportunities],
  );
  const filteredOpportunities = useMemo(() => {
    const query = search.trim().toLowerCase();
    return opportunities.filter((item) => {
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesShortlist = !shortlistOnly || Boolean(item.shortlistRank);
      const matchesSearch = !query || [item.name, item.targetCustomers, item.competitors, item.category].some((value) => value.toLowerCase().includes(query));
      return matchesCategory && matchesShortlist && matchesSearch;
    });
  }, [categoryFilter, opportunities, search, shortlistOnly]);
  const assignmentRows = useMemo(() => opportunities.flatMap((opportunity) => {
    const assigneeIds = opportunity.assigneeIds ?? [];
    return assigneeIds.map((userId) => ({
      key: `${opportunity.id}-${userId}`,
      opportunity,
      user: assignableUsers.find((candidate) => candidate.id === userId) ?? null,
      assignment: assignmentPeople.find((item) => item.opportunityId === opportunity.id && item.userId === userId),
      userId,
    }));
  }), [assignableUsers, assignmentPeople, opportunities]);
  const assignmentCount = assignmentRows.length;

  const openNewOpportunity = () => {
    setEditingOpportunityId(null);
    setOpportunityForm(EMPTY_OPPORTUNITY);
    setOpportunityDialogOpen(true);
  };

  const openEditOpportunity = (item: ProductOpportunity) => {
    setSelectedOpportunity(null);
    setEditingOpportunityId(item.id);
    setOpportunityForm({
      ...EMPTY_OPPORTUNITY,
      name: item.name,
      category: item.category,
      targetCustomers: item.targetCustomers,
      competitors: item.competitors,
      difficulty: item.difficulty,
      mvpTime: item.mvpTime,
      suggestedPrice: item.suggestedPrice,
      problemStatement: item.problemStatement ?? '',
      differentiator: item.differentiator ?? '',
      validationStatus: item.validationStatus ?? 'not_validated',
      customerEvidence: item.customerEvidence ?? '',
      mvpScope: item.mvpScope ?? '',
      investmentEstimate: item.investmentEstimate ?? '',
      revenuePotential: item.revenuePotential ?? '',
      salesDifficulty: item.salesDifficulty ?? '',
      teamFit: item.teamFit ?? '',
      nextStep: item.nextStep ?? '',
      assigneeIds: item.assigneeIds ?? [],
      workStatus: item.workStatus ?? 'not_started',
    });
    setOpportunityDialogOpen(true);
  };

  const handleOpportunityFieldChange = <K extends keyof OpportunityFormValues>(field: K, value: OpportunityFormValues[K]) => {
    setOpportunityForm((current) => ({ ...current, [field]: value }));
  };

  const handleAssignToMeAndStart = (opportunity: ProductOpportunity) => {
    if (!currentUser) return;
    dispatch(assignOpportunityAndStart({ opportunityId: opportunity.id, userId: currentUser.id }));
    const updatedOpportunity: ProductOpportunity = {
      ...opportunity,
      assigneeIds: [...new Set([...(opportunity.assigneeIds ?? []), currentUser.id])],
      workStatus: 'in_progress',
      workStartedAt: opportunity.workStatus === 'in_progress' ? opportunity.workStartedAt : new Date().toISOString(),
    };
    setSelectedOpportunity((selected) => selected?.id === opportunity.id ? updatedOpportunity : selected);
    if (isApiEnabled()) {
      void saveProductOpportunityAssignments({
        opportunityId: opportunity.id,
        assigneeIds: updatedOpportunity.assigneeIds ?? [],
        workStatus: 'in_progress',
        nextStep: updatedOpportunity.nextStep ?? '',
      })
        .then((assignments) => {
          dispatch(replaceOpportunityAssignments({ opportunityId: opportunity.id, assignments }));
          setAssignmentSyncError('');
        })
        .catch((error: unknown) => setAssignmentSyncError(error instanceof Error ? error.message : 'Assignment could not be shared with your team.'));
    }
  };

  const handleSaveOpportunity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingOpportunityId) {
      const current = opportunities.find((item) => item.id === editingOpportunityId);
      if (current) {
        const updated = { ...current, ...opportunityForm };
        dispatch(updateOpportunity(updated));
        const assignmentsChanged = (current.assigneeIds ?? []).join(',') !== opportunityForm.assigneeIds.join(',')
          || (current.workStatus ?? 'not_started') !== opportunityForm.workStatus
          || (current.nextStep ?? '') !== opportunityForm.nextStep;
        if (isApiEnabled() && assignmentsChanged) {
          void saveProductOpportunityAssignments({
            opportunityId: updated.id,
            assigneeIds: updated.assigneeIds ?? [],
            workStatus: updated.workStatus ?? 'not_started',
            nextStep: updated.nextStep ?? '',
          })
            .then((assignments) => {
              dispatch(replaceOpportunityAssignments({ opportunityId: updated.id, assignments }));
              setAssignmentSyncError('');
            })
            .catch((error: unknown) => setAssignmentSyncError(error instanceof Error ? error.message : 'Assignment changes could not be shared with your team.'));
        }
      }
    } else {
      dispatch(addOpportunity(opportunityForm));
    }
    setEditingOpportunityId(null);
    setOpportunityForm(EMPTY_OPPORTUNITY);
    setOpportunityDialogOpen(false);
  };

  const handleAddTodo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch(addTodo(newTodo));
    setNewTodo({ title: '', dueDate: '' });
    setTodoDialogOpen(false);
  };

  const todoRows = (items: ProjectTodo[]) => items.map((todo) => {
    const nextStatus = getTodoNextStatus(todo.status);
    const statusMeta = {
      todo: { label: 'To do', color: 'default' as const },
      doing: { label: 'In progress', color: 'warning' as const },
      done: { label: 'Done', color: 'success' as const },
    }[todo.status];
    return (
    <Stack key={todo.id} direction="row" alignItems="center" spacing={1.25} sx={{ py: 1.1, borderBottom: `1px solid ${theme.palette.divider}` }}>
      <Tooltip title={`Move to ${getTodoNextStatus(todo.status)}`}>
        <IconButton
          size="small"
          aria-label={`Set ${todo.title} to ${nextStatus}`}
          onClick={() => dispatch(updateTodoStatus({ id: todo.id, status: nextStatus }))}
          sx={{ color: todo.status === 'done' ? 'success.main' : 'text.secondary' }}
        >
          <CheckCircleOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} sx={{ textDecoration: todo.status === 'done' ? 'line-through' : 'none', color: todo.status === 'done' ? 'text.secondary' : 'text.primary' }}>
          {todo.title}
        </Typography>
        {todo.dueDate && <Typography variant="caption" color="text.secondary">Due {todo.dueDate}</Typography>}
      </Box>
      <Chip size="small" label={statusMeta.label} color={statusMeta.color} variant="outlined" />
      <Tooltip title="Delete task">
        <IconButton size="small" aria-label={`Delete ${todo.title}`} onClick={() => dispatch(deleteTodo(todo.id))}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
    );
  });

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader
        title="Product Ideas & Validation"
        subtitle="One project to compare opportunities, test demand, and turn the strongest idea into an MVP."
        breadcrumbs={[{ label: 'Work & Task Management' }, { label: 'Product Ideas & Validation' }]}
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={openNewOpportunity}>Add opportunity</Button>}
      />

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, mb: 2.5, borderRadius: 1.5, bgcolor: alpha(ACCENT, theme.palette.mode === 'dark' ? 0.1 : 0.045), borderColor: alpha(ACCENT, 0.22) }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" gap={2}>
          <Box>
            <Typography variant="overline" sx={{ color: ACCENT, fontWeight: 800, letterSpacing: 0.6 }}>ACTIVE PROJECT · MARKET VALIDATION</Typography>
            <Typography variant="h6" fontWeight={750}>Validate three ideas before building</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>Talk to Bengaluru businesses, test willingness to pay, then choose one focused MVP.</Typography>
          </Box>
          <Box sx={{ width: { xs: '100%', sm: 220 }, flexShrink: 0 }}>
            <Stack direction="row" justifyContent="space-between" mb={0.75}>
              <Typography variant="caption" color="text.secondary">Project checklist</Typography>
              <Typography variant="caption" fontWeight={700}>{doneCount}/{todos.length} complete</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 7, borderRadius: 4, '& .MuiLinearProgress-bar': { bgcolor: ACCENT } }} />
          </Box>
        </Stack>
      </Paper>

      <Grid2 container spacing={1.75} sx={{ mb: 3 }}>
        <Grid2 size={{ xs: 12, sm: 6, lg: 3 }}><Metric label="Opportunities" value={`${opportunities.length}`} note="Across five product categories" icon={<Inventory2OutlinedIcon fontSize="small" />} tint="#176B5B" /></Grid2>
        <Grid2 size={{ xs: 12, sm: 6, lg: 3 }}><Metric label="Shortlist" value={`${shortlist.length}`} note="Ranked ideas to evaluate first" icon={<StarOutlineIcon fontSize="small" />} tint="#C39732" /></Grid2>
        <Grid2 size={{ xs: 12, sm: 6, lg: 3 }}><Metric label="Open tasks" value={`${todos.filter((todo) => todo.status !== 'done').length}`} note={`${doingCount} currently in progress`} icon={<PlaylistAddCheckOutlinedIcon fontSize="small" />} tint="#547D9B" /></Grid2>
        <Grid2 size={{ xs: 12, sm: 6, lg: 3 }}><Metric label="Checklist progress" value={`${progress}%`} note="Move tasks forward as you validate" icon={<TrendingUpOutlinedIcon fontSize="small" />} tint="#DF835A" /></Grid2>
      </Grid2>

      <Tabs value={activeTab} onChange={(_, value: number) => setActiveTab(value)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Overview" />
        <Tab label={`Opportunities (${opportunities.length})`} />
        <Tab label={`To-dos (${todos.length})`} />
        <Tab icon={<GroupsOutlinedIcon fontSize="small" />} iconPosition="start" label={`Assignments (${assignmentCount})`} />
      </Tabs>

      {assignmentSyncError && (
        <Alert
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setAssignmentSyncError('');
                void fetchProductOpportunityAssignments()
                  .then((assignments) => {
                    dispatch(replaceOpportunityAssignments({ assignments }));
                  })
                  .catch((err: unknown) => {
                    setAssignmentSyncError(err instanceof Error ? err.message : 'Sync failed');
                  });
              }}
            >
              Retry Sync
            </Button>
          }
          sx={{ mb: 2 }}
        >
          {assignmentSyncError}
        </Alert>
      )}

      {activeTab === 0 && (
        <Grid2 container spacing={2.5}>
          <Grid2 size={{ xs: 12, lg: 7 }}>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, height: '100%', borderRadius: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.25 }}>
                <Box>
                  <Typography variant="h6" fontWeight={750}>Opportunity landscape</Typography>
                  <Typography variant="body2" color="text.secondary">Catalog distribution by market segment</Typography>
                </Box>
                <Button size="small" onClick={() => setActiveTab(1)}>Browse all</Button>
              </Stack>
              <Stack spacing={1.7}>
                {categoryCounts.map(({ category, count, color }) => (
                  <Box key={category}>
                    <Stack direction="row" justifyContent="space-between" gap={1} sx={{ mb: 0.65 }}>
                      <Typography variant="body2" fontWeight={600}>{category}</Typography>
                      <Typography variant="body2" color="text.secondary">{count}</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={opportunities.length ? (count / opportunities.length) * 100 : 0} sx={{ height: 8, borderRadius: 5, bgcolor: alpha(color, 0.12), '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 5 } }} />
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid2>
          <Grid2 size={{ xs: 12, lg: 5 }}>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, height: '100%', borderRadius: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} sx={{ mb: 1 }}>
                <Box>
                  <Typography variant="h6" fontWeight={750}>First validation steps</Typography>
                  <Typography variant="body2" color="text.secondary">A practical path from shortlist to decision</Typography>
                </Box>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setTodoDialogOpen(true)}>Add task</Button>
              </Stack>
              {todoRows(todos.slice(0, 4))}
              {todos.length > 4 && <Button sx={{ mt: 1 }} size="small" onClick={() => setActiveTab(2)}>See all {todos.length} tasks</Button>}
              {todos.length === 0 && <Typography color="text.secondary" variant="body2" sx={{ py: 2 }}>No project tasks yet. Add the first validation step.</Typography>}
            </Paper>
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={750}>Recommended shortlist</Typography>
                  <Typography variant="body2" color="text.secondary">Ten starting points from your market-demand research</Typography>
                </Box>
                <Button size="small" onClick={() => { setShortlistOnly(true); setActiveTab(1); }}>View shortlist</Button>
              </Stack>
              <Grid2 container spacing={1.5}>
                {shortlist.slice(0, 5).map((item) => (
                  <Grid2 size={{ xs: 12, sm: 6, xl: 4 }} key={item.id}>
                    <Box sx={{ height: '100%', p: 1.75, border: 1, borderColor: 'divider', borderRadius: 1.25 }}>
                      <Stack direction="row" justifyContent="space-between" gap={1}>
                        <Typography variant="subtitle2" fontWeight={750}>{item.name}</Typography>
                        <Chip size="small" label={`#${item.shortlistRank}`} sx={{ fontWeight: 700 }} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>{item.targetCustomers}</Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1, color: ACCENT, fontWeight: 650 }}>{item.shortlistPrice ?? item.suggestedPrice} · {item.mvpTime}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.5 }}>{item.rationale}</Typography>
                    </Box>
                  </Grid2>
                ))}
              </Grid2>
            </Paper>
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 1.5 }}>
              <Typography variant="h6" fontWeight={750}>Effort and business potential</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Rough founder-led MVP estimates; excludes founder salary, a full-time team, and extensive paid marketing.</Typography>
              <TableContainer>
                <Table size="small" sx={{ minWidth: 720 }}>
                  <TableHead><TableRow><TableCell>Category</TableCell><TableCell>Effort</TableCell><TableCell>Initial investment</TableCell><TableCell>Sales difficulty</TableCell><TableCell>Revenue potential</TableCell><TableCell>Small-team fit</TableCell></TableRow></TableHead>
                  <TableBody>{MARKET_COMPARISON.map((row) => <TableRow key={row.category}><TableCell sx={{ fontWeight: 650 }}>{row.category}</TableCell><TableCell>{row.effort}</TableCell><TableCell>{row.investment}</TableCell><TableCell>{row.sales}</TableCell><TableCell>{row.revenue}</TableCell><TableCell>{row.fit}</TableCell></TableRow>)}</TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid2>
          <Grid2 size={{ xs: 12 }}>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 1.5 }}>
              <Typography variant="h6" fontWeight={750}>Starting pricing framework</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Price against customer size, seats, usage, or number of branches. Validate willingness to pay before committing.</Typography>
              <Grid2 container spacing={1.5}>
                {PRICING_TIERS.map((tier) => <Grid2 size={{ xs: 12, sm: 6, md: 3 }} key={tier.name}><Box sx={{ p: 1.75, border: 1, borderColor: 'divider', borderRadius: 1.25, height: '100%' }}><Typography variant="subtitle2" fontWeight={750}>{tier.name}</Typography><Typography variant="h6" sx={{ color: ACCENT, my: 0.6 }}>{tier.price}{tier.name !== 'Enterprise' && <Typography component="span" variant="caption" color="text.secondary"> / month</Typography>}</Typography><Typography variant="body2" color="text.secondary">{tier.customer}</Typography></Box></Grid2>)}
              </Grid2>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.75 }}>Possible add-ons: onboarding ₹2,500–₹10,000 · data migration ₹1,000–₹5,000 · custom integrations from ₹5,000 · annual plans with a 10–15% discount.</Typography>
            </Paper>
          </Grid2>
        </Grid2>
      )}

      {activeTab === 1 && (
        <Box>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={1.5} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={750}>Opportunity catalog</Typography>
              <Typography variant="body2" color="text.secondary">Compare target customers, alternatives, effort, timelines, and pricing.</Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField size="small" label="Search opportunities" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ minWidth: { sm: 220 } }} />
              <FormControl size="small" sx={{ minWidth: { sm: 230 } }}>
                <InputLabel id="category-filter-label">Category</InputLabel>
                <Select labelId="category-filter-label" label="Category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <MenuItem value="all">All categories</MenuItem>
                  {PRODUCT_CATEGORIES.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
                </Select>
              </FormControl>
              <Button variant={shortlistOnly ? 'contained' : 'outlined'} startIcon={<StarOutlineIcon />} onClick={() => setShortlistOnly((value) => !value)}>Shortlist</Button>
            </Stack>
          </Stack>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.025) }}>
                  <TableCell>Opportunity</TableCell><TableCell>Target customers</TableCell><TableCell>Alternatives</TableCell><TableCell>Difficulty</TableCell><TableCell>MVP time</TableCell><TableCell>Suggested price</TableCell><TableCell align="center">Rank</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOpportunities.map((item) => <OpportunityRow key={item.id} item={item} onSelect={setSelectedOpportunity} />)}
                {filteredOpportunities.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>No opportunities match these filters.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Showing {filteredOpportunities.length} of {opportunities.length} opportunities. Prices and MVP estimates are starting assumptions to validate.</Typography>
        </Box>
      )}

      {activeTab === 2 && (
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 1.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={750}>Project to-dos</Typography>
              <Typography variant="body2" color="text.secondary">{doneCount} complete · {doingCount} in progress · {todos.length - doneCount - doingCount} to do</Typography>
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setTodoDialogOpen(true)}>Add task</Button>
          </Stack>
          <LinearProgress variant="determinate" value={progress} sx={{ mb: 1.5, height: 7, borderRadius: 4, '& .MuiLinearProgress-bar': { bgcolor: ACCENT } }} />
          {todoRows(todos)}
          {todos.length === 0 && <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: 'center' }}>Your project checklist is clear. Add a task to plan the next step.</Typography>}
        </Paper>
      )}

      {activeTab === 3 && (
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 1.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={750}>Who is working on what</Typography>
              <Typography variant="body2" color="text.secondary">One row per teammate and opportunity. Multi-person work appears once for each assignee.</Typography>
            </Box>
            <Chip size="small" icon={<GroupsOutlinedIcon />} label={`${assignmentCount} teammate assignments`} variant="outlined" />
          </Stack>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 760 }}>
              <TableHead><TableRow><TableCell>Team member</TableCell><TableCell>Opportunity</TableCell><TableCell>Target customers</TableCell><TableCell>Work status</TableCell><TableCell>Assigned next step</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead>
              <TableBody>
                {assignmentRows.map(({ key, opportunity, user, assignment, userId }) => {
                  const workStatus = opportunity.workStatus ?? 'not_started';
                  const statusMeta = WORK_STATUS_META[workStatus];
                  const displayName = user ? getUserDisplayName(user) : '';
                  const assigneeName = displayName || assignment?.userName || user?.email || assignment?.userEmail || 'Unavailable teammate';
                  const isCurrentUserAssigned = currentUser?.id === userId;
                  const canStartWork = currentUser?.id !== undefined && (!isCurrentUserAssigned || workStatus !== 'in_progress');
                  const actionLabel = isCurrentUserAssigned ? 'Continue' : 'Assign to me & start';
                  return (
                    <TableRow key={key} hover>
                      <TableCell><Typography variant="body2" fontWeight={user || assignment ? 650 : 400} color={user || assignment ? 'text.primary' : 'text.secondary'}>{assigneeName}</Typography>{(user?.email || assignment?.userEmail) && <Typography variant="caption" color="text.secondary">{user?.email ?? assignment?.userEmail}</Typography>}</TableCell>
                      <TableCell><Button size="small" sx={{ justifyContent: 'flex-start', textTransform: 'none', px: 0 }} onClick={() => setSelectedOpportunity(opportunity)}>{opportunity.name}</Button></TableCell>
                      <TableCell>{opportunity.targetCustomers}</TableCell>
                      <TableCell><Chip size="small" label={statusMeta.label} color={statusMeta.color} variant="outlined" /></TableCell>
                      <TableCell>{opportunity.nextStep || 'No next step set'}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                          <Button size="small" startIcon={<PersonAddAlt1OutlinedIcon />} onClick={() => handleAssignToMeAndStart(opportunity)} disabled={!canStartWork}>{actionLabel}</Button>
                          {canManageUsers && (
                            <>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<PersonOutlineIcon />}
                                onClick={() => handleOpenReassignModal(opportunity)}
                                sx={{ textTransform: 'none' }}
                              >
                                Edit Assignee
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                variant="text"
                                onClick={() => handleMakeUnassigned(opportunity)}
                                sx={{ textTransform: 'none' }}
                              >
                                Unassign
                              </Button>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {assignmentRows.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}><Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>No opportunity assignments yet. Start working from an opportunity detail view.</Typography><Button size="small" onClick={() => setActiveTab(1)}>Browse opportunities</Button></TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={selectedOpportunity !== null} onClose={() => setSelectedOpportunity(null)} fullWidth maxWidth="md">
        {selectedOpportunity && (
          <>
            <DialogTitle sx={{ pb: 1 }}>{selectedOpportunity.name}</DialogTitle>
            <DialogContent>
              <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                <Chip size="small" label={selectedOpportunity.category} />
                <Chip size="small" label={VALIDATION_STATUSES.find((status) => status.value === (selectedOpportunity.validationStatus ?? 'not_validated'))?.label ?? 'Not validated'} color={selectedOpportunity.validationStatus === 'validated' ? 'success' : 'default'} variant="outlined" />
                {selectedOpportunity.shortlistRank ? <Chip size="small" icon={<StarOutlineIcon />} label={`Shortlist #${selectedOpportunity.shortlistRank}`} color="warning" variant="outlined" /> : null}
              </Stack>
              <Grid2 container spacing={1.5}>
                <OpportunityDetail label="Target customers" value={selectedOpportunity.targetCustomers} />
                <OpportunityDetail label="Similar tools in market" value={selectedOpportunity.competitors} />
                <OpportunityDetail label="Problem to solve" value={selectedOpportunity.problemStatement} />
                <OpportunityDetail label="Differentiator" value={selectedOpportunity.differentiator} />
                <OpportunityDetail label="Difficulty and MVP estimate" value={`${selectedOpportunity.difficulty} · ${selectedOpportunity.mvpTime || 'Not estimated'}`} />
                <OpportunityDetail label="Suggested selling price" value={selectedOpportunity.shortlistPrice ?? selectedOpportunity.suggestedPrice} />
                <OpportunityDetail label="Customer interview evidence" value={selectedOpportunity.customerEvidence} />
                <OpportunityDetail label="MVP scope" value={selectedOpportunity.mvpScope} />
                <OpportunityDetail label="Investment estimate" value={selectedOpportunity.investmentEstimate} />
                <OpportunityDetail label="Revenue potential" value={selectedOpportunity.revenuePotential} />
                <OpportunityDetail label="Sales difficulty" value={selectedOpportunity.salesDifficulty} />
                <OpportunityDetail label="Small-team suitability" value={selectedOpportunity.teamFit} />
                <OpportunityDetail label="Next validation step" value={selectedOpportunity.nextStep} />
                <OpportunityDetail label="Research note" value={selectedOpportunity.rationale} />
                <OpportunityDetail label="Work status" value={WORK_STATUSES.find((status) => status.value === (selectedOpportunity.workStatus ?? 'not_started'))?.label ?? 'Not started'} />
                <OpportunityDetail label="Assigned to" value={(selectedOpportunity.assigneeIds ?? []).map((id) => {
                  const assignee = assignableUsers.find((user) => user.id === id);
                  const sharedAssignment = assignmentPeople.find((item) => item.opportunityId === selectedOpportunity.id && item.userId === id);
                  return (assignee && (getUserDisplayName(assignee) || assignee.email)) || sharedAssignment?.userName || sharedAssignment?.userEmail || 'Unavailable teammate';
                }).join(', ') || 'Unassigned'} />
              </Grid2>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setSelectedOpportunity(null)}>Close</Button>
              <Button variant="outlined" startIcon={<PersonAddAlt1OutlinedIcon />} onClick={() => handleAssignToMeAndStart(selectedOpportunity)} disabled={!currentUser || ((selectedOpportunity.assigneeIds ?? []).includes(currentUser.id) && selectedOpportunity.workStatus === 'in_progress')}>
                {(selectedOpportunity.assigneeIds ?? []).includes(currentUser?.id ?? '') ? 'Start working' : 'Assign to me & start'}
              </Button>
              {canManageUsers && (
                <Button
                  variant="outlined"
                  startIcon={<PersonOutlineIcon />}
                  onClick={() => handleOpenReassignModal(selectedOpportunity)}
                >
                  Edit Assignee
                </Button>
              )}
              <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => openEditOpportunity(selectedOpportunity)}>Edit opportunity</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={opportunityDialogOpen} onClose={() => setOpportunityDialogOpen(false)} fullWidth maxWidth="md" scroll="paper">
        <Box component="form" onSubmit={handleSaveOpportunity}>
          <DialogTitle>{editingOpportunityId ? 'Edit opportunity' : 'Add a product opportunity'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField autoFocus required label="Product or CRM name" value={opportunityForm.name} onChange={(event) => handleOpportunityFieldChange('name', event.target.value)} />
              <FormControl fullWidth>
                <InputLabel id="new-category-label">Category</InputLabel>
                <Select labelId="new-category-label" label="Category" value={opportunityForm.category} onChange={(event) => handleOpportunityFieldChange('category', event.target.value)}>
                  {PRODUCT_CATEGORIES.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="assignees-label">Assign teammates</InputLabel>
                <Select
                  multiple
                  disabled={!canManageUsers || !editingOpportunityId}
                  labelId="assignees-label"
                  label="Assign teammates"
                  value={opportunityForm.assigneeIds}
                  onChange={(event) => handleOpportunityFieldChange('assigneeIds', typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value as string[])}
                  renderValue={(selected) => (
                    <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.5}>
                      {(selected as string[]).map((id) => {
                        const teammate = assignableUsers.find((user) => user.id === id);
                        return <Chip key={id} size="small" label={teammate ? getUserDisplayName(teammate) || teammate.email : 'Unavailable teammate'} />;
                      })}
                    </Stack>
                  )}
                >
                  {assignableUsers.map((teammate) => <MenuItem key={teammate.id} value={teammate.id}>{getUserDisplayName(teammate) || teammate.email}</MenuItem>)}
                </Select>
                {!editingOpportunityId && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75 }}>Save this opportunity first, then assign teammates from its detail view.</Typography>}
                {!canManageUsers && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75 }}>Only account managers can change teammate assignments. Use Assign to me & start to take ownership.</Typography>}
                {canManageUsers && assignableUsers.length <= 1 && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75 }}>No other team accounts are available to assign.</Typography>}
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="work-status-label">Work status</InputLabel>
                <Select disabled={!canManageUsers || !editingOpportunityId} labelId="work-status-label" label="Work status" value={opportunityForm.workStatus} onChange={(event) => handleOpportunityFieldChange('workStatus', event.target.value as OpportunityWorkStatus)}>
                  {WORK_STATUSES.map((status) => <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField required label="Target customers" value={opportunityForm.targetCustomers} onChange={(event) => handleOpportunityFieldChange('targetCustomers', event.target.value)} />
              <TextField label="Similar tools in market" value={opportunityForm.competitors} onChange={(event) => handleOpportunityFieldChange('competitors', event.target.value)} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel id="new-difficulty-label">Difficulty</InputLabel>
                  <Select labelId="new-difficulty-label" label="Difficulty" value={opportunityForm.difficulty} onChange={(event) => handleOpportunityFieldChange('difficulty', event.target.value)}>
                    {DIFFICULTIES.map((difficulty) => <MenuItem key={difficulty} value={difficulty}>{difficulty}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField fullWidth label="MVP development time" placeholder="6–8 weeks" value={opportunityForm.mvpTime} onChange={(event) => handleOpportunityFieldChange('mvpTime', event.target.value)} />
              </Stack>
              <TextField label="Suggested selling price" placeholder="₹999–₹2,999/month" value={opportunityForm.suggestedPrice} onChange={(event) => handleOpportunityFieldChange('suggestedPrice', event.target.value)} />
              <FormControl fullWidth>
                <InputLabel id="validation-status-label">Validation status</InputLabel>
                <Select labelId="validation-status-label" label="Validation status" value={opportunityForm.validationStatus} onChange={(event) => handleOpportunityFieldChange('validationStatus', event.target.value as OpportunityValidationStatus)}>
                  {VALIDATION_STATUSES.map((status) => <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField multiline minRows={2} label="Problem to solve" value={opportunityForm.problemStatement} onChange={(event) => handleOpportunityFieldChange('problemStatement', event.target.value)} />
              <TextField multiline minRows={2} label="Differentiator" value={opportunityForm.differentiator} onChange={(event) => handleOpportunityFieldChange('differentiator', event.target.value)} />
              <TextField multiline minRows={2} label="Customer interview evidence" value={opportunityForm.customerEvidence} onChange={(event) => handleOpportunityFieldChange('customerEvidence', event.target.value)} />
              <TextField multiline minRows={2} label="MVP scope" value={opportunityForm.mvpScope} onChange={(event) => handleOpportunityFieldChange('mvpScope', event.target.value)} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth label="Investment estimate" placeholder="₹75k–₹2L" value={opportunityForm.investmentEstimate} onChange={(event) => handleOpportunityFieldChange('investmentEstimate', event.target.value)} />
                <TextField fullWidth label="Revenue potential" placeholder="Low, medium, high" value={opportunityForm.revenuePotential} onChange={(event) => handleOpportunityFieldChange('revenuePotential', event.target.value)} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth label="Sales difficulty" value={opportunityForm.salesDifficulty} onChange={(event) => handleOpportunityFieldChange('salesDifficulty', event.target.value)} />
                <TextField fullWidth label="Small-team suitability" value={opportunityForm.teamFit} onChange={(event) => handleOpportunityFieldChange('teamFit', event.target.value)} />
              </Stack>
              <TextField label="Next validation step" value={opportunityForm.nextStep} onChange={(event) => handleOpportunityFieldChange('nextStep', event.target.value)} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpportunityDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">{editingOpportunityId ? 'Save changes' : 'Add to catalog'}</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Reassign / Edit Assignee Dialog */}
      <Dialog
        open={reassignOpportunity !== null}
        onClose={() => setReassignOpportunity(null)}
        fullWidth
        maxWidth="sm"
      >
        {reassignOpportunity && (
          <>
            <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" fontWeight={800}>
                Edit Assignee & Work Status
              </Typography>
              <IconButton size="small" onClick={() => setReassignOpportunity(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Stack spacing={2.5}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                    border: 1,
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                  }}
                >
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    OPPORTUNITY
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {reassignOpportunity.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {reassignOpportunity.targetCustomers}
                  </Typography>
                </Box>

                <FormControl fullWidth>
                  <InputLabel id="reassign-teammate-label">Assignee</InputLabel>
                  <Select
                    labelId="reassign-teammate-label"
                    label="Assignee"
                    value={reassignUserIds[0] || 'unassigned'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'unassigned') {
                        setReassignUserIds([]);
                        setReassignWorkStatus('not_started');
                      } else {
                        setReassignUserIds([val]);
                        if (reassignWorkStatus === 'not_started') {
                          setReassignWorkStatus('in_progress');
                        }
                      }
                    }}
                  >
                    <MenuItem value="unassigned">
                      <em>Unassigned (No teammate assigned)</em>
                    </MenuItem>
                    {assignableUsers.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {getUserDisplayName(u) || u.email}
                            </Typography>
                            {u.email && (
                              <Typography variant="caption" color="text.secondary">
                                {u.email}
                              </Typography>
                            )}
                          </Box>
                          <Chip
                            size="small"
                            label={u.role || 'User'}
                            sx={{ height: 20, fontSize: '0.65rem', textTransform: 'capitalize' }}
                          />
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel id="reassign-work-status-label">Work Status</InputLabel>
                  <Select
                    labelId="reassign-work-status-label"
                    label="Work Status"
                    value={reassignWorkStatus}
                    onChange={(e) => setReassignWorkStatus(e.target.value as OpportunityWorkStatus)}
                  >
                    {WORK_STATUSES.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Assigned Next Step"
                  value={reassignNextStep}
                  onChange={(e) => setReassignNextStep(e.target.value)}
                  placeholder="e.g. Talk to 3 local business owners this week"
                  size="small"
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
              <Button
                color="error"
                variant="text"
                onClick={() => {
                  setReassignUserIds([]);
                  setReassignWorkStatus('not_started');
                }}
              >
                Make Unassigned
              </Button>
              <Stack direction="row" spacing={1}>
                <Button onClick={() => setReassignOpportunity(null)}>Cancel</Button>
                <Button variant="contained" onClick={handleSaveReassign}>
                  Save Assignment
                </Button>
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={todoDialogOpen} onClose={() => setTodoDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleAddTodo}>
          <DialogTitle>Add project task</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField autoFocus required label="Task" value={newTodo.title} onChange={(event) => setNewTodo({ ...newTodo, title: event.target.value })} />
              <TextField label="Due date" type="date" value={newTodo.dueDate} onChange={(event) => setNewTodo({ ...newTodo, dueDate: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setTodoDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Add task</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}

function OpportunityRow({ item, onSelect }: Readonly<{ item: ProductOpportunity; onSelect: (item: ProductOpportunity) => void }>) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(item);
    }
  };

  return (
    <TableRow hover role="button" tabIndex={0} aria-label={`View details for ${item.name}`} onClick={() => onSelect(item)} onKeyDown={handleKeyDown} sx={{ cursor: 'pointer', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' } }}>
      <TableCell sx={{ minWidth: 190 }}>
        <Typography variant="body2" fontWeight={700}>{item.name}</Typography>
        <Typography variant="caption" color="text.secondary">{item.category}</Typography>
      </TableCell>
      <TableCell sx={{ minWidth: 170 }}>{item.targetCustomers}</TableCell>
      <TableCell sx={{ minWidth: 170 }}>{item.competitors || '—'}</TableCell>
      <TableCell><Chip size="small" label={item.difficulty} variant="outlined" /></TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.mvpTime || '—'}</TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{item.suggestedPrice || '—'}</TableCell>
      <TableCell align="center">{item.shortlistRank ? <Chip size="small" icon={<StarOutlineIcon />} label={`#${item.shortlistRank}`} color="warning" variant="outlined" /> : '—'}</TableCell>
    </TableRow>
  );
}

function OpportunityDetail({ label, value }: Readonly<{ label: string; value?: string }>) {
  return (
    <Grid2 size={{ xs: 12, sm: 6 }}>
      <Box sx={{ height: '100%', p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
        <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{value?.trim() || 'Not added yet'}</Typography>
      </Box>
    </Grid2>
  );
}