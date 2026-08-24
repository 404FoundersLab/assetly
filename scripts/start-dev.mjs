import { spawn, execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webDir = resolve(root, 'apps/web');

function readUseApiFlag() {
  const webEnv = resolve(webDir, '.env');
  if (!existsSync(webEnv)) return false;
  try {
    const line = readFileSync(webEnv, 'utf8').split('\n').find((l) => l.startsWith('VITE_USE_API='));
    return line?.split('=')[1]?.trim() === 'true';
  } catch {
    return false;
  }
}

async function probeApi() {
  try {
    const health = await fetch('http://127.0.0.1:3000/api/health', { signal: AbortSignal.timeout(2000) });
    if (!health.ok) return 'down';
    const login = await fetch('http://127.0.0.1:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(2000),
    });
    return login.status === 404 ? 'stale' : 'ok';
  } catch {
    return 'down';
  }
}

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const pids = new Set();
      for (const line of out.split('\n')) {
        if (!line.includes('LISTENING')) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid)) pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
          console.log(`[assetly] Stopped stale process on port ${port} (PID ${pid})`);
        } catch {
          /* ignore */
        }
      }
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore', shell: true });
    }
  } catch {
    /* port not in use */
  }
}

function spawnProc(label, command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: 'inherit', shell: true });
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`[assetly] ${label} exited with code ${code}`);
  });
  return child;
}

async function waitForApi(maxMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const state = await probeApi();
    if (state === 'ok') return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

const useApi = readUseApiFlag();
let apiProc = null;

if (useApi) {
  const state = await probeApi();
  if (state === 'stale') {
    console.log('[assetly] Old API on port 3000 is missing new routes — restarting…');
    killPort(3000);
    await new Promise((r) => setTimeout(r, 800));
  } else if (state === 'ok') {
    console.log('[assetly] Reusing API already running on http://127.0.0.1:3000');
  }

  if ((await probeApi()) !== 'ok') {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    apiProc = spawnProc('api', npm, ['run', 'dev:api'], root);
    const ready = await waitForApi();
    if (!ready) {
      console.error('[assetly] API failed to start. Check DATABASE_URL in .env');
      apiProc?.kill();
      process.exit(1);
    }
    console.log('[assetly] API ready at http://127.0.0.1:3000');
  }
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
killPort(5173);
await new Promise((r) => setTimeout(r, 500));
const viteProc = spawnProc('web', npm, ['run', 'dev:web-only'], webDir);

const shutdown = () => {
  viteProc?.kill();
  apiProc?.kill();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
viteProc.on('exit', () => {
  apiProc?.kill();
  process.exit(0);
});
