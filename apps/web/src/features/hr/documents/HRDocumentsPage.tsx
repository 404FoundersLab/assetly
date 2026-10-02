import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  MenuItem,
  alpha,
  useTheme,
  Tooltip,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { PageHeader } from '../../../components/PageHeader';

interface HRDoc {
  id: string;
  title: string;
  category: 'Company Policies' | 'Legal & Compliance' | 'Compensation & Benefits' | 'Forms & Templates';
  format: 'PDF' | 'DOCX';
  fileSize: string;
  updatedDate: string;
  description: string;
}

const INITIAL_DOCS: HRDoc[] = [
  { id: '1', title: 'Global Employee Handbook 2026', category: 'Company Policies', format: 'PDF', fileSize: '4.2 MB', updatedDate: 'Jan 15, 2026', description: 'Comprehensive guide to workplace ethics, equal opportunity standards, and code of conduct.' },
  { id: '2', title: 'Information Security & Data Protection Charter', category: 'Legal & Compliance', format: 'PDF', fileSize: '1.8 MB', updatedDate: 'Feb 10, 2026', description: 'Mandatory confidentiality and device security handling standards.' },
  { id: '3', title: 'Corporate Medical & Life Insurance Guide', category: 'Compensation & Benefits', format: 'PDF', fileSize: '2.5 MB', updatedDate: 'Mar 01, 2026', description: 'Dependent coverage limits, cashless hospital network, and claim filing procedures.' },
  { id: '4', title: 'Remote Work & WFH Policy Guidelines', category: 'Company Policies', format: 'PDF', fileSize: '980 KB', updatedDate: 'Apr 12, 2026', description: 'Broadband reimbursement rules, ergonomic allowances, and core overlap hours.' },
  { id: '5', title: 'Parental Leave & Family Support Charter', category: 'Compensation & Benefits', format: 'PDF', fileSize: '1.2 MB', updatedDate: 'Jun 20, 2026', description: 'Maternity, paternity, adoption benefits, and flexible phased return.' },
  { id: '6', title: 'Standard NDA & IP Assignment Template', category: 'Legal & Compliance', format: 'DOCX', fileSize: '650 KB', updatedDate: 'Jul 05, 2026', description: 'Proprietary invention disclosure and non-disclosure agreement draft.' },
];

export function HRDocumentsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = INITIAL_DOCS.filter((d) => {
    const matchCat = categoryFilter === 'all' || d.category === categoryFilter;
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) || d.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleDownload = (title: string) => {
    alert(`Downloading ${title}...`);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="HR Document Vault & Policies"
        subtitle="Centralized repository of corporate governance charters, employee handbooks, benefits guides, and legal templates"
      />

      {/* Filter and Search */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3, mt: 1 }}>
        <TextField
          size="small"
          placeholder="Search policy name or keywords..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: { sm: 380 } }}
        />
        <TextField
          select
          size="small"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="all">All Document Categories</MenuItem>
          <MenuItem value="Company Policies">Company Policies</MenuItem>
          <MenuItem value="Legal & Compliance">Legal & Compliance</MenuItem>
          <MenuItem value="Compensation & Benefits">Compensation & Benefits</MenuItem>
          <MenuItem value="Forms & Templates">Forms & Templates</MenuItem>
        </TextField>
      </Stack>

      {/* Grid */}
      <Grid container spacing={3}>
        {filtered.map((doc) => (
          <Grid item xs={12} md={6} lg={4} key={doc.id}>
            <Card
              sx={{
                p: 3,
                height: '100%',
                borderRadius: '16px',
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease',
                '&:hover': { transform: 'translateY(-2px)', borderColor: '#10B981', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.12)' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    bgcolor: alpha('#10B981', 0.12),
                    color: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {doc.format === 'PDF' ? <PictureAsPdfIcon /> : <InsertDriveFileIcon />}
                </Box>
                <Chip
                  label={doc.category}
                  size="small"
                  sx={{ fontWeight: 700, fontSize: '0.65rem', bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }}
                />
              </Box>

              <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.05rem', mb: 1, letterSpacing: '-0.01em' }}>
                {doc.title}
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', lineHeight: 1.5, mb: 3, flexGrow: 1 }}>
                {doc.description}
              </Typography>

              <Box sx={{ pt: 2, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">
                  {doc.fileSize} • Updated {doc.updatedDate}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                  onClick={() => handleDownload(doc.title)}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, borderColor: '#10B981', color: '#10B981', '&:hover': { borderColor: '#059669', bgcolor: alpha('#10B981', 0.08) } }}
                >
                  Download
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
