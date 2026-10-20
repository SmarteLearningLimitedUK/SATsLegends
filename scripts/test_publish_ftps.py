"""Deployment checks use an in-memory FTP server, never the live host."""
import ftplib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('publish_ftps', Path(__file__).with_name('publish-ftps.py'))
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


class MemoryFTP:
    def __init__(self):
        self.files = {'/index.html': b'old page', '/.htaccess': b'old rules', '/php.ini': b'hosting settings'}
        self.renames = []
        self.fail_index_once = False

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def retrbinary(self, command, callback):
        name = command.removeprefix('RETR ')
        if name not in self.files:
            raise ftplib.error_perm('550 Not found')
        callback(self.files[name])

    def storbinary(self, command, stream, **kwargs):
        self.files[command.removeprefix('STOR ')] = stream.read()

    def size(self, name):
        return len(self.files[name])

    def voidcmd(self, command):
        return '200 OK'

    def rename(self, temporary, destination):
        if destination == '/index.html' and self.fail_index_once:
            self.fail_index_once = False
            raise OSError('Simulated connection interruption')
        self.files[destination] = self.files.pop(temporary)
        self.renames.append(destination)

    def delete(self, name):
        if name not in self.files:
            raise ftplib.error_perm('550 Not found')
        del self.files[name]

    def mkd(self, name):
        pass

    def cwd(self, name):
        pass


class PublisherChecks(unittest.TestCase):
    def setUp(self):
        temporary_parent = publisher.ROOT / '.tmp'
        temporary_parent.mkdir(exist_ok=True)
        temporary = tempfile.TemporaryDirectory(prefix='publisher-test-', dir=temporary_parent)
        self.root = Path(temporary.name).resolve()
        self.assertEqual(self.root.parent, temporary_parent.resolve())
        self.addCleanup(temporary.cleanup)
        self.state = self.root / '.deploy'
        self.state.mkdir()
        self.ftp = MemoryFTP()
        self.config = {'siteUrl': 'https://example.test', 'tlsHost': 'ftp.example.test', 'remoteRoot': '/', 'workers': 1}
        self.files = {'assets/app.js': b'new asset', '.htaccess': b'new rules',
                      'english/play/index.html': b'new English page', 'index.html': b'new page',
                      'site-release.json': b'new release'}

    def run_deploy(self, plan_only=False):
        with patch.object(publisher, 'STATE', self.state), \
             patch.object(publisher, 'connect', return_value=self.ftp), \
             patch.object(publisher, 'probe'), \
             patch.object(publisher, 'web_bytes', side_effect=lambda config, name, release: self.ftp.files['/' + name]):
            publisher.deploy(self.ftp, self.config, self.files, plan_only)

    def test_plan_never_uploads(self):
        previous = dict(self.ftp.files)
        self.run_deploy(plan_only=True)
        self.assertEqual(self.ftp.files, previous)
        self.assertFalse(self.ftp.renames)

    def test_assets_before_pages_and_backup_available(self):
        self.run_deploy()
        self.assertLess(self.ftp.renames.index('/assets/app.js'), self.ftp.renames.index('/index.html'))
        self.assertLess(self.ftp.renames.index('/english/play/index.html'), self.ftp.renames.index('/index.html'))
        self.assertEqual(self.ftp.files['/php.ini'], b'hosting settings')
        record = json.loads((self.state / 'rollback.json').read_text())
        self.assertEqual((self.state / 'backups' / record['backup'] / 'index.html').read_bytes(), b'old page')
        self.assertFalse(any('.sats-upload-' in name for name in self.ftp.files))

    def test_interrupted_switch_restores_old_pages(self):
        self.ftp.fail_index_once = True
        with self.assertRaisesRegex(OSError, 'interruption'):
            self.run_deploy()
        self.assertEqual(self.ftp.files['/index.html'], b'old page')
        self.assertEqual(self.ftp.files['/.htaccess'], b'old rules')
        self.assertNotIn('/english/play/index.html', self.ftp.files)
        self.assertEqual(self.ftp.files['/php.ini'], b'hosting settings')
        self.assertFalse((self.state / 'last-release.json').exists())

    def test_cached_release_does_not_skip_after_manual_index_change(self):
        self.run_deploy()
        self.ftp.files['/index.html'] = b'manually replaced page'
        self.ftp.renames.clear()
        self.run_deploy()
        self.assertIn('/assets/app.js', self.ftp.renames)
        self.assertEqual(self.ftp.files['/index.html'], b'new page')

    def test_private_and_hosting_files_cannot_enter_release(self):
        folder = self.root / 'dist'
        for name in ('index.html', 'english/play/index.html', '.htaccess'):
            target = folder / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(b'fixture')
        for name in ('.env', 'php.ini', '.user.ini'):
            forbidden = folder / name
            forbidden.write_text('not a public release file')
            with patch.object(publisher, 'ROOT', self.root):
                with self.assertRaises(publisher.PublishError):
                    publisher.release_files()
            forbidden.unlink()


if __name__ == '__main__':
    unittest.main()
