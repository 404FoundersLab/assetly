import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
} from '@mui/material';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

interface CreateFolderDialogProps {
  onClose: () => void;
  onCreate: (folderName: string, role: string) => void;
}

interface RoleOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export function CreateFolderDialog({ onClose, onCreate }: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState('');
  const [selectedRole, setSelectedRole] = useState('all-employees');

  const roleOptions: RoleOption[] = [
    {
      id: 'management-only',
      title: 'Management Only',
      description: 'Top-level executives and admins',
      icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 26 }} />,
    },
    {
      id: 'leadership',
      title: 'Leadership',
      description: 'Team leads and department heads',
      icon: <ShieldOutlinedIcon sx={{ fontSize: 26 }} />,
    },
    {
      id: 'all-employees',
      title: 'All Employees',
      description: 'Public organizational access',
      icon: <PeopleOutlinedIcon sx={{ fontSize: 26 }} />,
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    onCreate(folderName.trim(), selectedRole);
    setFolderName('');
    setSelectedRole('all-employees');
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Folder Name Field */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: '#616161',
            letterSpacing: '0.08em',
            display: 'block',
            mb: 1.2,
            fontSize: '0.75rem',
          }}
        >
          FOLDER NAME
        </Typography>
        <TextField
          fullWidth
          required
          placeholder="Enter folder name..."
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          InputProps={{
            sx: {
              borderRadius: '12px',
              bgcolor: '#F4F6F9',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'divider',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#1565C0',
              },
              fontSize: '0.9375rem',
            },
          }}
        />
      </Box>

      {/* Role-Based Access Selection */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: '#616161',
            letterSpacing: '0.08em',
            display: 'block',
            mb: 1.5,
            fontSize: '0.75rem',
          }}
        >
          ROLE-BASED ACCESS
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {roleOptions.map((option) => {
            const isSelected = selectedRole === option.id;
            return (
              <Box
                key={option.id}
                onClick={() => setSelectedRole(option.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 2,
                  borderRadius: '16px',
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: isSelected ? '#1565C0' : 'divider',
                  bgcolor: isSelected ? '#F0F7FF' : '#F8FAFC',
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
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={onClose}
          sx={{
            borderRadius: '12px',
            py: 1.5,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.9375rem',
            borderColor: 'divider',
            color: 'text.secondary',
            '&:hover': {
              bgcolor: 'action.hover',
              borderColor: 'text.secondary',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          fullWidth
          type="submit"
          variant="contained"
          sx={{
            borderRadius: '12px',
            py: 1.5,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.9375rem',
            bgcolor: '#0D47A1',
            boxShadow: 'none',
            '&:hover': {
              bgcolor: '#0A3C8B',
              boxShadow: 'none',
            },
          }}
        >
          Create Folder
        </Button>
      </Box>
    </form>
  );
}
