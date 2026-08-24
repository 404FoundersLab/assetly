import { useState, useMemo, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Stack, Avatar, Chip,
  IconButton, Button, Tabs, Tab, Divider, alpha, LinearProgress,
  List, ListItem, ListItemText, ListItemAvatar, ListItemSecondaryAction, Tooltip,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArchiveIcon from '@mui/icons-material/Archive';
import GavelIcon from '@mui/icons-material/Gavel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import SecurityIcon from '@mui/icons-material/Security';
import WorkIcon from '@mui/icons-material/Work';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import WifiIcon from '@mui/icons-material/Wifi';
import PeopleIcon from '@mui/icons-material/People';
import PolicyIcon from '@mui/icons-material/Policy';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useAppDispatch, useAppSelector } from '../../../hooks/storeHooks';
import { addCompanyPolicy, archiveCompanyPolicy, acknowledgePolicy, CompanyPolicy, PolicyCategory } from '../../../store/hrSlice';
import { PageHeader } from '../../../components/PageHeader';
import { extractPolicyTextFromFile } from '../../../utils/policyFileExtract';
import { isApiEnabled } from '../../../services/api/config';
import { ingestChatKnowledge } from '../../../services/api/knowledge';

const CATEGORY_META: Record<PolicyCategory, { label: string; color: string; icon: React.ReactNode }> = {
  general: { label: 'General', color: '#667eea', icon: <PolicyIcon /> },
  conduct: { label: 'Conduct', color: '#f093fb', icon: <PeopleIcon /> },
  safety: { label: 'Safety', color: '#4facfe', icon: <SecurityIcon /> },
  leave: { label: 'Leave', color: '#43e97b', icon: <WorkIcon /> },
  it: { label: 'IT', color: '#f7971e', icon: <WifiIcon /> },
  finance: { label: 'Finance', color: '#fa709a', icon: <CurrencyRupeeIcon /> },
  remote_work: { label: 'Remote Work', color: '#a18cd1', icon: <WorkIcon /> },
};

const CATEGORY_OPTIONS: PolicyCategory[] = ['general', 'conduct', 'safety', 'leave', 'it', 'finance', 'remote_work'];

const EMPTY_POLICY_FORM = {
  title: '',
  category: 'general' as PolicyCategory,
  version: '1.0',
  effectiveDate: new Date().toISOString().split('T')[0],
  content: '',
  requiresAcknowledgement: false,
  status: 'active' as 'active' | 'archived',
};

function guessCategoryFromName(name: string): PolicyCategory {
  const n = name.toLowerCase();
  if (/(leave|pto|time[\s_-]?off|vacation|maternity|paternity|sick)/.test(n)) return 'leave';
  if (/(remote|wfh|hybrid|flexible)/.test(n)) return 'remote_work';
  if (/(security|it[\s_-]|acceptable[\s_-]?use|password)/.test(n)) return 'it';
  if (/(expense|finance|reimburse|travel)/.test(n)) return 'finance';
  if (/(safety|health|ehs)/.test(n)) return 'safety';
  if (/(conduct|harassment|ethics|code)/.test(n)) return 'conduct';
  return 'general';
}

function titleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.(txt|md|markdown|docx|pdf)$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function HRPoliciesPage() {
  const dispatch = useAppDispatch();
  const employees = useAppSelector(s => s.employees.items);
  const companyPolicies = useAppSelector(s => s.hr.companyPolicies);
  const leavePolicies = useAppSelector(s => s.hr.policies);
  const currentUser = useAppSelector(s => s.auth.user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<PolicyCategory | 'all'>('all');
  const [selectedPolicy, setSelectedPolicy] = useState<CompanyPolicy | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState(EMPTY_POLICY_FORM);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const activePolicies = useMemo(() => companyPolicies.filter(p => p.status === 'active'), [companyPolicies]);
  const archivedPolicies = useMemo(() => companyPolicies.filter(p => p.status === 'archived'), [companyPolicies]);

  const filteredPolicies = useMemo(() => {
    const pool = activeTab === 0 ? activePolicies : archivedPolicies;
    if (categoryFilter === 'all') return pool;
    return pool.filter(p => p.category === categoryFilter);
  }, [activePolicies, archivedPolicies, categoryFilter, activeTab]);

  const getAckStats = (policy: CompanyPolicy) => {
    const acknowledged = policy.acknowledgements.length;
    const total = employees.filter(e => e.status === 'active').length;
    return { acknowledged, total, pct: total > 0 ? Math.round((acknowledged / total) * 100) : 0 };
  };

  const resetAddDialog = () => {
    setPolicyForm({ ...EMPTY_POLICY_FORM, effectiveDate: new Date().toISOString().split('T')[0] });
    setUploadedFileName(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openAddDialog = () => {
    resetAddDialog();
    setAddDialogOpen(true);
  };

  const handleFileSelected = async (file: File | null) => {
    setUploadError(null);
    if (!file) return;

    setUploading(true);
    try {
      const text = await extractPolicyTextFromFile(file);
      setUploadedFileName(file.name);
      setPolicyForm((prev) => ({
        ...prev,
        title: prev.title.trim() || titleFromFileName(file.name),
        category: prev.title.trim() ? prev.category : guessCategoryFromName(file.name),
        content: text,
      }));
      setAddDialogOpen(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not read that file.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddPolicy = () => {
    if (!policyForm.title.trim() || !policyForm.content.trim()) {
      setUploadError('Title and policy content are required.');
      return;
    }
    dispatch(addCompanyPolicy(policyForm));
    if (isApiEnabled()) {
      const nextPolicies = [
        {
          id: `pending-${Date.now()}`,
          title: policyForm.title,
          category: policyForm.category,
          version: policyForm.version,
          effectiveDate: policyForm.effectiveDate,
          content: policyForm.content,
          status: 'active' as const,
        },
        ...companyPolicies
          .filter((p) => p.status === 'active')
          .map((p) => ({
            id: p.id,
            title: p.title,
            category: p.category,
            version: p.version,
            effectiveDate: p.effectiveDate,
            content: p.content,
            status: p.status,
          })),
      ];
      void ingestChatKnowledge({
        hrPolicies: nextPolicies,
        leavePolicies: leavePolicies.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          maxDays: p.maxDays,
          description: p.description,
        })),
      }).catch(() => {});
    }
    setAddDialogOpen(false);
    resetAddDialog();
  };

  const handleAcknowledge = (policyId: string) => {
    if (!currentUser?.employeeId) return alert('No employee account linked to current user.');
    dispatch(acknowledgePolicy({ policyId, employeeId: currentUser.employeeId }));
  };

  return (
    <Box>
      <PageHeader
        title="Company Policies"
        subtitle="Manage company policy documents, track employee acknowledgements, and ensure compliance."
        breadcrumbs={[{ label: 'HR Portal', to: '/hr' }, { label: 'Company Policies' }]}
      />

      {/* Summary Stats */}
      <Grid container spacing={2.5} sx={{ mt: 2, mb: 3 }}>
        {[
          { label: 'Active Policies', value: activePolicies.length, color: '#667eea' },
          { label: 'Require Acknowledgement', value: activePolicies.filter(p => p.requiresAcknowledgement).length, color: '#f093fb' },
          { label: 'Fully Acknowledged', value: activePolicies.filter(p => { const s = getAckStats(p); return s.pct === 100; }).length, color: '#43e97b' },
          { label: 'Needs Attention', value: activePolicies.filter(p => p.requiresAcknowledgement && getAckStats(p).pct < 100).length, color: '#f44336' },
        ].map(s => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <Card sx={{ border: `1px solid ${alpha(s.color, 0.3)}`, background: `linear-gradient(135deg, ${alpha(s.color, 0.1)} 0%, ${alpha(s.color, 0.04)} 100%)` }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: s.color, width: 44, height: 44 }}><GavelIcon /></Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>{s.label}</Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs + Filter Row */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`Active (${activePolicies.length})`} />
          <Tab label={`Archived (${archivedPolicies.length})`} />
        </Tabs>
        <Stack direction="row" spacing={2}>
          <TextField select size="small" label="Category" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as PolicyCategory | 'all')} sx={{ minWidth: 160 }}>
            <MenuItem value="all">All Categories</MenuItem>
            {CATEGORY_OPTIONS.map(c => <MenuItem key={c} value={c}>{CATEGORY_META[c].label}</MenuItem>)}
          </TextField>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {uploading ? 'Reading file…' : 'Upload policy file'}
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog}>New Policy</Button>
        </Stack>
      </Stack>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.markdown,.docx,.pdf,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        hidden
        onChange={(e) => {
          handleFileSelected(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />

      {uploadError && !addDialogOpen && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setUploadError(null)}>
          {uploadError}
        </Alert>
      )}

      {/* Policy Cards Grid */}
      <Grid container spacing={2.5}>
        {filteredPolicies.map(policy => {
          const meta = CATEGORY_META[policy.category];
          const ackStats = getAckStats(policy);
          return (
            <Grid item xs={12} md={6} lg={4} key={policy.id}>
              <Card sx={{
                borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column',
                border: `1px solid ${alpha(meta.color, 0.2)}`,
                transition: 'all 0.2s',
                '&:hover': { boxShadow: `0 8px 24px ${alpha(meta.color, 0.2)}`, transform: 'translateY(-2px)' },
              }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                    <Avatar sx={{ bgcolor: meta.color, width: 40, height: 40 }}>{meta.icon}</Avatar>
                    <Stack spacing={0.5} alignItems="flex-end">
                      <Chip label={meta.label} size="small" sx={{ bgcolor: alpha(meta.color, 0.15), color: meta.color, fontWeight: 600 }} />
                      <Typography variant="caption" color="text.secondary">v{policy.version}</Typography>
                    </Stack>
                  </Stack>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>{policy.title}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                    Effective: {policy.effectiveDate}
                  </Typography>

                  {policy.requiresAcknowledgement && (
                    <Box sx={{ mt: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">Acknowledgements</Typography>
                        <Typography variant="caption" fontWeight={700} color={ackStats.pct === 100 ? 'success.main' : ackStats.pct < 70 ? 'error.main' : 'warning.main'}>
                          {ackStats.acknowledged}/{ackStats.total} ({ackStats.pct}%)
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate" value={ackStats.pct}
                        color={ackStats.pct === 100 ? 'success' : ackStats.pct < 70 ? 'error' : 'warning'}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  )}
                </CardContent>
                <Divider />
                <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button size="small" onClick={() => setSelectedPolicy(policy)} sx={{ fontWeight: 600 }}>View Policy</Button>
                  <Stack direction="row" spacing={0.5}>
                    {activeTab === 0 && (
                      <Tooltip title="Archive policy">
                        <IconButton size="small" onClick={() => { if (window.confirm('Archive this policy?')) dispatch(archiveCompanyPolicy(policy.id)); }}>
                          <ArchiveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Box>
              </Card>
            </Grid>
          );
        })}
        {filteredPolicies.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <Typography color="text.secondary">No policies found for the selected filter.</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Policy Detail Dialog */}
      <Dialog open={!!selectedPolicy} onClose={() => setSelectedPolicy(null)} maxWidth="md" fullWidth>
        {selectedPolicy && (
          <>
            <DialogTitle>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: CATEGORY_META[selectedPolicy.category].color }}>
                  {CATEGORY_META[selectedPolicy.category].icon}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>{selectedPolicy.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Version {selectedPolicy.version} · Effective {selectedPolicy.effectiveDate}
                  </Typography>
                </Box>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, mb: 3, whiteSpace: 'pre-wrap' }}>
                <Typography variant="body2" component="div" sx={{ lineHeight: 1.8 }}>
                  {selectedPolicy.content.replace(/\*\*(.*?)\*\*/g, '$1').replace(/^## /gm, '').replace(/^# /gm, '')}
                </Typography>
              </Box>

              {selectedPolicy.requiresAcknowledgement && (
                <Box>
                  <Typography variant="h6" fontWeight={700} gutterBottom>Acknowledgement Status</Typography>
                  <List dense>
                    {employees.filter(e => e.status === 'active').slice(0, 8).map(emp => {
                      const ack = selectedPolicy.acknowledgements.find(a => a.employeeId === emp.id);
                      return (
                        <ListItem key={emp.id} sx={{ px: 0 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: ack ? '#4caf50' : 'grey.400', fontSize: '0.75rem' }}>
                              {emp.firstName[0]}{emp.lastName[0]}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={<Typography variant="body2" fontWeight={600}>{emp.firstName} {emp.lastName}</Typography>}
                            secondary={ack ? `Acknowledged ${new Date(ack.acknowledgedAt).toLocaleDateString()}` : 'Not yet acknowledged'}
                          />
                          <ListItemSecondaryAction>
                            {ack ? <CheckCircleIcon color="success" fontSize="small" /> : <PendingIcon color="disabled" fontSize="small" />}
                          </ListItemSecondaryAction>
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
              <Button onClick={() => setSelectedPolicy(null)} color="inherit">Close</Button>
              {selectedPolicy.requiresAcknowledgement && (
                <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleAcknowledge(selectedPolicy.id)}>
                  Acknowledge Policy
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Add Policy Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => { setAddDialogOpen(false); resetAddDialog(); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Create Company Policy</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider',
                bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
                <Box>
                  <Typography variant="body2" fontWeight={700}>Upload from file</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Supports .txt, .md, Word (.docx), and PDF — text is extracted for the chatbot.
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<UploadFileIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
                >
                  {uploading ? 'Reading…' : 'Choose file'}
                </Button>
              </Stack>
              {uploadedFileName && (
                <Chip
                  icon={<InsertDriveFileIcon />}
                  label={uploadedFileName}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ mt: 1.5 }}
                  onDelete={() => {
                    setUploadedFileName(null);
                    setPolicyForm((p) => ({ ...p, content: '' }));
                  }}
                />
              )}
            </Box>

            {uploadError && (
              <Alert severity="warning" onClose={() => setUploadError(null)}>
                {uploadError}
              </Alert>
            )}

            <TextField fullWidth label="Policy Title" value={policyForm.title} onChange={e => setPolicyForm(p => ({ ...p, title: e.target.value }))} required />
            <Stack direction="row" spacing={2}>
              <TextField select fullWidth label="Category" value={policyForm.category} onChange={e => setPolicyForm(p => ({ ...p, category: e.target.value as PolicyCategory }))}>
                {CATEGORY_OPTIONS.map(c => <MenuItem key={c} value={c}>{CATEGORY_META[c].label}</MenuItem>)}
              </TextField>
              <TextField fullWidth label="Version" value={policyForm.version} onChange={e => setPolicyForm(p => ({ ...p, version: e.target.value }))} />
            </Stack>
            <TextField fullWidth label="Effective Date" type="date" InputLabelProps={{ shrink: true }} value={policyForm.effectiveDate} onChange={e => setPolicyForm(p => ({ ...p, effectiveDate: e.target.value }))} />
            <TextField
              fullWidth
              label="Policy Content"
              multiline
              rows={8}
              value={policyForm.content}
              onChange={e => setPolicyForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Paste policy text, or upload a .txt / .md / .docx / .pdf file above…"
            />
            <TextField select fullWidth label="Requires Acknowledgement" value={policyForm.requiresAcknowledgement ? 'yes' : 'no'} onChange={e => setPolicyForm(p => ({ ...p, requiresAcknowledgement: e.target.value === 'yes' }))}>
              <MenuItem value="yes">Yes — employees must sign</MenuItem>
              <MenuItem value="no">No — informational only</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => { setAddDialogOpen(false); resetAddDialog(); }} color="inherit">Cancel</Button>
          <Button
            onClick={handleAddPolicy}
            variant="contained"
            disabled={!policyForm.title.trim() || !policyForm.content.trim()}
          >
            Publish Policy
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default HRPoliciesPage;
