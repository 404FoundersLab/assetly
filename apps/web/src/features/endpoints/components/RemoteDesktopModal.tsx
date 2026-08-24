import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
  Typography, Chip, IconButton, Tooltip, Stack, Select, MenuItem,
  FormControl, InputLabel, Drawer, TextField, Paper, CircularProgress,
  Badge, Alert
} from '@mui/material';
import TvIcon from '@mui/icons-material/Tv';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import TerminalIcon from '@mui/icons-material/Terminal';
import SpeedIcon from '@mui/icons-material/Speed';
import MouseIcon from '@mui/icons-material/Mouse';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import SendIcon from '@mui/icons-material/Send';
import SecurityIcon from '@mui/icons-material/Security';
import type { Endpoint } from '../../../types';
import { apiFetch } from '../../../services/api/client';

interface RemoteDesktopModalProps {
  open: boolean;
  endpoint: Endpoint | null;
  onClose: () => void;
}

export function RemoteDesktopModal({ open, endpoint, onClose }: RemoteDesktopModalProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [quality, setQuality] = useState<'1080p' | '720p' | '480p'>('720p');
  const [fps, setFps] = useState<number>(15);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [consoleLogs, setConsoleLogs] = useState<Array<{ text: string; type: 'cmd' | 'output' | 'err' }>>([
    { text: 'AssetManager Remote Shell v2.0 Initialized.', type: 'output' },
    { text: 'Type any PowerShell or system command to execute remotely.', type: 'output' }
  ]);
  const [executingCmd, setExecutingCmd] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastMouseMoveTimeRef = useRef<number>(0);

  // Initialize Remote Session
  useEffect(() => {
    if (!open || !endpoint) return;

    setStatus('connecting');
    frameCountRef.current = 0;

    // Start remote session on relay
    apiFetch(`/api/endpoints/${endpoint.id}/remote-relay`, {
      method: 'POST',
      body: JSON.stringify({ action: 'start' })
    }).then(() => {
      startFrameStreaming();
    }).catch((err: any) => {
      console.error('Failed to start remote session:', err);
      setStatus('error');
    });

    // Calculate FPS live
    fpsTimerRef.current = setInterval(() => {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
    }, 1000);

    return () => {
      stopFrameStreaming();
      if (fpsTimerRef.current) clearInterval(fpsTimerRef.current);
      
      // Stop remote session on relay
      apiFetch(`/api/endpoints/${endpoint.id}/remote-relay`, {
        method: 'POST',
        body: JSON.stringify({ action: 'stop' })
      }).catch((err: any) => console.error('Failed to stop remote session:', err));
    };
  }, [open, endpoint, quality]);

  // Frame Streaming Loop
  const startFrameStreaming = () => {
    stopFrameStreaming();

    const fetchInterval = quality === '1080p' ? 250 : quality === '720p' ? 150 : 100;

    frameTimerRef.current = setInterval(async () => {
      if (!endpoint) return;
      try {
        const data = await apiFetch<{ is_active: boolean; last_frame: string | null; command_result: string | null }>(
          `/api/endpoints/${endpoint.id}/remote-relay`
        );

        if (data.is_active) {
          setStatus('connected');
          if (data.last_frame) {
            frameCountRef.current += 1;
            renderFrame(data.last_frame);
          }
        } else {
          setStatus('disconnected');
          stopFrameStreaming();
          return;
        }

        if (data.command_result) {
          setConsoleLogs(prev => [...prev, { text: data.command_result!, type: 'output' }]);
          setExecutingCmd(false);
        }
      } catch (err: any) {
        console.error('Frame poll error:', err);
      }
    }, fetchInterval);
  };

  const stopFrameStreaming = () => {
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
  };

  // Render received frame image buffer to canvas with high clarity smoothing
  const renderFrame = (jpegDataUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = jpegDataUrl;
  };

  // Helper to extract canvas target coordinates
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { xPct: 0, yPct: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const yPct = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { xPct, yPct };
  };

  const sendInputEvent = async (inputData: Record<string, any>) => {
    if (status !== 'connected' || !endpoint) return;
    try {
      await apiFetch(`/api/endpoints/${endpoint.id}/remote-relay`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'input',
          input: inputData
        })
      });
    } catch (err) {
      console.error('Failed to inject input event:', err);
    }
  };

  // Canvas Mouse Click Handler
  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) return; // Handled by contextmenu
    const { xPct, yPct } = getCanvasCoords(e);
    sendInputEvent({ type: 'click', xPct, yPct });
  };

  // Canvas Double Click Handler
  const handleCanvasDoubleClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { xPct, yPct } = getCanvasCoords(e);
    sendInputEvent({ type: 'dblclick', xPct, yPct });
  };

  // Canvas Right Click (Context Menu) Handler
  const handleCanvasContextMenu = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { xPct, yPct } = getCanvasCoords(e);
    sendInputEvent({ type: 'rightclick', xPct, yPct });
  };

  // Canvas Throttled Mouse Move Handler (Smooth AnyDesk cursor tracking)
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const now = Date.now();
    if (now - lastMouseMoveTimeRef.current < 100) return; // 100ms throttle
    lastMouseMoveTimeRef.current = now;

    // Only track move if mouse button is down or hovering canvas
    const { xPct, yPct } = getCanvasCoords(e);
    sendInputEvent({ type: 'move', xPct, yPct });
  };

  // Canvas Mouse Wheel Scroll Handler
  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { xPct, yPct } = getCanvasCoords(e);
    sendInputEvent({ type: 'scroll', xPct, yPct, deltaY: e.deltaY });
  };

  // Canvas Keyboard Listener
  const handleCanvasKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (terminalOpen) return; // Don't intercept when shell drawer is active
    // Prevent default scrolling for standard hotkeys inside remote viewer
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Backspace', 'Escape'].includes(e.key)) {
      e.preventDefault();
    }
    sendInputEvent({ type: 'keydown', key: e.key });
  };

  // Send Remote Shell Command
  const handleSendCmd = async () => {
    if (!command.trim() || !endpoint) return;
    const cmdText = command.trim();
    setCommand('');
    setConsoleLogs(prev => [...prev, { text: `> ${cmdText}`, type: 'cmd' }]);
    setExecutingCmd(true);

    try {
      await apiFetch(`/api/endpoints/${endpoint.id}/remote-relay`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'command',
          command: cmdText
        })
      });
    } catch (e: any) {
      setConsoleLogs(prev => [...prev, { text: `Error: ${e.message}`, type: 'err' }]);
      setExecutingCmd(false);
    }
  };

  // Send Ctrl+Alt+Del Command
  const handleSendCtrlAltDel = async () => {
    if (!endpoint) return;
    try {
      await apiFetch(`/api/endpoints/${endpoint.id}/remote-relay`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'command',
          command: "powershell -NoProfile -Command \"(New-Object -ComObject wscript.shell).SendKeys('^{%}{DEL}')\""
        })
      });
      setConsoleLogs(prev => [...prev, { text: '⚡ Sent Ctrl+Alt+Del signal to remote system.', type: 'output' }]);
    } catch (err: any) {
      setConsoleLogs(prev => [...prev, { text: `Failed to send Ctrl+Alt+Del: ${err.message}`, type: 'err' }]);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullScreen={fullscreen}
      PaperProps={{
        sx: {
          width: fullscreen ? '100vw' : '92vw',
          height: fullscreen ? '100vh' : '88vh',
          bgcolor: '#090d16',
          color: '#ffffff',
          borderRadius: fullscreen ? 0 : 2,
          overflow: 'hidden'
        }
      }}
    >
      {/* ── Top Header Toolbar ──────────────────────────────────────────────── */}
      <DialogTitle
        sx={{
          bgcolor: '#0f172a',
          color: '#ffffff',
          px: 2.5, py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1e293b'
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <TvIcon sx={{ color: '#38bdf8' }} />
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              Enterprise Remote Desktop — {endpoint?.hostname || 'Remote Host'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              IP: {endpoint?.ip_address || '—'} | OS: {endpoint?.os_version || '—'}
            </Typography>
          </Box>

          <Chip
            size="small"
            icon={<TvIcon style={{ color: '#ffffff', fontSize: 14 }} />}
            label={status === 'connected' ? `Live (${fps} FPS)` : status === 'connecting' ? 'Connecting…' : 'Disconnected'}
            color={status === 'connected' ? 'success' : 'warning'}
            sx={{ fontWeight: 600, ml: 1 }}
          />
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          {/* Quality Selector */}
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <Select
              value={quality}
              onChange={(e) => setQuality(e.target.value as any)}
              sx={{ color: '#ffffff', bgcolor: '#1e293b', fontSize: '12px', height: 32 }}
            >
              <MenuItem value="1080p">1080p HD</MenuItem>
              <MenuItem value="720p">720p Standard</MenuItem>
              <MenuItem value="480p">480p Fast</MenuItem>
            </Select>
          </FormControl>

          <Button
            size="small"
            variant="outlined"
            onClick={handleSendCtrlAltDel}
            sx={{ color: '#f59e0b', borderColor: '#f59e0b', fontSize: '11px', height: 32 }}
          >
            Ctrl+Alt+Del
          </Button>

          <Button
            size="small"
            variant={terminalOpen ? "contained" : "outlined"}
            color="info"
            startIcon={<TerminalIcon />}
            onClick={() => setTerminalOpen(!terminalOpen)}
            sx={{ fontSize: '11px', height: 32 }}
          >
            Remote Shell
          </Button>

          <IconButton color="inherit" onClick={() => setFullscreen(!fullscreen)}>
            {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>

          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<PowerSettingsNewIcon />}
            onClick={onClose}
            sx={{ fontWeight: 700 }}
          >
            Disconnect
          </Button>
        </Stack>
      </DialogTitle>

      {/* ── Main Viewport Canvas ────────────────────────────────────────────── */}
      <DialogContent sx={{ p: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#000000', overflow: 'hidden' }}>
        {status === 'connecting' ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <CircularProgress size={48} sx={{ color: '#38bdf8', mb: 2 }} />
            <Typography variant="h6">Establishing Secure Remote Desktop Tunnel…</Typography>
            <Typography variant="body2" color="text.secondary">Connecting to background agent on {endpoint?.hostname}…</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              zIndex: 10, bgcolor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 2, px: 2, py: 0.6,
              display: 'flex', alignItems: 'center', gap: 1.5, pointerEvents: 'none'
            }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '11px' }}>
                💡 <b>Self-Screen Reflection Tip:</b> Remote Control streams the host primary monitor. Open from a second monitor or separate device for clean control without screen recursion.
              </Typography>
            </Box>
            <canvas
              ref={canvasRef}
              tabIndex={0}
              width={quality === '1080p' ? 1920 : quality === '480p' ? 854 : 1280}
              height={quality === '1080p' ? 1080 : quality === '480p' ? 480 : 720}
              onClick={handleCanvasClick}
              onDoubleClick={handleCanvasDoubleClick}
              onContextMenu={handleCanvasContextMenu}
              onMouseMove={handleCanvasMouseMove}
              onWheel={handleCanvasWheel}
              onKeyDown={handleCanvasKeyDown}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                cursor: 'crosshair',
                outline: 'none'
              }}
            />
          </>
        )}

        {/* ── Remote Shell Drawer ─────────────────────────────────────────────── */}
        <Drawer
          anchor="right"
          open={terminalOpen}
          onClose={() => setTerminalOpen(false)}
          PaperProps={{
            sx: {
              width: 440,
              bgcolor: '#090d16',
              color: '#ffffff',
              p: 2,
              borderLeft: '1px solid #1e293b'
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TerminalIcon sx={{ color: '#10b981' }} />
              <Typography variant="subtitle1" fontWeight={700}>Remote PowerShell Prompt</Typography>
            </Stack>
            <IconButton color="inherit" onClick={() => setTerminalOpen(false)}><CloseIcon /></IconButton>
          </Box>

          <Paper variant="outlined" sx={{ flex: 1, bgcolor: '#030712', color: '#10b981', p: 1.5, fontFamily: 'monospace', fontSize: '11px', height: 'calc(100vh - 140px)', overflowY: 'auto', mb: 2 }}>
            {consoleLogs.map((log, idx) => (
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
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendCmd(); }}
              sx={{ bgcolor: '#1e293b', input: { color: '#ffffff', fontFamily: 'monospace', fontSize: '12px' } }}
            />
            <Button variant="contained" color="primary" onClick={handleSendCmd} disabled={executingCmd}>
              <SendIcon />
            </Button>
          </Stack>
        </Drawer>
      </DialogContent>
    </Dialog>
  );
}
