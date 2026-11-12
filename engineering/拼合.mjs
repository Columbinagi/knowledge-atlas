import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAtlasLibrary, serializeAtlasLibrary, outputFileName } from './lib-atlas.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MARK_CFG = '/* ================== 模块配置区：接入时必改 ================== */';
const MARK_ENG = '/* ================== 引擎（以下无需改动） ================== */';

function escMeta(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildSite({
  contentDir = path.join(ROOT, 'content'),
  templatePath = process.env.JC_TEMPLATE ? path.resolve(process.env.JC_TEMPLATE) : path.join(ROOT, 'templates', '词条图鉴模板.html'),
  outPath
} = {}) {
  const library = loadAtlasLibrary(contentDir);
  const atlas = library.atlases.find(item => item.id === library.defaultAtlas);
  /* 产物名唯一来源：SITE_META.outFile → brandName → 固定兜底（见 lib-atlas.outputFileName） */
  const target = outPath || path.join(ROOT, 'dist', outputFileName(atlas));
  const template = fs.readFileSync(templatePath, 'utf8');
  const begin = template.indexOf(MARK_CFG), end = template.indexOf(MARK_ENG);
  if (begin < 0 || end < begin) throw new Error('母版标记定位失败');
  const head = template.slice(0, begin), tail = template.slice(end);
  const titlePattern = /<title>[^<]*<\/title>/g;
  if ((head.match(titlePattern) || []).length !== 1) throw new Error('母版head必须恰有一个title');
  const meta = atlas.SITE_META;
  const brand = meta.brandName || meta.pageTitle;
  if (!brand) throw new Error('默认图鉴缺少品牌名，无法生成分享卡');
  const description = brand + (meta.brandTagline ? ' · ' + meta.brandTagline : '') +
    ' —— ' + atlas.TOPICS.length + ' 个主题 · ' + atlas.KB_TERMS.length + ' 张卡片，单文件离线可用的学习图鉴';
  // 分享抓取器不读取hash，静态元数据只描述默认图鉴。
  const tags = [
    '<title>' + escMeta(brand) + '</title>',
    '<meta name="description" content="' + escMeta(description) + '">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="' + escMeta(brand) + '">',
    '<meta property="og:title" content="' + escMeta(brand) + '">',
    '<meta property="og:description" content="' + escMeta(description) + '">',
    '<meta property="og:locale" content="zh_CN">',
    '<meta property="og:locale:alternate" content="en_US">',
    '<meta name="twitter:card" content="summary">',
    '<meta name="twitter:title" content="' + escMeta(brand) + '">',
    '<meta name="twitter:description" content="' + escMeta(description) + '">'
  ].join('\n');
  const output = head.replace(titlePattern, () => tags) + MARK_CFG + '\n' + serializeAtlasLibrary(library) + tail;
  const bytes = Buffer.byteLength(output, 'utf8');
  if (bytes > library.maxBytes) throw new Error('单文件体积超限：' + bytes + ' > ' + library.maxBytes + ' 字节，原产物未改动');
  fs.writeFileSync(target, output, 'utf8');
  return { bytes, characters: output.length, library, outPath: target };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = buildSite();
    console.log('拼合完成 → ' + result.outPath);
    for (const atlas of result.library.atlases) {
      console.log('  图鉴 ' + atlas.id + '：中文 ' + atlas.KB_TERMS.length + ' / 英文 ' + (atlas.KB_TERMS_EN || []).length + ' / 日志 ' + (atlas.CHANGELOG || []).length);
    }
    console.log('  共 ' + result.library.atlases.length + ' 部，' + result.characters + ' 字符 / ' + result.bytes + ' 字节；静态分享卡：' + result.library.defaultAtlas);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
