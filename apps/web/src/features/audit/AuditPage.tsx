import { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Chip,
} from '@mui/material';
import { useAppSelector } from '../../hooks/storeHooks';
import { formatDateTime } from '../../utils/format';

const actionColors: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
  ASSIGN: 'info',
  RETURN: 'warning',
  LOGIN: 'default',
  LOGOUT: 'default',
};

export function AuditPage() {
  const logs = useAppSelector((s) => s.audit.items);
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');

  const filtered = logs.filter((log) => {
    const matchAction = actionFilter === 'all' || log.action === actionFilter;
    const matchEntity = entityFilter === 'all' || log.entityType === entityFilter;
    return matchAction && matchEntity;
  });

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Audit Logs
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Immutable record of all platform actions for compliance
      </Typography>

      <Card sx={{ mb: 2, p: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          select
          size="small"
          label="Action"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">All Actions</MenuItem>
          {['CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'RETURN', 'LOGIN'].map((a) => (
            <MenuItem key={a} value={a}>
              {a}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Entity Type"
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">All Types</MenuItem>
          {['asset', 'employee', 'user'].map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Entity</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.createdAt)}</TableCell>
                  <TableCell>{log.userName}</TableCell>
                  <TableCell>
                    <Chip label={log.action} size="small" color={actionColors[log.action] ?? 'default'} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {log.entityLabel}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {log.entityType}
                    </Typography>
                  </TableCell>
                  <TableCell>{log.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
