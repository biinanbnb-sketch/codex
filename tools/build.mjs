import {mkdir,readFile,writeFile,copyFile,cp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {prepare,root} from './prepare.mjs';

if (process.platform !== 'darwin') throw new Error('macOS 启动器需要在 macOS 上构建；其他平台可以使用 npm run preview');
const {app,splash,webRoot} = await prepare();
const bundle = join(root,'dist',`${app.displayName}.app`);
// Delete only this generated bundle, never an installed or official application.
await rm(bundle,{recursive:true,force:true});
const resources = join(bundle,'Contents/Resources');
const binary = join(bundle,'Contents/MacOS/CodexSplashLauncher');
await mkdir(resources,{recursive:true});
await mkdir(join(bundle,'Contents/MacOS'),{recursive:true});
await mkdir(join(root,'.build/module-cache'),{recursive:true});
execFileSync('/usr/bin/xcrun',['swiftc','-O','-module-cache-path',join(root,'.build/module-cache'),join(root,'native/Launcher.swift'),'-o',binary,'-framework','AppKit','-framework','WebKit'],{stdio:'inherit'});
for (const file of ['codex-splash.js','splash.config.json','injection.js','preview.html','smoke-host.html']) await copyFile(join(webRoot,file),join(resources,file));
for (const file of ['run.mjs','payload.mjs','cdp.mjs']) await copyFile(join(root,'launcher',file),join(resources,file));
const iconset = join(root,'.build/AppIcon.iconset');
await mkdir(iconset,{recursive:true});
execFileSync('/usr/bin/xcrun',['swift',join(root,'tools/make-icon.swift'),iconset],{stdio:'inherit'});
execFileSync('/usr/bin/iconutil',['-c','icns',iconset,'-o',join(resources,'AppIcon.icns')],{stdio:'inherit'});
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const pairs = {
  CFBundleExecutable:'CodexSplashLauncher',CFBundleIdentifier:app.bundleIdentifier,
  CFBundleName:app.displayName,CFBundleDisplayName:app.displayName,CFBundleIconFile:'AppIcon.icns',
  CFBundlePackageType:'APPL',CFBundleShortVersionString:app.version,CFBundleVersion:'1',LSMinimumSystemVersion:'13.0'
};
await writeFile(join(bundle,'Contents/Info.plist'),'<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "https://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>\n'+Object.entries(pairs).map(([key,value])=>`<key>${key}</key><string>${escape(value)}</string>`).join('\n')+'\n<key>LSUIElement</key><true/><key>NSHighResolutionCapable</key><true/>\n</dict></plist>\n');
execFileSync('/usr/bin/codesign',['--force','--sign','-',bundle],{stdio:'inherit'});
execFileSync('/usr/bin/codesign',['--verify','--deep','--strict',bundle],{stdio:'inherit'});
console.log(`Built: ${bundle}`);
