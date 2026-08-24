import { Box, Button, Chip, Typography, Card, CardContent } from '@mui/material';
import FileOpenOutlinedIcon from '@mui/icons-material/FileOpenOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';

interface ExecutiveInsightsBannerProps {
  onReadReport: () => void;
}

export function ExecutiveInsightsBanner({ onReadReport }: ExecutiveInsightsBannerProps) {
  return (
    <Card
      sx={{
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(100deg, #0A192F 0%, #0F3057 60%, #16497D 100%)'
            : 'linear-gradient(100deg, #0D47A1 0%, #1565C0 60%, #1E88E5 100%)',
        color: '#FFFFFF',
        border: 'none',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        mb: 4,
      }}
    >
      <CardContent
        sx={{
          p: { xs: 3, sm: 4, md: 5 },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 4,
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Left Side Info */}
        <Box sx={{ flex: 1, maxWidth: { md: '60%' } }}>
          <Chip
            label="EXECUTIVE INSIGHTS"
            size="small"
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
              mb: 2.5,
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          />
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: 1.2,
              mb: 2,
              letterSpacing: '-0.02em',
              fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' },
            }}
          >
            Optimizing Governance through Structured Documentation
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255, 255, 255, 0.85)',
              mb: 4,
              fontSize: { xs: '0.95rem', sm: '1.05rem' },
              lineHeight: 1.6,
            }}
          >
            Learn how top-tier boards are streamlining their decision-making processes using our latest compliance framework.
          </Typography>
          <Button
            variant="outlined"
            onClick={onReadReport}
            sx={{
              color: '#FFFFFF',
              borderColor: 'rgba(255, 255, 255, 0.4)',
              borderWidth: 2,
              borderRadius: '24px',
              px: 4,
              py: 1.25,
              fontWeight: 700,
              textTransform: 'none',
              backdropFilter: 'blur(4px)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#FFFFFF',
                borderWidth: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            Read Full Report
          </Button>
        </Box>

        {/* Right Side Stylized Document Mockup */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            gap: 2,
            width: 280,
            bgcolor: 'rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(10px)',
            borderRadius: 3,
            p: 2.5,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
            transform: 'rotate(2deg) scale(0.95)',
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: 'rotate(0deg) scale(1)',
            },
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
            }}
          >
            Attachments
          </Typography>

          {/* Doc 1 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Box
              sx={{
                bgcolor: 'error.main',
                borderRadius: 1,
                p: 0.75,
                display: 'flex',
                color: '#FFFFFF',
              }}
            >
              <FileOpenOutlinedIcon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                noWrap
                sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#FFFFFF' }}
              >
                01_Performance_Report.pdf
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.65rem' }}>
                PDF · 4.2 MB
              </Typography>
            </Box>
          </Box>

          {/* Doc 2 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Box
              sx={{
                bgcolor: 'primary.main',
                borderRadius: 1,
                p: 0.75,
                display: 'flex',
                color: '#FFFFFF',
              }}
            >
              <DescriptionOutlinedIcon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                noWrap
                sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#FFFFFF' }}
              >
                Q3_Strategic_Roadmap.docx
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.65rem' }}>
                DOCX · 1.8 MB
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>

      {/* Decorative blurred backgrounds */}
      <Box
        sx={{
          position: 'absolute',
          right: '-10%',
          top: '-20%',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)',
          filter: 'blur(30px)',
          zIndex: 1,
        }}
      />
    </Card>
  );
}
