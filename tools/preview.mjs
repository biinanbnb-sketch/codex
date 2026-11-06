import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {prepare} from './prepare.mjs';

const {webRoot} = await prepare();
const types = {'preview.html':'text/html; charset=utf-8','codex-splash.js':'text/javascript; charset=utf-8'};
const server = createServer(async (request,response) => {
  const path = new URL(request.url,'http://127.0.0.1').pathname;
  const file = path === '/' ? 'preview.html' : path.slice(1);
  if (!Object.hasOwn(types,file)) { response.writeHead(404); response.end(); return; }
  try { response.writeHead(200,{'Content-Type':types[file],'Cache-Control':'no-store'}); response.end(await readFile(join(webRoot,file))); }
  catch { response.writeHead(500); response.end('Preview unavailable'); }
});
server.listen(0,'127.0.0.1',() => console.log(`Open http://127.0.0.1:${server.address().port} — Ctrl+C to stop`));
