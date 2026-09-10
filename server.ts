import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();

  // Determine if running in compiled production bundle (dist/server.cjs) or explicitly NODE_ENV=production
  const isCompiled = typeof __filename !== 'undefined' && __filename.includes('server.cjs');
  const isProduction = process.env.NODE_ENV === 'production' || isCompiled;
  const isDev = !isProduction;

  // In development, the sandbox reverse-proxy requires binding to 3000.
  // In production (Cloud Run), the container must listen on process.env.PORT (defaults to 8080).
  const PORT = isProduction ? (process.env.PORT ? parseInt(process.env.PORT, 10) : 8080) : 3000;

  app.use(express.json());

  // API health check route for Cloud Run and monitoring
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite middleware for development vs static build serving for production
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const cwdDist = path.join(process.cwd(), 'dist');
    const dirnameDist = typeof __dirname !== 'undefined' ? __dirname : cwdDist;
    const distPath = fs.existsSync(path.join(cwdDist, 'index.html'))
      ? cwdDist
      : (fs.existsSync(path.join(dirnameDist, 'index.html')) ? dirnameDist : cwdDist);

    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
