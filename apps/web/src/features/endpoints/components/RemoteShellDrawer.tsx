import { Drawer, Box, Stack, Typography, IconButton, Paper, TextField, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TerminalIcon from '@mui/icons-material/Terminal';
import SendIcon from '@mui/icons-material/Send';

export interface ConsoleLog { text: string; type: 'cmd' | 'output' | 'err' }

interface Props {
  open: boolean;
  onClose: () => void;
  logs: ConsoleLog[];
  command: string;
  onCommandChange: (v: string) => void;
  onSend: () => void;
  busy: boolean;
}

export function RemoteShellDrawer({ open, onClose, logs, command, onCommandChange, onSend, busy }: Props) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 440, bgcolor: '#090d16', color: '#ffffff', p: 2, borderLeft: '1px solid #1e293b' } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TerminalIcon sx={{ color: '#10b981' }} />
          <Typography variant="subtitle1" fontWeight={700}>Remote PowerShell Prompt</Typography>
        </Stack>
        <IconButton color="inherit" onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      <Paper
        variant="outlined"
        sx={{ flex: 1, bgcolor: '#030712', color: '#10b981', p: 1.5, fontFamily: 'monospace', fontSize: '11px', height: 'calc(100vh - 140px)', overflowY: 'auto', mb: 2 }}
      >
        {logs.map((log, idx) => (
          <Box key={idx} sx={{ color: log.type === 'cmd' ? '#38bdf8' : log.type === 'err' ? '#f44336' : '#10b981', mb: 0.5 }}>
            {log.text}
          </Box>
        ))}
      </Paper>

      <Stack direction="row" spacing={1}>
        <TextField
          fullWidth
          size="small"
          placeholder="Enter command (e.g. Get-Process, ipconfig)…"
          value={command}
          onChange={(e) => onCommandChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }}
          sx={{ bgcolor: '#1e293b', input: { color: '#ffffff', fontFamily: 'monospace', fontSize: '12px' } }}
        />
        <Button variant="contained" color="primary" onClick={onSend} disabled={busy}>
          <SendIcon />
        </Button>
      </Stack>
    </Drawer>
  );
}

