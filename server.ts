import express from 'express';
import path from 'path';
import fs from 'fs';

async function startServer() {
  const app = express();

  // Determine if running in compiled production bundle (dist/server.cjs) or explicitly NODE_ENV=production
  const isCompiled = typeof __filename !== 'undefined' && __filename.includes('server.cjs');
  const isProduction = process.env.NODE_ENV === 'production' || isCompiled;
  const isDev = !isProduction;
  const isNginxProxy = Boolean(process.env.NGINX_PORT);

  // In AI Studio dev environment, nginx routes port 8080 to port 3000, so dev server must bind to 3000.
  // In deployed Cloud Run production, Cloud Run expects the container to listen on process.env.PORT (default 8080).
  const PRIMARY_PORT = (isDev || isNginxProxy)
    ? 3000
    : (process.env.PORT ? parseInt(process.env.PORT, 10) : 8080);

  app.use(express.json());

  // API health check route for Cloud Run and monitoring
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite middleware for development vs static build serving for production
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const possibleDistPaths = [
      path.resolve(process.cwd(), 'dist'),
      typeof __dirname !== 'undefined' ? path.resolve(__dirname) : '',
      typeof __dirname !== 'undefined' ? path.resolve(__dirname, 'dist') : '',
      typeof __dirname !== 'undefined' ? path.resolve(__dirname, '..', 'dist') : '',
      path.resolve(process.cwd()),
    ].filter((p) => Boolean(p) && fs.existsSync(path.join(p, 'index.html')));

    const distPath = possibleDistPaths[0] || path.resolve(process.cwd(), 'dist');

    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PRIMARY_PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PRIMARY_PORT} (${isProduction ? 'production' : 'development'})`);
  });
  server.on('error', (err: any) => {
    console.error(`Primary server error on port ${PRIMARY_PORT}:`, err);
  });

  if (PRIMARY_PORT !== 3000) {
    const secondaryServer = app.listen(3000, '0.0.0.0', () => {
      console.log('Dual-port fallback listening on http://0.0.0.0:3000');
    });
    secondaryServer.on('error', (err: any) => {
      console.log('Secondary port 3000 not bound (non-critical):', err.message);
    });
  }
}

startServer();

