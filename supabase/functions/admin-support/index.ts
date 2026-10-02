import { admin, appUrl, checked, fail, HttpError, json, parentFor } from '../_shared/platform.ts';
import type { User } from 'npm:@supabase/supabase-js@2.117.2';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Action = 'grant' | 'revoke' | 'reset' | 'suspend' | 'reactivate';

async function bodyFor(request: Request): Promise<{ action: Action; targetId: string; reason: string }> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'Send a JSON request.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Missing request.');
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) { await reader.cancel(); throw new HttpError(413, 'Request is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let body: Record<string, unknown>;
  try {
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch { throw new HttpError(400, 'Invalid request.'); }
  if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some(key => !['action', 'targetId', 'reason'].includes(key))) {
    throw new HttpError(400, 'Invalid request.');
  }
  if (!['grant', 'revoke', 'reset', 'suspend', 'reactivate'].includes(String(body.action))
    || typeof body.targetId !== 'string' || !uuid.test(body.targetId)
    || typeof body.reason !== 'string' || body.reason.trim().length < 5 || body.reason.length > 300) {
    throw new HttpError(400, 'Choose an account and enter a short reason.');
  }
  return { action: body.action as Action, targetId: body.targetId, reason: body.reason.trim() };
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json({}, 200, true);
  const db = admin();
  let auditId: number | null = null;
  try {
    if (request.headers.get('origin') && request.headers.get('origin') !== appUrl()) throw new HttpError(403, 'Origin not allowed');
    if (request.method !== 'GET' && request.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    const actor = await parentFor(request, db);
    const staff = checked(await db.from('staff_accounts').select('user_id').eq('user_id', actor.id).maybeSingle());
    const suspension = checked(await db.from('account_suspensions').select('parent_id').eq('parent_id', actor.id).is('cleared_at', null).maybeSingle());
    if (!staff || suspension) throw new HttpError(403, 'Admin access required.');

    if (request.method === 'GET') {
      const url = new URL(request.url);
      const q = (url.searchParams.get('q') || '').trim().toLowerCase();
      if (q.length > 100) throw new HttpError(400, 'Search is too long.');
      const pendingDeletion = url.searchParams.get('pendingDeletion') === 'true';
      if (pendingDeletion && q) throw new HttpError(400, 'Clear search to view deletion requests.');
      const page = Number(url.searchParams.get('page') || '1');
      if (!Number.isInteger(page) || page < 1 || page > 10000) throw new HttpError(400, 'Invalid page.');
      const perPage = 50;
      let users: User[] = [];
      let total = 0;
      let truncated = false;
      if (pendingDeletion) {
        const requests = await db.from('account_deletion_requests').select('parent_id', { count: 'exact' })
          .order('requested_at', { ascending: false }).range((page - 1) * perPage, page * perPage - 1);
        if (requests.error) throw requests.error;
        total = requests.count ?? 0;
        const results = await Promise.all((requests.data ?? []).map(row => db.auth.admin.getUserById(row.parent_id)));
        for (const result of results) {
          if (result.error) throw result.error;
          if (result.data.user) users.push(result.data.user);
        }
      } else if (!q) {
        const result = await db.auth.admin.listUsers({ page, perPage });
        if (result.error) throw result.error;
        users = result.data.users;
        total = result.data.total || users.length;
      } else {
        for (let batch = 1; batch <= 20; batch++) {
          const result = await db.auth.admin.listUsers({ page: batch, perPage: 100 });
          if (result.error) throw result.error;
          total = result.data.total || total;
          users.push(...result.data.users.filter(user => user.email?.toLowerCase().includes(q) || user.id.includes(q)));
          if (users.length >= 50 || result.data.users.length < 100) break;
          if (batch === 20) truncated = true;
        }
        users = users.slice(0, 50);
      }
      const [latestRun, failedDeliveries, overdueDeliveries, pendingDeletionRequests] = await Promise.all([
        db.from('report_job_status').select('started_at,finished_at,claimed,sent,failed,error')
          .eq('id', true).maybeSingle(),
        db.from('report_deliveries').select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'sending']).not('last_error', 'is', null),
        db.from('report_deliveries').select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'sending']).lt('due_at', new Date(Date.now() - 3600000).toISOString()),
        db.from('account_deletion_requests').select('parent_id', { count: 'exact', head: true }),
      ]);
      for (const result of [latestRun, failedDeliveries, overdueDeliveries, pendingDeletionRequests]) if (result.error) throw result.error;
      const reportHealth = {
        latestRun: latestRun.data, failedDeliveries: failedDeliveries.count ?? 0,
        overdueDeliveries: overdueDeliveries.count ?? 0,
        schedulerStale: !latestRun.data || Date.now() - new Date(latestRun.data.started_at).getTime() > 10 * 60000,
      };
      const ids = users.map(user => user.id);
      if (!ids.length) return json({ accounts: [], total, truncated, page, reportHealth,
        pendingDeletionRequests: pendingDeletionRequests.count ?? 0 }, 200, true);
      const [children, subscriptions, grants, reports, progress, suspensions, deletionRequests] = await Promise.all([
        db.from('child_profiles').select('parent_id,nickname').in('parent_id', ids),
        db.from('subscriptions').select('parent_id,status,interval,current_period_end,cancel_at_period_end,product_code').in('parent_id', ids),
        db.from('complimentary_access').select('parent_id,product_code,valid_until,revoked_at').in('parent_id', ids),
        db.from('parent_settings').select('parent_id,report_emails,next_report_at').in('parent_id', ids),
        db.from('child_progress').select('parent_id,updated_at').in('parent_id', ids),
        db.from('account_suspensions').select('parent_id,reason,suspended_at,cleared_at').in('parent_id', ids),
        db.from('account_deletion_requests').select('parent_id,requested_at').in('parent_id', ids),
      ]);
      for (const result of [children, subscriptions, grants, reports, progress, suspensions, deletionRequests]) if (result.error) throw result.error;
      const accounts = users.map(user => ({
        id: user.id, email: user.email, createdAt: user.created_at, confirmed: Boolean(user.email_confirmed_at),
        nickname: children.data?.find(row => row.parent_id === user.id)?.nickname || null,
        subscriptions: subscriptions.data?.filter(row => row.parent_id === user.id) || [],
        complimentaryAccess: grants.data?.filter(row => row.parent_id === user.id) || [],
        subscription: subscriptions.data?.find(row => row.parent_id === user.id && row.product_code === 'matharia') || null,
        complimentary: grants.data?.find(row => row.parent_id === user.id && row.product_code === 'matharia') || null,
        reports: reports.data?.find(row => row.parent_id === user.id) || null,
        lastSaved: progress.data?.filter(row => row.parent_id === user.id).sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]?.updated_at || null,
        suspension: suspensions.data?.find(row => row.parent_id === user.id && !row.cleared_at) || null,
        deletionRequestedAt: deletionRequests.data?.find(row => row.parent_id === user.id)?.requested_at || null,
      }));
      return json({ accounts, total, truncated, page, reportHealth,
        pendingDeletionRequests: pendingDeletionRequests.count ?? 0 }, 200, true);
    }

    const { action, targetId, reason } = await bodyFor(request);
    const targetResult = await db.auth.admin.getUserById(targetId);
    if (targetResult.error || !targetResult.data.user) throw new HttpError(404, 'Account not found.');
    if (targetId === actor.id && (action === 'suspend' || action === 'reactivate')) throw new HttpError(400, 'You cannot change your own suspension.');
    if (action === 'suspend') {
      const targetStaff = checked(await db.from('staff_accounts').select('user_id').eq('user_id', targetId).maybeSingle());
      if (targetStaff) throw new HttpError(400, 'Staff accounts cannot be suspended here.');
    }
    if (action === 'reset') {
      const recent = checked(await db.from('admin_actions').select('id').eq('target_id', targetId).eq('action', 'reset')
        .eq('outcome', 'succeeded').gte('created_at', new Date(Date.now() - 10 * 60000).toISOString()).limit(1));
      if (recent?.length) throw new HttpError(429, 'A reset email was sent recently. Try again later.');
    }
    const audit = checked(await db.from('admin_actions').insert({ actor_id: actor.id, target_id: targetId,
      action, reason, outcome: 'started' }).select('id').single());
    if (!audit) throw new Error('Unable to record admin action');
    auditId = audit.id;
    if (action === 'grant') {
      checked(await db.from('complimentary_access').upsert({ parent_id: targetId, product_code: 'matharia',
        valid_until: new Date(Date.now() + 365 * 86400000).toISOString(), reason, granted_by: actor.id,
        granted_at: new Date().toISOString(), revoked_at: null }));
    } else if (action === 'revoke') {
      checked(await db.from('complimentary_access').update({ revoked_at: new Date().toISOString() })
        .eq('parent_id', targetId).eq('product_code', 'matharia'));
    } else if (action === 'reset') {
      if (!targetResult.data.user.email) throw new HttpError(400, 'This account has no email address.');
      const result = await db.auth.resetPasswordForEmail(targetResult.data.user.email, { redirectTo: `${appUrl()}/reset-password` });
      if (result.error) throw result.error;
    } else if (action === 'suspend') {
      checked(await db.from('account_suspensions').upsert({ parent_id: targetId, reason, suspended_by: actor.id,
        suspended_at: new Date().toISOString(), cleared_at: null }));
      checked(await db.from('parent_settings').update({ report_emails: false }).eq('parent_id', targetId));
      const result = await db.auth.admin.updateUserById(targetId, { ban_duration: '87600h' });
      if (result.error) throw result.error;
    } else {
      const result = await db.auth.admin.updateUserById(targetId, { ban_duration: 'none' });
      if (result.error) throw result.error;
      checked(await db.from('account_suspensions').update({ cleared_at: new Date().toISOString() }).eq('parent_id', targetId));
    }
    checked(await db.from('admin_actions').update({ outcome: 'succeeded' }).eq('id', auditId));
    return json({ ok: true }, 200, true);
  } catch (error) {
    if (auditId !== null) {
      const result = await db.from('admin_actions').update({ outcome: 'failed' }).eq('id', auditId).eq('outcome', 'started');
      if (result.error) console.error('Failed to update admin audit log');
    }
    return fail(error, true);
  }
});
