import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {loadSettings} from './config.mjs';
import {buildInjection} from '../launcher/payload.mjs';

export const root = dirname(dirname(fileURLToPath(import.meta.url)));
export const webRoot = join(root,'.build','web');

export async function prepare() {
  const {app,splash} = await loadSettings(root);
  await mkdir(webRoot,{recursive:true});
  await copyFile(join(root,'src/codex-splash.js'),join(webRoot,'codex-splash.js'));
  await writeFile(join(webRoot,'splash.config.json'),JSON.stringify(splash,null,2)+'\n');
  const config = JSON.stringify(splash).replaceAll('<','\\u003c');
  const template = await readFile(join(root,'web/preview.template.html'),'utf8');
  await writeFile(join(webRoot,'preview.html'),template.replace('/* SPLASH_CONFIG */{}',config));
  await writeFile(join(webRoot,'smoke-host.html'),await readFile(join(root,'web/smoke-host.html')));
  const source = await buildInjection(pathToFileURL(webRoot + '/'));
  await writeFile(join(webRoot,'injection.js'),source);
  return {app,splash,webRoot};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const {webRoot} = await prepare();
  console.log(`Preview: ${join(webRoot,'preview.html')}`);
}
