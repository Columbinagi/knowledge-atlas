/* ============================================================
   content/图鉴/demo/站点配置.js —— 数据区上半：SITE_META / TOPICS / DEFAULT_TOPIC / CATEGORIES
   本文件属于【内容线】：主题、分类、品牌与页脚文案在这里改。
   合入：node engineering/拼合.mjs    校验：node engineering/校验.mjs（改完必跑）
   数据区由两个标记框住，标记外可以写注释，标记内只放 JS 数据。
   ============================================================ */
/* ↓↓↓↓↓↓ 数据区原文（勿在本标记外添加内容）↓↓↓↓↓↓ */
/* ================== 模块配置区：接入时必改 ================== */
var SITE_META = {
  brand: '鉴',                             // 品牌字（logo 已图形化，此字段仅作标题兜底保留）
  brandName: '知识图鉴模板',                // 顶栏品牌名（悬停 logo 区时展开显示的全称）
  brandShort: '图鉴',                      // 顶栏品牌简称（logo 旁常驻；悬停展开全称）
  brandTagline: '看图懂术语',               // 品牌名下副标题（悬停展开态的第二行）
  pageTitle: '知识图鉴模板',                // 列表 / 搜索 / 收藏视图的标签页标题
  /* 以下 5 个 *En 字段可选：英文界面取它们，不给就回退中文 */
  brandNameEn: 'Glossary Atlas Template',
  brandShortEn: 'ATLAS',
  brandTaglineEn: 'Understand the terms at a glance',
  pageTitleEn: 'Glossary Atlas Template',
  footerNoteEn: 'Glossary Atlas Template · sample content · every figure carries a date and a source',
  changelogTitle: '更新日志 · {brand}',     // 更新日志视图的标签页标题
  navLinks: [                              // 顶栏导航（单文件站默认三项；可清空 []）
    {label: '词条', current: true},
    {label: '自测', href: '#practice'},
    {label: '更新', href: '#changelog'}
  ],
  searchPlaceholder: '搜索词条，试试「电驱」「电机」「三电」…',
  searchLabel: '搜索词条',
  footerNote: '知识图鉴模板 · 示例内容 · 数据类表述均标注时间锚点与来源',
  /* 标题模板：可用 {name} {nameEn} {topic} {q} {brand}，改这里即全站生效 */
  titleTemplate: '{name} · {brand}',       // 词条详情
  notFoundTitle: '这一条走丢了 · {brand}',  // 无效词条
  searchTitle: '搜索「{q}」· {brand}',      // 搜索结果
  /* 主题色。themeDefault 须是主题色表里的键；themeColors 提供则整表覆盖内置色板 */
  themeDefault: 'klein',
  themeColors: null
};

/* 主题（侧栏 chips，三级体系第一级；首页默认展示 DEFAULT_TOPIC）
   code 是两位数字，它是卡片 ID 的中间段：卡片 ID = 图鉴代号-主题代号-卡号，如 1-03-010。
   代号跟着主题走、定死不改——以后调整顺序或改名，都不改已发出的 ID。
   nameEn / headingEn 可选：英文界面取它们（缺则回退中文）。 */
var TOPICS = [
  {id: 't0', code: '01', name: '图鉴总览', nameEn: 'Overview', heading: '图鉴总览 · 这份图鉴怎么组织', headingEn: 'Overview · How this glossary is organized'},
  {id: 't1', code: '02', name: '三电系统总览', nameEn: 'Three-Electric Overview', heading: '三电系统总览 术语图鉴', headingEn: 'Three-Electric Overview Glossary'},
  {id: 't2', code: '03', name: '电驱与电机', nameEn: 'E-Drive & Motors', heading: '电驱与电机 术语图鉴', headingEn: 'E-Drive & Motors Glossary'}
];
var DEFAULT_TOPIC = 't2';   // 打开即显示「电驱与电机」——示例包里结构最全的那张卡

/* 细分类（主题内分节）
   同一主题可以有多个分类；卡片用 `- 分类:` 归属，归属不写分类时用 `- 主题:` 直接挂主题。
   新分类一律随词条上线再登记，不留空锚点。 */
var CATEGORIES = [
  {id: 'c1', topic: 't2', name: '电驱系统总体', nameEn: 'E-Drive Systems'}
];

/* ↑↑↑↑↑↑ 数据区原文结束 ↑↑↑↑↑↑ */
