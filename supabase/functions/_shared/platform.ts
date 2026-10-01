import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

export function secret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}
export function appUrl(): string {
  const url = new URL(secret('APP_URL'));
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') throw new Error('APP_URL must use HTTPS');
  return url.origin;
}
export const admin = () => createClient(secret('SUPABASE_URL'), secret('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function billingBody(request: Request): Promise<{ action: 'checkout'; interval: 'month' | 'year' } | { action: 'portal' }> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'Send a JSON request.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Missing billing request.');
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 2048) { await reader.cancel(); throw new HttpError(413, 'Billing request is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let body;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HttpError(400, 'Invalid billing request.'); }
  if (!body || Array.isArray(body) || typeof body !== 'object') throw new HttpError(400, 'Invalid billing request.');
  if (body.action === 'portal' && Object.keys(body).length === 1) return { action: 'portal' };
  if (body.action === 'checkout' && (body.interval === 'month' || body.interval === 'year')
    && Object.keys(body).every(key => key === 'action' || key === 'interval')) return { action: 'checkout', interval: body.interval };
  throw new HttpError(400, 'Choose a valid billing action and monthly or yearly plan.');
}
export function json(body: unknown, status = 200, cors = false): Response {
  return Response.json(body, { status, headers: {
    ...(cors ? { 'Access-Control-Allow-Origin': appUrl(), 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } : {}),
    'Cache-Control': 'no-store',
  } });
}
export async function parentFor(request: Request, db: ReturnType<typeof admin>) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Please log in again.');
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user?.email_confirmed_at) throw new HttpError(401, 'Please verify your email and log in again.');
  return data.user;
}
export function fail(error: unknown, cors = false): Response {
  const known = error instanceof HttpError;
  if (!known) console.error('Server operation failed', error instanceof Error ? error.message : 'Unknown error');
  return json({ error: known ? error.message : 'This service is temporarily unavailable. Please try again.' }, known ? error.status : 500, cors);
}
export function checked<T extends { data: unknown; error: unknown }>(result: T): T['data'] {
  if (result.error) throw result.error;
  return result.data;
}
