import { useState, useEffect, Fragment } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Collapse, IconButton, Grid, Divider,
  Tabs, Tab, Button, alpha, useTheme, LinearProgress,
  Tooltip, Stack, Avatar, Card, CardContent, Menu, MenuItem
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DownloadIcon from '@mui/icons-material/Download';
import SecurityIcon from '@mui/icons-material/Security';
import ShieldIcon from '@mui/icons-material/Shield';
import GppBadIcon from '@mui/icons-material/GppBad';
import GppMaybeIcon from '@mui/icons-material/GppMaybe';
import GppGoodIcon from '@mui/icons-material/GppGood';
import ComputerIcon from '@mui/icons-material/Computer';
import AppleIcon from '@mui/icons-material/Apple';
import TerminalIcon from '@mui/icons-material/Terminal';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import LockIcon from '@mui/icons-material/Lock';
import UpdateIcon from '@mui/icons-material/Update';
import RouterIcon from '@mui/icons-material/Router';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

import { apiFetch } from '../../services/api/client';
import { useAppSelector } from '../../hooks/storeHooks';
import { ThreatPanel } from './components/ThreatPanel';
import { InstalledApps } from './components/InstalledApps';
import { DeviceContext } from './components/DeviceContext';
import { ActionsBar } from './components/ActionsBar';
import { RemoteDesktopModal } from './components/RemoteDesktopModal';
import { EdrAnalyticsDashboard } from './components/EdrAnalyticsDashboard';
import type { Endpoint, ActivePort } from '../../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseUtcDate(str: string | null | undefined): Date | null {
  if (!str) return null;
  const s = str.replace(' ', 'T');
  const utc = s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`;
  const d = new Date(utc);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(str: string | null | undefined): string {
  const d = parseUtcDate(str);
  if (!d) return '\u2014';
  return d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
}

function getSecurityScore(endpoint: Endpoint, isOffline: boolean, isAvOutdated: boolean): number {
  let score = 100;
  if (isOffline) score -= 30;
  if (endpoint.firewall_status !== 'ON') score -= 20;
  if (endpoint.defender_status !== 'Active') score -= 20;
  if (isAvOutdated) score -= 15;
  if (!endpoint.windows_updates || endpoint.windows_updates.length === 0) score -= 15;
  return Math.max(0, score);
}

function SecurityScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const color = score >= 80 ? '#4caf50' : score >= 50 ? '#ff9800' : '#f44336';
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e0e0e0" strokeWidth={5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography fontWeight="bold" sx={{ fontSize: size >= 64 ? '13px' : '11px', color }}>{score}</Typography>
      </Box>
    </Box>
  );
}

function StatCard({ icon, label, value, color, sublabel }: { icon: React.ReactNode; label: string; value: number; color: string; sublabel?: string }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{ bgcolor: alpha(color, 0.12), color, width: 40, height: 40 }}>{icon}</Avatar>
          <Typography variant="subtitle2" color="text.secondary" flex={1}>{label}</Typography>
        </Box>
        <Typography variant="h4" fontWeight={800} sx={{ color }}>{value}</Typography>
        {sublabel && <Typography variant="caption" color="text.secondary">{sublabel}</Typography>}
      </CardContent>
    </Card>
  );
}

function EndpointRow({ endpoint, onRefresh }: { endpoint: Endpoint; onRefresh: () => void }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [remoteOpen, setRemoteOpen] = useState(false);
  const [portTab, setPortTab] = useState('All');

  const now = new Date();
  const lastSeen = parseUtcDate(endpoint.last_seen_at);
  const isOffline = !lastSeen || (now.getTime() - lastSeen.getTime()) > 5 * 60 * 1000;
  const avDate = parseUtcDate(endpoint.antivirus_updated_at);
  const isAvOutdated = avDate ? (now.getTime() - avDate.getTime()) >= 3 * 24 * 60 * 60 * 1000 : true;
  const score = getSecurityScore(endpoint, isOffline, isAvOutdated);
  const scoreColor = score >= 80 ? 'success' : score >= 50 ? 'warning' : 'error';
  const scoreLabel = score >= 80 ? 'Protected' : score >= 50 ? 'At Risk' : 'Critical';
  const allPorts = endpoint.active_ports || [];
  const filteredPorts = allPorts.filter((p: ActivePort) => {
    if (portTab === 'All') return true;
    if (portTab === 'Listening') return p.state?.toLowerCase() === 'listen';
    if (portTab === 'Established') return p.state?.toLowerCase() === 'established';
    return p.state?.toLowerCase() !== 'listen' && p.state?.toLowerCase() !== 'established';
  });
  const risks: string[] = [];
  if (endpoint.firewall_status !== 'ON') risks.push('Firewall OFF');
  if (endpoint.defender_status !== 'Active') risks.push('Defender Disabled');
  if (isAvOutdated) risks.push('AV Definitions Outdated');
  if (!endpoint.windows_updates?.length) risks.push('Missing OS Updates');
  const barColor = score >= 80 ? theme.palette.success.main : score >= 50 ? theme.palette.warning.main : theme.palette.error.main;

  return (
    <Fragment>
      <RemoteDesktopModal open={remoteOpen} endpoint={endpoint} onClose={() => setRemoteOpen(false)} />
      <TableRow
        onClick={() => setOpen(!open)}
        sx={{
          cursor: 'pointer',
          '& > *': { borderBottom: 'unset' },
          bgcolor: open ? alpha(theme.palette.primary.main, 0.04) : 'inherit',
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
          transition: 'background 0.15s',
        }}
      >
        <TableCell sx={{ width: 48, pl: 1.5 }}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Tooltip title={isOffline ? 'Offline' : 'Online'}>
              <FiberManualRecordIcon sx={{ fontSize: 12, color: isOffline ? 'error.main' : 'success.main', flexShrink: 0 }} />
            </Tooltip>
            <Box>
              <Typography variant="body2" fontWeight={600}>{endpoint.hostname}</Typography>
              <Typography variant="caption" color="text.secondary">{endpoint.ip_address}</Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {endpoint.assigned_employee_name ? (
              <>
                <Avatar sx={{ width: 22, height: 22, fontSize: '0.65rem', bgcolor: 'primary.main' }}>
                  {endpoint.assigned_employee_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </Avatar>
                <Typography variant="body2" fontWeight={600} noWrap>{endpoint.assigned_employee_name}</Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.disabled" fontStyle="italic">Unassigned</Typography>
            )}
          </Box>
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <SecurityScoreRing score={score} size={48} />
            <Box>
              <Chip label={scoreLabel} color={scoreColor as any} size="small" sx={{ fontWeight: 700, letterSpacing: 0.3 }} />
              {risks.length > 0 && (
                <Typography variant="caption" color="error.main" display="block" mt={0.3}>
                  {risks.length} risk{risks.length > 1 ? 's' : ''}
                </Typography>
              )}
            </Box>
          </Box>
        </TableCell>
        <TableCell>
          <Stack spacing={0.4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
              {endpoint.firewall_status === 'ON' ? <CheckCircleIcon sx={{ fontSize: 13, color: 'success.main' }} /> : <CancelIcon sx={{ fontSize: 13, color: 'error.main' }} />}
              <Typography variant="caption">Firewall</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
              {endpoint.defender_status === 'Active' ? <CheckCircleIcon sx={{ fontSize: 13, color: 'success.main' }} /> : <CancelIcon sx={{ fontSize: 13, color: 'error.main' }} />}
              <Typography variant="caption">Real-Time Protection</Typography>
            </Box>
          </Stack>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" color="text.secondary">{fmtDate(endpoint.last_seen_at)}</Typography>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 3, px: 1 }}>

              {/* Security posture summary */}
              <Paper variant="outlined" sx={{
                p: 2.5, mb: 3, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap',
                borderLeft: `4px solid ${barColor}`, bgcolor: alpha(barColor, 0.05),
              }}>
                <SecurityScoreRing score={score} size={72} />
                <Box flex={1} minWidth={200}>
                  <Typography variant="subtitle1" fontWeight={700}>Security Posture: {scoreLabel}</Typography>
                  <LinearProgress variant="determinate" value={score} color={scoreColor as any} sx={{ height: 6, borderRadius: 3, my: 1 }} />
                  {risks.length === 0
                    ? <Typography variant="body2" color="success.main">All security controls are active and up to date.</Typography>
                    : <Typography variant="body2" color="error.main">Issues: {risks.join(' \u00b7 ')}</Typography>}
                </Box>
                <ActionsBar endpointId={endpoint.id} isOffline={isOffline} onRemoteControl={() => setRemoteOpen(true)} />
              </Paper>

              {/* Threat Panel + Security Controls */}
              <Grid container spacing={3} mb={3}>
                <Grid item xs={12} md={7}><ThreatPanel endpointId={endpoint.id} /></Grid>
                <Grid item xs={12} md={5}>
                  <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <ShieldIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle2" fontWeight={700}>Security Controls</Typography>
                    </Box>
                    {[
                      { label: 'Windows Firewall', value: endpoint.firewall_status || 'Unknown', ok: endpoint.firewall_status === 'ON', icon: <LockIcon fontSize="small" /> },
                      { label: 'Real-Time Protection', value: endpoint.defender_status || 'Unknown', ok: endpoint.defender_status === 'Active', icon: <SecurityIcon fontSize="small" /> },
                      { label: 'AV Definitions', value: isAvOutdated ? `Outdated (${fmtDate(endpoint.antivirus_updated_at)})` : `Up to date`, ok: !isAvOutdated, icon: <UpdateIcon fontSize="small" />, warn: isAvOutdated },
                      { label: 'Windows Updates', value: endpoint.windows_updates?.length ? `${endpoint.windows_updates.length} patches` : 'None detected', ok: !!endpoint.windows_updates?.length, icon: <UpdateIcon fontSize="small" />, warn: !endpoint.windows_updates?.length },
                    ].map((item, i) => (
                      <Box key={i}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ color: item.ok ? 'success.main' : (item as any).warn ? 'warning.main' : 'error.main' }}>{item.icon}</Box>
                            <Typography variant="body2">{item.label}</Typography>
                          </Box>
                          <Chip size="small" label={item.value} color={item.ok ? 'success' : (item as any).warn ? 'warning' : 'error'} variant="outlined" sx={{ maxWidth: 180, fontSize: '0.7rem' }} />
                        </Box>
                        {i < 3 && <Divider />}
                      </Box>
                    ))}
                  </Paper>
                </Grid>
              </Grid>

              {/* Hardware + Device Context */}
              <Grid container spacing={3} mb={3}>
                <Grid item xs={12} md={5}>
                  <Paper variant="outlined" sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <ComputerIcon color="action" fontSize="small" />
                      <Typography variant="subtitle2" fontWeight={700}>Hardware & Identity</Typography>
                    </Box>
                    {[
                      { label: 'Hostname', value: endpoint.hostname },
                      { label: 'OS', value: endpoint.os_version || '\u2014' },
                      { label: 'IP Address', value: endpoint.ip_address },
                      { label: 'MAC Address', value: endpoint.mac_address || '\u2014' },
                      { label: 'Serial Number', value: endpoint.serial_number || '\u2014' },
                      { label: 'CPU', value: endpoint.cpu_model || '\u2014' },
                      { label: 'RAM', value: endpoint.ram_total_gb ? `${endpoint.ram_total_gb} GB` : '\u2014' },
                      { label: 'Storage', value: endpoint.storage_total_gb ? `${endpoint.storage_total_gb} GB` : '\u2014' },
                    ].map(({ label, value }, i) => (
                      <Box key={i}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.9 }}>
                          <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>{label}</Typography>
                          <Typography variant="body2" fontWeight={500} textAlign="right">{value}</Typography>
                        </Box>
                        {i < 7 && <Divider />}
                      </Box>
                    ))}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={7}><DeviceContext endpointId={endpoint.id} endpoint={endpoint} /></Grid>
              </Grid>

              {/* Network Connections */}
              <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <RouterIcon color="action" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={700}>Active Network Connections</Typography>
                  <Chip label={`${allPorts.length} total`} size="small" variant="outlined" sx={{ ml: 'auto' }} />
                </Box>
                <Tabs value={portTab} onChange={(_, val) => setPortTab(val)} sx={{ minHeight: 36, mb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                  <Tab label={`All (${allPorts.length})`} value="All" sx={{ minHeight: 36, py: 0.5, fontSize: '0.78rem' }} />
                  <Tab label={`Listening (${allPorts.filter((p: ActivePort) => p.state?.toLowerCase() === 'listen').length})`} value="Listening" sx={{ minHeight: 36, py: 0.5, fontSize: '0.78rem' }} />
                  <Tab label={`Established (${allPorts.filter((p: ActivePort) => p.state?.toLowerCase() === 'established').length})`} value="Established" sx={{ minHeight: 36, py: 0.5, fontSize: '0.78rem' }} />
                  <Tab label="Other" value="Other" sx={{ minHeight: 36, py: 0.5, fontSize: '0.78rem' }} />
                </Tabs>
                <Box sx={{ maxHeight: 220, overflowY: 'auto' }}>
                  {filteredPorts.length > 0 ? (
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          {['Proto', 'Local Port', 'Peer Address', 'State'].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredPorts.map((port: ActivePort, idx: number) => (
                          <TableRow key={idx} sx={port.state?.toLowerCase() === 'established' ? { borderLeft: '3px solid', borderLeftColor: 'primary.main' } : {}}>
                            <TableCell><Typography variant="caption" fontFamily="monospace">{port.protocol}</Typography></TableCell>
                            <TableCell><Typography variant="caption" fontFamily="monospace" fontWeight={600}>{port.local_port}</Typography></TableCell>
                            <TableCell><Typography variant="caption" fontFamily="monospace" color="text.secondary">{port.peer_address || '\u2014'}</Typography></TableCell>
                            <TableCell>
                              <Chip label={port.state} size="small"
                                color={port.state?.toLowerCase() === 'established' ? 'primary' : 'default'}
                                variant={port.state?.toLowerCase() === 'established' ? 'filled' : 'outlined'}
                                sx={{ fontSize: '0.65rem', height: 18 }} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No connections matching this filter.</Typography>
                  )}
                </Box>
              </Paper>

              {/* Windows Updates */}
              {endpoint.windows_updates && endpoint.windows_updates.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <UpdateIcon color="action" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight={700}>Installed Windows Updates</Typography>
                    <Chip label={`${endpoint.windows_updates.length} patches`} size="small" color="success" variant="outlined" sx={{ ml: 'auto' }} />
                  </Box>
                  <Box sx={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                    {endpoint.windows_updates.map((u: string, i: number) => (
                      <Chip key={i} label={u} size="small" variant="outlined" icon={<CheckCircleIcon />} color="success" sx={{ fontSize: '0.7rem' }} />
                    ))}
                  </Box>
                </Paper>
              )}

              {/* Installed Apps & CVE */}
              <InstalledApps endpointId={endpoint.id} />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </Fragment>
  );
}

export function EndpointsPage() {
  const theme = useTheme();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadAnchor, setDownloadAnchor] = useState<null | HTMLElement>(null);
  const { user, tenant } = useAppSelector((state) => state.auth);

  const fetchEndpoints = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ endpoints: Endpoint[] }>('/api/endpoints');
      setEndpoints(data.endpoints || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEndpoints(); }, []);

  const handleDownloadPlatform = async (platform: 'win' | 'macos' | 'linux') => {
    setDownloadAnchor(null);
    setIsDownloading(true);
    try {
      const fileNameMap = {
        win: { path: '/downloads/EndpointSecurityClient_Prod.exe', fallback: '/downloads/build-output/EndpointSecurityClient_Prod.exe', out: 'AssetManager_SecurityClient.exe' },
        macos: { path: '/downloads/EndpointSecurityClient_macOS', out: 'AssetManager_SecurityClient_macOS' },
        linux: { path: '/downloads/EndpointSecurityClient_Linux', out: 'AssetManager_SecurityClient_Linux' },
      };

      const target = fileNameMap[platform] as { path: string; fallback?: string; out: string };
      let response = await fetch(target.path);
      // Try build-output subdirectory (new Electron GUI build)
      if (!response.ok && target.fallback) response = await fetch(target.fallback);
      // Fall back to legacy API endpoint
      if (!response.ok && platform === 'win') response = await fetch('/api/agent/download');
      if (!response.ok) throw new Error(`Failed to download ${platform} agent executable`);

      const arrayBuffer = await response.arrayBuffer();
      const tenantId = user?.tenantId || tenant?.id || '11111111-1111-1111-1111-111111111111';
      const sig = new TextEncoder().encode(`___TENANT_ID___:${tenantId}`);
      const out = new Uint8Array(arrayBuffer.byteLength + sig.byteLength);
      out.set(new Uint8Array(arrayBuffer), 0); out.set(sig, arrayBuffer.byteLength);

      const url = window.URL.createObjectURL(new Blob([out], { type: 'application/octet-stream' }));
      const a = document.createElement('a'); a.href = url; a.download = target.out;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { alert('Failed to download agent. Please check your connection and try again.'); }
    finally { setIsDownloading(false); }
  };

  const now = new Date();
  const enriched = endpoints.map(ep => {
    const lastSeen = parseUtcDate(ep.last_seen_at);
    const isOffline = !lastSeen || (now.getTime() - lastSeen.getTime()) > 5 * 60 * 1000;
    const avDate = parseUtcDate(ep.antivirus_updated_at);
    const isAvOutdated = avDate ? (now.getTime() - avDate.getTime()) >= 3 * 24 * 60 * 60 * 1000 : true;
    return { ep, isOffline, score: getSecurityScore(ep, isOffline, isAvOutdated) };
  });
  const online = enriched.filter(e => !e.isOffline).length;
  const protected_ = enriched.filter(e => e.score >= 80).length;
  const atRisk = enriched.filter(e => e.score >= 50 && e.score < 80).length;
  const critical = enriched.filter(e => e.score < 50).length;
  const offline = enriched.filter(e => e.isOffline).length;

  const [viewTab, setViewTab] = useState<'edr' | 'inventory'>('edr');

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <ShieldIcon sx={{ fontSize: 30, color: 'primary.main' }} />
            <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>Endpoint Security</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Real-time protection status, threat intelligence, and device health for all registered endpoints across Windows, macOS, and Linux.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchEndpoints} disabled={loading}>Refresh</Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={(e) => setDownloadAnchor(e.currentTarget)}
            disabled={isDownloading}
            sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)', fontWeight: 700 }}
          >
            {isDownloading ? 'Preparing…' : 'Deploy Security Client ▾'}
          </Button>
          <Menu
            anchorEl={downloadAnchor}
            open={Boolean(downloadAnchor)}
            onClose={() => setDownloadAnchor(null)}
            PaperProps={{ sx: { minWidth: 260, mt: 1 } }}
          >
            <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                Security Client v2.0 — GUI Edition
              </Typography>
            </Box>
            <MenuItem onClick={() => handleDownloadPlatform('win')}>
              <ComputerIcon sx={{ mr: 1.5, color: '#0078d4' }} fontSize="small" />
              <Box>
                <Typography variant="body2" fontWeight={600}>Windows (.exe)</Typography>
                <Typography variant="caption" color="text.secondary">Electron desktop app</Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={() => handleDownloadPlatform('macos')}>
              <AppleIcon sx={{ mr: 1.5, color: '#555' }} fontSize="small" />
              <Box>
                <Typography variant="body2" fontWeight={600}>macOS (Darwin)</Typography>
                <Typography variant="caption" color="text.secondary">Intel &amp; Apple Silicon</Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={() => handleDownloadPlatform('linux')}>
              <TerminalIcon sx={{ mr: 1.5, color: '#e95420' }} fontSize="small" />
              <Box>
                <Typography variant="body2" fontWeight={600}>Linux (ELF)</Typography>
                <Typography variant="caption" color="text.secondary">x64 binary</Typography>
              </Box>
            </MenuItem>
          </Menu>
        </Stack>
      </Box>

      {/* Mode Switcher Tabs */}
      <Tabs value={viewTab} onChange={(_, val) => setViewTab(val)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="🛡️ EDR Analytics & Command Center" value="edr" sx={{ fontWeight: 700, fontSize: '0.85rem' }} />
        <Tab label={`🖥️ Registered Devices Inventory (${endpoints.length})`} value="inventory" sx={{ fontWeight: 700, fontSize: '0.85rem' }} />
      </Tabs>

      {/* EDR Analytics View */}
      {viewTab === 'edr' && (
        <EdrAnalyticsDashboard
          endpoints={endpoints}
          onRefresh={fetchEndpoints}
          onSelectEndpoint={() => setViewTab('inventory')}
        />
      )}

      {/* Devices Inventory View (Summary Cards + Endpoint Table) */}
      {viewTab === 'inventory' && (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={2.4}>
              <StatCard icon={<WifiIcon />} label="Online" value={online} color={theme.palette.info.main} sublabel="Heartbeat active" />
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <StatCard icon={<GppGoodIcon />} label="Protected" value={protected_} color={theme.palette.success.main} sublabel="All controls active" />
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <StatCard icon={<GppMaybeIcon />} label="At Risk" value={atRisk} color={theme.palette.warning.main} sublabel="Needs attention" />
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <StatCard icon={<GppBadIcon />} label="Critical" value={critical} color={theme.palette.error.main} sublabel="Action required" />
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <StatCard icon={<WifiOffIcon />} label="Offline" value={offline} color={theme.palette.text.secondary} sublabel="No heartbeat > 5m" />
            </Grid>
          </Grid>

          {/* Endpoint Table */}
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                  <TableCell sx={{ width: 48 }} />
                  {['Device', 'Assigned To', 'Security Score', 'Protection Status', 'Last Seen'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.7 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {error ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'error.main' }}>
                      <GppBadIcon sx={{ fontSize: 36, mb: 1, display: 'block', mx: 'auto', opacity: 0.5 }} />
                      {error}
                    </TableCell>
                  </TableRow>
                ) : loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">Loading endpoints\u2026</Typography>
                      <LinearProgress sx={{ mt: 2, maxWidth: 300, mx: 'auto' }} />
                    </TableCell>
                  </TableRow>
                ) : endpoints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <ShieldIcon sx={{ fontSize: 48, color: 'text.disabled', display: 'block', mx: 'auto', mb: 1.5 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>No Endpoints Registered</Typography>
                      <Typography variant="body2" color="text.disabled" mb={2}>Deploy the security agent on your Windows, macOS, or Linux devices to start monitoring.</Typography>
                      <Button variant="contained" startIcon={<DownloadIcon />} onClick={(e) => setDownloadAnchor(e.currentTarget)}>Deploy Agent ▾</Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  endpoints.map((endpoint: Endpoint) => (
                    <EndpointRow key={endpoint.id} endpoint={endpoint} onRefresh={fetchEndpoints} />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
