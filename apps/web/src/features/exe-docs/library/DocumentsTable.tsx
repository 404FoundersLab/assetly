import { useState } from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Typography,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Pagination,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import SearchIcon from '@mui/icons-material/Search';
import ContactPageIcon from '@mui/icons-material/ContactPage';
import ArticleIcon from '@mui/icons-material/Article';
import CampaignIcon from '@mui/icons-material/Campaign';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';

export interface DocumentRowData {
  id: string;
  title: string;
  type: string;
  access: string[];
  lastModified: string;
  owner: string;
  status: 'Confidential' | 'Approved' | 'Draft';
  iconType: 'contact' | 'sales' | 'marketing';
}

interface DocumentsTableProps {
  selectedFolder: string;
  documents: Record<string, DocumentRowData[]>;
}

export function DocumentsTable({ selectedFolder, documents }: DocumentsTableProps) {
  const folderDocs = documents[selectedFolder] ?? [];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(folderDocs.map((d) => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const isAllSelected = folderDocs.length > 0 && selectedIds.length === folderDocs.length;

  const renderIcon = (type: 'contact' | 'sales' | 'marketing') => {
    switch (type) {
      case 'contact':
        return <ContactPageIcon sx={{ color: '#1565C0', fontSize: 24 }} />;
      case 'sales':
        return <ArticleIcon sx={{ color: '#2e7d32', fontSize: 24 }} />;
      case 'marketing':
        return <CampaignIcon sx={{ color: '#ef6c00', fontSize: 24 }} />;
      default:
        return <ArticleIcon sx={{ fontSize: 24 }} />;
    }
  };

  const getStatusStyles = (status: 'Confidential' | 'Approved' | 'Draft') => {
    switch (status) {
      case 'Confidential':
        return {
          color: '#1565C0',
          bgcolor: '#FFFFFF',
          border: '1px solid #E0E0E0',
        };
      case 'Approved':
        return {
          color: '#2E7D32',
          bgcolor: '#FFFFFF',
          border: '1px solid #E0E0E0',
        };
      case 'Draft':
        return {
          color: '#757575',
          bgcolor: '#FFFFFF',
          border: '1px solid #E0E0E0',
        };
      default:
        return {};
    }
  };

  return (
    <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid', borderColor: 'divider' }}>
      {/* Top Toolbar */}
      <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={() => handleSelectAll(!isAllSelected)}
            startIcon={
              <Checkbox
                checked={isAllSelected}
                indeterminate={selectedIds.length > 0 && selectedIds.length < folderDocs.length}
                size="small"
                sx={{ p: 0, color: 'primary.main' }}
              />
            }
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: 'rgba(21, 101, 192, 0.05)',
              borderColor: 'transparent',
              '&:hover': {
                bgcolor: 'rgba(21, 101, 192, 0.1)',
                borderColor: 'transparent',
              },
              px: 2,
              py: 0.75,
            }}
          >
            Select All
          </Button>

          <IconButton color="default" size="small" disabled={selectedIds.length === 0}>
            <DownloadIcon fontSize="small" />
          </IconButton>
          <IconButton color="default" size="small" disabled={selectedIds.length === 0}>
            <ShareIcon fontSize="small" />
          </IconButton>
          <IconButton color="default" size="small" disabled={selectedIds.length === 0}>
            <DriveFileMoveIcon fontSize="small" />
          </IconButton>

          <Box sx={{ height: 24, width: '1px', bgcolor: 'divider', mx: 1 }} />

          <Button
            variant="outlined"
            startIcon={<LockPersonIcon />}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 700,
              px: 2,
              py: 0.75,
            }}
          >
            Manage Roles
          </Button>
        </Box>

        <Box>
          <TextField
            size="small"
            placeholder="Search in library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              sx: { borderRadius: '20px', width: { xs: '100%', sm: '220px' } },
            }}
          />
        </Box>
      </Box>

      {/* Documents Table */}
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell padding="checkbox" sx={{ width: '48px' }} />
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '0.05em' }}>TITLE</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '0.05em' }}>TYPE</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '0.05em' }}>ACCESS</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '0.05em' }}>LAST MODIFIED</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '0.05em' }}>OWNER</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', letterSpacing: '0.05em' }}>STATUS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {folderDocs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      py: 8,
                      gap: 1.5,
                    }}
                  >
                    <FolderOpenOutlinedIcon sx={{ fontSize: 48, color: '#CFD8DC' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#90A4AE' }}>
                      {selectedFolder}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#B0BEC5' }}>
                      This folder is empty. Upload files to get started.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              folderDocs.map((row) => {
              const isSelected = selectedIds.includes(row.id);
              return (
                <TableRow
                  key={row.id}
                  hover
                  selected={isSelected}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => handleSelectOne(row.id, e.target.checked)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                      <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {renderIcon(row.iconType)}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {row.title}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                      {row.type}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {row.access.map((acc, idx) => (
                        <Chip
                          key={acc}
                          label={acc}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.625rem',
                            borderRadius: '4px',
                            bgcolor: idx === 0 ? '#1565C0' : 'rgba(21, 101, 192, 0.08)',
                            color: idx === 0 ? '#FFFFFF' : '#1565C0',
                            height: '18px',
                            width: 'fit-content',
                          }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {row.lastModified}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {row.owner}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.status}
                      size="small"
                      sx={{
                        fontWeight: 500,
                        fontSize: '0.8125rem',
                        borderRadius: '16px',
                        px: 1,
                        py: 0.5,
                        ...getStatusStyles(row.status),
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Footer */}
      <Box sx={{ p: 2.5, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          Showing 1-10 of 1,284 documents
        </Typography>

        <Pagination
          count={3}
          variant="outlined"
          shape="rounded"
          color="primary"
          sx={{
            '& .MuiPaginationItem-root': {
              borderRadius: '8px',
              fontWeight: 700,
            },
          }}
        />
      </Box>
    </Card>
  );
}
