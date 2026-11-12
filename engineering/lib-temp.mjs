/* ============================================================
   engineering/lib-temp.mjs —— 工具临时目录的统一入口
   2026-11-07 立：此前收录草稿 / 校验 / 体检 / 多图鉴测试各写各的 `E:/tmp`，
   换一台机器（没有 E 盘）就跑不起来。现在只在这里拼路径：
     · 设了 JC_TMP → 用它（本机复跑建议 JC_TMP=E:/tmp，便于检查与清理）
     · 没设 → 用系统临时目录（os.tmpdir()），别的机器零配置也能跑
   只依赖 Node 内置模块，不引入任何包。
   ============================================================ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let cachedRoot = '';

export function tempRoot(){
  if (cachedRoot) return cachedRoot;
  const root = process.env.JC_TMP ? path.resolve(process.env.JC_TMP) : os.tmpdir();
  fs.mkdirSync(root, { recursive: true });
  cachedRoot = root;
  return root;
}

/* mkdtemp 会在前缀后追加 6 位随机字符，返回新建目录的绝对路径 */
export function makeTempDir(prefix){
  return fs.mkdtempSync(path.join(tempRoot(), prefix));
}
