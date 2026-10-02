# SATs Legends: beginner deployment guide

> **Historical preview setup.** This guide records the initial Cloudflare Pages setup and contains statements about services being unconnected that may no longer be true. For the current release checks, use [RELEASE_READINESS.md](RELEASE_READINESS.md) and confirm provider settings in their dashboards before changing the live site.

This guide is for the current React/Vite repository. The website and game build locally, but live parent accounts, payments, saved scores and emails are **not connected yet**. Publishing the files makes the public website viewable; it does not activate those services. Do not invite parents to pay until the final checks below pass.

## What you need

- Your IONOS login for `satslegends.com`.
- A free [Cloudflare account](https://dash.cloudflare.com/sign-up). Cloudflare Pages will serve the website and game files over HTTPS. You do not need the old FTP host for this route.
- Your Windows computer with this repository at `D:\BrainZilla\GitHub\SATsLegends` and [Node.js](https://nodejs.org/en/download) installed. If `npm --version` works in PowerShell, Node is ready.

Keep passwords, payment keys and private API keys in the relevant provider dashboards. Do not paste them into the website files, GitHub or a chat.

## A. Put up a preview you can open on any device

1. Open **PowerShell**. Copy and run each line below:

   ```powershell
   Set-Location 'D:\BrainZilla\GitHub\SATsLegends'
   npm ci
   $env:VITE_ASSET_BASE = '/'
   $env:VITE_ALLOW_GAME_PREVIEW = 'false'
   npm run lint
   npm run build
   ```

   Wait for `built in ...` with no error. The ready-to-upload folder is `D:\BrainZilla\GitHub\SATsLegends\dist`. Select that folder in Cloudflare so its `index.html` is at the site's root. Do not upload the source repository. If `npm` is not recognised, install Node.js, close PowerShell and reopen it.

2. In Cloudflare, open **Workers & Pages → Create application → Get started → Drag and drop your files**. Name this project `satslegends-preview` (or another available name). Drag the entire `dist` folder into the upload area and select **Deploy site**. If it asks for files again, drag `dist` again and select **Save and Deploy**. Cloudflare gives you a link such as `https://satslegends-preview.pages.dev`. Open it on your phone using mobile data as well as on your computer. [Cloudflare's Direct Upload instructions](https://developers.cloudflare.com/pages/get-started/direct-upload/).

3. Check the home page, `/revision`, `/videos`, `/for-parents` and a direct browser refresh on `/login`. The game is intentionally closed in this public preview because no real account/payment backend is configured. Do not set `VITE_ALLOW_GAME_PREVIEW=true` on a public paid site.

This build currently has 336 files, about 88 MB total, and no file exceeds 25 MiB. That is within Cloudflare's documented dashboard upload limits of 1,000 files and 25 MiB per file. Cloudflare's Pages static asset requests are free; this does **not** cover the later account, database and email services. [Upload limits](https://developers.cloudflare.com/pages/get-started/direct-upload/) · [Pages pricing](https://developers.cloudflare.com/pages/functions/pricing/).

To publish a later website update, run the commands in step 1 again, then open the same Pages project and select **Create a new deployment**. Upload the new `dist` folder. A Direct Upload project cannot later be converted to Git integration; automatic Git deployment would use a new Pages project. This manual route avoids having to sort the repository's many current uncommitted files before getting a preview.

## B. Put `satslegends.com` on the preview site

Do this only after the `pages.dev` link looks right. The domain will then show the public site, including the clear “coming soon” gate for account/payment features.

1. In Cloudflare, select **Domains → Onboard a domain**, enter `satslegends.com`, and choose the **Free** plan. Review the DNS records Cloudflare imports. Copy any existing email records (MX, SPF/TXT, DKIM, DMARC) from IONOS into Cloudflare before changing nameservers. If you use an IONOS mailbox, missing records can stop mail delivery. [Cloudflare DNS setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/).
2. In Cloudflare's **satslegends.com domain overview**, find the **two assigned Cloudflare nameservers**. Copy them exactly; do not use nameservers from a guide or another account.
3. In IONOS, open **Domains & SSL**, find `satslegends.com`, choose its **gear icon → Name Server → Use Custom Name Servers**, enter the two nameservers from Cloudflare and save. If DNSSEC is enabled in IONOS, disable it before switching nameservers; re-enable it through Cloudflare after activation. [IONOS instructions](https://www.ionos.co.uk/help/domains/using-your-own-name-servers/using-your-own-name-servers-for-a-domain/) · [Cloudflare DNSSEC note](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/).
4. Wait until the domain shows **Active** in Cloudflare. In your Pages project, select **Custom domains → Set up a domain**, enter `satslegends.com` and continue. You can add `www.satslegends.com` as a second custom domain afterward. Wait until the Pages custom domain shows ready, then open `https://satslegends.com` and refresh `https://satslegends.com/revision`. IONOS says nameserver changes can take up to 48 hours. Cloudflare handles the HTTPS certificate. [Cloudflare custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).

Do not point IONOS at the old Exact Hosting nameservers for this setup. After the switch, manage website and email DNS records in Cloudflare, while the domain registration stays at IONOS.

## C. What is still needed before selling subscriptions

The current code uses **Supabase** for parent login, child profiles and progress, **Stripe** for subscriptions and PayPal through Stripe, and **Resend** for report email. The existing technical setup is in [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md). Its old GoDaddy/FTP hosting instructions and its US$45/month managed-service estimate are an *alternative architecture*, not the £15/month target.

For the target of **up to 800 concurrent players with a £15/month service cap including report email**, the proposed lower-cost backend is Cloudflare Workers Paid + D1, Clerk parent authentication, Stripe billing and Amazon SES email. That backend is **not implemented in this repository**. It requires replacing the Supabase-specific account/progress/report code and migrating database and report jobs. Merely creating provider accounts or adding API keys will not make it work. The cap also excludes Stripe/PayPal transaction fees, domain renewal, taxes and any usage overages. Capacity requires a load test; no host can be promised to handle 800 active players just from its price list.

Before a paid launch, the implementation and live verification must cover:

1. Parent signup, confirmation, login and password reset; one child profile per paid Matharia subscription.
2. Stripe test and live prices of **£4.99 monthly** and **£49.99 yearly**, working webhook handling, cancellations and recurring PayPal if approved for the business account.
3. Private score saves and parent progress pages, with one parent's data inaccessible to another.
4. Email sender verification and sufficient sending quota, then reports scheduled for **Sunday 15:00 and Wednesday 16:00 Europe/London**. Each email links to a progress page that requires the parent's login.
5. Real browser tests of a complete purchase, save, cancellation, report and password reset; then an 800-player load test of logins and saves. Track the measured costs and errors before opening paid signup.

The next engineering task is to build and test that backend. Until then, the steps in A and B produce a **public website preview**, not a working subscription service.
