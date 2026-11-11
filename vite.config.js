import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

// Lists every built file in /precache.json and stamps the service worker with this build's id,
// so phones store the whole app (every screen) and pick up each new version.
export function precache() {
  let publicDir = 'public';
  return {
    name: 'pt-precache',
    apply: 'build',
    configResolved(c) { publicDir = c.publicDir; },
    writeBundle(opts, bundle) {
      const out = opts.dir;
      const walk = (dir, base = '') => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
        d.isDirectory() ? walk(path.join(dir, d.name), base + d.name + '/') : [base + d.name]);
      const pub = publicDir && fs.existsSync(publicDir) ? walk(publicDir).filter(f => f !== 'sw.js') : [];
      const built = Object.keys(bundle).filter(f => !f.endsWith('.map') && f !== 'index.html');
      const files = ['/', ...[...built, ...pub].sort().map(f => '/' + f)];
      const html = fs.readFileSync(path.join(out, 'index.html'));
      const version = createHash('sha256').update(files.join('\n')).update(html).digest('hex').slice(0, 12);
      fs.writeFileSync(path.join(out, 'precache.json'), JSON.stringify({ version, files }));
      const sw = path.join(out, 'sw.js');
      if (fs.existsSync(sw)) fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/__BUILD__/g, version));
    },
  };
}

export default defineConfig({
  plugins: [react(), precache()],
})
