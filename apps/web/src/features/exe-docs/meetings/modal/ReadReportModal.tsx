import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Divider,
  alpha,
} from '@mui/material';
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined';

interface ReadReportModalProps {
  open: boolean;
  onClose: () => void;
}

export function ReadReportModal({ open, onClose }: ReadReportModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      slotProps={{
        paper: {
          sx: { borderRadius: 3, p: 1 },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <LibraryBooksOutlinedIcon color="primary" sx={{ fontSize: '2rem' }} />
        <Box>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.25rem', lineHeight: 1.2 }}>
            Optimizing Governance through Structured Documentation
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Executive Intelligence briefing &bull; Published Q4 2024
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: 'divider', py: 3 }}>
        <Box sx={{ maxWidth: 720, mx: 'auto' }}>
          {/* Main Abstract */}
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              fontStyle: 'italic',
              color: 'text.secondary',
              mb: 4,
              lineHeight: 1.6,
              borderLeft: '4px solid',
              borderColor: 'primary.main',
              pl: 2,
            }}
          >
            "How top-tier boards are streamlining their decision-making processes, reducing legal exposure, and accelerating execution using our latest corporate compliance frameworks."
          </Typography>

          {/* Section 1 */}
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5, color: 'text.primary' }}>
            1. The Boardroom Information Dilemma
          </Typography>
          <Typography variant="body2" paragraph sx={{ lineHeight: 1.7, color: 'text.secondary', mb: 3 }}>
            Modern executive boards are faced with an unprecedented influx of information. However, abundance does not equate to clarity. Often, board packets stretch to hundreds of pages of unstructured data, leaving directors with limited capacity to identify critical risk vectors or strategic pivots. Structured documentation solves this by standardizing executive briefing files, ensuring key data points are highlighted, and enforcing compliance requirements early in the lifecycle.
          </Typography>

          {/* Section 2 */}
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5, color: 'text.primary' }}>
            2. Pillars of Structured Governance
          </Typography>
          <Typography variant="body2" paragraph sx={{ lineHeight: 1.7, color: 'text.secondary', mb: 1.5 }}>
            To establish a robust governance layer, organizations must implement three foundational principles:
          </Typography>
          
          <Box sx={{ pl: 2, mb: 4 }}>
            <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary', mb: 1 }}>
              &bull; <strong>Standardized Templating:</strong> Ensure all agenda proposals contain consistent sections: executive summary, financial impact assessment, risk mitigation matrices, and clear compliance pathways.
            </Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary', mb: 1 }}>
              &bull; <strong>Real-time Document Verification:</strong> Attachments must be digitally certified, ensuring directors review verified, non-repudiated assets.
            </Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
              &bull; <strong>Traceable Preparation Auditing:</strong> Track document preparation states (e.g., draft, pending legal review, finalized) to protect the board from decisions based on outdated reports.
            </Typography>
          </Box>

          {/* Highlight Callout */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
              border: '1px solid',
              borderColor: (theme) => alpha(theme.palette.primary.main, 0.15),
              mb: 4,
            }}
          >
            <Typography variant="subtitle2" color="primary.main" fontWeight={700} gutterBottom>
              Key Takeaway
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
              Companies utilizing structured documentation saw a 34% reduction in board-meeting duration and a 50% faster turnaround time for post-meeting resolutions and compliance sign-offs.
            </Typography>
          </Box>

          {/* Section 3 */}
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5, color: 'text.primary' }}>
            3. Implementation and Scaling
          </Typography>
          <Typography variant="body2" paragraph sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
            Transitioning to a structured governance model requires incremental changes. Organizations should begin by digitizing the meeting agenda checklist and migrating file management to a secure, permissioned library. Integrating these assets with active agendas ensures compliance criteria are automatically met prior to final board approval.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1.5 }}>
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>
          Close Article
        </Button>
        <Button
          onClick={onClose}
          variant="contained"
          color="primary"
          sx={{
            borderRadius: '20px',
            px: 3,
            fontWeight: 700,
            textTransform: 'none',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? '#1E88E5' : '#0D47A1',
            '&:hover': {
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? '#1565C0' : '#0A192F',
            },
          }}
        >
          Acknowledge & Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
