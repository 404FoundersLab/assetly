import { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Button, Tabs, Tab, Grid, Card, CardContent, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Stack, Avatar, LinearProgress,
  Rating, alpha, useTheme, Divider, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import FeedbackIcon from '@mui/icons-material/Feedback';
import StarIcon from '@mui/icons-material/Star';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../hooks/storeHooks';
import { updateGoal, addGoal, deleteGoal, updateReview, Goal, PerformanceReview } from '../../../store/performanceSlice';
import { PageHeader } from '../../../components/PageHeader';
import { BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

const RATING_COLORS: Record<number, string> = { 1: '#ef5350', 2: '#ff9800', 3: '#ffc107', 4: '#66bb6a', 5: '#42a5f5' };
const RATING_LABELS: Record<number, string> = { 1: 'Poor', 2: 'Below Avg', 3: 'Average', 4: 'Good', 5: 'Excellent' };
const STATUS_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error' | 'primary'> = {
  not_started: 'default', in_progress: 'primary', completed: 'success', overdue: 'error',
  draft: 'default', cancelled: 'default',
};

export function PerformancePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const employees = useAppSelector(s => s.employees.items);
  const reviews = useAppSelector(s => s.performance.reviews);
  const goals = useAppSelector(s => s.performance.goals);

  const [activeTab, setActiveTab] = useState(0);
  const [reviewDetailOpen, setReviewDetailOpen] = useState<PerformanceReview | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalForm, setGoalForm] = useState({ employeeId: '', title: '', description: '', dueDate: '', progress: 0, status: 'not_started' as Goal['status'] });

  const getEmpName = (id: string) => { const e = employees.find(x => x.id === id); return e ? `${e.firstName} ${e.lastName}` : 'Unknown'; };

  const stats = useMemo(() => {
    const completed = reviews.filter(r => r.status === 'completed');
    const avgRating = completed.length > 0
      ? completed.filter(r => r.rating).reduce((s, r) => s + (r.rating || 0), 0) / completed.filter(r => r.rating).length
      : 0;
    return {
      total: reviews.length,
      completed: completed.length,
      inProgress: reviews.filter(r => r.status === 'in_progress').length,
      avgRating: Math.round(avgRating * 10) / 10,
      overdueGoals: goals.filter(g => g.status === 'overdue').length,
      completedGoals: goals.filter(g => g.status === 'completed').length,
    };
  }, [reviews, goals]);

  const ratingDistData = useMemo(() => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.filter(r => r.rating).forEach(r => { if (r.rating) dist[r.rating]++; });
    return Object.entries(dist).map(([r, count]) => ({ name: RATING_LABELS[Number(r)], count, fill: RATING_COLORS[Number(r)] }));
  }, [reviews]);

  const handleGoalSubmit = () => {
    if (!goalForm.employeeId || !goalForm.title || !goalForm.dueDate) return alert('Fill required fields.');
    if (editingGoal) {
      dispatch(updateGoal({ ...editingGoal, ...goalForm }));
    } else {
      dispatch(addGoal({ ...goalForm, progress: Number(goalForm.progress) }));
    }
    setGoalDialogOpen(false);
    setEditingGoal(null);
    setGoalForm({ employeeId: '', title: '', description: '', dueDate: '', progress: 0, status: 'not_started' });
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalForm({ employeeId: goal.employeeId, title: goal.title, description: goal.description, dueDate: goal.dueDate, progress: goal.progress, status: goal.status });
    setGoalDialogOpen(true);
  };

  return (
    <Box>
      <PageHeader
        title="Performance Reviews"
        subtitle="Manage review cycles, track employee goals, and monitor performance ratings."
        breadcrumbs={[{ label: 'HR Portal', to: '/hr' }, { label: 'Performance' }]}
      />

      {/* KPI Row */}
      <Grid container spacing={2.5} sx={{ mt: 2, mb: 3 }}>
        {[
          { label: 'Reviews Completed', value: stats.completed, color: '#4caf50' },
          { label: 'In Progress', value: stats.inProgress, color: '#2196f3' },
          { label: 'Avg Rating', value: stats.avgRating > 0 ? `${stats.avgRating}/5` : '—', color: '#f7971e' },
          { label: 'Overdue Goals', value: stats.overdueGoals, color: '#f44336' },
        ].map(s => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <Card sx={{ border: `1px solid ${alpha(s.color, 0.3)}`, background: `linear-gradient(135deg, ${alpha(s.color, 0.1)} 0%, ${alpha(s.color, 0.04)} 100%)` }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: s.color, width: 44, height: 44 }}><EmojiEventsIcon /></Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>{s.label}</Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab icon={<EmojiEventsIcon fontSize="small" />} iconPosition="start" label="Review Cycles" />
        <Tab icon={<TrackChangesIcon fontSize="small" />} iconPosition="start" label="Goal Tracker" />
        <Tab icon={<FeedbackIcon fontSize="small" />} iconPosition="start" label="Rating Analytics" />
      </Tabs>

      {activeTab === 0 && (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {['Employee', 'Period', 'Self Rating', 'Manager Rating', 'Status', 'Scheduled', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {reviews.map(rev => (
                  <TableRow key={rev.id} hover>
                    <TableCell>
                      <Typography
                        variant="body2" fontWeight={600} sx={{ cursor: 'pointer', color: 'primary.main' }}
                        onClick={() => navigate(`/hr/employees/${rev.employeeId}`)}
                      >
                        {getEmpName(rev.employeeId)}
                      </Typography>
                    </TableCell>
                    <TableCell><Chip label={rev.period} variant="outlined" size="small" /></TableCell>
                    <TableCell>
                      {rev.selfRating ? (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <StarIcon sx={{ fontSize: 16, color: RATING_COLORS[rev.selfRating] }} />
                          <Typography variant="body2" fontWeight={600}>{rev.selfRating}/5</Typography>
                        </Stack>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {rev.rating ? (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <StarIcon sx={{ fontSize: 16, color: RATING_COLORS[rev.rating] }} />
                          <Typography variant="body2" fontWeight={700} sx={{ color: RATING_COLORS[rev.rating] }}>{rev.rating}/5</Typography>
                        </Stack>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip label={rev.status.replace('_', ' ')} color={STATUS_COLOR[rev.status]} size="small" sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
                    </TableCell>
                    <TableCell><Typography variant="body2">{new Date(rev.scheduledDate).toLocaleDateString()}</Typography></TableCell>
                    <TableCell>
                      <Tooltip title="View details">
                        <IconButton size="small" color="primary" onClick={() => setReviewDetailOpen(rev)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {activeTab === 1 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={700}>Employee Goals</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingGoal(null); setGoalForm({ employeeId: '', title: '', description: '', dueDate: '', progress: 0, status: 'not_started' }); setGoalDialogOpen(true); }}>
              Add Goal
            </Button>
          </Stack>
          <Stack spacing={2}>
            {goals.map(goal => (
              <Paper key={goal.id} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${alpha(goal.status === 'overdue' ? theme.palette.error.main : theme.palette.divider, 0.3)}` }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <Typography variant="body1" fontWeight={700}>{goal.title}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer', color: 'primary.main' }} onClick={() => navigate(`/hr/employees/${goal.employeeId}`)}>
                      {getEmpName(goal.employeeId)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Progress</Typography>
                      <Typography variant="caption" fontWeight={700}>{goal.progress}%</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate" value={goal.progress}
                      color={goal.status === 'overdue' ? 'error' : goal.progress >= 80 ? 'success' : 'primary'}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <Typography variant="caption" color="text.secondary" display="block">Due Date</Typography>
                    <Typography variant="body2" fontWeight={600} color={goal.status === 'overdue' ? 'error.main' : 'text.primary'}>
                      {goal.dueDate}
                    </Typography>
                  </Grid>
                  <Grid item xs={4} md={2}>
                    <Chip label={goal.status.replace('_', ' ')} color={STATUS_COLOR[goal.status]} size="small" sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
                  </Grid>
                  <Grid item xs={2} md={1}>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => handleEditGoal(goal)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => dispatch(deleteGoal(goal.id))}><DeleteIcon fontSize="small" /></IconButton>
                    </Stack>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Rating Distribution</Typography>
              <Box sx={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ratingDistData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <ChartTooltip />
                    <Bar dataKey="count" name="Employees" radius={[4, 4, 0, 0]}>
                      {ratingDistData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Top Performers</Typography>
              <Stack spacing={1.5}>
                {reviews.filter(r => r.rating && r.rating >= 4).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5).map(rev => (
                  <Stack key={rev.id} direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ width: 32, height: 32, bgcolor: RATING_COLORS[rev.rating!], fontSize: '0.75rem' }}>
                        {getEmpName(rev.employeeId)[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600} sx={{ cursor: 'pointer', color: 'primary.main' }} onClick={() => navigate(`/hr/employees/${rev.employeeId}`)}>
                          {getEmpName(rev.employeeId)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{rev.period}</Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <StarIcon sx={{ color: RATING_COLORS[rev.rating!], fontSize: 18 }} />
                      <Typography variant="body2" fontWeight={700} sx={{ color: RATING_COLORS[rev.rating!] }}>{rev.rating}/5 · {RATING_LABELS[rev.rating!]}</Typography>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Review Detail Dialog */}
      <Dialog open={!!reviewDetailOpen} onClose={() => setReviewDetailOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Review — {reviewDetailOpen ? getEmpName(reviewDetailOpen.employeeId) : ''} · {reviewDetailOpen?.period}
        </DialogTitle>
        <DialogContent dividers>
          {reviewDetailOpen && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Self Rating</Typography>
                  <Rating value={reviewDetailOpen.selfRating} readOnly max={5} />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Manager Rating</Typography>
                  <Rating value={reviewDetailOpen.rating} readOnly max={5} />
                </Grid>
              </Grid>
              {reviewDetailOpen.strengths && (
                <Box sx={{ p: 2, bgcolor: alpha('#4caf50', 0.06), borderRadius: 2, border: `1px solid ${alpha('#4caf50', 0.2)}` }}>
                  <Typography variant="caption" color="success.main" fontWeight={700} display="block" gutterBottom>Strengths</Typography>
                  <Typography variant="body2">{reviewDetailOpen.strengths}</Typography>
                </Box>
              )}
              {reviewDetailOpen.improvements && (
                <Box sx={{ p: 2, bgcolor: alpha('#ff9800', 0.06), borderRadius: 2, border: `1px solid ${alpha('#ff9800', 0.2)}` }}>
                  <Typography variant="caption" color="warning.main" fontWeight={700} display="block" gutterBottom>Areas for Improvement</Typography>
                  <Typography variant="body2">{reviewDetailOpen.improvements}</Typography>
                </Box>
              )}
              {reviewDetailOpen.managerFeedback && (
                <Box sx={{ p: 2, bgcolor: alpha('#2196f3', 0.06), borderRadius: 2, border: `1px solid ${alpha('#2196f3', 0.2)}` }}>
                  <Typography variant="caption" color="primary.main" fontWeight={700} display="block" gutterBottom>Manager Feedback</Typography>
                  <Typography variant="body2">{reviewDetailOpen.managerFeedback}</Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDetailOpen(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Goal Dialog */}
      <Dialog open={goalDialogOpen} onClose={() => setGoalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingGoal ? 'Edit Goal' : 'Add New Goal'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField select fullWidth label="Employee" value={goalForm.employeeId} onChange={e => setGoalForm(p => ({ ...p, employeeId: e.target.value }))} required>
              {employees.map(e => <MenuItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</MenuItem>)}
            </TextField>
            <TextField fullWidth label="Goal Title" value={goalForm.title} onChange={e => setGoalForm(p => ({ ...p, title: e.target.value }))} required />
            <TextField fullWidth label="Description" multiline rows={2} value={goalForm.description} onChange={e => setGoalForm(p => ({ ...p, description: e.target.value }))} />
            <TextField fullWidth label="Due Date" type="date" InputLabelProps={{ shrink: true }} value={goalForm.dueDate} onChange={e => setGoalForm(p => ({ ...p, dueDate: e.target.value }))} required />
            <TextField fullWidth label="Progress (%)" type="number" inputProps={{ min: 0, max: 100 }} value={goalForm.progress} onChange={e => setGoalForm(p => ({ ...p, progress: Number(e.target.value) }))} />
            <TextField select fullWidth label="Status" value={goalForm.status} onChange={e => setGoalForm(p => ({ ...p, status: e.target.value as Goal['status'] }))}>
              {(['not_started', 'in_progress', 'completed', 'overdue'] as Goal['status'][]).map(s => (
                <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setGoalDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleGoalSubmit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PerformancePage;
