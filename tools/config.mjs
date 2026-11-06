import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

export function merge(base, override) {
  const result = {...base};
  for (const [key, value] of Object.entries(override)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('配置含有无效字段');
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? merge(base[key] || {}, value) : value;
  }
  return result;
}

export function validateSplash(config) {
  const fields = ['name','nameEn','user','brand','subtitle','welcomePrefix','welcomeEnPrefix','modeText','modeEn','operatorLabel','operatorBadge','welcomeBadge','promptHost','promptPath','promptMode'];
  const allowed = new Set([...fields,'sound','hold','stats','checks','permissions','authTitles','theme','logMessages']);
  for (const key of Object.keys(config)) if (!allowed.has(key)) throw new Error(`未知动画配置字段：${key}`);
  for (const key of fields) if (typeof config[key] !== 'string' || config[key].length > 100) throw new Error(`${key} 必须为不超过100字符的字符串`);
  if (!/^[A-Za-z0-9 ._-]{1,16}$/.test(config.brand)) throw new Error('brand 必须为1–16位英文字母、数字、空格或 ._-');
  if (typeof config.sound !== 'boolean') throw new Error('sound 必须为 true 或 false');
  if (!Number.isInteger(config.hold) || config.hold < 300 || config.hold > 10000) throw new Error('hold 必须为300–10000毫秒的整数');
  for (const key of ['stats','checks','permissions']) {
    const rows = config[key];
    if (!Array.isArray(rows) || (key === 'stats' ? rows.length > 6 : rows.length !== 5)
      || !rows.every(row => Array.isArray(row) && row.length === 2 && row.every(value => typeof value === 'string' && value.length <= 60))) {
      throw new Error(`${key} 必须为两列文字数组；checks/permissions各5行，stats最多6行`);
    }
  }
  for (const key of ['request','verify','success','grant']) {
    const pair = config.authTitles?.[key];
    if (!Array.isArray(pair) || pair.length !== 2 || !pair.every(value => typeof value === 'string' && value.length <= 100)) throw new Error(`authTitles.${key} 必须是两段文字`);
  }
  for (const [key, value] of Object.entries(config.theme || {})) {
    if (!['accent','background','foreground','success','warning'].includes(key) || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`theme.${key} 必须是 #RRGGBB 颜色`);
  }
  if (!Array.isArray(config.logMessages) || config.logMessages.length !== 23 || !config.logMessages.every(value => typeof value === 'string' && value.length <= 240)) throw new Error('logMessages 必须保留23条文字，每条最多240字符');
  return config;
}

export function validateApp(config) {
  if (typeof config.displayName !== 'string' || !config.displayName.trim() || /[/\\\x00-\x1f]/.test(config.displayName) || ['.','..'].includes(config.displayName)) throw new Error('displayName 不是有效应用名称');
  if (!/^[a-zA-Z][a-zA-Z0-9.-]+$/.test(config.bundleIdentifier) || config.bundleIdentifier === 'com.openai.codex') throw new Error('启动器需要独立的 bundleIdentifier，不能使用官方应用标识');
  if (!/^\d+\.\d+\.\d+$/.test(config.version)) throw new Error('version 需要形如 1.0.0');
  return config;
}

async function load(directory, name, validate) {
  const base = JSON.parse(await readFile(join(directory, `${name}.json`), 'utf8'));
  let local = {};
  try { local = JSON.parse(await readFile(join(directory, `${name}.local.json`), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return validate(merge(base, local));
}

export async function loadSettings(root) {
  const directory = join(root, 'config');
  const [splash, app] = await Promise.all([load(directory,'splash',validateSplash),load(directory,'app',validateApp)]);
  return {splash, app};
}
