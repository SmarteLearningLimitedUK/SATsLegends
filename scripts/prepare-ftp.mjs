import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('.');
const folder = path.join(root, '.tmp', 'ftp-release');
if (path.dirname(folder) !== path.join(root, '.tmp')) throw new Error('Release path is outside the workspace temporary folder');
await rm(folder, { recursive: true, force: true });
await mkdir(folder, { recursive: true });
await cp(path.join(root, 'dist'), folder, { recursive: true });
// Some FTP clients hide dotfiles. Make the Apache rewrite file unmistakable.
await writeFile(path.join(folder, 'UPLOAD-README.txt'), `SATs Legends FTP release\n\nUpload all contents, including .htaccess, to satslegends.com's website root.\nUse HTTPS. The website needs SPA fallback to index.html.\nAccounts, Stripe, report email and schedule must also be configured in Supabase.\nNever upload .env files, source files or backend secrets.\nSee docs/PRODUCTION_SETUP.md for the complete setup.\n`);
await readFile(path.join(folder, 'index.html'));
console.log(`FTP files ready: ${folder}`);
