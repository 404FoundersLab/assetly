import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../../services/api/client';

export type RemoteStatus = 'connecting' | 'connected' | 'error' | 'disconnected';
export type RemoteQuality = '1080p' | '720p' | '480p';

interface RelayState {
  is_active: boolean;
  last_frame: string | null;
  command_result: string | null;
  signals?: { id: number | string; payload: any }[];
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Wait until ICE gathering finishes (or 3s) so the SDP carries all candidates (no trickle needed).
function waitForIce(pc: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const finish = () => { pc.removeEventListener('icegatheringstatechange', check); resolve(); };
    const check = () => { if (pc.iceGatheringState === 'complete') finish(); };
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(finish, 3000);
  });
}

/**
 * Remote control session hook.
 * Primary: WebRTC video + data channel for input (low latency, like AnyDesk/TeamViewer).
 * Fallback: JPEG frames polled through the HTTP relay until/unless WebRTC connects.
 */
export function useRemoteSession(
  endpointId: string | null,
  open: boolean,
  quality: RemoteQuality,
  onCommandResult: (text: string) => void,
) {
  const [status, setStatus] = useState<RemoteStatus>('connecting');
  const [rtcLive, setRtcLive] = useState(false);
  const [fps, setFps] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const liveRef = useRef(false);
  const statusRef = useRef<RemoteStatus>('connecting');
  const lastSignalRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastVideoFramesRef = useRef(0);
  const qualityRef = useRef(quality);
  const cmdRef = useRef(onCommandResult);
  qualityRef.current = quality;
  cmdRef.current = onCommandResult;

  const updateStatus = useCallback((s: RemoteStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const setVideoEl = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(() => {});
    }
  }, []);

  const renderFrame = useCallback((jpegDataUrl: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = jpegDataUrl;
  }, []);

  useEffect(() => {
    if (!open || !endpointId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const base = `/api/endpoints/${endpointId}/remote-relay`;
    const startedAt = Date.now();

    updateStatus('connecting');
    setRtcLive(false);
    liveRef.current = false;
    lastSignalRef.current = 0;
    streamRef.current = null;
    frameCountRef.current = 0;
    lastVideoFramesRef.current = 0;

    const sendSignal = (signal: unknown) =>
      apiFetch(base, { method: 'POST', body: JSON.stringify({ action: 'signal', signal }) });

    const markLive = (live: boolean) => {
      liveRef.current = live;
      setRtcLive(live);
    };

    const startRtc = async () => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      dcRef.current = pc.createDataChannel('input', { ordered: true });
      pc.addTransceiver('video', { direction: 'recvonly' });

      pc.ontrack = (ev) => {
        const stream = ev.streams[0] ?? new MediaStream([ev.track]);
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.play().catch(() => {});
        }
        markLive(true);
        updateStatus('connected');
      };
      pc.onconnectionstatechange = () => {
        if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) markLive(false);
      };

      await pc.setLocalDescription(await pc.createOffer());
      await waitForIce(pc);
      if (cancelled) return;
      await sendSignal({ type: 'offer', sdp: pc.localDescription?.sdp });
    };

    const handleSignal = async (payload: any) => {
      const pc = pcRef.current;
      if (!pc || !payload) return;
      if (payload.type === 'answer' && !pc.remoteDescription) {
        await pc.setRemoteDescription({ type: 'answer', sdp: payload.sdp });
      } else if (payload.type === 'candidate' && payload.candidate && pc.remoteDescription) {
        await pc.addIceCandidate(payload.candidate).catch(() => {});
      }
    };

    const poll = async () => {
      if (cancelled) return;
      const lite = liveRef.current;
      try {
        const data = await apiFetch<RelayState>(
          `${base}?${lite ? 'mode=lite&' : ''}since=${lastSignalRef.current}`,
        );

        if (!data.is_active) {
          updateStatus('disconnected');
          return; // session ended
        }

        for (const s of data.signals ?? []) {
          lastSignalRef.current = Math.max(lastSignalRef.current, Number(s.id) || 0);
          await handleSignal(s.payload);
        }

        if (!lite && data.last_frame) {
          frameCountRef.current += 1;
          renderFrame(data.last_frame);
          updateStatus('connected');
        }
        if (data.command_result) cmdRef.current(data.command_result);
      } catch (err) {
        console.error('Remote poll error:', err);
      }

      if (statusRef.current === 'connecting' && Date.now() - startedAt > 25000) {
        updateStatus('error');
      }
      const frameInterval = qualityRef.current === '1080p' ? 250 : qualityRef.current === '720p' ? 150 : 100;
      timer = setTimeout(poll, liveRef.current ? 700 : frameInterval);
    };

    apiFetch(base, { method: 'POST', body: JSON.stringify({ action: 'start' }) })
      .then(() => {
        if (cancelled) return;
        startRtc().catch((e) => console.warn('WebRTC setup failed, using relay fallback:', e));
        poll();
      })
      .catch((err) => {
        console.error('Failed to start remote session:', err);
        updateStatus('error');
      });

    const fpsTimer = setInterval(() => {
      const v = videoRef.current;
      if (liveRef.current && v && v.getVideoPlaybackQuality) {
        const total = v.getVideoPlaybackQuality().totalVideoFrames;
        setFps(Math.max(0, total - lastVideoFramesRef.current));
        lastVideoFramesRef.current = total;
      } else {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
      }
    }, 1000);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      clearInterval(fpsTimer);
      try { dcRef.current?.close(); } catch { /* ignore */ }
      try { pcRef.current?.close(); } catch { /* ignore */ }
      dcRef.current = null;
      pcRef.current = null;
      streamRef.current = null;
      liveRef.current = false;
      apiFetch(base, { method: 'POST', body: JSON.stringify({ action: 'stop' }) })
        .catch((err) => console.error('Failed to stop remote session:', err));
    };
  }, [open, endpointId, updateStatus, renderFrame]);

  // Send an input event: data channel when WebRTC is live, otherwise the HTTP relay queue.
  const sendInput = useCallback((input: Record<string, unknown>) => {
    const dc = dcRef.current;
    if (liveRef.current && dc && dc.readyState === 'open') {
      dc.send(JSON.stringify(input));
      return;
    }
    if (statusRef.current !== 'connected' || !endpointId) return;
    apiFetch(`/api/endpoints/${endpointId}/remote-relay`, {
      method: 'POST',
      body: JSON.stringify({ action: 'input', input }),
    }).catch((err) => console.error('Failed to inject input event:', err));
  }, [endpointId]);

  return { status, rtcLive, fps, canvasRef, videoRef, setVideoEl, sendInput };
}

