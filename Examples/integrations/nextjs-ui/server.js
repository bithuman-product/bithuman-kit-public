// Custom Next.js server with LiveKit WebSocket proxy.
// Proxies WebSocket upgrade requests on /rtc to the LiveKit server,
// so the browser only needs one port (the frontend port) for both
// the UI and LiveKit signaling — no separate port 17880 required.

const { createServer } = require('http');
const { parse } = require('url');
const { request: httpRequest } = require('http');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

// Internal LiveKit URL (Docker DNS resolves "livekit" to the container)
const LIVEKIT_INTERNAL = process.env.LIVEKIT_WS_URL || 'http://livekit:17880';

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  });

  // Proxy WebSocket upgrades for /rtc to LiveKit
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url);

    if (pathname === '/rtc') {
      const target = new URL(LIVEKIT_INTERNAL);

      const proxyReq = httpRequest({
        hostname: target.hostname,
        port: target.port || 17880,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          host: `${target.hostname}:${target.port || 17880}`,
        },
      });

      proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
        let header = 'HTTP/1.1 101 Switching Protocols\r\n';
        for (const [key, value] of Object.entries(proxyRes.headers)) {
          header += `${key}: ${value}\r\n`;
        }
        header += '\r\n';

        socket.write(header);
        if (proxyHead.length > 0) socket.write(proxyHead);
        if (head.length > 0) proxySocket.write(head);

        proxySocket.pipe(socket);
        socket.pipe(proxySocket);

        proxySocket.on('error', () => socket.destroy());
        socket.on('error', () => proxySocket.destroy());
      });

      proxyReq.on('response', (res) => {
        // LiveKit rejected the upgrade (e.g., bad token)
        let header = `HTTP/1.1 ${res.statusCode} ${res.statusMessage}\r\n`;
        for (const [key, value] of Object.entries(res.headers)) {
          header += `${key}: ${value}\r\n`;
        }
        header += '\r\n';
        socket.write(header);
        res.pipe(socket);
      });

      proxyReq.on('error', (err) => {
        console.error('[lk-proxy] Error:', err.message);
        socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
        socket.destroy();
      });

      proxyReq.end();
    } else if (dev) {
      // In dev mode, let Next.js handle HMR WebSocket
      handle(req, { write: () => {}, end: () => {} });
    } else {
      socket.destroy();
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`> Frontend ready on http://0.0.0.0:${port}`);
    console.log(`> LiveKit proxy: ${LIVEKIT_INTERNAL}`);
  });
});
