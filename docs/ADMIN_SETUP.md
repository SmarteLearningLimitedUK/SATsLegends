# SATs Legends owner account and support dashboard

The live Cloudflare Pages preview at `https://satslegends.pages.dev` currently has no account backend. Do these steps in order. The admin dashboard code is in this repository; the account itself is created only after the Supabase project is connected. The Supabase **dashboard login** and the SATs Legends **parent/admin login** are separate accounts.

## 1. Create the database tables

In your Supabase project, open **SQL Editor → New query**. Run each entire file once, in this order:

1. `supabase/migrations/202609290001_family_accounts.sql`
2. `supabase/migrations/202610010001_admin_support.sql`

Each query should finish successfully before you proceed. Running SQL in the editor may not change the dashboard's “Last migration” label; it is a manual schema change. Do not rerun a file that already succeeded.

The second file creates staff membership, complimentary game access, suspension checks and an audit log. A normal parent cannot add themselves to staff or grant their own free access.

## 2. Configure authentication links

In **Authentication → URL Configuration**, set:

- **Site URL:** `https://satslegends.pages.dev`
- **Redirect URLs:** `https://satslegends.pages.dev/auth/callback` and `https://satslegends.pages.dev/reset-password`

Keep email confirmation enabled. Public signup and password reset need a verified sending service before inviting families beyond your own project-team email. See [Supabase's redirect URL guide](https://supabase.com/docs/guides/auth/redirect-urls) and [SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp).

## 3. Connect the website to Supabase

From your Supabase project's **Connect** dialog or **Settings → API Keys**, copy the **Project URL** and the `sb_publishable_...` key. In **Cloudflare → Workers & Pages → satslegends → Settings → Environment variables**, add these build variables for Production:

```text
VITE_SUPABASE_URL                 https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY    sb_publishable_YOUR_KEY
VITE_ASSET_BASE                  /
VITE_ALLOW_GAME_PREVIEW          false
```

The publishable key is designed for browser use. **Never** put a `sb_secret_...` key, the database password, a Stripe secret or a service-role key into a `VITE_` variable. Deploy the admin branch/merged `main` after both SQL files succeed, then trigger a new Pages deployment so these build variables are included. [Supabase key guide](https://supabase.com/docs/guides/getting-started/api-keys).

## 4. Deploy the support function

The dashboard's user search and account actions run through `supabase/functions/admin-support/`. They need a Supabase Edge Function, not just Cloudflare Pages. In Supabase **Edge Functions → Secrets**, set `APP_URL` to `https://satslegends.pages.dev`. The hosted function receives `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically; do not copy that secret to Cloudflare or the browser. [Supabase function secrets](https://supabase.com/docs/guides/functions/secrets).

In PowerShell from this repository's root, run:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy admin-support
```

The project ref is the part before `.supabase.co` in your Project URL. The login command opens a browser for your own Supabase sign-in. Never give anyone the resulting access token. If you later add Stripe and reports, deploy their functions separately as described in [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md).

## 5. Create your personal account, then grant its staff role

1. Open `https://satslegends.pages.dev/signup`, create your **parent** account with your own email and a private password, and confirm the email. Do not share that password.
2. In Supabase **Authentication → Users**, locate the exact email you just verified and copy its **User UID**.
3. In **SQL Editor**, replace both placeholders below with your UID and your exact email, review the selected row, then run the insert:

```sql
select id, email, email_confirmed_at
from auth.users
where id = 'YOUR-USER-UID'::uuid and lower(email) = lower('your@email.example');

insert into public.staff_accounts(user_id)
select id from auth.users
where id = 'YOUR-USER-UID'::uuid
  and lower(email) = lower('your@email.example')
  and email_confirmed_at is not null
on conflict do nothing;
```

The first query must show **one** row with your own email and a confirmation time. If it does not, stop; the insert should not be run. Sign out and back in if the Admin link does not appear immediately.

## 6. Give your own parent account free Matharia access

Open `/admin`, search your email, enter a reason such as `Owner testing access`, and select **Grant one year free**. This records a complimentary access grant in the database without creating a fake Stripe subscription or charging your card. Open **Parent account**, add one child nickname, and select **Play Matharia**. The admin dashboard also shows users, plan and report status, last save time, and lets authorised staff send reset emails, revoke complimentary access, or suspend/reactivate a non-staff account. Every account action requires a reason and is audited.

The support dashboard does not delete family data or alter Stripe charges. Suspension blocks the account's database reads and progress saves immediately; Supabase's sign-in ban is applied too. A parent reactivated by staff must opt back into report emails if those were switched off during suspension.

## Before public paid launch

This setup gives the owner a working test account. Stripe, PayPal, custom SMTP/report delivery and load validation are still separate work. Supabase Free is suitable for development; its paid Pro plan starts above the agreed £15/month cap. Do not offer paid signup or claim 800-player capacity until the production backend and an 800-player load test are complete.
