import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Popover,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { UploadFolderTab } from './UploadFolderTab';
import { UploadFileDialog } from './UploadFileDialog';
import { CreateFolderDialog } from './CreateFolderDialog';
import { FolderConfig } from '../FolderSidebar';

interface AddNewContentDialogProps {
  open: boolean;
  onClose: () => void;
  folders: FolderConfig[];
  onPathChange: (folderName: string) => void;
  onUploadFile: (fileData: {
    name: string;
    type: string;
    description: string;
    accessLevel: string;
    permissions: string[];
    requireApproval: boolean;
  }) => void;
  onUploadFolder: (folderData: {
    name: string;
    accessLevel: string;
    permissions: string[];
    requireApproval: boolean;
    filesCount: number;
  }) => void;
  onCreateFolder: (folderName: string, role: string) => void;
  selectedFolderPath?: string;
  initialTab?: number;
}

export function AddNewContentDialog({
  open,
  onClose,
  folders,
  onPathChange,
  onUploadFile,
  onUploadFolder,
  onCreateFolder,
  selectedFolderPath = 'Company Documents > HR > Employee Docs',
  initialTab = 0,
}: AddNewContentDialogProps) {
  // Tabs State
  const [activeTab, setActiveTab] = useState(initialTab);

  // Popover State
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ root: true });

  // Synced initial tab
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setExpandedNodes({ root: true });
    }
  }, [open, initialTab]);

  const handleEditClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  const openPopover = Boolean(anchorEl);
  const popoverId = openPopover ? 'path-chooser-popover' : undefined;

  const pathParts = selectedFolderPath.split(' > ');
  const currentFolderName = pathParts[pathParts.length - 1] === 'Company Documents' ? 'root' : pathParts[pathParts.length - 1];

  const renderTreeItem = (
    name: string,
    label: string,
    depth: number,
    hasChildren: boolean,
    onSelect: () => void
  ) => {
    const isSelected = currentFolderName === name;
    const isOpen = expandedNodes[name];

    return (
      <Box
        key={name}
        sx={{
          display: 'flex',
          alignItems: 'center',
          py: 0.75,
          px: 1.25,
          pl: depth * 2.5 + 1.25,
          borderRadius: '8px',
          cursor: 'pointer',
          bgcolor: isSelected ? 'rgba(21, 101, 192, 0.08)' : 'transparent',
          '&:hover': {
            bgcolor: isSelected ? 'rgba(21, 101, 192, 0.12)' : 'action.hover',
          },
          transition: 'all 0.15s ease',
          mb: 0.5,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
          handleClosePopover();
        }}
      >
        {/* Left Toggle Chevron */}
        <Box
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation();
              setExpandedNodes((prev) => ({ ...prev, [name]: !prev[name] }));
            }
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            mr: 0.5,
            color: 'text.secondary',
            visibility: hasChildren ? 'visible' : 'hidden',
            borderRadius: '4px',
            '&:hover': {
              bgcolor: 'action.selected',
            },
          }}
        >
          {isOpen ? <ExpandMoreIcon sx={{ fontSize: 16 }} /> : <ChevronRightIcon sx={{ fontSize: 16 }} />}
        </Box>

        {/* Folder Icon */}
        {isOpen ? (
          <FolderOpenOutlinedIcon sx={{ fontSize: 18, color: isSelected ? 'primary.main' : '#757575', mr: 1 }} />
        ) : (
          <FolderOutlinedIcon sx={{ fontSize: 18, color: isSelected ? 'primary.main' : '#757575', mr: 1 }} />
        )}

        {/* Label */}
        <Typography
          variant="body2"
          sx={{
            fontWeight: isSelected ? 700 : 500,
            color: isSelected ? 'primary.main' : 'text.primary',
            fontSize: '0.8125rem',
            flexGrow: 1,
          }}
        >
          {label}
        </Typography>

        {/* Selected Checkmark */}
        {isSelected && (
          <CheckCircleIcon sx={{ fontSize: 16, color: 'primary.main', ml: 1 }} />
        )}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          p: 3.5,
          boxShadow: '0px 10px 40px rgba(0, 0, 0, 0.08)',
        },
      }}
    >
      {/* Dialog Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0D47A1', lineHeight: 1.2, mb: 1.5 }}>
            Add New Content
          </Typography>

          {/* Breadcrumb Path Pill */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Box
              onClick={handleEditClick}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                bgcolor: '#EBF3FB',
                border: '1px solid #C8DFF5',
                borderRadius: '20px',
                px: 1.75,
                py: 0.5,
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: '#E1F5FE',
                  borderColor: '#1565C0',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {pathParts.map((part, index) => (
                <React.Fragment key={part}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: index === pathParts.length - 1 ? 700 : 500,
                      fontSize: '0.75rem',
                      color: index === pathParts.length - 1 ? '#1A3C5E' : '#5B7FA6',
                    }}
                  >
                    {part}
                  </Typography>
                  {index < pathParts.length - 1 && (
                    <Typography
                      variant="caption"
                      sx={{ fontSize: '0.75rem', color: '#8BAECB', fontWeight: 400 }}
                    >
                      ›
                    </Typography>
                  )}
                </React.Fragment>
              ))}
              <IconButton size="small" sx={{ p: 0.25, ml: 0.5, color: '#5B7FA6' }}>
                <EditOutlinedIcon sx={{ fontSize: '0.85rem' }} />
              </IconButton>
            </Box>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#90A4AE', bgcolor: '#F5F7FA', '&:hover': { bgcolor: '#E1F5FE' } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          mb: 3,
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.875rem',
            minHeight: 48,
            color: 'text.secondary',
            '&.Mui-selected': {
              color: 'primary.main',
            },
          },
        }}
      >
        <Tab icon={<UploadFileOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Upload File" />
        <Tab icon={<CloudUploadOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Upload Folder" />
        <Tab icon={<CreateNewFolderOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="New Folder" />
      </Tabs>

      {/* TAB 1: UPLOAD FILE */}
      {activeTab === 0 && (
        <DialogContent sx={{ p: 0, overflow: 'visible' }}>
          <UploadFileDialog onClose={onClose} onUpload={onUploadFile} />
        </DialogContent>
      )}

      {/* TAB 2: UPLOAD FOLDER */}
      {activeTab === 1 && (
        <DialogContent sx={{ p: 0 }}>
          <UploadFolderTab onClose={onClose} onUploadFolder={onUploadFolder} />
        </DialogContent>
      )}

      {/* TAB 3: NEW FOLDER */}
      {activeTab === 2 && (
        <DialogContent sx={{ p: 0 }}>
          <CreateFolderDialog onClose={onClose} onCreate={onCreateFolder} />
        </DialogContent>
      )}

      {/* Path Chooser Popover */}
      <Popover
        id={popoverId}
        open={openPopover}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            width: 320,
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(12, 25, 38, 0.15)',
            border: '1px solid #CFD8DC',
            maxHeight: 400,
            overflowY: 'auto',
            p: 2,
          },
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            color: 'text.secondary',
            letterSpacing: '0.05em',
            display: 'block',
            mb: 1.5,
          }}
        >
          SELECT DESTINATION PATH
        </Typography>

        <Box sx={{ mt: 1 }}>
          {/* Root Node */}
          {renderTreeItem('root', 'Company Documents', 0, folders.length > 0, () => onPathChange('root'))}

          {expandedNodes['root'] &&
            folders.map((folder) => {
              const hasSub = !!(folder.subfolders && folder.subfolders.length > 0);
              return (
                <React.Fragment key={folder.name}>
                  {renderTreeItem(folder.name, folder.name, 1, hasSub, () => onPathChange(folder.name))}

                  {expandedNodes[folder.name] &&
                    hasSub &&
                    folder.subfolders?.map((sub) => {
                      const hasSubSub = !!(sub.subfolders && sub.subfolders.length > 0);
                      return (
                        <React.Fragment key={sub.name}>
                          {renderTreeItem(sub.name, sub.name, 2, hasSubSub, () => onPathChange(sub.name))}

                          {expandedNodes[sub.name] &&
                            hasSubSub &&
                            sub.subfolders?.map((subSub) => (
                              <React.Fragment key={subSub.name}>
                                {renderTreeItem(subSub.name, subSub.name, 3, false, () => onPathChange(subSub.name))}
                              </React.Fragment>
                            ))}
                        </React.Fragment>
                      );
                    })}
                </React.Fragment>
              );
            })}
        </Box>
      </Popover>
    </Dialog>
  );
}
