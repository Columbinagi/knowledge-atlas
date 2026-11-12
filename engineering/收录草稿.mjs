/* ============================================================
   engineering/收录草稿.mjs —— 把「审阅通过」的卡片草稿收录进知识库，并重建站点
   用法：node engineering/收录草稿.mjs <草稿文件> [--atlas=<id>] [--en] [--num=NNN] [--dry]
   多部图鉴时含 --dry 都必须显式选择；单部可默认。草稿实际路径必须在所选根的 草稿/ 内。
   例：  node engineering/收录草稿.mjs content/图鉴/nev/草稿/motor-controller-mcu.md --atlas=nev
         node engineering/收录草稿.mjs content/图鉴/nev/草稿/motor-controller-mcu.md --atlas=nev --num=165   （插到 160 与 170 之间）
         node engineering/收录草稿.mjs content/图鉴/nev/草稿/pmsm-en.md --atlas=nev --en                     （英文译文卡）
   做四件事：① 解析并校验草稿 ② 分配主线编号 ③ 写入 知识库/<主题名>/ 并删除草稿 ④ 重建站点
   收尾仍要跑 `node engineering/校验.mjs`：0 错误才算收录完成（本脚本只做文件搬运与编号，不做内容判断）。
   草稿区（content/图鉴/<图鉴id>/草稿/）不被拼合读取，所以没审阅通过的草稿不会污染站点。
   ============================================================ */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { parseKnowledgeDir, entryToMd } from './lib-md.mjs';
import { readAtlasRegistry, atlasContentDir, selectAtlas, readAtlasConfig } from './lib-atlas.mjs';
import { readManifest, saveManifest, applyRow, nextFreeSeq, cardIdOf } from './lib-manifest.mjs';
import { makeTempDir } from './lib-temp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STEP = 5;                                    /* 编号步长 5（2026-10-02 口径，容量 99→200，与 内容规范 §5 / 词条清单 §一 一致）：留空隙，方便日后插卡 */

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const en = args.includes('--en');
const numArg = (args.find(a => a.startsWith('--num=')) || '').slice(6);
const draftArg = args.find(a => !a.startsWith('--'));
const fail = msg => { console.log('✗ ' + msg); process.exit(1); };

const contentRoot = path.join(ROOT, 'content');
let registry;
try { registry = readAtlasRegistry(contentRoot); }
catch (e){ fail('图鉴清单读取失败：' + e.message); }
const atlasArgs = args.filter(a => a.startsWith('--atlas='));
if (atlasArgs.length > 1 || atlasArgs.some(a => !a.slice(8))) fail('--atlas 必须指定一个非空 id');
let atlas;
/* 多图鉴时忘写 --atlas 是最常见的误操作：给一行明确的 ✗，不要甩调用栈 */
try { atlas = selectAtlas(registry, atlasArgs[0]?.slice(8), { requireExplicit: true }); }
catch (e){ fail(e.message); }
const CONTENT_DIR = atlasContentDir(contentRoot, atlas);
function assertInside(root, file){
  const rel = path.relative(root, file);
  if (!rel || rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) {
    fail('路径不属于所选图鉴目录：' + file);
  }
}
if (!draftArg) fail('用法：node engineering/收录草稿.mjs <草稿文件> [--atlas=<id>] [--en] [--num=NNN] [--dry]');
const draftPath = path.isAbsolute(draftArg) ? draftArg : path.join(ROOT, draftArg);
if (!fs.existsSync(draftPath) || !fs.statSync(draftPath).isFile()) fail('草稿文件不存在：' + draftArg);
const draftRoot = fs.realpathSync(path.join(CONTENT_DIR, '草稿'));
assertInside(CONTENT_DIR, draftRoot);
const draft = fs.realpathSync(draftPath);
assertInside(draftRoot, draft);
if (path.extname(draft).toLowerCase() !== '.md') fail('草稿必须为 Markdown 文件');
const KB = path.join(CONTENT_DIR, en ? '知识库-en' : '知识库');
for (const name of ['知识库', '知识库-en']) {
  const dir = path.join(CONTENT_DIR, name);
  if (fs.existsSync(dir)) assertInside(CONTENT_DIR, fs.realpathSync(dir));
}

/* ---- 站点配置：仅使用所选图鉴的主题与分类 ---- */
const { TOPICS, CATEGORIES, DEFAULT_TOPIC } = readAtlasConfig(contentRoot, atlas);
/* 2026-11-07：主题以分类为准（与引擎 topicOfTerm 同口径），用于定「卡号属于哪个容器」 */
const topicOf = t => {
  const c = CATEGORIES.find(x => x.id === t.cat);
  return c ? c.topic : (t.topic || DEFAULT_TOPIC);
};

/* ---- ① 解析并校验草稿（复制到临时目录，复用正式解析器，避免两套格式判断） ---- */
const tmp = makeTempDir('atlas-draft-');
let term = null, parseError = null;
try {
  fs.copyFileSync(draft, path.join(tmp, path.basename(draft)));
  const parsed = parseKnowledgeDir(tmp, { optional: true, allowStageLess: en, topicOf });
  if (parsed.length !== 1) throw new Error('一张草稿文件里应当只有一张卡片，实际解析出 ' + parsed.length + ' 张');
  term = parsed[0];
} catch (e){
  parseError = e;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (parseError) fail('草稿解析失败（格式不符契约）：' + parseError.message);

const problems = [];
if (!/^[a-z0-9-]+$/.test(term.id || '')) problems.push('id 只允许小写字母/数字/连字符，当前为 ' + term.id);
if (!term.name) problems.push('缺词条名');
if (!term.definition) problems.push('缺「是什么」（必填字段）');
if (!term.topic && !term.cat) problems.push('缺「主题」或「分类」，无法归属目录');

const cnTerms = parseKnowledgeDir(path.join(CONTENT_DIR, '知识库'), { keepMeta: true, topicOrder: TOPICS.map(t => t.id), topicOf });
const enTerms = parseKnowledgeDir(path.join(CONTENT_DIR, '知识库-en'),
  { optional: true, allowStageLess: true, keepMeta: true, topicOrder: TOPICS.map(t => t.id), topicOf });
if (en){
  if (!cnTerms.some(t => t.id === term.id)) problems.push('英文卡必须已有同 id 的中文卡：' + term.id);
} else if (cnTerms.some(t => t.id === term.id)){
  problems.push('id 与已收录词条撞车：' + term.id);
}
if (enTerms.some(t => t.id === term.id)) problems.push('该 id 的英文卡已存在：' + term.id);
if (problems.length) fail('草稿校验未通过：\n   - ' + problems.join('\n   - '));

/* ---- ② 分配卡号：每主题一个三位数容器（2026-11-07 起）——中文卡取「该主题现有最大卡号 + 步长」；
        英文卡镜像中文卡的卡号。跨主题允许重号，全项目唯一性由「图鉴代号-主题代号-卡号」保证 ---- */
function topicIdOf(t){
  let id = t.topic;
  if (!id && t.cat){
    const c = CATEGORIES.find(x => x.id === t.cat);
    id = c && c.topic;
  }
  if (!TOPICS.find(x => x.id === id)) fail('主题无法归属（topic=' + t.topic + ' cat=' + t.cat + '）——请检查 站点配置.js');
  return id;
}
const topicId = topicIdOf(term);
const topic = TOPICS.find(x => x.id === topicId);
const topicName = topic.name;
const topicTerms = cnTerms.filter(t => t.topic === topicId);
const seqs = topicTerms.map(t => t.__seq);

/* 词条清单：本图鉴的「唯一选题依据」。收录必须同步改写它——只搬卡片不改清单，
   跑 校验.mjs 会报「卡片不在清单里」，等于把收尾甩回给人（2026-11-07 P2 修）。 */
const manifestFile = path.join(CONTENT_DIR, '词条清单.md');
if (!fs.existsSync(manifestFile)) fail('缺 ' + path.relative(ROOT, manifestFile) + '（内容线的唯一选题依据），先补清单再收录');
let manifest;
try { manifest = readManifest(manifestFile); }
catch (e){ fail('词条清单读取失败：' + e.message); }
const manifestRow = manifest.rows.find(r => r.id === term.id) || null;
/* 同主题其它行的预留卡号也算「已占用」——清单 §一 的取号规则是「最小未占用」，预留号不能被顶掉 */
const reserved = manifest.rows
  .filter(r => r.topic === topicName && r.id !== term.id)
  .map(r => Number(r.num)).filter(Number.isSafeInteger);

let seq, seqNote = '';
if (en) seq = (cnTerms.find(t => t.id === term.id) || {}).__seq;
else if (numArg) seq = Number(numArg);
else if (manifestRow && /^\d{3,}$/.test(manifestRow.num)){
  seq = Number(manifestRow.num); seqNote = '（按清单预留号）';
} else {
  seq = nextFreeSeq([...seqs, ...reserved], { step: STEP });
  if (seq === null) fail('主题「' + topicName + '」卡号已用尽（001–999 按步长 ' + STEP + '），先跑 node engineering/重排编号.mjs');
}
if (!Number.isSafeInteger(seq) || seq <= 0) fail('编号无法确定（--num=NNN 需为正整数）');
if (en && numArg && Number(numArg) !== seq) fail('英文编号必须镜像中文：' + seq);
const occupied = (en ? enTerms : cnTerms).filter(t => t.topic === topicId).map(t => t.__seq);
if (occupied.includes(seq)) fail('编号 ' + seq + ' 已被主题「' + topicName + '」的其它卡片占用（换 --num=NNN，或先跑 重排编号）');
/* 卡号决定主题内顺序：给出落在哪两张卡之间，便于人工确认位置对不对 */
const lower = topicTerms.filter(t => t.__seq < seq).pop();
const upper = topicTerms.filter(t => t.__seq > seq)[0];
const pos = (lower ? '排在「' + lower.name + '」之后' : '排在最前') + (upper ? '、「' + upper.name + '」之前' : '、排在最后');

/* ---- ③ 写入知识库、同步清单并删除草稿 ---- */
if (en && topicId !== topicIdOf(cnTerms.find(t => t.id === term.id))) fail('英文卡主题必须镜像中文卡');
const dir = path.resolve(KB, topicName);
assertInside(KB, dir);
/* 已存在的父目录也查真实路径，阻止符号链接将写入导向别部。 */
let parent = dir;
while (!fs.existsSync(parent)) parent = path.dirname(parent);
if (fs.realpathSync(parent) !== CONTENT_DIR) assertInside(CONTENT_DIR, fs.realpathSync(parent));
const num = String(seq).padStart(3, '0');
const target = path.join(dir, num + '-' + term.id + '.md');
if (fs.existsSync(target)) fail('目标文件已存在，拒绝覆盖：' + target);

/* 清单行：中文卡新增或更新；英文卡只是镜像，清单（中文一侧）不动。
   覆盖范围：新行取卡片定义首句（截断），已有行保留人写的那句。 */
const scopeOf = t => {
  const s = String(t.definition || '')
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1').replace(/\|/g, '／').replace(/\s+/g, ' ').trim();
  return s.length > 48 ? s.slice(0, 48) + '…' : s;
};
let rowAction = 'skipped';
if (!en){
  const nextRow = {
    num, id: term.id, name: term.name, topic: topicName,
    scope: (manifestRow && manifestRow.scope) || scopeOf(term),
    state: '已上线',
    code: cardIdOf(atlas.code, topic.code, num)
  };
  /* 先在内存里改：结构不合契约（缺表头 / id 重复）就在落盘前停住 */
  try { rowAction = applyRow(manifest, nextRow, { topics: TOPICS }); }
  catch (e){ fail('词条清单改不了：' + e.message); }
  console.log('清单：' + (rowAction === 'added' ? '新增行 ' : rowAction === 'updated' ? '更新行 ' : '无需改动 ') + nextRow.code);
}
console.log('图鉴：' + atlas.id);
console.log('草稿：' + path.relative(ROOT, draft));
console.log('收录：' + path.relative(ROOT, target) + '（编号 ' + num + seqNote + '，' + pos + '）');
if (dry){ console.log('\n（--dry 预览模式，未改动任何文件）'); process.exit(0); }
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(target, entryToMd(term, seq), { encoding: 'utf8', flag: 'wx' });   /* 不覆盖已有卡片 */
if (!en){
  try { saveManifest(manifest); }
  catch (e){ fail('卡片已写入，但清单保存失败（请手工补这一行）：' + e.message); }
}
fs.unlinkSync(draft);

/* ---- ④ 显式调用构建入口；import 本身不再执行构建。仅真实收录会进入这里。 ---- */
let mergeErr = null;
try {
  const { buildSite } = await import(pathToFileURL(path.join(ROOT, 'engineering', '拼合.mjs')).href);
  await buildSite();
}
catch (e) { mergeErr = e; }
if (mergeErr){ console.error((mergeErr && mergeErr.stack) || String(mergeErr)); fail('拼合失败，请检查上面的输出'); }
console.log('已收录「' + term.name + '」并重建站点。接着跑：\n   node engineering/校验.mjs');
