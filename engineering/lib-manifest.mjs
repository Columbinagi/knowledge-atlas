/* ============================================================
   engineering/lib-manifest.mjs —— 词条清单.md 的读与改（收录草稿 / 重排编号共用）
   表列序固定：编号 | id | 中文名 | 主题 | 覆盖范围 | 状态 | 卡片 ID
     · 前六列顺序不许动（校验按位置取值）；
     · 第七列「卡片 ID」= 图鉴代号-主题代号-卡号，由 cardIdOf() 算，校验逐行核对；
     · 「主题」列写**主题名**（不是 id）——校验拿它反查 TOPICS[].code，写 id 会算出 `??`。
   为什么单独成模块（2026-11-07 P2）：收录与重排此前只搬卡片文件、不改清单，
   跑完 `校验.mjs` 必红（「编号不一致」/「卡片不在清单里」）。清单是内容线的唯一选题依据，
   两个写操作工具必须让它跟卡片同一步更新，否则等于把收尾工作甩回给人。
   ============================================================ */
import fs from 'node:fs';

const ROW_RE = /^\|\s*(\d{3,})\s*\|/;          /* 明细行：首列是三位以上数字 */
const HEAD_RE = /^\|\s*编号\s*\|/;             /* 表头行，用于判断清单结构是否合契约 */

/* 卡片 ID = 图鉴代号-主题代号-卡号（例 1-06-015）。缺任一段就显式留 ?? 让校验报出来 */
export function cardIdOf(atlasCode, topicCode, num){
  return String(atlasCode) + '-' + String(topicCode || '??') + '-' + String(num);
}

export function readManifest(file){
  const text = fs.readFileSync(file, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(eol);
  const rows = [];
  lines.forEach((line, i) => {
    if (!ROW_RE.test(line)) return;
    const c = line.split('|').map(s => s.trim());
    /* split 后 c[0] 是行首空段、末段是行尾空段：编号从 c[1] 起 */
    rows.push({ line: i, num: c[1], id: c[2], name: c[3], topic: c[4], scope: c[5], state: c[6], code: c[7] || '' });
  });
  const hasHeader = lines.some(l => HEAD_RE.test(l));
  return { file, eol, lines, rows, hasHeader };
}

export function formatRow(row){
  const cells = [row.num, row.id, row.name, row.topic, row.scope, row.state, row.code];
  return '| ' + cells.map(v => String(v === undefined || v === null ? '' : v).trim()).join(' | ') + ' |';
}

export function saveManifest(manifest){
  fs.writeFileSync(manifest.file, manifest.lines.join(manifest.eol), 'utf8');
}

/* 主题声明序 → 用于把新行插到「主题顺序 + 卡号」的正确位置 */
function orderOf(topics, name){
  const i = topics.findIndex(t => t.name === name);
  return i < 0 ? Number.MAX_SAFE_INTEGER : i;
}
function sortKey(topics, row){
  return [orderOf(topics, row.topic), Number(row.num) || 0];
}

/* 同一 id 只允许一行：重复就是清单本身坏了，宁可停机也不猜该改哪行 */
function onlyRowOf(manifest, id){
  const hits = manifest.rows.filter(r => r.id === id);
  if (hits.length > 1) throw new Error('词条清单里 id 重复：' + id + '（先手工合并成一行）');
  return hits[0] || null;
}

/* 取该主题「大于最大值的最小未占用步长倍数」——清单 §一 的取号规则。
   used 是「已被卡片或清单预留占用」的卡号集合；返回 null 表示容器用尽。 */
export function nextFreeSeq(topicSeqs, { step = 5, max = 999 } = {}){
  const used = new Set(topicSeqs.map(Number).filter(Number.isSafeInteger));
  let seq = (used.size ? Math.max.apply(null, [...used]) : 0) + step;
  while (used.has(seq)) seq += step;
  return seq > max ? null : seq;
}

/* 收录：把一张卡写成清单行。已存在同 id 行 → 改它（待写 → 已上线）；否则按序插入新行。
   返回 'added' | 'updated' | 'unchanged'，供调用方原样打印。 */
export function applyRow(manifest, row, { topics }){
  if (!manifest.hasHeader) throw new Error('词条清单缺少「| 编号 | id | 中文名 | 主题 | 覆盖范围 | 状态 | 卡片 ID |」表头，拒绝改写');
  const line = formatRow(row);
  const found = onlyRowOf(manifest, row.id);
  if (found){
    if (manifest.lines[found.line] === line) return 'unchanged';
    manifest.lines[found.line] = line;
    found.num = row.num; found.name = row.name; found.topic = row.topic;
    found.scope = row.scope; found.state = row.state; found.code = row.code;
    return 'updated';
  }
  const key = sortKey(topics, row);
  let at = -1;
  for (const r of manifest.rows){
    const k = sortKey(topics, r);
    if (k[0] > key[0] || (k[0] === key[0] && k[1] > key[1])){ at = r.line; break; }
  }
  if (at < 0){
    /* 没有更靠后的行：接在最后一条明细行之后；空表就接在表头分隔行之后 */
    const lastRow = manifest.rows[manifest.rows.length - 1];
    if (lastRow) at = lastRow.line + 1;
    else {
      const sep = manifest.lines.findIndex(l => /^\|\s*-{3,}/.test(l));
      at = sep < 0 ? manifest.lines.length : sep + 1;
    }
  }
  manifest.lines.splice(at, 0, line);
  manifest.rows.push({ line: at, num: row.num, id: row.id, name: row.name, topic: row.topic, scope: row.scope, state: row.state, code: row.code });
  for (const r of manifest.rows) if (r.line >= at && r !== manifest.rows[manifest.rows.length - 1]) r.line++;
  return 'added';
}

/* 重排：按 id 批量改「编号 + 卡片 ID」。
   updates: Map<id, {num, code, topic}>；返回真正发生变化的行数。
   清单里出现、但知识库里没有的 id（待写行）不动——那不是重排能决定的。 */
export function applyNumbers(manifest, updates, { topics }){
  let changed = 0;
  for (const r of manifest.rows){
    const next = updates.get(r.id);
    if (!next) continue;
    const merged = Object.assign({}, r, {
      num: next.num,
      code: next.code,
      topic: next.topic || r.topic
    });
    const line = formatRow(merged);
    if (manifest.lines[r.line] === line) continue;
    manifest.lines[r.line] = line;
    Object.assign(r, merged);
    changed++;
  }
  return changed;
}

/* 重排前的反向检查：待写行（知识库里还没有的 id）预留的卡号，不能与本次压实结果撞车，
   否则清单里会出现两行同一个卡片 ID——那等于把「预留」作废了。返回冲突描述数组。 */
export function reservedConflicts(manifest, updates, { topics }){
  const out = [];
  const taken = new Map();                     /* topic|num → id */
  for (const [id, v] of updates) taken.set(v.topic + '|' + v.num, id);
  for (const r of manifest.rows){
    if (updates.has(r.id)) continue;           /* 已上线行由 updates 处理 */
    const num = String(r.num).padStart(3, '0');
    const owner = taken.get(r.topic + '|' + num);
    if (owner) out.push('清单待写行 ' + r.id + ' 预留的 ' + r.topic + ' ' + num + ' 与压实后的 ' + owner + ' 冲突');
  }
  return out;
}
