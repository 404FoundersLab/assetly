import type { IncomingMessage, ServerResponse } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import health from '../api/health';
import sync from '../api/sync';
import search from '../api/search';
import upload from '../api/upload';
import chat from '../api/chat';
import chatIngest from '../api/chat/ingest';
import authLogin from '../api/auth/login';
import authChangePassword from '../api/auth/change-password';
import authDemoStatus from '../api/auth/demo-status';
import assetsIndex from '../api/assets/index';
import assetsImport from '../api/assets/import';
import assetsAssign from '../api/assets/assign';
import assetsReturn from '../api/assets/return';
import assetsById from '../api/assets/[id]';
import employeesIndex from '../api/employees/index';
import employeesById from '../api/employees/[id]';
import departmentsIndex from '../api/departments/index';
import departmentsById from '../api/departments/[id]';
import vendorsIndex from '../api/vendors/index';
import vendorsById from '../api/vendors/[id]';
import assetCategoriesIndex from '../api/asset-categories/index';
import assetCategoriesById from '../api/asset-categories/[id]';
import requestsIndex from '../api/requests/index';
import requestsById from '../api/requests/[id]';
import tenantsIndex from '../api/tenants/index';
import tenantsById from '../api/tenants/[id]';
import usersIndex from '../api/users/index';
import usersById from '../api/users/[id]';
import agentDownload from '../api/agent/download';
import endpointsIndex from '../api/endpoints/index';
import endpointsRegister from '../api/endpoints/register';
import endpointsTelemetry from '../api/endpoints/telemetry';
import endpointsThreats from '../api/endpoints/[id]/threats';
import endpointsInstalledApps from '../api/endpoints/[id]/installed-apps';
import endpointsDeviceContext from '../api/endpoints/[id]/device-context';
import endpointsActionsForceScan from '../api/endpoints/[id]/actions/force-scan';
import endpointsActionsIsolate from '../api/endpoints/[id]/actions/isolate';
import endpointsActionsSync from '../api/endpoints/[id]/actions/sync';
import billingSubscription from '../api/billing/subscription';
import billingCheckout from '../api/billing/checkout';
import billingPortal from '../api/billing/portal';
import billingWebhooks from '../api/billing/webhooks';
import billingWebhooksRazorpay from '../api/billing/webhooks-razorpay';
import hrLeave from '../api/hr/leave';
import hrLeaveById from '../api/hr/leave/[id]';

type ApiHandler = (req: Request) => Promise<Response>;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function loadEnv() {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../.env'),
    resolve(repoRoot, '.env'),
  ];
  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue;
    try {
      for (const line of readFileSync(envPath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
      return;
    } catch {
      /* try next */
    }
  }
}

function resolveHandler(pathname: string): ApiHandler | null {
  if (pathname === '/api/health') return health;
  if (pathname === '/api/sync') return sync;
  if (pathname === '/api/search') return search;
  if (pathname === '/api/upload') return upload;
  if (pathname === '/api/chat') return chat;
  if (pathname === '/api/chat/ingest') return chatIngest;
  if (pathname === '/api/auth/login') return authLogin;
  if (pathname === '/api/auth/change-password') return authChangePassword;
  if (pathname === '/api/auth/demo-status') return authDemoStatus;
  if (pathname === '/api/assets/import') return assetsImport;
  if (pathname === '/api/assets/assign') return assetsAssign;
  if (pathname === '/api/assets/return') return assetsReturn;
  if (pathname === '/api/assets') return assetsIndex;
  if (pathname === '/api/employees') return employeesIndex;
  if (pathname === '/api/departments') return departmentsIndex;
  if (pathname === '/api/vendors') return vendorsIndex;
  if (pathname === '/api/asset-categories') return assetCategoriesIndex;
  if (/^\/api\/asset-categories\/[^/]+$/.test(pathname)) return assetCategoriesById;
  if (pathname === '/api/requests') return requestsIndex;
  if (pathname === '/api/hr/leave') return hrLeave;
  if (/^\/api\/hr\/leave\/[^/]+$/.test(pathname)) return hrLeaveById;
  if (pathname === '/api/endpoints') return endpointsIndex;
  if (pathname === '/api/endpoints/register') return endpointsRegister;
  if (pathname === '/api/endpoints/telemetry') return endpointsTelemetry;
  if (/^\/api\/assets\/[^/]+$/.test(pathname)) return assetsById;
  if (/^\/api\/employees\/[^/]+$/.test(pathname)) return employeesById;
  if (/^\/api\/departments\/[^/]+$/.test(pathname)) return departmentsById;
  if (/^\/api\/vendors\/[^/]+$/.test(pathname)) return vendorsById;
  if (/^\/api\/requests\/[^/]+$/.test(pathname)) return requestsById;

  if (pathname === '/api/tenants') return tenantsIndex;
  if (/^\/api\/tenants\/[^/]+$/.test(pathname)) return tenantsById;
  if (pathname === '/api/users') return usersIndex;
  if (/^\/api\/users\/[^/]+$/.test(pathname)) return usersById;

  if (pathname === '/api/agent/download') return agentDownload;

  if (pathname === '/api/billing/subscription') return billingSubscription;
  if (pathname === '/api/billing/checkout') return billingCheckout;
  if (pathname === '/api/billing/portal') return billingPortal;
  if (pathname === '/api/billing/webhooks') return billingWebhooks;
  if (pathname === '/api/billing/webhooks-razorpay') return billingWebhooksRazorpay;

  // New endpoint API routes
  if (/^\/api\/endpoints\/[^/]+\/threats$/.test(pathname)) return endpointsThreats;
  if (/^\/api\/endpoints\/[^/]+\/installed-apps$/.test(pathname)) return endpointsInstalledApps;
  if (/^\/api\/endpoints\/[^/]+\/device-context$/.test(pathname)) return endpointsDeviceContext;
  if (/^\/api\/endpoints\/[^/]+\/actions\/force-scan$/.test(pathname)) return endpointsActionsForceScan;
  if (/^\/api\/endpoints\/[^/]+\/actions\/isolate$/.test(pathname)) return endpointsActionsIsolate;
  if (/^\/api\/endpoints\/[^/]+\/actions\/sync$/.test(pathname)) return endpointsActionsSync;

  return null;
}

async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (!req.method || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

function toWebRequest(req: IncomingMessage, body?: Buffer): Request {
  const host = req.headers.host ?? '127.0.0.1';
  return new Request(`http://${host}${req.url}`, {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: body && body.length > 0 ? (body as unknown as BodyInit) : undefined,
  });
}

async function writeWebResponse(res: ServerResponse, webRes: Response) {
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await webRes.arrayBuffer()));
}

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse) {
  if (!req.url) {
    res.statusCode = 400;
    res.end('Bad request');
    return;
  }

  const pathname = new URL(req.url, `http://${req.headers.host ?? '127.0.0.1'}`).pathname;
  const handler = resolveHandler(pathname);

  if (!handler) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    const body = await readBody(req);
    const response = await handler(toWebRequest(req, body));
    await writeWebResponse(res, response);
  } catch (e) {
    console.error(`[API ERROR] ${req.method} ${pathname}:`, e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Internal server error' }));
  }
}

loadEnv();
