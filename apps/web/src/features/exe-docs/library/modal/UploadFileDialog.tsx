import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Switch,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';

interface RoleOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface UploadFileDialogProps {
  onClose: () => void;
  onUpload: (fileData: {
    name: string;
    type: string;
    description: string;
    accessLevel: string;
    permissions: string[];
    requireApproval: boolean;
  }) => void;
}

const FILE_TYPES = [
  'PDF Document',
  'Word Document',
  'Excel Spreadsheet',
  'PowerPoint Presentation',
  'Image Asset',
];

const ACCESS_ROLE_OPTIONS: RoleOption[] = [
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

const ROLES = ['Super Admin', 'Dept Admin', 'Team Lead', 'Employee'];

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export function UploadFileDialog({
  onClose,
  onUpload,
}: UploadFileDialogProps) {
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('PDF Document');
  const [description, setDescription] = useState('');
  const [accessLevel, setAccessLevel] = useState('management-only');
  const [permissions, setPermissions] = useState<string[]>(['Super Admin', 'Dept Admin']);
  const [requireApproval, setRequireApproval] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Preview & Progress States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileSizeStr, setFileSizeStr] = useState('');
  const [textPreview, setTextPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset dialog state when opened freshly
  useEffect(() => {
    setFileName('');
    setFileType('PDF Document');
    setDescription('');
    setAccessLevel('management-only');
    setPermissions(['Super Admin', 'Dept Admin']);
    setRequireApproval(false);
    
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setTextPreview(null);
    setFileSizeStr('');
    
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, []);

  const handleRoleToggle = (role: string) => {
    setPermissions((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    // Revoke previous URL if any
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    setSelectedFile(file);
    setFileSizeStr(formatFileSize(file.size));

    // Get file extension
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    // Create Object URL for images or PDFs
    if (file.type.startsWith('image/') || ext === 'pdf') {
      setFilePreviewUrl(URL.createObjectURL(file));
      setTextPreview(null);
    } else if (file.type.startsWith('text/') || ['txt', 'md', 'json', 'js', 'ts', 'css', 'html', 'xml'].includes(ext)) {
      setFilePreviewUrl(null);

      // Read text file preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setTextPreview(text.substring(0, 150));
      };
      reader.readAsText(file);
    } else {
      setFilePreviewUrl(null);
      setTextPreview(null);
    }

    // Extract base name without extension for the input box
    const dotIndex = file.name.lastIndexOf('.');
    const name = dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;
    setFileName(name);

    // Auto-detect type
    if (ext === 'pdf') {
      setFileType('PDF Document');
    } else if (['doc', 'docx'].includes(ext)) {
      setFileType('Word Document');
    } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
      setFileType('Excel Spreadsheet');
    } else if (['ppt', 'pptx'].includes(ext)) {
      setFileType('PowerPoint Presentation');
    } else if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) {
      setFileType('Image Asset');
    }
  };

  const clearSelectedFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setTextPreview(null);
    setFileSizeStr('');
    setFileName('');
  };

  const triggerBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;
    onUpload({
      name: fileName.trim(),
      type: fileType,
      description: description.trim(),
      accessLevel,
      permissions,
      requireApproval,
    });
    // Reset states
    clearSelectedFile();
    setDescription('');
    setAccessLevel('management-only');
    setPermissions(['Super Admin', 'Dept Admin']);
    setRequireApproval(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={4}>
        {/* Left Column: Drag & Drop + File Info */}
        <Grid item xs={12} md={7}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {/* Conditional File Upload Area */}
          {selectedFile ? (
            <Box
              sx={{
                border: '1px solid #CFD8DC',
                borderRadius: '16px',
                bgcolor: '#FAFCFE',
                p: 3,
                mb: 3,
              }}
            >
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2.5 }}>
                {/* Sphere / Image Preview Box */}
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '12px',
                    bgcolor: '#0D1117',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                >
                  {(() => {
                    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';

                    // 1. Image Preview
                    if (selectedFile.type.startsWith('image/')) {
                      return (
                        <img
                          src={filePreviewUrl || ''}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          alt="File preview"
                        />
                      );
                    }

                    // 2. PDF Preview
                    if (ext === 'pdf') {
                      return (
                        <object
                          data={`${filePreviewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                          type="application/pdf"
                          style={{
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Fallback styling for PDF if object tag is not supported */}
                          <Box
                            sx={{
                              width: '100%',
                              height: '100%',
                              bgcolor: '#FFEBEE',
                              color: '#C62828',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.625rem' }}>
                              PDF
                            </Typography>
                          </Box>
                        </object>
                      );
                    }

                    // 3. Text Preview
                    if (textPreview !== null) {
                      return (
                        <Box
                          sx={{
                            width: '100%',
                            height: '100%',
                            bgcolor: '#FFF',
                            p: 0.5,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                          }}
                        >
                          <Typography
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '5px',
                              lineHeight: 1.1,
                              color: '#37474F',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all',
                              textAlign: 'left',
                            }}
                          >
                            {textPreview}
                          </Typography>
                        </Box>
                      );
                    }

                    // 4. Color-coded Office and other extensions fallbacks
                    let themeBg = '#ECEFF1';
                    let themeText = '#546E7A';

                    if (['doc', 'docx'].includes(ext)) {
                      themeBg = '#E3F2FD';
                      themeText = '#1565C0';
                    } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
                      themeBg = '#E8F5E9';
                      themeText = '#2E7D32';
                    } else if (['ppt', 'pptx'].includes(ext)) {
                      themeBg = '#FFF3E0';
                      themeText = '#EF6C00';
                    }

                    return (
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          bgcolor: themeBg,
                          color: themeText,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.625rem', textTransform: 'uppercase' }}>
                          {ext}
                        </Typography>
                      </Box>
                    );
                  })()}
                </Box>

                {/* File details & progress */}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: '#263238',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '75%',
                      }}
                    >
                      {selectedFile.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#78909C', fontWeight: 600 }}>
                      {fileSizeStr}
                    </Typography>
                  </Box>

                  {/* Progress Bar Row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Box sx={{ flexGrow: 1, height: 6, bgcolor: '#ECEFF1', borderRadius: 3, overflow: 'hidden' }}>
                      <Box sx={{ width: '100%', height: '100%', bgcolor: '#4CAF50', borderRadius: 3 }} />
                    </Box>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#4CAF50" />
                      <path d="M9 12l2 2 4-4" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Box>

                  <Typography variant="caption" sx={{ color: '#4CAF50', fontWeight: 800, letterSpacing: '0.05em', fontSize: '0.6875rem' }}>
                    UPLOAD COMPLETE
                  </Typography>
                </Box>
              </Box>

              {/* Buttons Row */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={clearSelectedFile}
                  startIcon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                  sx={{
                    borderRadius: '8px',
                    borderColor: '#CFD8DC',
                    color: '#546E7A',
                    textTransform: 'none',
                    fontWeight: 700,
                    py: 1,
                    fontSize: '0.875rem',
                    '&:hover': {
                      bgcolor: '#F5F7FA',
                      borderColor: '#B0BEC5',
                    },
                  }}
                >
                  Remove
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={triggerBrowse}
                  startIcon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38l.73-.72" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                  sx={{
                    borderRadius: '8px',
                    borderColor: '#1565C0',
                    color: '#1565C0',
                    textTransform: 'none',
                    fontWeight: 700,
                    py: 1,
                    fontSize: '0.875rem',
                    '&:hover': {
                      bgcolor: 'rgba(21, 101, 192, 0.04)',
                      borderColor: '#0D47A1',
                    },
                  }}
                >
                  Replace
                </Button>
              </Box>
            </Box>
          ) : (
            /* Drag and Drop Zone */
            <Box
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={{
                border: '2px dashed',
                borderColor: dragOver ? '#1565C0' : '#CFD8DC',
                borderRadius: '16px',
                bgcolor: dragOver ? '#F0F7FF' : '#FAFCFE',
                py: 5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                mb: 3,
                '&:hover': {
                  borderColor: '#1565C0',
                  bgcolor: '#F0F7FF',
                },
              }}
              onClick={triggerBrowse}
            >
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: '#E3F2FD',
                  color: '#1565C0',
                  borderRadius: '50%',
                  mb: 1.5,
                  display: 'flex',
                }}
              >
                <UploadFileOutlinedIcon sx={{ fontSize: 28 }} />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#263238' }}>
                Drag and Drop File
              </Typography>
              <Typography variant="caption" sx={{ color: '#78909C', mb: 2, display: 'block', mt: 0.25 }}>
                Or click to browse your local storage
              </Typography>
              <Button
                variant="outlined"
                size="small"
                sx={{
                  borderRadius: '8px',
                  borderColor: '#1565C0',
                  color: '#1565C0',
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 3,
                  '&:hover': {
                    borderColor: '#0D47A1',
                    bgcolor: 'rgba(21, 101, 192, 0.04)',
                  },
                }}
              >
                Browse Files
              </Button>
            </Box>
          )}

          {/* File Information Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <InfoOutlinedIcon sx={{ color: '#1565C0', fontSize: '1.25rem' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#263238' }}>
              File Information
            </Typography>
          </Box>

          {/* File Name & Type Row */}
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid item xs={12} sm={7}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: '#546E7A',
                  letterSpacing: '0.05em',
                  display: 'block',
                  mb: 1,
                }}
              >
                FILE NAME
              </Typography>
              <TextField
                fullWidth
                required
                placeholder="e.g. Employee_Handbook_2024"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
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
            </Grid>
            <Grid item xs={12} sm={5}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: '#546E7A',
                  letterSpacing: '0.05em',
                  display: 'block',
                  mb: 1,
                }}
              >
                FILE TYPE
              </Typography>
              <Select
                fullWidth
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                sx={{
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
                }}
              >
                {FILE_TYPES.map((type) => (
                  <MenuItem key={type} value={type} sx={{ fontSize: '0.875rem' }}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
          </Grid>

          {/* Description field */}
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: '#546E7A',
                letterSpacing: '0.05em',
                display: 'block',
                mb: 1,
              }}
            >
              DESCRIPTION
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Describe the document content and its purpose..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
        </Grid>

        {/* Right Column: Security & Access + Submit/Cancel */}
        <Grid item xs={12} md={5} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Security & Access Container */}
          <Box
            sx={{
              bgcolor: '#F5F8FC',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: '#E1E8F5',
              p: 2.5,
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
              <ShieldOutlinedIcon sx={{ color: '#1565C0', fontSize: '1.25rem' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#263238' }}>
                Security & Access
              </Typography>
            </Box>

            {/* Access Level Dropdown */}
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: '#546E7A',
                  letterSpacing: '0.05em',
                  display: 'block',
                  mb: 1,
                }}
              >
                ACCESS LEVEL
              </Typography>
              <Select
                fullWidth
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value)}
                renderValue={(value) => {
                  const opt = ACCESS_ROLE_OPTIONS.find((o) => o.id === value);
                  if (!opt) return null;
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', color: '#1565C0' }}>
                        {opt.icon}
                      </Box>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        {opt.title}
                      </Typography>
                    </Box>
                  );
                }}
                sx={{
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
                }}
              >
                {ACCESS_ROLE_OPTIONS.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', color: '#546E7A' }}>
                        {option.icon}
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.2 }}>
                          {option.title}
                        </Typography>
                        <Typography sx={{ fontSize: '0.6875rem', color: '#78909C' }}>
                          {option.description}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {/* Role Permissions Checkboxes Grid */}
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: '#546E7A',
                  letterSpacing: '0.05em',
                  display: 'block',
                  mb: 1,
                }}
              >
                ROLE PERMISSIONS
              </Typography>
              <Grid container spacing={1.5}>
                {ROLES.map((role) => {
                  const isChecked = permissions.includes(role);
                  return (
                    <Grid item xs={6} key={role}>
                      <Box
                        sx={{
                          border: '1px solid',
                          borderColor: isChecked ? '#1565C0' : '#CFD8DC',
                          borderRadius: '10px',
                          bgcolor: isChecked ? '#FFF' : '#FAFCFE',
                          display: 'flex',
                          alignItems: 'center',
                          px: 1.5,
                          py: 0.5,
                          cursor: 'pointer',
                          '&:hover': {
                            borderColor: '#1565C0',
                          },
                        }}
                        onClick={() => handleRoleToggle(role)}
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={isChecked}
                              onChange={() => handleRoleToggle(role)}
                              size="small"
                              sx={{
                                p: 0.5,
                                color: '#B0BEC5',
                                '&.Mui-checked': {
                                  color: '#1565C0',
                                },
                              }}
                            />
                          }
                          label={
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#37474F' }}>
                              {role}
                            </Typography>
                          }
                          sx={{ m: 0 }}
                        />
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>

            <Box sx={{ borderTop: '1px solid', borderColor: '#E1E8F5', pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#263238', display: 'block' }}>
                  Approval Workflow
                </Typography>
                <Typography variant="caption" sx={{ color: '#78909C', fontSize: '0.6875rem', display: 'block' }}>
                  Require sign-off before publishing
                </Typography>
              </Box>
              <Switch
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
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
          </Box>

          {/* Action Buttons Stack */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={!selectedFile || !fileName.trim()}
              startIcon={<CloudUploadOutlinedIcon />}
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
                '&.Mui-disabled': {
                  bgcolor: '#E0E0E0',
                  color: '#9E9E9E',
                },
              }}
            >
              Upload and Finalize
            </Button>
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
                borderColor: '#CFD8DC',
                color: '#546E7A',
                bgcolor: '#FFF',
                '&:hover': {
                  bgcolor: '#FAFCFE',
                  borderColor: '#90A4AE',
                  color: '#37474F',
                },
              }}
            >
              Cancel
            </Button>
          </Box>
        </Grid>
      </Grid>
    </form>
  );
}
