import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Switch,
} from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

interface UploadFolderTabProps {
  onClose: () => void;
  onUploadFolder: (folderData: {
    name: string;
    accessLevel: string;
    permissions: string[];
    requireApproval: boolean;
    filesCount: number;
  }) => void;
}

const ACCESS_ROLE_OPTIONS = [
  {
    id: 'management-only',
    title: 'Management Only',
    description: 'Top-level executives and admins',
    icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 22 }} />,
  },
  {
    id: 'leadership',
    title: 'Leadership',
    description: 'Team leads and department heads',
    icon: <ShieldOutlinedIcon sx={{ fontSize: 22 }} />,
  },
  {
    id: 'all-employees',
    title: 'All Employees',
    description: 'Public organizational access',
    icon: <PeopleOutlinedIcon sx={{ fontSize: 22 }} />,
  },
];

export function UploadFolderTab({ onClose, onUploadFolder }: UploadFolderTabProps) {
  const [folderName, setFolderName] = useState('');
  const [folderAccessLevel, setFolderAccessLevel] = useState('all-employees');
  const [folderPermissions, setFolderPermissions] = useState<string[]>([
    'Super Admin',
    'Dept Admin',
    'Team Lead',
    'Employee',
  ]);
  const [folderRequireApproval, setFolderRequireApproval] = useState(false);
  const [folderDragOver, setFolderDragOver] = useState(false);
  const [selectedFolderObj, setSelectedFolderObj] = useState(false);
  const [folderFilesCount, setFolderFilesCount] = useState(5);

  const handleUploadFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    onUploadFolder({
      name: folderName.trim(),
      accessLevel: folderAccessLevel,
      permissions: folderPermissions,
      requireApproval: folderRequireApproval,
      filesCount: folderFilesCount,
    });
  };

  return (
    <form onSubmit={handleUploadFolderSubmit}>
      {/* Drag and Drop Zone */}
      <Box
        onDragOver={(e) => { e.preventDefault(); setFolderDragOver(true); }}
        onDragLeave={() => setFolderDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setFolderDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFolderName('Uploaded Folder');
            setSelectedFolderObj(true);
            setFolderFilesCount(e.dataTransfer.files.length);
          }
        }}
        onClick={() => {
          setFolderName('Campaign Assets');
          setSelectedFolderObj(true);
          setFolderFilesCount(7);
        }}
        sx={{
          border: '1.5px dashed',
          borderColor: folderDragOver ? '#1565C0' : '#CFD8DC',
          borderRadius: '16px',
          bgcolor: folderDragOver ? '#F0F7FF' : '#FAFCFE',
          py: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          mb: 4,
          '&:hover': {
            borderColor: '#1565C0',
            bgcolor: '#F0F7FF',
          },
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            bgcolor: '#E3F2FD',
            color: '#1565C0',
            borderRadius: '50%',
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CloudUploadOutlinedIcon sx={{ fontSize: 26 }} />
        </Box>
        <Typography variant="body1" sx={{ fontWeight: 600, color: '#263238', mb: selectedFolderObj ? 0.5 : 3 }}>
          {selectedFolderObj ? `Folder selected: ${folderName}` : 'Drag and drop your folders here'}
        </Typography>
        {selectedFolderObj && (
          <Typography variant="caption" sx={{ color: '#78909C', mb: 3, display: 'block' }}>
            Contains {folderFilesCount} files ready to upload
          </Typography>
        )}
        <Button
          variant="contained"
          sx={{
            borderRadius: '12px',
            bgcolor: '#1565C0',
            color: '#ffffff',
            textTransform: 'none',
            fontWeight: 700,
            px: 4,
            py: 1,
            boxShadow: 'none',
            '&:hover': { bgcolor: '#0D47A1', boxShadow: 'none' },
          }}
        >
          Browse Folders
        </Button>
      </Box>

      {/* CONTENT DETAILS and ROLE-BASED ACCESS Grid */}
      <Grid container spacing={4}>
        {/* Left Column: CONTENT DETAILS */}
        <Grid item xs={12} md={6}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: '#546E7A',
              letterSpacing: '0.05em',
              display: 'block',
              mb: 1.5,
            }}
          >
            CONTENT DETAILS
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: '#37474F',
                mb: 1,
              }}
            >
              Display Name (Matches uploaded content)
            </Typography>
            <TextField
              fullWidth
              required
              placeholder="Enter document name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              InputProps={{
                sx: {
                  borderRadius: '12px',
                  bgcolor: '#FAFCFE',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#CFD8DC',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#90A4AE',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1565C0',
                  },
                  fontSize: '0.875rem',
                },
              }}
            />
          </Box>

          {/* Approval Workflow Box */}
          <Box
            sx={{
              bgcolor: '#ebf6ff',
              borderRadius: '16px',
              p: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid #cce5ff',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ color: '#1565C0', display: 'flex' }}>
                <ShieldOutlinedIcon sx={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: '#0d47a1',
                    lineHeight: 1.2,
                  }}
                >
                  Approval Workflow
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#546E7A',
                    display: 'block',
                    mt: 0.25,
                  }}
                >
                  Require manager review
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={folderRequireApproval}
              onChange={(e) => setFolderRequireApproval(e.target.checked)}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#1565C0',
                  '& + .MuiSwitch-track': {
                    backgroundColor: '#1565C0',
                  },
                },
              }}
            />
          </Box>
        </Grid>

        {/* Right Column: ROLE-BASED ACCESS */}
        <Grid item xs={12} md={6}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: '#546E7A',
              letterSpacing: '0.05em',
              display: 'block',
              mb: 1.5,
            }}
          >
            ROLE-BASED ACCESS
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {ACCESS_ROLE_OPTIONS.map((option) => {
              const isSelected = folderAccessLevel === option.id;
              return (
                <Box
                  key={option.id}
                  onClick={() => {
                    setFolderAccessLevel(option.id);
                    let permissionsList = ['Super Admin', 'Dept Admin'];
                    if (option.id === 'leadership') {
                      permissionsList = ['Super Admin', 'Dept Admin', 'Team Lead'];
                    } else if (option.id === 'all-employees') {
                      permissionsList = ['Super Admin', 'Dept Admin', 'Team Lead', 'Employee'];
                    }
                    setFolderPermissions(permissionsList);
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 2,
                    borderRadius: '16px',
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: isSelected ? '#1565C0' : 'divider',
                    bgcolor: isSelected ? '#F0F7FF' : '#FFF',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: isSelected ? '#1565C0' : 'text.secondary',
                      bgcolor: isSelected ? '#F0F7FF' : 'action.hover',
                    },
                  }}
                >
                  {/* Left Icon */}
                  <Box
                    sx={{
                      color: isSelected ? '#1565C0' : '#757575',
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {option.icon}
                  </Box>

                  {/* Middle Text */}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: isSelected ? '#0D47A1' : 'text.primary',
                        lineHeight: 1.2,
                      }}
                    >
                      {option.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#757575',
                        fontSize: '0.75rem',
                        display: 'block',
                        mt: 0.25,
                      }}
                    >
                      {option.description}
                    </Typography>
                  </Box>

                  {/* Right Radio Indicator */}
                  <Box sx={{ color: isSelected ? '#1565C0' : '#B0BEC5', display: 'flex', alignItems: 'center' }}>
                    {isSelected ? (
                      <RadioButtonCheckedIcon fontSize="small" />
                    ) : (
                      <RadioButtonUncheckedIcon fontSize="small" />
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Grid>
      </Grid>

      {/* Divider and Action Buttons Footer */}
      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          mt: 4,
          pt: 2.5,
          display: 'flex',
          gap: 2.5,
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: '#546E7A',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!selectedFolderObj || !folderName.trim()}
          variant="contained"
          sx={{
            borderRadius: '10px',
            px: 4,
            py: 1.25,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            bgcolor: '#0D47A1',
            boxShadow: 'none',
            '&:hover': {
              bgcolor: '#0A3C8B',
              boxShadow: 'none',
            },
            '&.Mui-disabled': {
              bgcolor: '#E0E0E0',
              color: '#9E9E9E',
            },
          }}
        >
          Add Content
        </Button>
      </Box>
    </form>
  );
}
