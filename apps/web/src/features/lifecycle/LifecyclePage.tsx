import { useState, useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Avatar,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  alpha,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import BuildIcon from '@mui/icons-material/Build';
import SyncIcon from '@mui/icons-material/Sync';
import { useAppSelector } from '../../hooks/storeHooks';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { getEmployeeName, formatDateTime } from '../../utils/format';
import { Asset, AssetAssignment, OwnershipEvent } from '../../types';

type TimelineEvent = {
  id: string;
  date: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
};

export function LifecyclePage() {
  const assets = useAppSelector((s) => s.assets.items);
  const assignments = useAppSelector((s) => s.assets.assignments);
  const history = useAppSelector((s) => s.assets.ownershipHistory);
  const employees = useAppSelector((s) => s.employees.items);

  const [search, setSearch] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(assets.length > 0 ? assets[0].id : null);

  const filteredAssets = useMemo(() => {
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.assetTag.toLowerCase().includes(search.toLowerCase())
    );
  }, [assets, search]);

  const selectedAsset = useMemo(() => assets.find(a => a.id === selectedAssetId), [assets, selectedAssetId]);

  const assetTimeline = useMemo(() => {
    if (!selectedAssetId || !selectedAsset) return [];
    
    const events: TimelineEvent[] = [];
    
    // 1. Creation Event
    events.push({
      id: `create-${selectedAsset.id}`,
      date: selectedAsset.createdAt,
      title: 'Asset Added to Inventory',
      description: `Registered as ${selectedAsset.assetTag} (${selectedAsset.category})`,
      icon: <AddCircleIcon />,
      color: '#2e7d32'
    });

    // 2. Assignment Events (both Assigned and Returned)
    const assetAssignments = assignments.filter(a => a.assetId === selectedAssetId);
    
    assetAssignments.forEach(assignment => {
      const emp = employees.find(e => e.id === assignment.employeeId);
      const empName = emp ? getEmployeeName(emp.firstName, emp.lastName) : 'Unknown Employee';
      
      events.push({
        id: `assign-${assignment.id}`,
        date: assignment.assignedAt,
        title: 'Assigned to Employee',
        description: `Assigned to ${empName} by ${assignment.assignedBy}. ${assignment.notes ? `Notes: ${assignment.notes}` : ''}`,
        icon: <AssignmentIndIcon />,
        color: '#1565c0'
      });

      if (assignment.returnedAt) {
        events.push({
          id: `return-${assignment.id}`,
          date: assignment.returnedAt,
          title: 'Returned to Inventory',
          description: `Collected back from ${empName}. ${assignment.returnCondition ? `Condition: ${assignment.returnCondition}` : ''}`,
          icon: <KeyboardReturnIcon />,
          color: '#ed6c02'
        });
      }
    });

    // 3. Other Ownership History (Repairs, Status Changes if they were logged in ownershipHistory)
    const otherEvents = history.filter(h => h.assetId === selectedAssetId && h.eventType !== 'ASSIGNED' && h.eventType !== 'RETURNED');
    otherEvents.forEach(h => {
      events.push({
        id: `hist-${h.id}`,
        date: h.createdAt,
        title: h.eventType,
        description: `${h.description} (by ${h.performedBy})`,
        icon: <BuildIcon />,
        color: '#7b1fa2'
      });
    });

    // Sort events chronologically
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedAssetId, selectedAsset, assignments, employees, history]);

  return (
    <Box>
      <PageHeader
        title="Asset Lifecycle Tracking"
        subtitle="View the complete history of every asset: additions, assignments, and returns."
      />

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Left Column: Asset Selection */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search assets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <List sx={{ flex: 1, overflowY: 'auto', p: 0 }}>
              {filteredAssets.length === 0 ? (
                <ListItem>
                  <ListItemText secondary="No assets found" />
                </ListItem>
              ) : (
                filteredAssets.map(asset => (
                  <ListItemButton
                    key={asset.id}
                    selected={selectedAssetId === asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    sx={{
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&.Mui-selected': {
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                        borderLeft: (theme) => `4px solid ${theme.palette.primary.main}`,
                      }
                    }}
                  >
                    <ListItemText
                      primary={asset.assetTag}
                      secondary={asset.name}
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                  </ListItemButton>
                ))
              )}
            </List>
          </Card>
        </Grid>

        {/* Right Column: Timeline */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 'calc(100vh - 200px)', overflowY: 'auto', p: 3 }}>
            {!selectedAsset ? (
              <EmptyState
                icon={<SyncIcon />}
                title="Select an asset"
                description="Choose an asset from the list to view its complete lifecycle history."
              />
            ) : (
              <Box>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                  {selectedAsset.assetTag} — {selectedAsset.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                  Current Status: <strong>{selectedAsset.status.replace('_', ' ').toUpperCase()}</strong>
                </Typography>

                <Stepper orientation="vertical">
                  {assetTimeline.map((step, index) => (
                    <Step key={step.id} active={true}>
                      <StepLabel
                        icon={
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: alpha(step.color, 0.15),
                              color: step.color,
                            }}
                          >
                            {step.icon}
                          </Box>
                        }
                      >
                        <Typography variant="subtitle1" fontWeight={600}>
                          {step.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(step.date)}
                        </Typography>
                      </StepLabel>
                      <StepContent>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            {step.description}
                          </Typography>
                        </Box>
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>
                
                {selectedAsset.status === 'in_stock' && (
                   <Box sx={{ mt: 3, p: 2, bgcolor: alpha('#2e7d32', 0.05), borderRadius: 2, border: '1px dashed #2e7d32' }}>
                     <Typography variant="body2" color="text.primary" textAlign="center">
                       Asset is currently in stock and ready for deployment.
                     </Typography>
                   </Box>
                )}
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
