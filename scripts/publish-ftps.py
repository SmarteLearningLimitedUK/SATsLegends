"""Publish static builds using the existing FileZilla site, with verified FTPS."""
from __future__ import annotations

import argparse
import base64
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import ftplib
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import socket
import ssl
import sys
import urllib.parse
import urllib.request
import uuid
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / '.deploy'
CRITICAL = ('.htaccess', 'english/play/index.html', 'index.html', 'site-release.json')
PROTECTED = {'.well-known', 'cgi-bin', '.ftpquota', '.user.ini', 'php.ini'}
OMIT = {'_headers', '_redirects', 'UPLOAD-README.txt'}


class PublishError(Exception):
    pass


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def credentials(config):
    manager = Path(os.environ['APPDATA']) / 'FileZilla' / 'sitemanager.xml'
    matches = [s for s in ET.parse(manager).findall('.//Server')
               if s.findtext('Name') == config['filezillaSite']
               and s.findtext('Host') == config['savedHost']]
    if len(matches) != 1:
        raise PublishError('The configured FileZilla site was not found uniquely. Check its name and host.')
    site = matches[0]
    password = site.find('Pass')
    if password is None or password.get('encoding') != 'base64':
        raise PublishError('This saved FileZilla login needs interactive setup. No password was read or logged.')
    return site.findtext('User'), base64.b64decode(password.text or '').decode('utf-8')


def connect(config):
    saved_ips = {r[4][0] for r in socket.getaddrinfo(config['savedHost'], config['port'])}
    tls_ips = {r[4][0] for r in socket.getaddrinfo(config['tlsHost'], config['port'])}
    if not saved_ips.intersection(tls_ips):
        raise PublishError('The certified hostname no longer points at the saved FTP server. Check the hosting details.')
    user, password = credentials(config)
    ftp = ftplib.FTP_TLS(context=ssl.create_default_context(), timeout=45)
    try:
        ftp.connect(config['tlsHost'], config['port'])
        ftp.login(user, password)
        ftp.prot_p()
        ftp.voidcmd('TYPE I')
        ftp.cwd(config['remoteRoot'])
        return ftp
    except ssl.SSLCertVerificationError:
        ftp.close()
        raise PublishError('The FTP certificate could not be verified. Publishing was stopped.') from None
    except Exception:
        ftp.close()
        raise PublishError('The secure FTP connection failed. Check the saved FileZilla login and hosting availability.') from None


def remote_path(config, name):
    return str(PurePosixPath(config['remoteRoot']) / PurePosixPath(name))


def retrieve(ftp, path):
    result = io.BytesIO()
    try:
        ftp.retrbinary('RETR ' + path, result.write)
    except ftplib.error_perm as error:
        if str(error).startswith('550'):
            return None
        raise
    return result.getvalue()


def atomic_upload(ftp, config, name, data, release_id):
    destination = remote_path(config, name)
    temporary = destination + '.sats-upload-' + release_id
    try:
        ftp.storbinary('STOR ' + temporary, io.BytesIO(data), blocksize=262144)
        ftp.voidcmd('TYPE I')
        if ftp.size(temporary) != len(data):
            raise PublishError('The server reported an incomplete upload for ' + name)
        ftp.rename(temporary, destination)
    finally:
        try:
            ftp.delete(temporary)
        except ftplib.all_errors:
            pass


def web_bytes(config, name, release_id):
    url = config['siteUrl'].rstrip('/') + '/' + urllib.parse.quote(name, safe='/')
    request = urllib.request.Request(url + '?sats_publish=' + release_id,
                                    headers={'Cache-Control': 'no-cache', 'Accept-Encoding': 'identity',
                                             'User-Agent': 'SATsLegendsPublisher/1.0'})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


def probe(ftp, config):
    release_id = uuid.uuid4().hex
    name = 'sats-publish-check-' + release_id + '.txt'
    temporary = remote_path(config, name) + '.sats-upload-' + release_id
    try:
        for phase in (1, 2):
            data = f'SATs Legends publish check {release_id} phase {phase}\n'.encode()
            atomic_upload(ftp, config, name, data, release_id)
            if web_bytes(config, name, release_id + str(phase)) != data:
                raise PublishError('The FTP directory does not match the website URL. Publishing was stopped.')
        print('PASS verified TLS, upload, replacement, and HTTPS retrieval on satslegends.com.', flush=True)
    finally:
        for item in (temporary, remote_path(config, name)):
            try:
                ftp.delete(item)
            except ftplib.error_perm:
                pass


def release_files():
    folder = (ROOT / 'dist').resolve()
    if not folder.is_dir():
        raise PublishError('Build the release before planning or uploading.')
    result = {}
    for file in sorted(folder.rglob('*')):
        if not file.is_file():
            continue
        if not file.resolve().is_relative_to(folder):
            raise PublishError('A release file points outside dist.')
        name = file.relative_to(folder).as_posix()
        parts = PurePosixPath(name).parts
        if name in OMIT:
            continue
        if parts[0] in PROTECTED or any(p.startswith('.env') or p in {'.git', 'node_modules'} for p in parts):
            raise PublishError('Protected or private file found in dist: ' + name)
        if any(p.startswith('.') for p in parts) and name != '.htaccess':
            raise PublishError('Unexpected hidden release file: ' + name)
        result[name] = file.read_bytes()
    for required in ('index.html', 'english/play/index.html', '.htaccess'):
        if required not in result:
            raise PublishError('The combined release is missing ' + required)
    return result


def backup(ftp, config, release_id):
    folder = STATE / 'backups' / (datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ-') + release_id)
    folder.mkdir(parents=True)
    records = {}
    for name in CRITICAL:
        data = retrieve(ftp, remote_path(config, name))
        records[name] = data is not None
        if data is not None:
            file = folder / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(data)
    if not records['index.html']:
        raise PublishError('No existing website index was found at the configured FTP root.')
    (folder / 'backup.json').write_text(json.dumps({'target': config, 'files': records}, indent=2), encoding='utf-8')
    return folder


def restore(ftp, config, folder):
    folder = folder.resolve()
    if not folder.is_relative_to((STATE / 'backups').resolve()):
        raise PublishError('Backup path is outside the local backup directory.')
    saved = json.loads((folder / 'backup.json').read_text(encoding='utf-8'))
    if saved['target'] != config:
        raise PublishError('This backup belongs to a different deployment target.')
    for name in CRITICAL:
        if saved['files'][name]:
            atomic_upload(ftp, config, name, (folder / name).read_bytes(), uuid.uuid4().hex)
        else:
            try:
                ftp.delete(remote_path(config, name))
            except ftplib.error_perm:
                pass
    if digest(web_bytes(config, 'index.html', uuid.uuid4().hex)) != digest((folder / 'index.html').read_bytes()):
        raise PublishError('The restored page could not be verified over HTTPS.')
    print('PASS previous page entry files restored and verified.', flush=True)


def deploy(ftp, config, files, plan_only):
    previous = STATE / 'last-release.json'
    cache = json.loads(previous.read_text(encoding='utf-8')) if previous.exists() else None
    current_index = retrieve(ftp, remote_path(config, 'index.html'))
    usable_cache = cache and cache['target'] == config and digest(current_index or b'') == cache['hashes'].get('index.html')
    hashes = {name: digest(data) for name, data in files.items()}
    changed = [name for name in files if not usable_cache or cache['hashes'].get(name) != hashes[name]]
    total = sum(len(files[name]) for name in changed)
    print(f'{len(files)} release files; {len(changed)} uploads ({total / 1048576:.1f} MB).', flush=True)
    print('Target: ' + config['siteUrl'] + ' via verified FTPS at ' + config['tlsHost'], flush=True)
    print('Page files are switched after assets. Existing unrelated server files are retained.', flush=True)
    if plan_only:
        print('PASS build and upload plan ready; plan mode makes no server changes.', flush=True)
        return
    probe(ftp, config)
    release_id = uuid.uuid4().hex
    folder = backup(ftp, config, release_id)
    # Record the rollback target before uploading, including interrupted publishes.
    (STATE / 'rollback.json').write_text(json.dumps({'backup': folder.name}), encoding='utf-8')
    directories = set()
    for name in changed:
        parent = PurePosixPath(name).parent
        while str(parent) != '.':
            directories.add(str(parent))
            parent = parent.parent
    for name in sorted(directories, key=lambda value: (value.count('/'), value)):
        try:
            ftp.mkd(remote_path(config, name))
        except ftplib.error_perm:
            ftp.cwd(remote_path(config, name))
            ftp.cwd(config['remoteRoot'])
    assets = [name for name in changed if name not in CRITICAL]
    workers = max(1, min(int(config.get('workers', 3)), 4))

    def worker(names):
        with connect(config) as upload:
            for name in names:
                atomic_upload(upload, config, name, files[name], release_id)

    try:
        with ThreadPoolExecutor(max_workers=workers) as pool:
            for _ in pool.map(worker, [assets[i::workers] for i in range(workers) if assets[i::workers]]):
                pass
        for name in CRITICAL:
            if name in changed:
                atomic_upload(ftp, config, name, files[name], release_id)
        for name in ('index.html', 'english/play/index.html'):
            if digest(web_bytes(config, name, release_id)) != hashes[name]:
                raise PublishError('The published page could not be verified: ' + name)
    except Exception:
        print('Publish did not finish; restoring the backed-up page entry files.', flush=True)
        with connect(config) as recovery:
            restore(recovery, config, folder)
        raise
    previous.write_text(json.dumps({'target': config, 'hashes': hashes, 'backup': folder.name}, indent=2), encoding='utf-8')
    print('PASS website, Matharia and Lexcoria published and verified at ' + config['siteUrl'], flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['check', 'probe', 'plan', 'publish', 'rollback'])
    args = parser.parse_args()
    config = json.loads((ROOT / '.publish-target.json').read_text(encoding='utf-8'))
    if not config['siteUrl'].startswith('https://') or '..' in PurePosixPath(config['remoteRoot']).parts:
        raise PublishError('The deployment target is not valid.')
    STATE.mkdir(exist_ok=True)
    with connect(config) as ftp:
        if args.mode == 'check':
            if retrieve(ftp, remote_path(config, 'index.html')) is None:
                raise PublishError('The website index was not found at the configured FTP root.')
            print('PASS verified FTPS login and read access to the website root.', flush=True)
        elif args.mode == 'probe':
            probe(ftp, config)
        elif args.mode == 'rollback':
            record = json.loads((STATE / 'rollback.json').read_text(encoding='utf-8'))
            restore(ftp, config, STATE / 'backups' / record['backup'])
            (STATE / 'last-release.json').unlink(missing_ok=True)
        else:
            deploy(ftp, config, release_files(), args.mode == 'plan')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'PUBLISH STOPPED: {type(error).__name__}: {error}', file=sys.stderr)
        sys.exit(1)
