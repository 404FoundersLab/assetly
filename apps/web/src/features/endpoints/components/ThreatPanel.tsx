import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Chip, Switch, FormControlLabel,
  Button, List, ListItem, ListItemText, Divider
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { apiFetch } from '../../../services/api/client';
import { PanelLoader } from '../../../components/Loader';
import type { EndpointThreat, ThreatSeverity } from '../../../types';

export function ThreatPanel({ endpointId }: { endpointId: string }) {
  const [threats, setThreats] = useState<EndpointThreat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const fetchThreats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ threats: any[] }>(`/api/endpoints/${endpointId}/threats?resolved=${showResolved}`);
      setThreats(data.threats || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch threats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreats();
  }, [endpointId, showResolved]);

  const getSeverityColor = (severity: ThreatSeverity | string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'warning'; // Using warning for amber/yellow as MUI defaults
      case 'low': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden' }}>
        <PanelLoader message="Checking threats…" minHeight={120} />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderLeft: '4px solid #f44336' }}>
        <Typography color="error" gutterBottom>{error}</Typography>
        <Button variant="outlined" color="error" onClick={fetchThreats} size="small">Retry</Button>
      </Paper>
    );
  }

  const criticalCount = threats.filter(t => t.severity === 'critical').length;
  const highCount = threats.filter(t => t.severity === 'high').length;
  const mediumCount = threats.filter(t => t.severity === 'medium').length;
  const lowCount = threats.filter(t => t.severity === 'low').length;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" display="flex" alignItems="center" gap={1}>
          <WarningAmberIcon color={threats.length > 0 ? "error" : "action"} />
          Threats & Alerts
        </Typography>
        <FormControlLabel
          control={<Switch size="small" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />}
          label="Show resolved"
        />
      </Box>

      {threats.length === 0 ? (
        <Box display="flex" alignItems="center" gap={1} color="success.main" my={2}>
          <CheckCircleOutlineIcon />
          <Typography>No active threats</Typography>
        </Box>
      ) : (
        <>
          <Box display="flex" gap={1} mb={2}>
            <Chip label={`Critical: ${criticalCount}`} color="error" size="small" />
            <Chip label={`High: ${highCount}`} color="warning" size="small" />
            <Chip label={`Medium: ${mediumCount}`} color="warning" size="small" variant="outlined" />
            <Chip label={`Low: ${lowCount}`} size="small" variant="outlined" />
          </Box>
          <List dense disablePadding>
            {threats.slice(0, 5).map((threat, idx) => (
              <Box key={threat.id || idx}>
                <ListItem alignItems="flex-start" disablePadding sx={{ py: 1 }}>
                  <Box mr={2} mt={0.5}>
                    <Chip label={threat.severity?.toUpperCase()} color={getSeverityColor(threat.severity) as any} size="small" />
                  </Box>
                  <ListItemText
                    primary={<Typography variant="subtitle2">{threat.threat_type}</Typography>}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.primary" display="block">
                          {threat.description}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary">
                          Detected: {new Date(threat.detected_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                {idx < Math.min(threats.length, 5) - 1 && <Divider component="li" />}
              </Box>
            ))}
          </List>
        </>
      )}
    </Paper>
  );
}
