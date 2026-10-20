import React, { useState, useRef, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Button, Box, Typography, Chip,
  IconButton, Stack, Select, MenuItem, FormControl, CircularProgress
} from '@mui/material';
import TvIcon from '@mui/icons-material/Tv';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import TerminalIcon from '@mui/icons-material/Terminal';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import type { Endpoint } from '../../../types';
import { apiFetch } from '../../../services/api/client';
import { useRemoteSession, type RemoteQuality } from './useRemoteSession';
import { RemoteShellDrawer, type ConsoleLog } from './RemoteShellDrawer';

interface RemoteDesktopModalProps {
  open: boolean;
  endpoint: Endpoint | null;
  onClose: () => void;
}

const MODIFIER_KEYS = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'AltGraph'];

export function RemoteDesktopModal({ open, endpoint, onClose }: RemoteDesktopModalProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [quality, setQuality] = useState<RemoteQuality>('720p');
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([
    { text: 'AssetManager Remote Shell v2.0 Initialized.', type: 'output' },
    { text: 'Type any PowerShell or system command to execute remotely.', type: 'output' }
  ]);
  const [executingCmd, setExecutingCmd] = useState(false);
  const lastMoveRef = useRef(0);

  const onCommandResult = useCallback((text: string) => {
    setConsoleLogs((prev) => [...prev, { text, type: 'output' }]);
    setExecutingCmd(false);
  }, []);

  const { status, rtcLive, fps, canvasRef, videoRef, setVideoEl, sendInput } =
    useRemoteSession(endpoint?.id ?? null, open, quality, onCommandResult);

  // Map a mouse position to 0..1 coordinates of the remote screen (accounts for letterboxing)
  const getCoords = (e: { clientX: number; clientY: number }) => {
    const el: HTMLElement | null = rtcLive ? videoRef.current : canvasRef.current;
    if (!el) return { xPct: 0, yPct: 0 };
    const rect = el.getBoundingClientRect();
    const cw = rtcLive ? (videoRef.current?.videoWidth || rect.width) : (canvasRef.current?.width || rect.width);
    const ch = rtcLive ? (videoRef.current?.videoHeight || rect.height) : (canvasRef.current?.height || rect.height);
    const scale = Math.min(rect.width / cw, rect.height / ch);
    const dw = cw * scale;
    const dh = ch * scale;
    const left = rect.left + (rect.width - dw) / 2;
    const top = rect.top + (rect.height - dh) / 2;
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    return { xPct: clamp((e.clientX - left) / dw), yPct: clamp((e.clientY - top) / dh) };
  };

  // WebRTC mode uses real button down/up (drag, double-click and selection behave natively).
  // Relay fallback mode keeps discrete click events to limit HTTP traffic.
  const handleMouseDown = (e: React.MouseEvent) => {
    (e.currentTarget as HTMLElement).focus();
    if (!rtcLive) return;
    e.preventDefault();
    sendInput({ type: 'down', button: e.button === 2 ? 2 : 0, ...getCoords(e) });
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!rtcLive) return;
    e.preventDefault();
    sendInput({ type: 'up', button: e.button === 2 ? 2 : 0, ...getCoords(e) });
  };
  const handleClick = (e: React.MouseEvent) => {
    if (rtcLive || e.button === 2) return;
    sendInput({ type: 'click', ...getCoords(e) });
  };
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (rtcLive) return;
    sendInput({ type: 'dblclick', ...getCoords(e) });
  };
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!rtcLive) sendInput({ type: 'rightclick', ...getCoords(e) });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastMoveRef.current < (rtcLive ? 16 : 100)) return;
    lastMoveRef.current = now;
    sendInput({ type: 'move', ...getCoords(e) });
  };
  const handleWheel = (e: React.WheelEvent) => {
    sendInput({ type: 'scroll', deltaY: e.deltaY, ...getCoords(e) });
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (terminalOpen || MODIFIER_KEYS.includes(e.key)) return;
    e.preventDefault();
    sendInput({ type: 'keydown', key: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey });
  };

  const sendRelayCommand = async (cmd: string) => {
    if (!endpoint) return;
    await apiFetch(`/api/endpoints/${endpoint.id}/remote-relay`, {
      method: 'POST',
      body: JSON.stringify({ action: 'command', command: cmd })
    });
  };

  const handleSendCmd = async () => {
    if (!command.trim()) return;
    const cmdText = command.trim();
    setCommand('');
    setConsoleLogs((prev) => [...prev, { text: `> ${cmdText}`, type: 'cmd' }]);
    setExecutingCmd(true);
    try {
      await sendRelayCommand(cmdText);
    } catch (e: any) {
      setConsoleLogs((prev) => [...prev, { text: `Error: ${e.message}`, type: 'err' }]);
      setExecutingCmd(false);
    }
  };

  // Save the current remote screen as a PNG file on this computer
  const handleScreenshot = () => {
    const video = videoRef.current;
    const source: CanvasImageSource | null = rtcLive && video && video.videoWidth ? video : canvasRef.current;
    if (!source) return;
    const w = source instanceof HTMLVideoElement ? source.videoWidth : (source as HTMLCanvasElement).width;
    const h = source instanceof HTMLVideoElement ? source.videoHeight : (source as HTMLCanvasElement).height;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    out.getContext('2d')?.drawImage(source, 0, 0, w, h);
    out.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${endpoint?.hostname || 'remote'}-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  };

  const handleSendCtrlAltDel = async () => {
    try {
      await sendRelayCommand("powershell -NoProfile -Command \"(New-Object -ComObject wscript.shell).SendKeys('^{%}{DEL}')\"");
      setConsoleLogs((prev) => [...prev, { text: '⚡ Sent Ctrl+Alt+Del signal to remote system.', type: 'output' }]);
    } catch (err: any) {
      setConsoleLogs((prev) => [...prev, { text: `Failed to send Ctrl+Alt+Del: ${err.message}`, type: 'err' }]);
    }
  };

  const chipLabel =
    status === 'connected' ? (rtcLive ? `Live · WebRTC (${fps} FPS)` : `Live · Relay (${fps} FPS)`)
      : status === 'connecting' ? 'Connecting…' : 'Disconnected';

  const canvasW = quality === '1080p' ? 1920 : quality === '480p' ? 854 : 1280;
  const canvasH = quality === '1080p' ? 1080 : quality === '480p' ? 480 : 720;

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
      <DialogTitle
        sx={{
          bgcolor: '#0f172a', color: '#ffffff', px: 2.5, py: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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
            label={chipLabel}
            color={status === 'connected' ? 'success' : 'warning'}
            sx={{ fontWeight: 600, ml: 1 }}
          />
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <Select
              value={quality}
              disabled={rtcLive}
              onChange={(e) => setQuality(e.target.value as RemoteQuality)}
              sx={{ color: '#ffffff', bgcolor: '#1e293b', fontSize: '12px', height: 32 }}
            >
              <MenuItem value="1080p">1080p HD</MenuItem>
              <MenuItem value="720p">720p Standard</MenuItem>
              <MenuItem value="480p">480p Fast</MenuItem>
            </Select>
          </FormControl>

          <Button size="small" variant="outlined" color="inherit" startIcon={<CameraAltIcon />}
            onClick={handleScreenshot} disabled={status !== 'connected'}
            sx={{ fontSize: '11px', height: 32, borderColor: '#475569' }}>
            Screenshot
          </Button>

          <Button size="small" variant="outlined" onClick={handleSendCtrlAltDel}
            sx={{ color: '#f59e0b', borderColor: '#f59e0b', fontSize: '11px', height: 32 }}>
            Ctrl+Alt+Del
          </Button>

          <Button size="small" variant={terminalOpen ? 'contained' : 'outlined'} color="info"
            startIcon={<TerminalIcon />} onClick={() => setTerminalOpen(!terminalOpen)}
            sx={{ fontSize: '11px', height: 32 }}>
            Remote Shell
          </Button>

          <IconButton color="inherit" onClick={() => setFullscreen(!fullscreen)}>
            {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>

          <Button variant="contained" color="error" size="small"
            startIcon={<PowerSettingsNewIcon />} onClick={onClose} sx={{ fontWeight: 700 }}>
            Disconnect
          </Button>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#000000', overflow: 'hidden' }}>
        {(status === 'connecting' || status === 'error' || status === 'disconnected') && (
          <Box sx={{ position: 'absolute', inset: 0, zIndex: 5, bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', p: 4 }}>
            {status === 'connecting' ? (
              <Box>
                <CircularProgress size={48} sx={{ color: '#38bdf8', mb: 2 }} />
                <Typography variant="h6">Establishing Secure Remote Desktop Tunnel…</Typography>
                <Typography variant="body2" color="text.secondary">Connecting to agent on {endpoint?.hostname}…</Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {status === 'error' ? 'Could not reach the device' : 'Session ended'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {status === 'error'
                    ? 'Make sure the AssetManager client is running on the device and online, then reconnect.'
                    : 'The remote session was closed.'}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        <Box
          tabIndex={0}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          onMouseMove={handleMouseMove}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          sx={{ width: '100%', height: '100%', outline: 'none', cursor: 'crosshair', position: 'relative' }}
        >
          <video
            ref={setVideoEl}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', display: rtcLive ? 'block' : 'none' }}
          />
          <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: rtcLive ? 'none' : 'block' }}
          />
        </Box>

        <RemoteShellDrawer
          open={terminalOpen}
          onClose={() => setTerminalOpen(false)}
          logs={consoleLogs}
          command={command}
          onCommandChange={setCommand}
          onSend={handleSendCmd}
          busy={executingCmd}
        />
      </DialogContent>
    </Dialog>
  );
}

