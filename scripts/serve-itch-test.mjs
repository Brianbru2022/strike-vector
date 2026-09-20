import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('.dist-itch-host');
if (!existsSync(resolve(root, 'index.html'))) throw new Error('.dist-itch-host/index.html is missing; run pnpm itch:package first.');

const app = express();
const mount = '/games/iron-kestrel';
app.get('/api/health', (_request, response) => response.json({ ok: true, mount }));
app.get('/itch-host.html', (_request, response) => response.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Itch test host</title>
<style>html,body{margin:0;background:#151515;width:100%;height:100%}iframe{display:block;border:0;width:100%;height:100%}</style></head>
<body><iframe title="Iron Kestrel '87 itch game" allow="fullscreen; autoplay" src="${mount}/"></iframe></body></html>`));
app.use(mount, express.static(root, { fallthrough: true }));
app.get(`${mount}/*`, (_request, response) => response.sendFile(resolve(root, 'index.html')));

const port = Number(process.env.ITCH_TEST_PORT ?? 4186);
app.listen(port, '127.0.0.1', () => console.log(`Itch test host: http://127.0.0.1:${port}/itch-host.html`));
