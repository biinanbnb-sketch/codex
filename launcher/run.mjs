import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import {realpath, readFile} from 'node:fs/promises';
import {join, sep} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {buildInjection} from './payload.mjs';
import {connect, localSocket, mainWindow} from './cdp.mjs';

const exec = promisify(execFile);
async function command(file, args) {
  return (await exec(file, args, {timeout:15000, maxBuffer:1024*1024})).stdout.trim();
}
async function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}
async function verifyListener(port, bundle) {
  const listing = await command('/usr/sbin/lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fpn']);
  const pids = [...listing.matchAll(/^p(\d+)$/gm)].map(match => match[1]);
  const addresses = [...listing.matchAll(/^n(.+)$/gm)].map(match => match[1]);
  if (!pids.length || !addresses.length || addresses.some(address => address !== `127.0.0.1:${port}`)) {
    throw new Error('调试端口未限定在本机，停止接入');
  }
  for (const pid of new Set(pids)) {
    if (Number(await command('/bin/ps', ['-p', pid, '-o', 'uid='])) !== process.getuid())
      throw new Error('端口所属用户不匹配');
    const listing = await command('/usr/sbin/lsof', ['-a', '-p', pid, '-d', 'txt', '-Fn']);
    const executable = listing.split('\n').find(line => line.startsWith('n'))?.slice(1);
    if (!executable || !(await realpath(executable)).startsWith(bundle + sep))
      throw new Error('端口不属于官方应用');
  }
}
async function main() {
  const index = process.argv.indexOf('--bundle');
  if (index < 0 || !process.argv[index + 1]) throw new Error('请从 codex 应用打开');
  const bundle = await realpath(process.argv[index + 1]);
  await command('/usr/bin/codesign', ['--verify', '--deep', '--strict=symlinks', '-R', '=anchor apple generic and certificate leaf[subject.OU] = "2DC432GLL2"', bundle]);
  const identifier = await command('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleIdentifier', join(bundle, 'Contents/Info.plist')]);
  if (identifier !== 'com.openai.codex') throw new Error('官方应用标识不匹配');
  const source = await buildInjection(new URL('./', import.meta.url));
  const config = JSON.parse(await readFile(new URL('splash.config.json', import.meta.url), 'utf8'));
  const extra = config.sound ? ['--autoplay-policy=no-user-gesture-required'] : [];
  const port = await freePort();
  await command('/usr/bin/open', ['-n', '-a', bundle, '--args', '--remote-debugging-address=127.0.0.1', `--remote-debugging-port=${port}`, ...extra]);
  const deadline = Date.now() + 45000;
  let lastError = '主窗口未就绪';
  while (Date.now() < deadline) {
    let client;
    try {
      await verifyListener(port, bundle);
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, {signal:AbortSignal.timeout(1500), redirect:'error'});
      if (!response.ok) throw new Error('主窗口列表未就绪');
      const targets = await response.json();
      if (!Array.isArray(targets)) throw new Error('主窗口列表无效');
      const target = targets.find(mainWindow);
      if (!target) throw new Error('尚未找到主窗口');
      client = await connect(localSocket(target.webSocketDebuggerUrl, port));
      const result = await client.call('Runtime.evaluate', {expression:source, returnByValue:true, awaitPromise:true});
      if (result.exceptionDetails) throw new Error('动画接入异常');
      if (!result.result?.value?.installed) throw new Error(result.result?.value?.error || '等待可见主窗口');
      const status = await client.call('Runtime.evaluate', {expression:'window.__codexSplashState?.phase', returnByValue:true});
      if (['playing', 'complete'].includes(status.result?.value)) {
        console.log('启动动画已开始，辅助进程退出。');
        return;
      }
      throw new Error('动画未能开始');
    } catch (error) { lastError = error.message; }
    finally { client?.close(); }
    await delay(250);
  }
  throw new Error('此版本接入失败：' + lastError + '。原应用没有修改，可完全退出后从官方图标打开。');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
