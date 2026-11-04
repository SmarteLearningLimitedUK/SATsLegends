# Matharia account deletion

Prepared locally; not deployed. The function deletes only the user validated by
Supabase Auth. The app requires explicit acknowledgement that the shared identity,
website profiles/progress and native device progress are removed. Apple and
website subscriptions are not cancelled by account deletion.

Despite `verify_jwt = false` in config.toml, the handler validates the bearer token
with `Auth.getUser` itself. Password identities need a fresh password AMR claim.
Apple identities need a fresh authorization code for the native bundle; the
server exchanges it, verifies its subject, and revokes its Apple token first.
Refresh sessions are revoked before hard deletion. Caller-supplied user IDs are
rejected. Server rows use existing foreign-key cascade rules.

Before deployment to `znwqfeqzzlyytbfsakqj`, configure server-only secrets:

- `APPLE_SIGN_IN_TEAM_ID`: the existing Apple team ID.
- `APPLE_SIGN_IN_KEY_ID`: an Apple **Sign in with Apple** key ID.
- `APPLE_SIGN_IN_PRIVATE_KEY`: that key's private `.p8` contents.

These are not App Store Connect API-key credentials. Do not put private values in
Vite variables, the repository, browser builds, CI output, or chat. Supabase's
normal `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` runtime secrets are also used.
The native audience is fixed to `com.smartelearning.satslegends`.

The default allowed web origin is `capacitor://localhost`. Extra origins can be
explicitly supplied with `MATHARIA_NATIVE_ALLOWED_ORIGINS`; do not add the website
to bypass the app boundary.

With authorized deployment access, run from the repository root:

```sh
supabase functions deploy native-account-delete --project-ref znwqfeqzzlyytbfsakqj
```

Keep existing web authentication settings intact when adding the native bundle
ID to the Apple provider. Verify native Apple login, a disposable password
account, and an Apple test account on a device after deployment. Do not delete a
real user's account as a deployment test.

```sh
deno check supabase/functions/native-account-delete/index.ts
node --test variants/matharia/scripts/account-deletion.test.mjs
```

Tests use generated keys and simulated services. They do not certify deployed
secrets, actual Apple revocation, live database cleanup, or native iOS behaviour.
