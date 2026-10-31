import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Box,
  Typography,
  IconButton,
  Chip,
  Stack,
  alpha,
  useTheme,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import GroupsIcon from '@mui/icons-material/Groups';
import type { Project, TaskPriority } from '../../../types';
import { useAppDispatch, useAppSelector } from '../../../hooks/storeHooks';
import { addProject, updateProject, deleteProject } from '../../../store/tasksSlice';

interface ProjectModalProps {
  open: boolean;
  project?: Project | null;
  onClose: () => void;
  onDeleted?: (deletedId: string) => void;
}

const COLOR_PRESETS = [
  { label: 'Indigo', value: '#6366F1' },
  { label: 'Emerald', value: '#10B981' },
  { label: 'Pink', value: '#EC4899' },
  { label: 'Amber', value: '#F59E0B' },
  { label: 'Purple', value: '#8B5CF6' },
  { label: 'Cyan', value: '#06B6D4' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Rose', value: '#F43F5E' },
  { label: 'Teal', value: '#14B8A6' },
  { label: 'Orange', value: '#F97316' },
];

export function ProjectModal({ open, project, onClose, onDeleted }: ProjectModalProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const dispatch = useAppDispatch();

  const departments = useAppSelector((s) => s.departments.items);
  const employees = useAppSelector((s) => s.employees.items);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [managerName, setManagerName] = useState('');
  const [status, setStatus] = useState<'active' | 'planning' | 'completed' | 'on_hold'>('active');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [memberEmployeeIds, setMemberEmployeeIds] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setCode(project.code);
      setDescription(project.description || '');
      setDepartmentId(project.departmentId || (departments[0]?.id || ''));
      setManagerName(project.managerName || '');
      setStatus(project.status || 'active');
      setPriority(project.priority || 'medium');
      setStartDate(project.startDate || new Date().toISOString().split('T')[0]);
      setEndDate(project.endDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
      setColor(project.color || '#6366F1');
      setMemberEmployeeIds(project.memberEmployeeIds || []);
    } else {
      setName('');
      setCode('');
      setDescription('');
      setDepartmentId(departments[0]?.id || '');
      setManagerName('');
      setStatus('active');
      setPriority('medium');
      const now = new Date();
      setStartDate(now.toISOString().split('T')[0]);
      setEndDate(new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0]);
      setColor(COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)].value);
      setMemberEmployeeIds([]);
    }
    setDeleteConfirmOpen(false);
  }, [project, departments, open]);

  const generateCode = (str: string) => {
    return (
      str
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 6) || ''
    );
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    if (!project && (!code || code === generateCode(name))) {
      setCode(generateCode(newName));
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const dept = departments.find((d) => d.id === departmentId);
    const departmentName = dept ? dept.name : undefined;
    const finalCode = (code.trim() || generateCode(name) || 'PRJ').toUpperCase();

    if (project) {
      dispatch(
        updateProject({
          ...project,
          name: name.trim(),
          code: finalCode,
          description: description.trim(),
          departmentId,
          departmentName,
          managerName: managerName.trim() || 'Lead',
          status,
          priority,
          startDate,
          endDate,
          color,
          memberEmployeeIds,
        })
      );
    } else {
      dispatch(
        addProject({
          name: name.trim(),
          code: finalCode,
          description: description.trim(),
          departmentId,
          departmentName,
          managerName: managerName.trim() || 'Lead',
          status,
          priority,
          startDate,
          endDate,
          color,
          memberEmployeeIds,
        })
      );
    }
    onClose();
  };

  const handleDelete = () => {
    if (!project) return;
    dispatch(deleteProject(project.id));
    if (onDeleted) onDeleted(project.id);
    setDeleteConfirmOpen(false);
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: isDark ? '#1E293B' : '#FFFFFF',
            backgroundImage: 'none',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1.5,
            borderBottom: '1px solid',
            borderColor: theme.palette.divider,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                bgcolor: alpha(color, 0.15),
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} letterSpacing="-0.01em">
                {project ? 'Edit Project' : 'Create New Project'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {project ? `ID: ${project.id}` : 'Define milestone scope, manager, department & target roadmap timeline'}
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2.5}>
            {/* Project Name */}
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Project Name *"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Cloud & Redis HA Infrastructure"
                size="small"
                autoFocus
              />
            </Grid>

            {/* Project Code */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Project Code *"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="e.g. INFRA"
                size="small"
                helperText="Short uppercase badge identifier"
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Project Scope / Objectives"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={3}
                placeholder="Detail high-level deliverables, architecture goals, or operational objectives..."
                size="small"
              />
            </Grid>

            {/* Department */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Department"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                size="small"
              >
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.name} ({dept.costCenter || 'Dept'})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Project Manager */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Project Lead / Manager"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="e.g. Sarah Chen or Vasanth (Admin)"
                size="small"
                helperText="Name of primary project owner"
              />
            </Grid>

            {/* Status */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                size="small"
              >
                <MenuItem value="active">Active (In Flight)</MenuItem>
                <MenuItem value="planning">Planning (Draft)</MenuItem>
                <MenuItem value="on_hold">On Hold</MenuItem>
                <MenuItem value="completed">Completed / Archived</MenuItem>
              </TextField>
            </Grid>

            {/* Priority */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                size="small"
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent / Critical</MenuItem>
              </TextField>
            </Grid>

            {/* Timeline Start Date */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>

            {/* Timeline End Date */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Target End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>

            {/* Theme Accent Color */}
            <Grid item xs={12}>
              <Box sx={{ p: 2, borderRadius: '12px', bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: '1px solid', borderColor: theme.palette.divider }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
                  <ColorLensIcon sx={{ fontSize: 16, color }} /> Project Badge & Border Accent Color
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ alignItems: 'center' }}>
                  {COLOR_PRESETS.map((preset) => {
                    const isSelected = color.toLowerCase() === preset.value.toLowerCase();
                    return (
                      <Box
                        key={preset.value}
                        onClick={() => setColor(preset.value)}
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: preset.value,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          outline: isSelected ? `2px solid ${isDark ? '#FFFFFF' : '#0F172A'}` : 'none',
                          outlineOffset: 2,
                          transition: 'transform 0.15s ease',
                          '&:hover': { transform: 'scale(1.15)' },
                        }}
                      />
                    );
                  })}
                  <TextField
                    size="small"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    sx={{ width: 120, ml: 1 }}
                    inputProps={{ style: { fontSize: '0.8rem', padding: '6px 10px', textTransform: 'uppercase' } }}
                  />
                  <Chip
                    label="PREVIEW"
                    size="small"
                    sx={{
                      fontWeight: 800,
                      bgcolor: alpha(color, 0.15),
                      color: color,
                      border: `1px solid ${alpha(color, 0.4)}`,
                    }}
                  />
                </Stack>
              </Box>
            </Grid>

            {/* Assigned Team Members */}
            {employees.length > 0 && (
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Team Members"
                  value={memberEmployeeIds}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMemberEmployeeIds(typeof val === 'string' ? val.split(',') : val);
                  }}
                  SelectProps={{
                    multiple: true,
                    renderValue: (selected: any) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((empId: string) => {
                          const emp = employees.find((e) => e.id === empId);
                          return (
                            <Chip
                              key={empId}
                              label={emp ? `${emp.firstName} ${emp.lastName}` : empId}
                              size="small"
                              sx={{ height: 22, fontSize: '0.75rem' }}
                            />
                          );
                        })}
                      </Box>
                    ),
                  }}
                  size="small"
                  helperText="Select employees involved in this project"
                >
                  {employees.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.jobTitle || 'Employee'})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid',
            borderColor: theme.palette.divider,
            justifyContent: project ? 'space-between' : 'flex-end',
          }}
        >
          {project && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => setDeleteConfirmOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
            >
              Delete Project
            </Button>
          )}

          <Stack direction="row" spacing={1.5}>
            <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!name.trim()}
              sx={{
                bgcolor: '#8B5CF6',
                '&:hover': { bgcolor: '#7C3AED' },
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '8px',
                px: 3,
              }}
            >
              {project ? 'Save Changes' : 'Create Project'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Sub-Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '16px', p: 1 },
        }}
      >
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <DeleteOutlineIcon />
          Delete Project
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Are you sure you want to delete project <strong>{name}</strong> ({code})?
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            All existing tasks linked to this project will remain safe in the system and become General / Unassigned Deliverables.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
          >
            Delete Project
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
