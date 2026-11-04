export type DeleteUser = { id: string; identities?: Array<{ provider: string; identity_data?: Record<string, unknown> }> };
export type DeleteDependencies = {
  getUser: (token: string) => Promise<DeleteUser | null>;
  revokeApple: (code: string, subject: string) => Promise<void>;
  signOutAll: (token: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  now?: () => number;
  allowedOrigins?: string[];
};
export class DeleteError extends Error { constructor(public status: number, message: string) { super(message); } }

function recentPassword(token: string, now: number) {
  // Read claims only after Auth.getUser validates this exact token. Refreshing
  // a token does not refresh the password authentication timestamp in AMR.
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Array.isArray(payload.amr) && payload.amr.some((entry: { method?: string; timestamp?: number }) =>
      entry.method === 'password' && typeof entry.timestamp === 'number' && entry.timestamp <= now + 30 && entry.timestamp >= now - 300);
  } catch { return false; }
}
export function deletionHandler(dependencies: DeleteDependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    const allowed = dependencies.allowedOrigins ?? ['capacitor://localhost'];
    const headers: Record<string, string> = { 'Cache-Control': 'no-store', 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const reply = (body: unknown, status: number) => Response.json(body, { status, headers });
    try {
      if (origin && !allowed.includes(origin)) throw new DeleteError(403, 'Open account deletion in the Matharia app.');
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
      if (request.method !== 'POST') throw new DeleteError(405, 'Use the account deletion form.');
      if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new DeleteError(415, 'Send the account deletion confirmation.');
      const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
      if (!token) throw new DeleteError(401, 'Please sign in again.');
      const user = await dependencies.getUser(token);
      if (!user) throw new DeleteError(401, 'Please sign in again.');
      const reader = request.body?.getReader();
      if (!reader) throw new DeleteError(400, 'Confirm account deletion.');
      const chunks: Uint8Array[] = []; let size = 0;
      try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 4096) { await reader.cancel(); throw new DeleteError(413, 'Deletion confirmation is too large.'); } chunks.push(value); } }
      finally { reader.releaseLock(); }
      const bytes = new Uint8Array(size); let offset = 0; for (const part of chunks) { bytes.set(part, offset); offset += part.length; }
      let body;
      try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new DeleteError(400, 'Confirm account deletion.'); }
      if (!body || Array.isArray(body) || body.action !== 'delete' || body.confirmation !== 'DELETE' || Object.keys(body).some(key => !['action', 'confirmation', 'appleAuthorizationCode'].includes(key))) throw new DeleteError(400, 'Type DELETE to confirm account deletion.');
      const apple = user.identities?.find(identity => identity.provider === 'apple');
      if (apple) {
        const subject = apple.identity_data?.sub;
        if (typeof subject !== 'string') throw new DeleteError(503, 'Apple account verification is temporarily unavailable.');
        if (typeof body.appleAuthorizationCode !== 'string' || !body.appleAuthorizationCode || body.appleAuthorizationCode.length > 2048) throw new DeleteError(409, 'Authorise deletion with the Apple Account used to sign in.');
        await dependencies.revokeApple(body.appleAuthorizationCode, subject);
      } else if (!recentPassword(token, (dependencies.now?.() ?? Date.now()) / 1000)) {
        throw new DeleteError(409, 'Confirm your password again before deleting this account.');
      }
      // No target ID is accepted from the client. Revoke refresh sessions first,
      // then remove only the identity returned by the trusted authentication API.
      await dependencies.signOutAll(token);
      await dependencies.deleteUser(user.id);
      return reply({ deleted: true }, 200);
    } catch (error) {
      return reply({ error: error instanceof DeleteError ? error.message : 'Unable to delete your account. Please try again.' }, error instanceof DeleteError ? error.status : 500);
    }
  };
}
