import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { RELEASE_INFO } from './src/game/Release';

const app = express();
const PORT = Number(process.env.PORT) || 4177;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    edition: 'iron-kestrel-87',
    offlineAssets: true,
    version: RELEASE_INFO.version,
    buildId: RELEASE_INFO.buildId,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IRON KESTREL '87: NORTH ATLANTIC AIR WAR active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
