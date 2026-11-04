import { admin, secret } from '../_shared/platform.ts';
import { deletionHandler, DeleteError } from './handler.ts';
import { revokeAppleAuthorization } from './apple.ts';

Deno.serve(deletionHandler({
  getUser: async token => { const { data, error } = await admin().auth.getUser(token); return error ? null : data.user; },
  revokeApple: async (code, subject) => {
    let config;
    try { config = { clientId: 'com.smartelearning.satslegends', teamId: secret('APPLE_SIGN_IN_TEAM_ID'), keyId: secret('APPLE_SIGN_IN_KEY_ID'), privateKey: secret('APPLE_SIGN_IN_PRIVATE_KEY') }; }
    catch { throw new DeleteError(503, 'Apple account deletion is temporarily unavailable. Please try again later.'); }
    await revokeAppleAuthorization(code, subject, config);
  },
  signOutAll: async token => { const { error } = await admin().auth.admin.signOut(token, 'global'); if (error) throw new DeleteError(503, 'Unable to revoke account sessions. Your account has not been deleted.'); },
  deleteUser: async id => { const { error } = await admin().auth.admin.deleteUser(id, false); if (error) throw new DeleteError(503, 'Your account could not be deleted. Please try again.'); },
  allowedOrigins: ['capacitor://localhost', ...(Deno.env.get('MATHARIA_NATIVE_ALLOWED_ORIGINS') ?? '').split(',').map(value => value.trim()).filter(Boolean)],
}));
