import { json, error, corsPreflight, parseBody } from './_lib/db';
import { requireAuth } from './_lib/auth';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);
  if (auth instanceof Response) return auth;
  if (req.method !== 'POST') return error('Method not allowed', 405);

  try {
    const body = await parseBody<{ dataUrl?: string; filename?: string }>(req);
    const dataUrl = String(body.dataUrl ?? '');
    const filename = String(body.filename ?? 'asset.jpg');

    if (!dataUrl.startsWith('data:image/')) {
      return error('Invalid image data', 400);
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) return error('Invalid image format', 400);

      const contentType = match[1];
      const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
      const path = `assets/${crypto.randomUUID()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const res = await fetch(`${supabaseUrl}/storage/v1/object/asset-images/${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: bytes,
      });

      if (!res.ok) {
        const msg = await res.text();
        return error(`Upload failed: ${msg.slice(0, 200)}`, 502);
      }

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/asset-images/${path}`;
      return json({ url: publicUrl, storage: 'supabase' });
    }

    return json({ url: dataUrl, storage: 'inline' });
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Upload failed', 500);
  }
}
