import { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Button, Tabs, Tab, Grid, Card, CardContent, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Stack, Avatar, LinearProgress,
  Checkbox, Tooltip, alpha, useTheme, Stepper, Step, StepLabel, FormControlLabel
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import ListAltIcon from '@mui/icons-material/ListAlt';
import LaptopIcon from '@mui/icons-material/Laptop';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../hooks/storeHooks';
import { updateOnboardingTask, addOnboarding, updateOffboarding, EmployeeOnboarding } from '../../../store/onboardingSlice';
import { PageHeader } from '../../../components/PageHeader';

const CATEGORY_COLORS: Record<string, string> = {
  documentation: '#667eea', it_setup: '#4facfe', training: '#43e97b',
  administrative: '#f7971e', introductions: '#f093fb',
};

export function OnboardingPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const employees = useAppSelector(s => s.employees.items);
  const onboardings = useAppSelector(s => s.onboarding.onboardings);
  const offboardings = useAppSelector(s => s.onboarding.offboardings);
  const templates = useAppSelector(s => s.onboarding.templates);

  const [activeTab, setActiveTab] = useState(0);
  const [selectedOb, setSelectedOb] = useState<EmployeeOnboarding | null>(null);
  const [addObOpen, setAddObOpen] = useState(false);
  const [newObEmpId, setNewObEmpId] = useState('');
  const [newObStartDate, setNewObStartDate] = useState(new Date().toISOString().split('T')[0]);

  const getEmpName = (id: string) => { const e = employees.find(x => x.id === id); return e ? `${e.firstName} ${e.lastName}` : 'Unknown'; };
  const getEmpJobTitle = (id: string) => employees.find(x => x.id === id)?.jobTitle || '';

  const getProgress = (ob: EmployeeOnboarding) => {
    if (ob.tasks.length === 0) return 0;
    return Math.round((ob.tasks.filter(t => t.completed).length / ob.tasks.length) * 100);
  };

  const handleToggleTask = (obId: string, templateId: string, completed: boolean) => {
    dispatch(updateOnboardingTask({ onboardingId: obId, templateId, completed }));
    if (selectedOb) {
      setSelectedOb(prev => prev ? {
        ...prev,
        tasks: prev.tasks.map(t => t.templateId === templateId ? { ...t, completed, completedAt: completed ? new Date().toISOString() : null } : t)
      } : null);
    }
  };

  const handleAddOnboarding = () => {
    if (!newObEmpId || !newObStartDate) return;
    dispatch(addOnboarding({
      employeeId: newObEmpId,
      startDate: newObStartDate,
      status: 'in_progress',
      tasks: templates.map(t => ({ templateId: t.id, completed: false, completedAt: null, notes: '' })),
      buddyId: null,
      welcomeKitSent: false,
    }));
    setAddObOpen(false);
    setNewObEmpId('');
  };

  return (
    <Box>
      <PageHeader
        title="Onboarding & Offboarding"
        subtitle="Manage employee onboarding checklists, exit processes, and template configuration."
        breadcrumbs={[{ label: 'HR Portal', to: '/hr' }, { label: 'Onboarding' }]}
      />

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mt: 3, mb: 3 }}>
        <Tab icon={<RocketLaunchIcon fontSize="small" />} iconPosition="start" label="Active Onboardings" />
        <Tab icon={<ExitToAppIcon fontSize="small" />} iconPosition="start" label="Offboarding" />
        <Tab icon={<ListAltIcon fontSize="small" />} iconPosition="start" label="Checklist Templates" />
      </Tabs>

      {activeTab === 0 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={700}>Active Onboardings ({onboardings.length})</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddObOpen(true)}>Start Onboarding</Button>
          </Stack>

          <Grid container spacing={3}>
            {onboardings.map(ob => {
              const prog = getProgress(ob);
              const completedTasks = ob.tasks.filter(t => t.completed).length;
              return (
                <Grid item xs={12} md={6} key={ob.id}>
                  <Card sx={{
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                    transition: 'all 0.2s',
                    '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' }
                  }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {getEmpName(ob.employeeId)[0]}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="subtitle1" fontWeight={700} sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
                              onClick={() => navigate(`/hr/employees/${ob.employeeId}`)}
                            >
                              {getEmpName(ob.employeeId)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">{getEmpJobTitle(ob.employeeId)}</Typography>
                          </Box>
                        </Stack>
                        <Chip
                          label={ob.status.replace('_', ' ')}
                          color={ob.status === 'completed' ? 'success' : 'primary'}
                          size="small" sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                        />
                      </Stack>

                      <Box sx={{ mt: 2, mb: 1 }}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Progress: {completedTasks}/{ob.tasks.length} tasks</Typography>
                          <Typography variant="caption" fontWeight={700} color={prog === 100 ? 'success.main' : 'primary.main'}>{prog}%</Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate" value={prog}
                          sx={{ mt: 0.5, height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': { borderRadius: 4 } }}
                          color={prog === 100 ? 'success' : 'primary'}
                        />
                      </Box>

                      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">Start: <strong>{ob.startDate}</strong></Typography>
                        {ob.welcomeKitSent && <Chip label="Kit Sent" size="small" color="success" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />}
                      </Stack>

                      <Button
                        variant="outlined" size="small" sx={{ mt: 2 }}
                        onClick={() => setSelectedOb(ob)}
                      >
                        View Checklist
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Offboarding Records</Typography>
          {offboardings.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <Typography color="text.secondary">No active offboarding records.</Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {offboardings.map(off => (
                <Paper key={off.id} sx={{ p: 3, borderRadius: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: 'error.main' }}>{getEmpName(off.employeeId)[0]}</Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ cursor: 'pointer', color: 'primary.main' }} onClick={() => navigate(`/hr/employees/${off.employeeId}`)}>
                          {getEmpName(off.employeeId)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Exit Date: {off.exitDate} · {off.reason.replace('_', ' ')}</Typography>
                      </Box>
                    </Stack>
                    <Chip label={off.reason.replace('_', ' ')} size="small" color="error" variant="outlined" sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
                  </Stack>
                  <Grid container spacing={2}>
                    {[
                      { label: 'Exit Interview', done: off.exitInterviewDone },
                      { label: 'Assets Returned', done: off.assetsReturned, link: true },
                      { label: 'Access Revoked', done: off.accessRevoked },
                      { label: 'Docs Cleared', done: off.docsCleared },
                      { label: 'Final Settlement', done: off.finalSettlementDone },
                    ].map(item => (
                      <Grid item xs={12} sm={4} md={2.4} key={item.label}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {item.done ? <CheckCircleIcon color="success" fontSize="small" /> : <RadioButtonUncheckedIcon color="disabled" fontSize="small" />}
                          <Typography variant="body2" color={item.done ? 'success.main' : 'text.secondary'} fontWeight={item.done ? 600 : 400}>
                            {item.label}
                          </Typography>
                          {item.link && !item.done && (
                            <Tooltip title="View assigned assets">
                              <IconButton size="small" onClick={() => navigate('/assets')}>
                                <LaptopIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </Grid>
                    ))}
                  </Grid>
                  {off.notes && <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, fontStyle: 'italic' }}>Note: {off.notes}</Typography>}
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Onboarding Task Templates ({templates.length} tasks)</Typography>
          <Grid container spacing={2}>
            {templates.map((t, i) => (
              <Grid item xs={12} sm={6} md={4} key={t.id}>
                <Card sx={{ borderRadius: 2, border: `1px solid ${alpha(CATEGORY_COLORS[t.category] || '#667eea', 0.2)}` }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                      <Chip label={t.category.replace('_', ' ')} size="small" sx={{ bgcolor: CATEGORY_COLORS[t.category] || '#667eea', color: '#fff', fontWeight: 600, textTransform: 'capitalize' }} />
                      <Chip label={`Day ${t.dueOffsetDays}`} size="small" variant="outlined" />
                    </Stack>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1 }}>{t.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t.description}</Typography>
                    {t.required && <Chip label="Required" size="small" color="error" variant="outlined" sx={{ mt: 1, height: 20, fontSize: '0.65rem' }} />}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Checklist Detail Dialog */}
      <Dialog open={!!selectedOb} onClose={() => setSelectedOb(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Onboarding Checklist — {selectedOb ? getEmpName(selectedOb.employeeId) : ''}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            {selectedOb?.tasks.map(task => {
              const tmpl = templates.find(t => t.id === task.templateId);
              if (!tmpl) return null;
              return (
                <Box key={task.templateId} sx={{
                  p: 1.5, borderRadius: 2,
                  bgcolor: task.completed ? alpha('#4caf50', 0.06) : alpha(theme.palette.action.hover, 0.5),
                  border: `1px solid ${task.completed ? alpha('#4caf50', 0.2) : alpha(theme.palette.divider, 0.5)}`,
                }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={task.completed}
                        onChange={e => handleToggleTask(selectedOb.id, task.templateId, e.target.checked)}
                        color="success"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={600} sx={{ textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'text.secondary' : 'text.primary' }}>
                          {tmpl.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{tmpl.description}</Typography>
                        {task.completedAt && (
                          <Typography variant="caption" color="success.main" display="block">
                            ✓ Completed {new Date(task.completedAt).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', m: 0 }}
                  />
                </Box>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedOb(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Onboarding Dialog */}
      <Dialog open={addObOpen} onClose={() => setAddObOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Start New Onboarding</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField select fullWidth label="Select Employee" value={newObEmpId} onChange={e => setNewObEmpId(e.target.value)}>
              {employees.map(e => <MenuItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</MenuItem>)}
            </TextField>
            <TextField fullWidth label="Start Date" type="date" InputLabelProps={{ shrink: true }} value={newObStartDate} onChange={e => setNewObStartDate(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddObOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleAddOnboarding} variant="contained">Start Onboarding</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default OnboardingPage;
