# Parent sign-in methods

These steps turn on the optional Google, Apple and passkey buttons already implemented in the website. Keep provider client secrets in Supabase. Cloudflare only needs the public on/off flags below.

## 1. Apply the report-consent migration

In **Supabase → SQL Editor**, run [202610020001_social_signup_report_consent.sql](../supabase/migrations/202610020001_social_signup_report_consent.sql). New social accounts then start with progress-report emails **off**. A parent can opt in from their dashboard. Password sign-up continues to use the report checkbox on the form. Existing parent settings are unchanged.

## 2. Set the website redirects

In **Supabase → Authentication → URL Configuration**, set the Site URL to `https://satslegends.com` once the domain is live. Add `https://satslegends.com/auth/callback` to the allowed redirect URLs. While testing on the Pages address, also allow `https://satslegends.pages.dev/auth/callback`. Include `https://www.satslegends.com/auth/callback` only if the www address serves the site. The website sends parents back to their account after provider sign-in.

## 3. Google

Create a **Web application** OAuth client in Google Auth Platform. Add `https://satslegends.com` as an authorized JavaScript origin and copy the **Supabase callback URL shown on the Google provider page** into Google's authorized redirect URIs. Paste the Google client ID and secret into **Supabase → Authentication → Providers → Google**, then enable the provider. Follow [Supabase's Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google) for the current Google console fields.

In **Cloudflare Pages → satslegends → Settings → Variables and Secrets**, add a **Text** build variable `VITE_GOOGLE_AUTH_ENABLED` with value `true`. Redeploy the production branch. The button stays hidden until this flag is true.

## 4. Apple

Apple web sign-in requires an Apple Developer configuration: a Services ID, a Sign in with Apple key, and the matching Supabase callback/domain settings. Enter the required values in **Supabase → Authentication → Providers → Apple** and enable it. Follow [Supabase's Apple web setup](https://supabase.com/docs/guides/auth/social-login/auth-apple) for the current Apple portal steps. Apple web OAuth credentials require regular secret rotation, so keep the signing key in a safe place.

Add the Cloudflare **Text** build variable `VITE_APPLE_AUTH_ENABLED=true` and redeploy.

## 5. Passkeys

Enable **Supabase → Authentication → Passkeys** only after `https://satslegends.com` is live. Set the relying party ID to `satslegends.com` and the origin to `https://satslegends.com`. If you serve www, include `https://www.satslegends.com` as an additional origin. An RP ID cannot later change without invalidating enrolled passkeys. The separate `pages.dev` domain cannot share passkeys with `satslegends.com`.

Add `VITE_PASSKEY_AUTH_ENABLED=true` as a Cloudflare **Text** build variable and redeploy. A confirmed parent signs in normally, opens **Parent account → Your account security → Add a passkey**, then can use **Log in with a passkey** on the next visit. Passkeys require HTTPS and a supported browser/device. See [Supabase's passkey guide](https://supabase.com/docs/guides/auth/passkeys).

## Check before inviting parents

1. Open the deployed site in a private browser window and confirm only configured sign-in buttons appear.
2. Complete a Google or Apple sign-up, confirm the parent dashboard opens, and confirm progress emails start off.
3. Add one passkey, sign out, then sign back in with it.
4. Test the same flows on an iPhone and an Android phone. Keep email/password login available as a recovery route.

Never put a Google/Apple client secret, Supabase secret key, or Apple signing key in a `VITE_` variable; those values are included in the public browser build.
