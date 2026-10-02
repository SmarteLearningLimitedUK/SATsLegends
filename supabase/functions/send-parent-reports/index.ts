import { admin, appUrl, checked, fail, json, secret } from '../_shared/platform.ts';
import { reportEmail } from '../_shared/report-email.ts';

async function sameSecret(actual: string, expected: string) {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([actual, expected].map(value => crypto.subtle.digest('SHA-256', encoder.encode(value))));
  return new Uint8Array(a).reduce((difference, value, index) => difference | (value ^ new Uint8Array(b)[index]), 0) === 0;
}
Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const cronSecret = secret('REPORT_CRON_SECRET');
  if (cronSecret.length < 32 || !await sameSecret(request.headers.get('x-report-secret') ?? '', cronSecret)) return json({ error: 'Unauthorized' }, 401);
  let runId: string | null = null;
  let db: ReturnType<typeof admin> | null = null;
  try {
    db = admin();
    runId = crypto.randomUUID();
    checked(await db.from('report_job_status').upsert({ id: true, run_id: runId,
      started_at: new Date().toISOString(), finished_at: null, claimed: 0, sent: 0, failed: 0, error: null },
    { onConflict: 'id' }));
    // Validate configuration before claiming work.
    const from = secret('REPORT_FROM');
    const apiKey = secret('RESEND_API_KEY');
    const origin = appUrl();
    const deliveries = checked(await db.rpc('claim_report_deliveries', { batch_size: 40 }));
    let sent = 0;
    let failed = 0;
    for (const delivery of deliveries) {
      try {
        const settings = checked(await db.from('parent_settings').select('report_emails').eq('parent_id', delivery.parent_id).single());
        const { user } = checked(await db.auth.admin.getUserById(delivery.parent_id));
        const profiles = checked(await db.from('child_profiles').select('id,nickname').eq('parent_id', delivery.parent_id)) ?? [];
        if (!settings?.report_emails || !user?.email || !user.email_confirmed_at || !profiles.length) {
          checked(await db.rpc('finish_report_delivery', { delivery_id: delivery.id, email_id: null, skip_delivery: true }));
          continue;
        }
        const progress = checked(await db.from('child_progress').select('child_id,product_code,player,updated_at')
          .eq('parent_id', delivery.parent_id).in('product_code', ['matharia', 'english'])) ?? [];
        const children = profiles.map(profile => ({ ...profile,
          progress: progress.filter(saved => saved.child_id === profile.id) }));
        const email = reportEmail(origin, children);
        const result = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `parent-report/${delivery.id}` },
          body: JSON.stringify({ from, to: [user.email], ...email }), signal: AbortSignal.timeout(15000),
        });
        if (!result.ok) throw new Error(`Email provider returned ${result.status}`);
        const receipt = await result.json();
        checked(await db.rpc('finish_report_delivery', { delivery_id: delivery.id, email_id: receipt.id }));
        sent++;
      } catch (error) {
        failed++;
        // Keep the lease/backoff: next invocation retries with the SAME provider idempotency key.
        const message = error instanceof Error ? error.message.slice(0, 200) : 'Delivery failed';
        await db.from('report_deliveries').update({ last_error: message }).eq('id', delivery.id);
      }
      // Resend's default request rate is two per second.
      await new Promise(resolve => setTimeout(resolve, 600));
    }
    checked(await db.from('report_job_status').update({ finished_at: new Date().toISOString(),
      claimed: deliveries.length, sent, failed }).eq('run_id', runId));
    return json({ sent, failed, claimed: deliveries.length });
  } catch (error) {
    if (db && runId) {
      const message = error instanceof Error ? error.message.slice(0, 200) : 'Report run failed';
      const update = await db.from('report_job_status').update({ finished_at: new Date().toISOString(), error: message }).eq('run_id', runId);
      if (update.error) console.error('Failed to record report run failure');
    }
    return fail(error);
  }
});
