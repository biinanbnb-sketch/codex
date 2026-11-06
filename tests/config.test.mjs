import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadSettings,merge,validateSplash,validateApp} from '../tools/config.mjs';

const settings = JSON.parse(await readFile(new URL('../config/splash.json',import.meta.url),'utf8'));
test('invalid display content is rejected before building', () => {
  for (const override of [{sound:'false'},{hold:-1},{hold:10001},{brand:'过长或中文'},{permissions:[]},{logMessages:[]},{theme:{accent:'red'}},{nam:'typo'}]) {
    assert.throws(()=>validateSplash({...settings,...override}));
  }
  assert.throws(()=>validateApp({displayName:'../codex',bundleIdentifier:'local.test',version:'1.0.0'}));
  assert.throws(()=>validateApp({displayName:'codex',bundleIdentifier:'com.openai.codex',version:'1.0.0'}));
});

test('local overrides preserve unrelated defaults, replace arrays, and leave shared files untouched',async()=>{
  const root=await mkdtemp(join(tmpdir(),'codex-config-'));
  try {
    await mkdir(join(root,'config'));
    await writeFile(join(root,'config/splash.json'),JSON.stringify(settings));
    await writeFile(join(root,'config/app.json'),JSON.stringify({displayName:'codex',bundleIdentifier:'local.test.launcher',version:'1.0.0'}));
    await writeFile(join(root,'config/splash.local.json'),JSON.stringify({name:'Test User',theme:{accent:'#abcdef'},stats:[['Label','Value']]}));
    const {splash}=await loadSettings(root);
    assert.equal(splash.name,'Test User');
    assert.equal(splash.theme.accent,'#abcdef');
    assert.equal(splash.theme.background,settings.theme.background);
    assert.deepEqual(splash.stats,[['Label','Value']]);
    assert.equal(JSON.parse(await readFile(join(root,'config/splash.json'),'utf8')).name,settings.name);
    assert.throws(()=>merge({},JSON.parse('{"__proto__":{"polluted":true}}')));
  } finally { await rm(root,{recursive:true,force:true}); }
});
