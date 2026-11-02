import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Divider,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Box,
  TextField,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  fetchWorkflowDefinitions,
  saveWorkflowDefinition,
  type WorkflowDefinitionDto,
  type WorkflowStepDto,
} from '../../services/api/workflows';
import { ROLE_LABELS, TENANT_ASSIGNABLE_ROLES } from '../../constants/roles';

export function WorkflowSettingsCard() {
  const [workflows, setWorkflows] = useState<WorkflowDefinitionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingModule, setSavingModule] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadWorkflows = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorkflowDefinitions();
      setWorkflows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workflow configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkflows();
  }, []);

  const handleStepChange = (
    module: string,
    stepIndex: number,
    field: keyof WorkflowStepDto,
    value: any
  ) => {
    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.module !== module) return wf;
        const nextSteps = [...wf.steps];
        nextSteps[stepIndex] = { ...nextSteps[stepIndex], [field]: value };
        return { ...wf, steps: nextSteps };
      })
    );
  };

  const handleAddStep = (module: string) => {
    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.module !== module) return wf;
        const nextOrder = wf.steps.length + 1;
        const newStep: WorkflowStepDto = {
          stepOrder: nextOrder,
          stepName: `Approval Level ${nextOrder}`,
          approverType: 'role',
          approverRole: 'tenant_admin',
          isRequired: true,
          autoSkipIfSubmitter: true,
        };
        return { ...wf, steps: [...wf.steps, newStep] };
      })
    );
  };

  const handleRemoveStep = (module: string, stepIndex: number) => {
    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.module !== module) return wf;
        const nextSteps = wf.steps.filter((_, i) => i !== stepIndex).map((s, i) => ({
          ...s,
          stepOrder: i + 1,
        }));
        return { ...wf, steps: nextSteps };
      })
    );
  };

  const handleSave = async (wf: WorkflowDefinitionDto) => {
    setSavingModule(wf.module);
    setError(null);
    setSuccess(null);
    try {
      await saveWorkflowDefinition(wf.module, {
        name: wf.name,
        description: wf.description,
        fallbackApproverRole: wf.fallbackApproverRole,
        fallbackApproverId: wf.fallbackApproverId,
        alternateApproverRole: wf.alternateApproverRole,
        alternateApproverId: wf.alternateApproverId,
        steps: wf.steps,
      });
      setSuccess(`Workflow '${wf.name}' updated successfully.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save workflow definition');
    } finally {
      setSavingModule(null);
    }
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Multi-Level Approval Workflows
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Configure hierarchical approval chains, sequential stages, fallback approvers, and alternate approvers for self-approval prevention.
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Stack spacing={2}>
            {workflows.map((wf) => (
              <Accordion key={wf.id} defaultExpanded={wf.module === 'leave_request'}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="subtitle1" fontWeight={700}>
                      {wf.name}
                    </Typography>
                    <Chip label={`${wf.steps.length} Approval Stage(s)`} size="small" color="primary" variant="outlined" />
                    <Chip label={wf.module.toUpperCase()} size="small" />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {wf.description}
                  </Typography>

                  {/* Fallback & Alternate Approvers */}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Fallback Approver (if no manager)"
                      value={wf.fallbackApproverRole}
                      onChange={(e) =>
                        setWorkflows((prev) =>
                          prev.map((w) =>
                            w.id === wf.id ? { ...w, fallbackApproverRole: e.target.value } : w
                          )
                        )
                      }
                      helperText="Routes here when an employee submits without an assigned manager"
                    >
                      {TENANT_ASSIGNABLE_ROLES.map((r) => (
                        <MenuItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Alternate Approver (Prevents Self-Approval)"
                      value={wf.alternateApproverRole}
                      onChange={(e) =>
                        setWorkflows((prev) =>
                          prev.map((w) =>
                            w.id === wf.id ? { ...w, alternateApproverRole: e.target.value } : w
                          )
                        )
                      }
                      helperText="Routes here when Tenant Admin submits a request"
                    >
                      {TENANT_ASSIGNABLE_ROLES.map((r) => (
                        <MenuItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  {/* Sequential Steps */}
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                    Sequential Approval Stages:
                  </Typography>
                  <Stack spacing={1.5} sx={{ mb: 2 }}>
                    {wf.steps.map((step, idx) => (
                      <Card variant="outlined" key={idx} sx={{ p: 2 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                          <Chip label={`Level ${step.stepOrder}`} size="small" color="info" />
                          <TextField
                            size="small"
                            label="Stage Name"
                            value={step.stepName}
                            onChange={(e) =>
                              handleStepChange(wf.module, idx, 'stepName', e.target.value)
                            }
                            sx={{ minWidth: 200 }}
                          />
                          <TextField
                            select
                            size="small"
                            label="Approver Type"
                            value={step.approverType}
                            onChange={(e) =>
                              handleStepChange(wf.module, idx, 'approverType', e.target.value)
                            }
                            sx={{ minWidth: 150 }}
                          >
                            <MenuItem value="manager">Employee's Manager</MenuItem>
                            <MenuItem value="role">Specific Role</MenuItem>
                          </TextField>

                          {step.approverType === 'role' && (
                            <TextField
                              select
                              size="small"
                              label="Role"
                              value={step.approverRole || 'tenant_admin'}
                              onChange={(e) =>
                                handleStepChange(wf.module, idx, 'approverRole', e.target.value)
                              }
                              sx={{ minWidth: 150 }}
                            >
                              {TENANT_ASSIGNABLE_ROLES.map((r) => (
                                <MenuItem key={r} value={r}>
                                  {ROLE_LABELS[r]}
                                </MenuItem>
                              ))}
                            </TextField>
                          )}

                          {wf.steps.length > 1 && (
                            <Tooltip title="Delete Step">
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleRemoveStep(wf.module, idx)}
                              >
                                <DeleteOutlineIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </Card>
                    ))}
                  </Stack>

                  <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => handleAddStep(wf.module)}
                    >
                      Add Approval Stage
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={() => void handleSave(wf)}
                      disabled={savingModule === wf.module}
                    >
                      {savingModule === wf.module ? 'Saving...' : 'Save Configuration'}
                    </Button>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

