/* ============================================================
   engineering/重排编号.mjs —— 把主线编号重新摊开为 010 / 020 / 030 …
   用法：node engineering/重排编号.mjs --atlas=<id>  选择图鉴执行（多部时包括 --dry 都必须显式选择）
         node engineering/重排编号.mjs --dry      只预览，不动文件
         node engineering/重排编号.mjs --step=10  指定步长（默认 5）
   为什么需要它：编号是「声明序 = 学习主线」，为便于插卡而留了步长的空隙。
   空隙总有用尽的一天，那时用本脚本一键恢复空隙——**保序**，且编号不显示、互链走 id，
   所以重排不改变任何内容与引用关系，只改文件名前缀、卡内 `## N.`，以及 `词条清单.md` 的
   编号与「卡片 ID」列（2026-11-07 起；不改清单等于把收尾甩回给人，跑校验必红）。
   步长口径（2026-10-02 起，见 content/图鉴/<图鉴id>/词条清单.md §一）：**基础步长 5**，容量 = 三位数 ÷ 5 = 200 项；
   现有编号多是 10 的倍数，属 5 的合法子集，故不传参数的老用法结果不变。
   英文分册镜像中文分册的编号（按 id 对齐），不单独排序。
   ============================================================ */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseKnowledgeDir, entryToMd } from './lib-md.mjs';
import { readAtlasRegistry, readAtlasConfig, atlasContentDir, selectAtlas } from './lib-atlas.mjs';
import { readManifest, saveManifest, applyNumbers, reservedConflicts, cardIdOf } from './lib-manifest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = path.join(ROOT, 'content');
/* 面向命令行的失败一律一行 ✗（不甩调用栈）：图鉴选错/清单缺失是最常见的误操作 */
const die = msg => { console.log('✗ ' + msg); process.exit(1); };
let registry;
try { registry = readAtlasRegistry(contentRoot); }
catch (e){ die('图鉴清单读取失败：' + e.message); }
const atlasArgs = process.argv.slice(2).filter(a => a.startsWith('--atlas='));
if (atlasArgs.length > 1 || atlasArgs.some(a => !a.slice(8))) die('--atlas 必须指定一个非空 id');
let atlas;
try { atlas = selectAtlas(registry, atlasArgs[0]?.slice(8), { requireExplicit: true }); }
catch (e){ die(e.message); }
const CONTENT_DIR = atlasContentDir(contentRoot, atlas);
const config = readAtlasConfig(contentRoot, atlas);
/* 2026-11-07：主题以分类为准（与引擎 topicOfTerm 同口径），重排按有效主题分组 */
const topicOf = t => {
  const c = config.CATEGORIES.find(x => x.id === t.cat);
  return c ? c.topic : (t.topic || config.DEFAULT_TOPIC);
};
const DIRS = [path.join(CONTENT_DIR, '知识库'), path.join(CONTENT_DIR, '知识库-en')];
function assertInside(file){
  const rel = path.relative(CONTENT_DIR, fs.realpathSync(file));
  if (!rel || rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) {
    die('路径越出所选图鉴：' + file);
  }
}
DIRS.filter(dir => fs.existsSync(dir)).forEach(assertInside);
const dry = process.argv.includes('--dry');
/* 步长：默认 5（2026-10-02 口径，见 content/图鉴/<图鉴id>/词条清单.md §一），可用 --step=N 覆盖；
   现有编号多为 10 的倍数，仍属 5 的合法子集，不重排时一条都不用改 */
const stepArg = process.argv.find(a => a.startsWith('--step='));
const STEP = stepArg ? Number(stepArg.slice(7)) : 5;
if (!Number.isSafeInteger(STEP) || STEP <= 0) die('--step 必须为正整数');

const TOPIC_ORDER = config.TOPICS.map(t => t.id);
const cn = parseKnowledgeDir(DIRS[0], { keepMeta: true, topicOrder: TOPIC_ORDER, topicOf });
/* 2026-11-07：编号改为「每主题一个三位数容器」，重排必须**按主题分别压实**——
   每个主题从头 005/010/015…，跨主题允许重号。全域压实会把不同主题的卡挤进同一段，
   主题边界一乱，卡片 ID 的第二段就失去意义。 */
const numOf = new Map();                /* 中文分册定编号；英文分册按 id 镜像同一编号 */
const counters = {};
cn.forEach(t => {
  if (numOf.has(t.id)) die('本图鉴中文 id 重复：' + t.id);
  const k = t.topic || '';
  counters[k] = (counters[k] || 0) + 1;
  const seq = counters[k] * STEP;
  if (!Number.isSafeInteger(seq)) die('重排编号超出安全整数范围');
  numOf.set(t.id, seq);
});

/* ---- 先算出全部改动，确认无冲突再落盘 ---- */
const plans = DIRS.map((dir, k) => {
  const terms = k === 0 ? cn
    : parseKnowledgeDir(dir, { optional: true, allowStageLess: true, keepMeta: true, topicOrder: TOPIC_ORDER, topicOf });
  const ids = new Set();
  return terms.map(t => {
    if (!/^[a-z0-9-]+$/.test(t.id || '') || ids.has(t.id)) die('本图鉴 id 无效或重复：' + t.id);
    ids.add(t.id);
    if (!numOf.has(t.id)) die('英文卡缺少同 id 中文卡：' + t.id);
    const seq = numOf.get(t.id);
    const from = path.join(dir, t.__file);
    assertInside(from);
    const to = path.join(path.dirname(from), String(seq).padStart(3, '0') + '-' + t.id + '.md');
    return { term: t, seq: seq, from: from, to: to };
  });
});
const all = plans.flat();
const changes = all.filter(p => p.from !== p.to);
const sources = new Set(all.map(p => p.from));
const targets = new Set();
for (const p of changes){
  const key = p.to.toLowerCase();
  if (targets.has(key)) die('目标文件名冲突：' + path.relative(ROOT, p.to));
  targets.add(key);
  if (fs.existsSync(p.to)) {
    assertInside(p.to);
    if (!sources.has(p.to)) die('目标文件已存在且不属于本次重排：' + path.relative(ROOT, p.to));
  }
}

/* ---- 清单同步（2026-11-07 P2 修）：重排只改文件名与卡内编号，清单不跟着改，
        跑 校验.mjs 必报「编号不一致」。清单里「主题」列写的是主题名、第七列是卡片 ID，
        两者都由这里一并刷新；待写行预留的卡号若与压实结果撞车，落盘前就拒绝。 ---- */
const manifestFile = path.join(CONTENT_DIR, '词条清单.md');
if (!fs.existsSync(manifestFile)) die('缺 ' + path.relative(ROOT, manifestFile) + '（内容线的唯一选题依据），拒绝重排');
const manifest = readManifest(manifestFile);
const updates = new Map();
for (const p of all){
  const topic = config.TOPICS.find(t => t.id === p.term.topic);
  if (!topic) die('主题不在 TOPICS 里：' + p.term.id + '（' + (p.term.topic || '空') + '）');
  const num = String(p.seq).padStart(3, '0');    /* 清单编号与文件名同宽，卡片 ID 的第三段也用它 */
  updates.set(p.term.id, { num, code: cardIdOf(atlas.code, topic.code, num), topic: topic.name });
}
const clash = reservedConflicts(manifest, updates, { topics: config.TOPICS });
if (clash.length) die('清单与压实结果冲突，未改动任何文件：\n   - ' + clash.join('\n   - '));

console.log('图鉴 ' + atlas.id + '：中文 ' + cn.length + ' 条；需要改动的卡片：' + changes.length + ' 张');
changes.slice(0, 80).forEach(p => console.log('   ' + path.relative(ROOT, p.from) + '\n   → ' + path.relative(ROOT, p.to)));
if (changes.length > 80) console.log('其余 ' + (changes.length - 80) + ' 张省略展示，仍在本次计划内。');
/* 清单里的编号 / 卡片 ID 与卡片对齐——即便卡片文件名已经对齐，清单也可能是旧的（缺第七列、
   主题列写成 id），所以「无需重排」时仍要同步一次清单，不能让校验红着收工 */
const syncManifest = () => {
  const n = applyNumbers(manifest, updates, { topics: config.TOPICS });
  if (n) saveManifest(manifest);
  console.log('词条清单：' + (n ? '同步 ' + n + ' 行（编号与卡片 ID）' : '已与卡片一致，无需改动'));
};
if (!changes.length){ console.log('编号已按步长 ' + STEP + ' 对齐，无需重排。'); syncManifest(); process.exit(0); }
if (dry){ console.log('\n（--dry 预览模式，未改动任何文件）'); process.exit(0); }

/* ---- 落盘：先写新文件，再删旧文件（中途失败也不丢内容） ---- */
for (const p of changes){
  fs.writeFileSync(p.to, entryToMd(p.term, p.seq), 'utf8');
  fs.unlinkSync(p.from);
}
syncManifest();
console.log('\n已重排 ' + changes.length + ' 张卡片。接着跑：\n   node engineering/拼合.mjs\n   node engineering/校验.mjs');
