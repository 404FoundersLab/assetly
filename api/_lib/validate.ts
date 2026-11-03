import { z, type ZodTypeAny } from 'zod';
import { error, parseBody } from './db';

export { z };

/**
 * Parses and validates a JSON body against a schema. Unknown properties are stripped and
 * wrong types are rejected with HTTP 400 (no schema details beyond field paths are exposed).
 */
export async function validateBody<S extends ZodTypeAny>(
  req: Request,
  schema: S,
  maxBytes?: number,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await parseBody<unknown>(req, maxBytes);
  } catch (e) {
    return { ok: false, response: error(e instanceof Error ? e.message : 'Invalid request', 500) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => i.path.join('.') || 'body'))].join(', ');
    return { ok: false, response: error(`Invalid request: ${fields}`, 400) };
  }
  return { ok: true, data: parsed.data };
}

export function validateQuery<S extends ZodTypeAny>(
  req: Request,
  schema: S,
): { ok: true; data: z.infer<S> } | { ok: false; response: Response } {
  const obj: Record<string, string> = {};
  new URL(req.url).searchParams.forEach((v, k) => {
    obj[k] = v;
  });
  const parsed = schema.safeParse(obj);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => i.path.join('.') || 'query'))].join(', ');
    return { ok: false, response: error(`Invalid request: ${fields}`, 400) };
  }
  return { ok: true, data: parsed.data };
}

export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const idSchema = z.string().trim().min(1).max(128);

/** Optional text field: accepts string/number/boolean, rejects objects and arrays, caps length. */
export const text = (max = 255) =>
  z.union([z.string().max(max), z.number(), z.boolean()]).transform((v) => String(v)).nullish();

/** Passes unknown keys through (for large entity payloads) while typing/capping the listed ones. */
export function looseBody<T extends z.ZodRawShape>(shape: T = {} as T) {
  return z.looseObject(shape).superRefine((obj, ctx) => {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && v.length > 100_000) ctx.addIssue({ code: 'custom', path: [k], message: 'too long' });
    }
  });
}

/** Like validateBody, but throws so existing handler catch blocks turn it into HTTP 400. */
export async function parseValidated<S extends ZodTypeAny>(req: Request, schema: S, maxBytes?: number): Promise<z.infer<S>> {
  const raw = await parseBody<unknown>(req, maxBytes);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => i.path.join('.') || 'body'))].join(', ');
    throw new Error(`Invalid request: ${fields}`);
  }
  return parsed.data;
}
