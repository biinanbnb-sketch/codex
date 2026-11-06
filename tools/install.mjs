import {access,cp,mkdir,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {loadSettings} from './config.mjs';
import {root} from './prepare.mjs';

if (process.platform !== 'darwin') throw new Error('安装需要 macOS');
const {app} = await loadSettings(root);
const name = `${app.displayName}.app`;
const source = join(root,'dist',name);
await access(source);
execFileSync('/usr/bin/codesign',['--verify','--deep','--strict',source],{stdio:'inherit'});
const destinationDirectory = join(homedir(),'Applications');
await mkdir(destinationDirectory,{recursive:true});
const destination = join(destinationDirectory,name);
// A matching filename must never cause replacement of another application.
let exists = false;
try { await access(destination); exists = true; } catch (error) { if(error.code!=='ENOENT') throw error; }
if (exists) {
  const identifier = execFileSync('/usr/libexec/PlistBuddy',['-c','Print :CFBundleIdentifier',join(destination,'Contents/Info.plist')],{encoding:'utf8'}).trim();
  if (identifier !== app.bundleIdentifier) throw new Error('目标位置有另一款应用；请先修改 displayName。安装未覆盖任何应用。');
  const backup = destination + '.backup-' + new Date().toISOString().replaceAll(':','-');
  await rename(destination,backup);
  console.log(`Previous launcher kept at: ${backup}`);
}
await cp(source,destination,{recursive:true,errorOnExist:true,force:false});
console.log(`Installed: ${destination}`);
