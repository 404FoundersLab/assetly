import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Avatar,
  Divider,
  Paper,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PeopleIcon from '@mui/icons-material/People';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import BadgeIcon from '@mui/icons-material/Badge';
import { PageHeader } from '../../components/PageHeader';
import { fetchOrgHierarchy, type HierarchyNodeDto, type HierarchyResponseDto } from '../../services/api/workflows';

function HierarchyCard({ node, depth = 0 }: { node: HierarchyNodeDto; depth?: number }) {
  const hasReports = node.children && node.children.length > 0;

  return (
    <Box sx={{ ml: depth > 0 ? 3 : 0, mt: 1.5, position: 'relative' }}>
      <Paper
        elevation={depth === 0 ? 3 : 1}
        sx={{
          p: 2,
          borderLeft: 4,
          borderColor: depth === 0 ? 'primary.main' : hasReports ? 'secondary.main' : 'divider',
          bgcolor: 'background.paper',
          borderRadius: 2,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                bgcolor: depth === 0 ? 'primary.main' : hasReports ? 'secondary.main' : 'grey.700',
                width: 42,
                height: 42,
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {node.firstName[0]}
              {node.lastName[0] || ''}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {node.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {node.jobTitle || 'Team Member'} {node.departmentName ? `• ${node.departmentName}` : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {node.email}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            {node.directReportsCount > 0 && (
              <Chip
                icon={<PeopleIcon />}
                label={`${node.directReportsCount} Direct Report${node.directReportsCount > 1 ? 's' : ''}`}
                color="primary"
                size="small"
                variant="outlined"
              />
            )}
            <Chip
              label={node.status}
              color={node.status === 'active' ? 'success' : 'default'}
              size="small"
            />
          </Stack>
        </Stack>
      </Paper>

      {/* Render Subordinates / Children */}
      {hasReports && (
        <Box sx={{ pl: 2, borderLeft: '2px dashed', borderColor: 'divider', ml: 2, mt: 1 }}>
          {node.children.map((child) => (
            <HierarchyCard key={child.id} node={child} depth={depth + 1} />
          ))}
        </Box>
      )}
    </Box>
  );
}

export function HierarchyPage() {
  const [data, setData] = useState<HierarchyResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOrgHierarchy();
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load organization hierarchy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Organization Hierarchy & Reporting Lines"
        subtitle="View team reporting relationships, managers, and direct reports across departments."
        actions={
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={() => void loadData()}>
            Refresh
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stat Cards */}
      {data && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.dark', width: 48, height: 48 }}>
                  <BadgeIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Employees
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {data.totalEmployees}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'secondary.dark', width: 48, height: 48 }}>
                  <SupervisorAccountIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Reporting Managers
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {data.managersCount}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.dark', width: 48, height: 48 }}>
                  <AccountTreeIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Top-Level Leaders
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {data.tree.length}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tree Visualization */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      ) : !data || data.tree.length === 0 ? (
        <Card sx={{ p: 5, textAlign: 'center', bgcolor: 'background.paper' }}>
          <AccountTreeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" fontWeight={600}>
            No Employees in Hierarchy
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Add employees and assign reporting managers in the Employees directory to build your organizational tree.
          </Typography>
        </Card>
      ) : (
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Organizational Reporting Structure
          </Typography>
          {data.tree.map((rootNode) => (
            <HierarchyCard key={rootNode.id} node={rootNode} />
          ))}
        </Box>
      )}
    </Box>
  );
}
