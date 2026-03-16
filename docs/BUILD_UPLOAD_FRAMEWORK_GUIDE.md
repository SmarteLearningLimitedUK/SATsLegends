# Build + FTP/FTPS Upload Framework Guide (Reusable for Future Projects)

This guide explains how to copy the same build-and-upload setup used in this repo into other projects.

## What this framework includes

- `Script_BuildAll.bat` (Windows one-click orchestrator)
- `deploy.config.example.bat` (template for environment-specific FTP settings)
- `scripts/upload-ftps.ps1` (FTP/FTPS uploader with retries and optional parallel uploads)
- Vite relative asset base (`base: './'`) for subfolder/static deployments

## 1) Copy these files into your new project

Copy:

- `Script_BuildAll.bat` to repo root
- `deploy.config.example.bat` to repo root
- `scripts/upload-ftps.ps1` to `scripts/`

Your repo should look like:

- `package.json`
- `Script_BuildAll.bat`
- `deploy.config.example.bat`
- `scripts/upload-ftps.ps1`

## 2) Ensure build scripts exist in `package.json`

You need at least:

- `npm install` to resolve dependencies
- `npm run build` to generate production output

If your build output is not `dist/`, update `Script_BuildAll.bat`:

- Change `-LocalRoot "%SCRIPT_DIR%dist"` to your output folder.

## 3) Configure Vite base for subfolder/static hosting

If the app is deployed in a subfolder (for example `/sats`), use:

```ts
base: './'
```

in `vite.config.ts`.

This ensures generated asset links are relative (`./assets/...`) instead of root-based (`/assets/...`).

## 4) Create project-specific deployment config

1. Copy `deploy.config.example.bat` to `deploy.config.bat`.
2. Set values:

- `FTP_HOST`
- `FTP_PORT`
- `FTP_USERNAME`
- `FTP_PASSWORD`
- `FTP_REMOTE_DIR`

Optional controls:

- `FTP_USE_SSL=true|false`
- `FTP_ALLOW_INSECURE_CERT=true|false`
- `FTP_USE_PASSIVE=true|false`
- `FTP_ALLOW_PASSIVE_TOGGLE_FALLBACK=true|false`
- `FTP_MAX_PARALLEL=1..20` (default 5 recommended for this framework)

## 5) Run deployment

Run from Windows:

```bat
Script_BuildAll.bat
```

The script:

1. Runs `npm install`
2. Runs `npm run build`
3. Uploads build artifacts to FTP/FTPS

## 6) Recommended defaults

For most internal FTPS hosts:

- `FTP_USE_SSL=true`
- `FTP_ALLOW_INSECURE_CERT=true` only if cert validation fails and this is trusted/internal
- `FTP_USE_PASSIVE=true`
- `FTP_ALLOW_PASSIVE_TOGGLE_FALLBACK=false`
- `FTP_MAX_PARALLEL=5`

If errors increase under load, reduce `FTP_MAX_PARALLEL` to `3` or `2`.

## 7) How overwrite works

Uploads use FTP `UploadFile` requests. Existing remote files are replaced on servers that permit overwrite.

If overwrite fails, check server-side permissions and FTP account restrictions.

## 8) Porting checklist

When reusing this framework in a new project:

- [ ] `package.json` has a valid `build` script
- [ ] `Script_BuildAll.bat` points to correct build output folder
- [ ] `deploy.config.bat` has environment-specific credentials
- [ ] `vite.config.ts` uses `base: './'` when deploying to a subfolder
- [ ] `scripts/upload-ftps.ps1` copied unchanged first, then tune only if needed
- [ ] Run a small deployment first with `FTP_MAX_PARALLEL=1`, then increase

## 9) Common issues and fixes

- TLS certificate invalid:
  - Set `FTP_USE_SSL=true`, `FTP_ALLOW_INSECURE_CERT=true` (trusted internal only).
- 450/451/452 temporary FTP errors:
  - Keep passive mode enabled, lower parallel count.
- White screen after deploy:
  - Confirm `base: './'` and that uploaded JS/CSS files exist in remote `assets/`.

---

Tip: Keep this framework generic and avoid project-specific logic in `upload-ftps.ps1`. Put project differences in `deploy.config.bat` and output-path settings in `Script_BuildAll.bat`.
