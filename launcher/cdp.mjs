// A small CDP client using Node's built-in WebSocket. No browser profile access.
export function mainWindow(target) {
  if (target?.type !== 'page') return false;
  let url;
  try { url = new URL(target.url); } catch { return false; }
  if (url.origin !== 'null' && url.protocol !== 'app:') return false;
  if (url.protocol !== 'app:' || url.hostname !== '-' || url.pathname !== '/index.html') return false;
  return !/(?:^|[\/_-])(avatar|mini|quick-chat|detached-window|notification|popover)(?:[\/_-]|$)/i.test(url.searchParams.get('initialRoute') || '/');
}

export function localSocket(value, port) {
  const url = new URL(value);
  const expected = `127.0.0.1:${port}`;
  if (url.protocol !== 'ws:' || url.host !== expected || url.username || url.password || !/^\/devtools\/page\/[^/]+$/.test(url.pathname)) throw new Error('拒绝连接本次本机页面以外的调试地址');
  return url.href;
}

class CdpClient {
  #socket;
  #waiting = new Map();
  #sequence = 0;
  #closed = false;

  constructor(socket) {
    this.#socket = socket;
    socket.addEventListener('message', event => {
      let reply;
      try { reply = JSON.parse(event.data); } catch { return; }
      const job = this.#waiting.get(reply.id);
      if (!job) return;
      this.#waiting.delete(reply.id);
      clearTimeout(job.timer);
      reply.error ? job.reject(new Error(reply.error.message || 'CDP请求失败')) : job.resolve(reply.result);
    });
    socket.addEventListener('close', () => this.#disconnect());
    socket.addEventListener('error', () => this.#disconnect());
  }

  #disconnect() {
    this.#closed = true;
    for (const job of this.#waiting.values()) {
      clearTimeout(job.timer);
      job.reject(new Error('调试连接已断开'));
    }
    this.#waiting.clear();
  }

  call(method, params = {}, timeout = 5000) {
    if (this.#closed) return Promise.reject(new Error('调试连接已断开'));
    return new Promise((resolve, reject) => {
      const id = ++this.#sequence;
      const timer = setTimeout(() => { this.#waiting.delete(id); reject(new Error(`${method} 超时`)); }, timeout);
      this.#waiting.set(id, {resolve,reject,timer});
      try { this.#socket.send(JSON.stringify({id,method,params})); }
      catch (error) { clearTimeout(timer); this.#waiting.delete(id); reject(error); }
    });
  }

  close() { this.#disconnect(); this.#socket.close(); }
}

export async function connect(address, Socket = WebSocket) {
  const socket = new Socket(address);
  const client = new CdpClient(socket);
  await new Promise((resolve, reject) => {
    const fail = () => { clearTimeout(timer); reject(new Error('无法打开调试连接')); };
    const timer = setTimeout(() => { reject(new Error('调试连接超时')); client.close(); }, 5000);
    socket.addEventListener('error', fail, {once:true});
    socket.addEventListener('open', () => { clearTimeout(timer); socket.removeEventListener('error', fail); resolve(); }, {once:true});
  });
  return client;
}
