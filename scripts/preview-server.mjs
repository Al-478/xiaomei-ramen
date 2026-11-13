import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from './check-assets.mjs';

const port = Number(process.env.RAMEN_PREVIEW_PORT ?? 4173);
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>小美煮拉面</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#542039}canvas{display:block;width:100%;height:100%;touch-action:none}</style><canvas id="game"></canvas><script src="/preview-adapter.js"></script><script src="/dist/main.js"></script></html>`;
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/') { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(url.searchParams.has('benchmark')?html.replace('/dist/main.js','/benchmark.js'):html); return; }
    if(url.pathname==='/benchmark.js'){response.setHeader('Content-Type','text/javascript; charset=utf-8');response.end(await readFile(path.join(root,'.preview/benchmark.js')));return;}
    const adapter = url.pathname === '/preview-adapter.js';
    if (!adapter && !/^\/(dist\/main\.js|assets\/images\/[a-z0-9/_-]+\.(png|jpg)|assets\/audio\/[a-z0-9_-]+\.mp3)$/.test(url.pathname)) {
      response.writeHead(404); response.end(); return;
    }
    const file = adapter ? path.join(root, 'scripts/preview-adapter.js') : path.join(root, 'dist-wechat', url.pathname.slice(1));
    const body = await readFile(file);
    response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript; charset=utf-8' : file.endsWith('.png') ? 'image/png' : file.endsWith('.mp3') ? 'audio/mpeg' : 'image/jpeg');
    response.end(body);
  } catch { response.writeHead(404); response.end(); }
});
server.listen(port, '127.0.0.1', () => console.log(`本地画布预览：http://127.0.0.1:${port}；浏览器适配器不进入微信包。`));
