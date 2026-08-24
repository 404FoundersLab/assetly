import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { EmployeeSelect } from '../../../../components/EmployeeSelect';
import { useAuthUser } from '../../../../hooks/storeHooks';
import { getUserDisplayName } from '../../../../utils/userDisplay';
import type { EmployeeDocCategory, EmployeeDocStatus } from './types';
import { ACCESS_ROLE_OPTIONS, DOC_CATEGORIES } from './types';

export interface UploadEmployeeDocumentPayload {
  employeeId: string;
  title: string;
  category: EmployeeDocCategory;
  fileType: string;
  status: EmployeeDocStatus;
  description: string;
  accessRoles: string[];
  ownerName: string;
  fileName?: string;
  fileSize?: number;
}

interface UploadEmployeeDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: UploadEmployeeDocumentPayload) => void;
  defaultEmployeeId?: string;
}

export function UploadEmployeeDocumentDialog({
  open,
  onClose,
  onSubmit,
  defaultEmployeeId,
}: UploadEmployeeDocumentDialogProps) {
  const user = useAuthUser();
  const fileRef = useRef<HTMLInputElement>(null);

  const [employeeId, setEmployeeId] = useState(defaultEmployeeId ?? '');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EmployeeDocCategory>('Other');
  const [status, setStatus] = useState<EmployeeDocStatus>('Draft');
  const [description, setDescription] = useState('');
  const [accessRoles, setAccessRoles] = useState<string[]>(['tenant_admin', 'hr_admin']);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmployeeId(defaultEmployeeId ?? '');
    setTitle('');
    setCategory('Other');
    setStatus('Draft');
    setDescription('');
    setAccessRoles(['tenant_admin', 'hr_admin']);
    setFile(null);
  }, [open, defaultEmployeeId]);

  const handleFile = (f: File | null) => {
    setFile(f);
    if (f && !title) {
      const base = f.name.replace(/\.[^.]+$/, '');
      setTitle(base);
    }
  };

  const handleSubmit = () => {
    if (!employeeId || !title.trim()) return;
    onSubmit({
      employeeId,
      title: title.trim(),
      category,
      fileType: file?.type || 'application/pdf',
      status,
      description: description.trim(),
      accessRoles,
      ownerName: getUserDisplayName(user) || 'HR',
      fileName: file?.name,
      fileSize: file?.size,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>Upload employee document</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <EmployeeSelect
            value={employeeId}
            onChange={setEmployeeId}
            label="Employee"
            required
          />

          <Box
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files[0] ?? null);
            }}
            sx={{
              p: 3,
              border: '2px dashed',
              borderColor: file ? 'primary.main' : 'divider',
              borderRadius: 2,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: file ? 'action.selected' : 'action.hover',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <CloudUploadOutlinedIcon color="primary" sx={{ fontSize: 36, mb: 1 }} />
            <Typography variant="body2" fontWeight={600}>
              {file ? file.name : 'Drop file or click to browse'}
            </Typography>
            {file && (
              <Typography variant="caption" color="text.secondary">
                {(file.size / 1024).toFixed(1)} KB
              </Typography>
            )}
            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </Box>

          <TextField
            label="Document title"
            required
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value as EmployeeDocCategory)}>
              {DOC_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as EmployeeDocStatus)}>
              <MenuItem value="Draft">Draft</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Confidential">Confidential</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Description"
            fullWidth
            multiline
            minRows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
              Who can access
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {ACCESS_ROLE_OPTIONS.map((role) => {
                const selected = accessRoles.includes(role.value);
                return (
                  <Chip
                    key={role.value}
                    label={role.label}
                    size="small"
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    onClick={() => {
                      setAccessRoles((prev) =>
                        selected ? prev.filter((r) => r !== role.value) : [...prev, role.value],
                      );
                    }}
                  />
                );
              })}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!employeeId || !title.trim()}>
          Save document
        </Button>
      </DialogActions>
    </Dialog>
  );
}
