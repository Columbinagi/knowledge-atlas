import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { parseKnowledgeDir, parseChangelogMd } from './lib-md.mjs';

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const isSlug = value => typeof value === 'string' && SLUG.test(value);
const MAX_ATLASES = 5;
const MAX_BYTES = 20 * 1024 * 1024;

export function atlasContentDir(contentDir, entry) {
  if (!entry || !isSlug(entry.id) || entry.contentRoot !== '图鉴/' + entry.id) {
    throw new Error('图鉴内容目录必须为 图鉴/<id>');
  }
  const root = fs.realpathSync(contentDir);
  const target = fs.realpathSync(path.join(root, entry.contentRoot));
  const relative = path.relative(root, target);
  if (!relative || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
    throw new Error('图鉴内容目录越出 content：' + entry.id);
  }
  return target;
}

function rejectLinkedFiles(dir) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name), stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) throw new Error('图鉴内不允许符号链接：' + name);
    if (stat.isDirectory()) rejectLinkedFiles(file);
  }
}

export function readAtlasRegistry(contentDir) {
  const file = path.join(contentDir, '图鉴清单.json');
  const registry = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (registry.schemaVersion !== 1 || !isSlug(registry.collectionId || '')) {
    throw new Error('图鉴清单 schemaVersion / collectionId 无效');
  }
  if (!Number.isInteger(registry.maxAtlases) || registry.maxAtlases < 1 || registry.maxAtlases > MAX_ATLASES ||
      !Number.isInteger(registry.maxBytes) || registry.maxBytes < 1 || registry.maxBytes > MAX_BYTES) {
    throw new Error('图鉴上限必须为1—5部，文件上限必须为1—20971520字节');
  }
  if (!Array.isArray(registry.atlases) || !registry.atlases.length || registry.atlases.length > registry.maxAtlases) {
    throw new Error('图鉴数量为空或超过上限');
  }
  const ids = new Set(), dirs = new Set(), codes = new Set();
  for (const entry of registry.atlases) {
    if (!entry || !isSlug(entry.id || '') || ids.has(entry.id)) throw new Error('图鉴id无效或重复');
    if (!/^#[0-9a-f]{6}$/i.test(entry.color || '') || !isSlug(entry.mark || '')) {
      throw new Error('图鉴身份色或图形键无效：' + entry.id);
    }
    /* 2026-11-07：图鉴代号是卡片 ID 的第一段（如 1-06-015），注册时定死、只增不改、不复用。
       1—99 足够五部；用整数而不是 slug，是为了 ID 可排序、可跨项目对齐。 */
    if (!Number.isInteger(entry.code) || entry.code < 1 || entry.code > 99) {
      throw new Error('图鉴代号必须为1—99的整数：' + entry.id);
    }
    if (codes.has(entry.code)) throw new Error('图鉴代号重复：' + entry.code);
    codes.add(entry.code);
    const dir = atlasContentDir(contentDir, entry);
    rejectLinkedFiles(dir);
    const key = process.platform === 'win32' ? dir.toLowerCase() : dir;
    if (dirs.has(key)) throw new Error('图鉴内容目录重复：' + entry.id);
    ids.add(entry.id); dirs.add(key);
  }
  if (!ids.has(registry.defaultAtlas)) throw new Error('默认图鉴不在清单内');
  return registry;
}

export function selectAtlas(registry, id, { requireExplicit = false } = {}) {
  if (!id && requireExplicit && registry.atlases.length > 1) {
    throw new Error('多图鉴写操作必须指定 --atlas=<id>');
  }
  const wanted = id || registry.defaultAtlas;
  const entry = registry.atlases.find(item => item.id === wanted);
  if (!entry) throw new Error('图鉴不存在：' + wanted);
  return entry;
}

export function readAtlasConfig(contentDir, entry) {
  const file = path.join(atlasContentDir(contentDir, entry), '站点配置.js');
  const raw = fs.readFileSync(file, 'utf8');
  const a = raw.indexOf('↓↓↓↓↓↓'), b = raw.indexOf('↑↑↑↑↑↑');
  if (a < 0 || b <= a) throw new Error(entry.id + ' 站点配置缺少数据区标记');
  const start = raw.indexOf('\n', a) + 1;
  const end = raw.lastIndexOf('\n/*', b) + 1;
  if (!start || end <= start) throw new Error(entry.id + ' 数据区标记顺序异常');
  const context = vm.createContext({});
  vm.runInContext(raw.slice(start, end), context, { filename: file, timeout: 1000 });
  const config = {};
  for (const key of ['SITE_META', 'TOPICS', 'DEFAULT_TOPIC', 'CATEGORIES']) config[key] = context[key];
  if (!config.SITE_META || !Array.isArray(config.TOPICS) || !Array.isArray(config.CATEGORIES) ||
      !config.TOPICS.some(topic => topic.id === config.DEFAULT_TOPIC)) {
    throw new Error(entry.id + ' 配置不完整或默认主题不存在');
  }
  /* 2026-11-07：主题代号是卡片 ID 的第二段（两位数字，01—99），写在 TOPICS 里跟着主题走。
     必须有、且唯一——以后重排主题顺序也不会改变已经发出去的 ID。 */
  const topicCodes = new Set();
  for (const topic of config.TOPICS) {
    if (!/^\d{2}$/.test(topic.code || '') || topicCodes.has(topic.code)) {
      throw new Error(entry.id + ' 主题代号必须为两位数字且唯一：' + (topic.id || '?'));
    }
    topicCodes.add(topic.code);
  }
  return JSON.parse(JSON.stringify(config));
}

export function loadAtlasLibrary(contentDir) {
  const registry = readAtlasRegistry(contentDir);
  const atlases = registry.atlases.map(entry => {
    const dir = atlasContentDir(contentDir, entry);
    const config = readAtlasConfig(contentDir, entry);
    /* 2026-11-07：卡号在各主题内重复，读库时按「主题声明序 + 卡号」排，
       保证词条数组的顺序与站点目录顺序一致，不受文件名遍历顺序影响。
       主题以分类为准（与引擎 topicOfTerm 同口径）。 */
    const topicOrder = config.TOPICS.map(topic => topic.id);
    const topicOf = term => {
      const cat = config.CATEGORIES.find(item => item.id === term.cat);
      return cat ? cat.topic : (term.topic || config.DEFAULT_TOPIC);
    };
    const log = name => {
      const file = path.join(dir, name);
      return fs.existsSync(file) ? parseChangelogMd(fs.readFileSync(file, 'utf8')) : null;
    };
    const english = parseKnowledgeDir(path.join(dir, '知识库-en'), { optional: true, allowStageLess: true, topicOrder, topicOf });
    return {
      id: entry.id, code: entry.code, color: entry.color, mark: entry.mark,
      ...config,
      KB_TERMS: parseKnowledgeDir(path.join(dir, '知识库'), { topicOrder, topicOf }),
      KB_TERMS_EN: english.length ? english : null,
      CHANGELOG: log('更新日志.md'),
      CHANGELOG_EN: log('更新日志-en.md')
    };
  });
  return {
    schemaVersion: registry.schemaVersion, collectionId: registry.collectionId,
    defaultAtlas: registry.defaultAtlas, maxAtlases: registry.maxAtlases,
    maxBytes: registry.maxBytes, atlases
  };
}

export function serializeAtlasLibrary(library) {
  const json = JSON.stringify(library).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return 'var ATLAS_LIBRARY = ' + json + ';\n';
}
