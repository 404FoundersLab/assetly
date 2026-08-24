import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Chip, Switch, FormControlLabel,
  Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Collapse
} from '@mui/material';
import { apiFetch } from '../../../services/api/client';
import { PanelLoader } from '../../../components/Loader';
import type { InstalledApp } from '../../../types';

export function InstalledApps({ endpointId }: { endpointId: string }) {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vulnerableOnly, setVulnerableOnly] = useState(false);
  const [expandedCve, setExpandedCve] = useState<string | null>(null);

  const fetchApps = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ apps: any[] }>(`/api/endpoints/${endpointId}/installed-apps?vulnerable=${vulnerableOnly}`);
      setApps(data.apps || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch installed apps');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [endpointId, vulnerableOnly]);

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden' }}>
        <PanelLoader message="Loading installed apps…" minHeight={140} />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderLeft: '4px solid #f44336' }}>
        <Typography color="error" gutterBottom>{error}</Typography>
        <Button variant="outlined" color="error" onClick={fetchApps} size="small">Retry</Button>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Installed Apps & CVE Exposure</Typography>
        <FormControlLabel
          control={<Switch size="small" checked={vulnerableOnly} onChange={(e) => setVulnerableOnly(e.target.checked)} />}
          label="Vulnerable only"
        />
      </Box>

      {apps.length === 0 ? (
        <Typography color="text.secondary">No apps found matching criteria.</Typography>
      ) : (
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>App Name</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Publisher</TableCell>
                <TableCell>Install Date</TableCell>
                <TableCell>CVE Exposure</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {apps.map((app) => (
                <TableRow key={app.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{app.app_name}</TableCell>
                  <TableCell>{app.version || '-'}</TableCell>
                  <TableCell color="text.secondary">{app.publisher || '-'}</TableCell>
                  <TableCell>{app.install_date ? new Date(app.install_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    {app.cve_count > 0 ? (
                      <Box>
                        <Chip
                          label={`${app.cve_count} Vulnerabilities`}
                          color="error"
                          size="small"
                          onClick={() => setExpandedCve(expandedCve === app.id ? null : app.id)}
                          sx={{ cursor: 'pointer', fontWeight: 700 }}
                        />
                        <Collapse in={expandedCve === app.id} timeout="auto" unmountOnExit>
                          <Box mt={1.5} p={1.5} sx={{ bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200', borderRadius: 1.5 }}>
                            <Typography variant="caption" fontWeight={700} color="error.dark" display="block" mb={1}>
                              Detected Security Vulnerabilities:
                            </Typography>
                            {Array.isArray((app as any).cve_details) && (app as any).cve_details.length > 0 ? (
                              (app as any).cve_details.map((detail: any, idx: number) => (
                                <Box key={idx} sx={{ mb: idx < (app as any).cve_details.length - 1 ? 1 : 0, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                                    <Typography
                                      component="a"
                                      href={`https://nvd.nist.gov/vuln/detail/${detail.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      variant="caption"
                                      fontWeight={700}
                                      color="primary.main"
                                      sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                                    >
                                      {detail.id} ↗
                                    </Typography>
                                    <Chip
                                      label={detail.severity}
                                      size="small"
                                      color={detail.severity === 'CRITICAL' ? 'error' : detail.severity === 'HIGH' ? 'warning' : 'default'}
                                      sx={{ fontSize: '0.65rem', height: 18, fontWeight: 700 }}
                                    />
                                  </Box>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {detail.description}
                                  </Typography>
                                </Box>
                              ))
                            ) : (
                              <Typography variant="caption" color="text.primary">
                                {(app.cve_ids || []).map(cve => (
                                  <Chip
                                    key={cve}
                                    component="a"
                                    href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    label={`${cve} ↗`}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    clickable
                                    sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
                                  />
                                ))}
                              </Typography>
                            )}
                          </Box>
                        </Collapse>
                      </Box>
                    ) : (
                      <Chip label="Clean" color="success" size="small" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
