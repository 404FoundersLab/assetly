import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Avatar,
  alpha,
  useTheme,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CampaignIcon from '@mui/icons-material/Campaign';
import PushPinIcon from '@mui/icons-material/PushPin';
import DeleteIcon from '@mui/icons-material/Delete';
import { PageHeader } from '../../../components/PageHeader';

interface Announcement {
  id: string;
  title: string;
  category: 'Company News' | 'Policy Update' | 'Event' | 'Urgent Notice';
  author: string;
  authorRole: string;
  date: string;
  content: string;
  isPinned: boolean;
  priorityColor: string;
}

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: 'Q4 Global Town Hall & FY27 Product Roadmap Unveiling',
    category: 'Event',
    author: 'Vasanth',
    authorRole: 'CEO & Founder',
    date: 'Oct 02, 2026',
    content: 'Join us live this Friday at 4:00 PM IST for our quarterly all-hands gathering. We will review Q3 achievements, celebrate promotions, and outline our key AI innovation roadmap.',
    isPinned: true,
    priorityColor: '#6366F1',
  },
  {
    id: '2',
    title: 'Annual Health & Wellness Checkup Camp (Campus A & B)',
    category: 'Company News',
    author: 'Emily Davis',
    authorRole: 'Head of People Operations',
    date: 'Sep 28, 2026',
    content: 'Complimentary comprehensive health screening camps will be held on Floor 2 next Tuesday and Wednesday. Pre-book your slot through the employee wellness portal.',
    isPinned: false,
    priorityColor: '#10B981',
  },
  {
    id: '3',
    title: 'Updated Expense Reimbursement & Travel Policy Effective Nov 1',
    category: 'Policy Update',
    author: 'Priya Patel',
    authorRole: 'Finance Director',
    date: 'Sep 24, 2026',
    content: 'Please review the updated daily meal allowance and flight booking guidelines uploaded to the Document Vault under Finance & Travel guidelines.',
    isPinned: false,
    priorityColor: '#F59E0B',
  },
];

export function AnnouncementsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [posts, setPosts] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'Company News' as Announcement['category'], content: '', isPinned: false });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) return;

    const colors: Record<string, string> = {
      'Company News': '#10B981',
      'Policy Update': '#F59E0B',
      'Event': '#6366F1',
      'Urgent Notice': '#EF4444',
    };

    const newPost: Announcement = {
      id: String(Date.now()),
      title: form.title,
      category: form.category,
      author: 'HR Communications',
      authorRole: 'People Operations',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      content: form.content,
      isPinned: form.isPinned,
      priorityColor: colors[form.category] || '#10B981',
    };

    setPosts([newPost, ...posts]);
    setOpenModal(false);
    setForm({ title: '', category: 'Company News', content: '', isPinned: false });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Remove announcement bulletin?')) {
      setPosts(posts.filter((p) => p.id !== id));
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Company Announcements & Bulletins"
        subtitle="Broadcast corporate news, policy changes, town hall schedules, and festive greetings to all employees"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenModal(true)}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            Post Announcement
          </Button>
        }
      />

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {posts.map((post) => (
          <Grid item xs={12} key={post.id}>
            <Card
              sx={{
                p: 3,
                borderRadius: '16px',
                border: '1px solid',
                borderColor: post.isPinned ? alpha(post.priorityColor, 0.4) : theme.palette.divider,
                bgcolor: post.isPinned
                  ? isDark ? 'rgba(99, 102, 241, 0.06)' : '#F8FAFC'
                  : 'background.paper',
                boxShadow: post.isPinned ? `0 8px 24px -6px ${alpha(post.priorityColor, 0.15)}` : 'none',
                position: 'relative',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Chip
                    label={post.category}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      bgcolor: alpha(post.priorityColor, isDark ? 0.2 : 0.1),
                      color: post.priorityColor,
                      borderRadius: '6px',
                    }}
                  />
                  {post.isPinned && (
                    <Chip
                      icon={<PushPinIcon sx={{ fontSize: 14 }} />}
                      label="PINNED"
                      size="small"
                      color="primary"
                      sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700 }}
                    />
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Published on {post.date}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => handleDelete(post.id)} sx={{ color: 'text.secondary' }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>

              <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.2rem', mb: 1.5, letterSpacing: '-0.02em' }}>
                {post.title}
              </Typography>

              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7, mb: 3 }}>
                {post.content}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: post.priorityColor, fontSize: '0.75rem', fontWeight: 700 }}>
                  {post.author[0]}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={700}>{post.author}</Typography>
                  <Typography variant="caption" color="text.secondary">{post.authorRole}</Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Post Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreate}>
          <DialogTitle sx={{ fontWeight: 800 }}>Create Company Announcement</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                required
                fullWidth
                label="Headline Title"
                placeholder="e.g. Q4 Town Hall Schedule..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <TextField
                select
                required
                fullWidth
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Announcement['category'] })}
              >
                <MenuItem value="Company News">Company News</MenuItem>
                <MenuItem value="Policy Update">Policy Update</MenuItem>
                <MenuItem value="Event">Event / All-Hands</MenuItem>
                <MenuItem value="Urgent Notice">Urgent Notice</MenuItem>
              </TextField>
              <TextField
                required
                fullWidth
                multiline
                rows={4}
                label="Announcement Content"
                placeholder="Details of the announcement..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}>
              Publish Broadcast
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
