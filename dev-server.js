// ---------------------------------------------------------------------------
// Dev-only static file server. This is NOT part of the deployed app — the app
// is just the static files in `public/`, which any static host serves with no
// backend at all.
//
// It exists for one reason: camera/mic access (getUserMedia) needs a "secure
// context". http://localhost qualifies, but a phone or laptop reaching this
// machine over its LAN IP on plain HTTP does not. `bun run dev:https` serves
// over HTTPS with a locally-trusted mkcert certificate, so you can test a real
// call between two devices.
// ---------------------------------------------------------------------------

import { join, normalize } from 'path';

const ROOT = import.meta.dir;
const PUBLIC_DIR = join(ROOT, 'public');
const useHttps = Boolean(process.env.HTTPS);
const port = Number(process.env.PORT) || (useHttps ? 8443 : 8080);

let tls;
if (useHttps) {
  const cert = Bun.file(join(ROOT, 'certs/cert.pem'));
  const key = Bun.file(join(ROOT, 'certs/key.pem'));
  if (!(await cert.exists()) || !(await key.exists())) {
    console.error(
      'No TLS certificate found in certs/.\n\n' +
      'Generate one with mkcert (https://github.com/FiloSottile/mkcert):\n' +
      '  bun run certs\n\n' +
      'To also reach this server from another device on your network,\n' +
      'include this machine\'s LAN IP when generating it:\n' +
      '  mkcert -cert-file certs/cert.pem -key-file certs/key.pem \\\n' +
      '         localhost 127.0.0.1 ::1 192.168.x.x\n'
    );
    process.exit(1);
  }
  tls = { cert, key };
}

const server = Bun.serve({
  port,
  hostname: '0.0.0.0', // reachable from other devices on the LAN
  tls,
  async fetch(req) {
    let path;
    try {
      path = decodeURIComponent(new URL(req.url).pathname);
    } catch {
      return new Response('Bad request', { status: 400 });
    }
    if (path === '/') path = '/index.html';

    const filePath = normalize(join(PUBLIC_DIR, path));
    // Reject path traversal: the resolved path must stay inside PUBLIC_DIR.
    if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + '/')) {
      return new Response('Forbidden', { status: 403 });
    }

    const file = Bun.file(filePath);
    return (await file.exists())
      ? new Response(file) // Bun sets Content-Type from the file extension
      : new Response('Not found', { status: 404 });
  },
});

const scheme = useHttps ? 'https' : 'http';
console.log(`Dev server running: ${scheme}://localhost:${server.port}`);
if (useHttps) {
  console.log(`From another device: ${scheme}://<this-machine-LAN-IP>:${server.port}`);
} else {
  console.log('Open the localhost URL above — 0.0.0.0 and LAN IPs are not secure contexts.');
}
