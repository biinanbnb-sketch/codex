import {execFileSync} from 'node:child_process';
import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {root,prepare} from './prepare.mjs';

for (const directory of ['src','launcher','tools','tests']) {
  for (const file of await readdir(join(root,directory))) {
    if (/\.(mjs|js)$/.test(file)) execFileSync(process.execPath,['--check',join(root,directory,file)],{stdio:'inherit'});
  }
}
const {webRoot} = await prepare();
execFileSync(process.execPath,['--check',join(webRoot,'injection.js')],{stdio:'inherit'});
console.log('Syntax, configuration, and generated payload checks passed.');
