<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a5a23fe0-08ec-40a3-9b21-e5cfbefe3020

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## One-click build + upload for internal testing (Windows)

1. Copy `deploy.config.example.bat` to `deploy.config.bat`.
2. Edit `deploy.config.bat` and set your FTP/FTPS credentials.
3. Double-click `Script_BuildAll.bat`.

What it does:
- Runs `npm install`
- Runs `npm run build`
- Uploads all files from `dist/` to the remote folder `sats` using explicit FTPS on port 21
- `FTP_ALLOW_INSECURE_CERT=true` can be used if your FTPS server presents a self-signed or mismatched TLS certificate
- `FTP_USE_PASSIVE` controls FTP passive mode (`true` default); set `false` if your server requires active mode
- `FTP_ALLOW_PASSIVE_TOGGLE_FALLBACK` controls whether the uploader retries with opposite passive mode (`false` default)

This branch no longer uses Vercel deployment files; use `Script_BuildAll.bat` for internal test uploads.
