import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, base));

test('PWA launches the secure admin and has the expected branding', () => {
  const manifest = JSON.parse(read('majka-admin.webmanifest').toString('utf8'));
  const admin = read('admin.html').toString('utf8');
  assert.equal(manifest.start_url, './admin.html');
  assert.equal(manifest.id, './admin.html');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.short_name, 'Majka ADMIN');
  assert.match(admin, /rel="manifest" href="majka-admin\.webmanifest"/);
  assert.match(admin, /rel="apple-touch-icon" href="icons\/majka-admin-192\.png"/);
  assert.match(admin, /beforeinstallprompt/);
  assert.match(admin, /appinstalled/);
  assert.doesNotMatch(admin, /serviceWorker\.register/);
});

test('PWA icons are real PNG images in 192px and 512px', () => {
  for (const size of [192, 512]) {
    const bytes = read(`icons/majka-admin-${size}.png`);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
  }
});
