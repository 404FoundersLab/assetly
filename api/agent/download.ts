import { requireAuth } from '../_lib/auth';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  try {
    const tenantId = auth.tenantId;
    if (!tenantId) {
      return new Response('User must belong to a tenant', { status: 400 });
    }

    // On serverless environments like Vercel, returning binaries > 4.5MB from function response causes HTTP 500 payload errors.
    // We redirect to the static CDN asset path.
    const relativeStaticUrl = '/downloads/EndpointSecurityClient_Prod.exe';

    let exePath = resolve(process.cwd(), 'apps/client/EndpointSecurityClient_Prod.exe');
    if (!existsSync(exePath)) {
      exePath = resolve(process.cwd(), 'apps/web/public/downloads/EndpointSecurityClient_Prod.exe');
    }

    if (!existsSync(exePath)) {
      return Response.redirect(new URL(relativeStaticUrl, req.url).toString(), 302);
    }

    const baseExeBuffer = readFileSync(exePath);
    if (baseExeBuffer.length > 4 * 1024 * 1024) {
      return Response.redirect(new URL(relativeStaticUrl, req.url).toString(), 302);
    }
    
    // Create the signature buffer: ___TENANT_ID___:{tenantId}
    const signature = `___TENANT_ID___:${tenantId}`;
    const signatureBuffer = Buffer.from(signature, 'utf8');

    // Combine base exe and signature
    const finalBuffer = Buffer.concat([baseExeBuffer, signatureBuffer]);

    return new Response(finalBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="AssetManager_Agent.exe"',
        'Content-Length': finalBuffer.length.toString(),
      }
    });

  } catch (error: any) {
    console.error('Download error:', error);
    return Response.redirect(new URL('/downloads/EndpointSecurityClient_Prod.exe', req.url).toString(), 302);
  }
}
