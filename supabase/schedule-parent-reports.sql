-- Run once AFTER deploying send-parent-reports and adding these two secrets to Vault
-- through the dashboard: reports_function_url, reports_cron_secret.
-- URL: https://YOUR_PROJECT.supabase.co/functions/v1/send-parent-reports
-- Secret: exactly the same random value as the REPORT_CRON_SECRET function secret.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule(jobid) from cron.job where jobname = 'sats-legends-parent-reports';
select cron.schedule('sats-legends-parent-reports', '* * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'reports_function_url'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-report-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'reports_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 90000
  );
$$);
