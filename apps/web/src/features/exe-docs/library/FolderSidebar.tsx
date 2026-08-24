import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Checkbox,
  FormControlLabel,
  IconButton,
} from '@mui/material';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { AddNewContentDialog } from './modal/AddNewContentDialog';
import { DocumentRowData } from './DocumentsTable';

export interface SubfolderConfig {
  name: string;
  subfolders?: SubfolderConfig[];
}

export interface FolderConfig {
  name: string;
  subfolders?: SubfolderConfig[];
  isShared?: boolean;
}

interface FolderSidebarProps {
  selectedFolder: string;
  onSelectFolder: (name: string) => void;
  folders: FolderConfig[];
  setFolders: React.Dispatch<React.SetStateAction<FolderConfig[]>>;
  documents: Record<string, DocumentRowData[]>;
  setDocuments: React.Dispatch<React.SetStateAction<Record<string, DocumentRowData[]>>>;
  triggerUpload?: number;
}

export function FolderSidebar({
  selectedFolder,
  onSelectFolder,
  folders,
  setFolders,
  documents,
  setDocuments,
  triggerUpload = 0,
}: FolderSidebarProps) {
  
  // Collapsible State
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    HR: true,
    Sales: false,
    Marketing: false,
    Operations: false,
  });

  // Checkbox state for Document State
  const [documentStates, setDocumentStates] = useState<Record<string, boolean>>({
    all: true,
    confidential: false,
    approved: false,
    draft: false,
  });

  // Modal State
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [dialogInitialTab, setDialogInitialTab] = useState(0);

  // Tracks which folder the dialog was triggered from (independent of sidebar selection)
  const [targetFolder, setTargetFolder] = useState<string>(selectedFolder);



  // Drag and Drop State
  const [draggedFolder, setDraggedFolder] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  const lastTriggerUpload = useRef(triggerUpload);

  // Listen to external dialog trigger actions from header "Create New" button
  useEffect(() => {
    if (triggerUpload > lastTriggerUpload.current) {
      setTargetFolder(selectedFolder);
      setDialogInitialTab(0);
      setContentDialogOpen(true);
    }
    lastTriggerUpload.current = triggerUpload;
  }, [triggerUpload, selectedFolder]);

  const toggleFolder = (folderName: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  const handleStateChange = (stateName: 'all' | 'confidential' | 'approved' | 'draft') => {
    if (stateName === 'all') {
      setDocumentStates({
        all: true,
        confidential: false,
        approved: false,
        draft: false,
      });
    } else {
      setDocumentStates((prev) => ({
        ...prev,
        all: false,
        [stateName]: !prev[stateName],
      }));
    }
  };

  const getFolderPath = (name: string) => {
    if (name === 'root') {
      return 'Company Documents';
    }
    for (const folder of folders) {
      if (folder.name === name) {
        return `Company Documents > ${folder.name}`;
      }
      if (folder.subfolders) {
        for (const sub of folder.subfolders) {
          if (sub.name === name) {
            return `Company Documents > ${folder.name} > ${sub.name}`;
          }
          if (sub.subfolders) {
            const subSub = sub.subfolders.find((ss) => ss.name === name);
            if (subSub) {
              return `Company Documents > ${folder.name} > ${sub.name} > ${subSub.name}`;
            }
          }
        }
      }
    }
    return `Company Documents > HR > Employee Docs`;
  };

  const getFolderCount = (folder: FolderConfig): number => {
    if (folder.subfolders && folder.subfolders.length > 0) {
      return folder.subfolders.reduce((sum, sub) => sum + (documents[sub.name]?.length ?? 0), 0);
    }
    return documents[folder.name]?.length ?? 0;
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, folderName: string) => {
    e.dataTransfer.setData('text/plain', folderName);
    setDraggedFolder(folderName);
  };

  const handleDragEnd = () => {
    setDraggedFolder(null);
    setDragOverFolder(null);
  };

  const handleDragOver = (e: React.DragEvent, targetName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent dragging onto itself
    if (draggedFolder === targetName) return;

    setDragOverFolder(targetName);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolder(null);
  };

  const handleDrop = (e: React.DragEvent, targetFolderName: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceFolderName = e.dataTransfer.getData('text/plain') || draggedFolder;
    
    setDragOverFolder(null);
    setDraggedFolder(null);

    if (!sourceFolderName || sourceFolderName === targetFolderName) return;

    moveFolder(sourceFolderName, targetFolderName);
  };

  const moveFolder = (sourceFolderName: string, targetFolderName: string) => {
    let extractedFolder: FolderConfig | SubfolderConfig | null = null;
    let isSourceTopLevel = false;

    // 1. Locate and extract source folder
    const topIndex = folders.findIndex((f) => f.name === sourceFolderName);
    if (topIndex !== -1) {
      extractedFolder = folders[topIndex];
      isSourceTopLevel = true;
    }

    let parentOfSource: string | null = null;
    if (!extractedFolder) {
      for (const folder of folders) {
        if (folder.subfolders) {
          const subIndex = folder.subfolders.findIndex((s) => s.name === sourceFolderName);
          if (subIndex !== -1) {
            extractedFolder = folder.subfolders[subIndex];
            parentOfSource = folder.name;
            break;
          }
        }
      }
    }

    if (!extractedFolder) return;

    // 2. Resolve drop target parent if dropping on a subfolder
    let finalTarget = targetFolderName;
    if (targetFolderName !== 'root') {
      const isTargetTopLevel = folders.some((f) => f.name === targetFolderName);
      if (!isTargetTopLevel) {
        // Find parent of the subfolder we dropped on
        let foundParent: string | null = null;
        for (const folder of folders) {
          if (folder.subfolders?.some((s) => s.name === targetFolderName)) {
            foundParent = folder.name;
            break;
          }
        }
        if (foundParent) {
          finalTarget = foundParent;
        } else {
          finalTarget = 'root';
        }
      }
    }

    // Prevent dragging a top-level folder into its own subfolders
    if (isSourceTopLevel && finalTarget !== 'root') {
      const sourceFolderObj = extractedFolder as FolderConfig;
      if (sourceFolderObj.subfolders?.some((sub) => sub.name === finalTarget)) {
        return;
      }
    }

    // 3. Remove source folder from its previous location
    let updatedFolders = folders.map((folder) => {
      if (parentOfSource && folder.name === parentOfSource) {
        return {
          ...folder,
          subfolders: folder.subfolders?.filter((s) => s.name !== sourceFolderName) || [],
        };
      }
      return folder;
    });

    if (isSourceTopLevel) {
      updatedFolders = updatedFolders.filter((f) => f.name !== sourceFolderName);
    }

    // 4. Place extracted folder under target
    if (finalTarget === 'root') {
      // Add as top-level folder
      const newTopFolder: FolderConfig = {
        name: extractedFolder.name,
        subfolders: (extractedFolder as FolderConfig).subfolders || [],
      };
      const sharedIndex = updatedFolders.findIndex((f) => f.name === 'Shared');
      if (sharedIndex !== -1) {
        updatedFolders.splice(sharedIndex, 0, newTopFolder);
      } else {
        updatedFolders.push(newTopFolder);
      }
    } else {
      // Add as subfolder under target top-level folder
      updatedFolders = updatedFolders.map((folder) => {
        if (folder.name === finalTarget) {
          const sourceSubfolders = (extractedFolder as FolderConfig).subfolders || [];
          const newSubfoldersList = [...(folder.subfolders || [])];

          // Add dragged folder name to list of subfolders
          if (!newSubfoldersList.some((s) => s.name === extractedFolder!.name)) {
            newSubfoldersList.push({ name: extractedFolder!.name });
          }

          // Transfer all child subfolders to the new parent
          sourceSubfolders.forEach((sub) => {
            if (!newSubfoldersList.some((s) => s.name === sub.name)) {
              newSubfoldersList.push({ name: sub.name });
            }
          });

          return {
            ...folder,
            subfolders: newSubfoldersList,
          };
        }
        return folder;
      });

      // Automatically open the target folder
      setOpenFolders((prev) => ({
        ...prev,
        [finalTarget]: true,
      }));
    }

    setFolders(updatedFolders);
  };

  const handleCreateFolderSubmit = (folderName: string, _role: string) => {
    const isTopLevel = folders.some((f) => f.name === targetFolder);

    if (isTopLevel) {
      // Add as a subfolder under the clicked top-level folder
      setFolders((prev) =>
        prev.map((f) => {
          if (f.name === targetFolder) {
            return {
              ...f,
              subfolders: [...(f.subfolders || []), { name: folderName, subfolders: [] }],
            };
          }
          return f;
        })
      );
      setOpenFolders((prev) => ({ ...prev, [targetFolder]: true }));
      onSelectFolder(folderName);
    } else {
      // Check if targetFolder is a level-2 subfolder
      let parentFolder: FolderConfig | null = null;
      for (const f of folders) {
        if (f.subfolders?.some((s) => s.name === targetFolder)) {
          parentFolder = f;
          break;
        }
      }

      if (parentFolder) {
        // Add as a sub-subfolder under targetFolder (inside Employee Docs)
        setFolders((prev) =>
          prev.map((f) => {
            if (f.name === parentFolder!.name) {
              return {
                ...f,
                subfolders: f.subfolders?.map((s) => {
                  if (s.name === targetFolder) {
                    return {
                      ...s,
                      subfolders: [...(s.subfolders || []), { name: folderName, subfolders: [] }],
                    };
                  }
                  return s;
                }),
              };
            }
            return f;
          })
        );
        setOpenFolders((prev) => ({ ...prev, [parentFolder!.name]: true, [targetFolder]: true }));
        onSelectFolder(folderName);
      } else {
        // Check if targetFolder is already a level-3 sub-subfolder
        let parentSub: SubfolderConfig | null = null;
        let grandParent: FolderConfig | null = null;
        for (const f of folders) {
          if (f.subfolders) {
            for (const s of f.subfolders) {
              if (s.subfolders?.some((ss) => ss.name === targetFolder)) {
                parentSub = s;
                grandParent = f;
                break;
              }
            }
          }
          if (parentSub) break;
        }

        if (parentSub && grandParent) {
          // Add as sibling under parentSub (same level-3)
          setFolders((prev) =>
            prev.map((f) => {
              if (f.name === grandParent!.name) {
                return {
                  ...f,
                  subfolders: f.subfolders?.map((s) => {
                    if (s.name === parentSub!.name) {
                      return {
                        ...s,
                        subfolders: [...(s.subfolders || []), { name: folderName, subfolders: [] }],
                      };
                    }
                    return s;
                  }),
                };
              }
              return f;
            })
          );
          setOpenFolders((prev) => ({ ...prev, [grandParent!.name]: true, [parentSub!.name]: true }));
          onSelectFolder(folderName);
        } else {
          // Fallback: add as new top-level folder before 'Shared'
          const newFolder: FolderConfig = { name: folderName, subfolders: [] };
          setFolders((prev) => {
            const index = prev.findIndex((f) => f.name === 'Shared');
            const updated = [...prev];
            index !== -1 ? updated.splice(index, 0, newFolder) : updated.push(newFolder);
            return updated;
          });
        }
      }
    }

    // Initialize document list for the new folder
    setDocuments((prev) => ({
      ...prev,
      [folderName]: [],
    }));

    setContentDialogOpen(false);
  };

  const handleUploadFileSubmit = (fileData: {
    name: string;
    type: string;
    description: string;
    accessLevel: string;
    permissions: string[];
    requireApproval: boolean;
  }) => {
    const newDoc: DocumentRowData = {
      id: `doc-${Date.now()}`,
      title: fileData.name,
      type: fileData.type.toUpperCase(),
      access: fileData.permissions.length > 0 ? fileData.permissions : [fileData.accessLevel.toUpperCase()],
      lastModified: 'Just now',
      owner: 'Current User',
      status: fileData.requireApproval ? 'Draft' : 'Approved',
      iconType: fileData.type.toLowerCase().includes('pdf') ? 'contact' : 'sales',
    };

    setDocuments((prev) => ({
      ...prev,
      [targetFolder]: [...(prev[targetFolder] || []), newDoc],
    }));

    setContentDialogOpen(false);
  };

  const handleUploadFolderSubmit = (folderData: {
    name: string;
    accessLevel: string;
    permissions: string[];
    requireApproval: boolean;
    filesCount: number;
  }) => {
    // 1. Create subfolder under current targetFolder
    handleCreateFolderSubmit(folderData.name, folderData.accessLevel);

    // 2. Add mock files inside that subfolder
    const mockFiles: DocumentRowData[] = Array.from({ length: folderData.filesCount }).map((_, idx) => ({
      id: `doc-${Date.now()}-${idx}`,
      title: `${folderData.name.replace(/\s+/g, '_')}_Doc_${idx + 1}`,
      type: 'PDF DOCUMENT',
      access: folderData.permissions.length > 0 ? folderData.permissions : [folderData.accessLevel.toUpperCase()],
      lastModified: 'Just now',
      owner: 'Current User',
      status: folderData.requireApproval ? 'Draft' : 'Approved',
      iconType: 'contact',
    }));

    setDocuments((prev) => ({
      ...prev,
      [folderData.name]: mockFiles,
    }));

    setContentDialogOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Folders Card */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.05em' }}>
              FOLDERS
            </Typography>
            
            {/* Outlined Action Icons — target the currently selected folder */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => { setTargetFolder('root'); setDialogInitialTab(2); setContentDialogOpen(true); }}
                sx={{
                  color: '#1565C0',
                  p: 0.5,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <CreateNewFolderOutlinedIcon sx={{ fontSize: '1.25rem' }} />
              </IconButton>
            </Box>
          </Box>

          <List
            disablePadding
            onDragOver={(e) => handleDragOver(e, 'root')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'root')}
            sx={{
              minHeight: '200px',
              border: dragOverFolder === 'root' ? '2px dashed #1565C0' : '2px dashed transparent',
              borderRadius: '8px',
              p: dragOverFolder === 'root' ? 1 : 0,
              transition: 'all 0.2s ease',
            }}
          >
            {folders.map((folder) => {
              const hasSubfolders = folder.subfolders && folder.subfolders.length > 0;
              const isOpen = openFolders[folder.name];
              const isSelected = selectedFolder === folder.name;

              return (
                <Box key={folder.name}>
                  <ListItemButton
                    draggable
                    onDragStart={(e) => handleDragStart(e, folder.name)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, folder.name)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, folder.name)}
                    onClick={() => {
                      if (hasSubfolders) {
                        toggleFolder(folder.name);
                      } else {
                        onSelectFolder(folder.name);
                      }
                    }}
                    selected={isSelected}
                    sx={{
                      borderRadius: '8px',
                      mb: 0.5,
                      py: 0.75,
                      color: isSelected ? 'primary.main' : 'text.primary',
                      pr: 0.5,
                      opacity: draggedFolder === folder.name ? 0.4 : 1,
                      outline: dragOverFolder === folder.name ? '2px dashed #1565C0' : 'none',
                      outlineOffset: '-2px',
                      bgcolor: dragOverFolder === folder.name ? 'rgba(21, 101, 192, 0.08)' : (isSelected ? 'action.selected' : 'transparent'),
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: '#757575' }}>
                      {folder.isShared ? (
                        <FolderSharedOutlinedIcon fontSize="small" />
                      ) : hasSubfolders && isOpen ? (
                        <FolderOpenOutlinedIcon fontSize="small" />
                      ) : (
                        <FolderOutlinedIcon fontSize="small" />
                      )}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{folder.name}</span>
                          <span style={{ color: '#90A4AE', fontSize: '0.875rem', fontWeight: 400 }}>({getFolderCount(folder)})</span>
                        </Box>
                      }
                    />

                    {hasSubfolders && (isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />)}
                  </ListItemButton>

                  {hasSubfolders && (
                    <Collapse in={isOpen} timeout="auto" unmountOnExit>
                      <List
                        disablePadding
                        sx={{
                          pl: 2,
                          ml: 2,
                          borderLeft: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        {folder.subfolders?.map((sub) => {
                          const hasSubSub = sub.subfolders && sub.subfolders.length > 0;
                          const isSubOpen = openFolders[sub.name];
                          return (
                            <Box key={sub.name}>
                              <ListItemButton
                                draggable
                                onDragStart={(e) => handleDragStart(e, sub.name)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, sub.name)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, sub.name)}
                                selected={selectedFolder === sub.name}
                                onClick={() => {
                                  onSelectFolder(sub.name);
                                  if (hasSubSub) {
                                    toggleFolder(sub.name);
                                  }
                                }}
                                sx={{
                                  borderRadius: '8px',
                                  mb: 0.5,
                                  py: 0.5,
                                  pr: 0.5,
                                  opacity: draggedFolder === sub.name ? 0.4 : 1,
                                  outline: dragOverFolder === sub.name ? '2px dashed #1565C0' : 'none',
                                  outlineOffset: '-2px',
                                  bgcolor: dragOverFolder === sub.name ? 'rgba(21, 101, 192, 0.08)' : 'transparent',
                                  transition: 'all 0.15s ease',
                                  '&.Mui-selected': {
                                    bgcolor: 'rgba(21, 101, 192, 0.08)',
                                    color: 'primary.main',
                                    '& .MuiListItemIcon-root': { color: 'primary.main' },
                                  },
                                }}
                              >
                                <ListItemIcon sx={{ minWidth: 32, color: '#757575' }}>
                                  {hasSubSub && isSubOpen ? (
                                    <FolderOpenOutlinedIcon fontSize="small" />
                                  ) : (
                                    <FolderOutlinedIcon fontSize="small" />
                                  )}
                                </ListItemIcon>
                                
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{sub.name}</span>
                                      <span style={{ color: '#90A4AE', fontSize: '0.875rem', fontWeight: 400 }}>({documents[sub.name]?.length ?? 0})</span>
                                    </Box>
                                  }
                                />
                                {hasSubSub && (isSubOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />)}
                              </ListItemButton>

                              {hasSubSub && (
                                <Collapse in={isSubOpen} timeout="auto" unmountOnExit>
                                  <List
                                    disablePadding
                                    sx={{
                                      pl: 2,
                                      ml: 2,
                                      borderLeft: '1px solid',
                                      borderColor: 'divider',
                                    }}
                                  >
                                    {sub.subfolders?.map((subSub) => (
                                      <ListItemButton
                                        key={subSub.name}
                                        selected={selectedFolder === subSub.name}
                                        onClick={() => onSelectFolder(subSub.name)}
                                        sx={{
                                          borderRadius: '8px',
                                          mb: 0.5,
                                          py: 0.5,
                                          pr: 0.5,
                                          transition: 'all 0.15s ease',
                                          '&.Mui-selected': {
                                            bgcolor: 'rgba(21, 101, 192, 0.08)',
                                            color: 'primary.main',
                                            '& .MuiListItemIcon-root': { color: 'primary.main' },
                                          },
                                        }}
                                      >
                                        <ListItemIcon sx={{ minWidth: 32, color: '#757575' }}>
                                          <FolderOutlinedIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText
                                          primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                              <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{subSub.name}</span>
                                              <span style={{ color: '#90A4AE', fontSize: '0.875rem', fontWeight: 400 }}>({documents[subSub.name]?.length ?? 0})</span>
                                            </Box>
                                          }
                                        />
                                      </ListItemButton>
                                    ))}
                                  </List>
                                </Collapse>
                              )}
                            </Box>
                          );
                        })}
                      </List>
                    </Collapse>
                  )}
                </Box>
              );
            })}
          </List>
        </CardContent>
      </Card>

      {/* Document State Card */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.05em', mb: 2 }}>
            DOCUMENT STATE
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={documentStates.all}
                  onChange={() => handleStateChange('all')}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  All Documents
                </Typography>
              }
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={documentStates.confidential}
                  onChange={() => handleStateChange('confidential')}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1565C0' }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Confidential
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={documentStates.approved}
                  onChange={() => handleStateChange('approved')}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2e7d32' }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Approved
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={documentStates.draft}
                  onChange={() => handleStateChange('draft')}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#9e9e9e' }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Draft
                  </Typography>
                </Box>
              }
            />
          </Box>
        </CardContent>
      </Card>

      {/* Unified Add New Content Dialog Component */}
      <AddNewContentDialog
        open={contentDialogOpen}
        onClose={() => setContentDialogOpen(false)}
        folders={folders}
        onPathChange={setTargetFolder}
        onUploadFile={handleUploadFileSubmit}
        onUploadFolder={handleUploadFolderSubmit}
        onCreateFolder={handleCreateFolderSubmit}
        selectedFolderPath={getFolderPath(targetFolder)}
        initialTab={dialogInitialTab}
      />

    </Box>
  );
}
