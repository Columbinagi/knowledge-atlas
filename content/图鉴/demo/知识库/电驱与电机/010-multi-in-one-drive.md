## 010. 多合一电驱

- id: `multi-in-one-drive`
- 分类: `c1`
- 英文名: Multi-in-One e-Drive

### 你可能会说

> 「八合一电驱」到底比三合一多合了什么？

### 是什么

多合一电驱是把电机、逆变器、减速器连同 DC-DC、车载充电机等部件装进同一个壳体的做法——「几合一」说的就是壳里塞了几件东西。

### 详解

- 「三合一」= 电机 + 逆变器 + 减速器，是目前的主流基线；往上加 DC-DC、车载充电机（OBC）、高压配电盒（PDU）、热管理模块、整车控制器，就成了六合一、八合一乃至十六合一。
- 集成度不是越高越好：省下的体积与线束是确定的，代价却落在热管理与维修性上——模块一旦失效，往往要换整台总成。

### 先知道

- 电驱系统（由逆变器、电机、减速器串成的一整段动力链）

### 别名

多合一总成、集成式电驱、X 合一

### 图解

```html
<div style="width:100%;max-width:600px;display:flex;flex-direction:column;gap:12px"><div class="dk-flow"><div class="dk-stage"><b>分立</b><small>三件各自独立</small><span class="mk-tag blue" data-at="0">当前</span></div><div class="dk-arr">→</div><div class="dk-stage"><b>三合一</b><small>电机＋逆变器<br>＋减速器</small><span class="mk-tag blue" data-at="1">当前</span></div><div class="dk-arr">→</div><div class="dk-stage"><b>八合一</b><small>再加 DC-DC<br>OBC · PDU · 热管理</small><span class="mk-tag blue" data-at="2">当前</span></div><div class="dk-arr">→</div><div class="dk-stage"><b>十六合一</b><small>连整车控制器<br>一起纳入</small><span class="mk-tag blue" data-at="3">当前</span></div></div><div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center"><span class="mk-tag gray" data-at="0">独立壳体 ×3</span><span class="mk-tag blue" data-at-min="1">共用一个壳体</span><span class="mk-tag blue">驱动电机</span><span class="mk-tag blue">逆变器</span><span class="mk-tag blue">减速器</span><span class="mk-tag green" data-at-min="2">DC-DC</span><span class="mk-tag green" data-at-min="2">车载充电机</span><span class="mk-tag green" data-at-min="2">高压配电盒</span><span class="mk-tag green" data-at-min="2">热管理模块</span><span class="mk-tag orange" data-at-min="3">整车控制器</span><span class="mk-tag orange" data-at-min="3">充电管理</span></div><div class="dk-status" data-at="0">三件各有壳体、各有线束：前舱塞满，高压线束要单独走一大圈。</div><div class="dk-status" data-at="1">共用壳体与冷却回路，省掉两组线束与两组管路——这一步的收益最大。</div><div class="dk-status" data-at="2">再把 DC-DC、OBC、PDU 与热管理收进来：体积与线束继续降，热量开始互相干扰。</div><div class="dk-status" data-at="3">继续加到十六合一：集成度到顶，代价是任一模块失效都要换整台总成。</div></div>
```

### 一句话

「几合一」就是壳里有几件东西。三合一是基线，再往上每加一层，都是用热管理与维修性去换体积和线束。

### 演示注解

集成度分级为示意。各家对「几合一」的口径并不统一——同一个数字，部件清单可能并不相同。

### 主线位置

当前: 1

标题: 它在「电驱与电机」这条主线的哪一步

说明: 点节点可切换；标「当前术语在这里」的就是本条的位置

1. 电驱总成 —— 它是一整套总成，不是一台电机
2. 电机本体 —— 为什么主流是永磁同步
3. 绕组与冷却 —— 扁线与油冷：把功率密度顶上去
4. 其他技术路线 —— 异步电机与轴向磁通
5. 控制器与功率器件 —— 直流怎么变成三相交流
6. 传动 —— 降速增扭，落到车轮
7. 考核 —— 效率图与评价指标

### 可操作演示

```json
{
  "states": 4,
  "init": 1,
  "acts": [
    {
      "label": "← 往回拆一层",
      "step": -1
    },
    {
      "label": "再集成一层 →",
      "step": 1
    },
    {
      "label": "回到三合一",
      "to": 1
    }
  ]
}
```

### 正文分点

#### 集成到底省下了什么

省壳体与支架：三套独立壳体变成一套，轴承座、端盖、安装点全部合并，零件数与装配工位同步减少。前舱腾出的空间可以直接换成乘员舱或前备箱。

省线束与管路：三相交流母线和冷却管从「总成之间走线」变成「壳内铜排与内腔流道」，长度和接插件数量下降一个量级。高压线束截面积大、屏蔽层厚，减下来的重量很可观。

省一次装配与一次标定：三件分别供货时，振动、噪声、扭矩响应要在整车装配之后再对齐；集成供货把这些耦合关系在总成内部就锁死了。

#### 代价落在哪三个地方

热耦合：电机、逆变器、DC-DC 挤在一个壳里，损耗都变成热，热量互相叠加。集成度越高，冷却设计越接近极限——水冷之外往往还要叠加油冷。

维修性：分立方案里烧了逆变器可以单换；多合一往往要换整台总成。出保之后的成本差异非常明显。

平台绑定：总成按某个平台的前舱尺寸与悬置点设计，跨车型复用要重新做结构件。

#### 口径提醒：数字不能直接横向比

「几合一」没有统一标准。同一个「八合一」，在不同厂商那里部件清单可能并不相同。比较两家产品时，要比清单，不要比数字。

截至 2026 年上半年，集成式电驱总成（三合一及以上）已占国内乘用车电驱装机量的七成上下，多合一（四合一及以上）方案的占比在 25%–30% 区间。各家统计口径不一，看趋势即可，不必纠结小数位。

### 使用场景

**什么时候用**

- 前舱空间紧张、要求线束短、追求轻量化时，优先选集成度高的方案

```html
<div class="mk" style="flex-direction:column;align-items:stretch"><div class="mk-row between"><span>前舱可用长度</span><span class="mk-tag green">+ 前备箱</span></div><div class="mk-row"><span class="mk-line" style="width:70%"></span></div><div class="mk-row"><span class="mk-line" style="width:40%"></span><span class="mk-tag blue">空间腾出来了</span></div></div>
```

- 对比两家产品时，先对齐部件清单，再比集成度

```html
<div class="mk" style="flex-direction:column;align-items:stretch"><div class="mk-row between"><span class="mk-tag blue">甲：八合一</span><span class="mk-tag gray">含 DC-DC</span></div><div class="mk-row between"><span class="mk-tag blue">乙：八合一</span><span class="mk-tag red">含电动压缩机</span></div></div>
```

**什么时候不用**

- 把集成度当成技术先进性的排序——它换的是体积与线束，不是效率上限

```html
<div class="mk bad" style="flex-direction:column;align-items:stretch"><div class="mk-row between"><span>集成度</span><span class="mk-tag red">↑ 越高</span></div><div class="mk-row between"><span>效率上限</span><span class="mk-tag gray">基本不变</span></div></div>
```

- 忽略出保后的维修成本，多合一故障往往要换整台总成

```html
<div class="mk bad" style="flex-direction:column;align-items:stretch"><div class="mk-row"><span class="mk-tag red">单模块损坏</span><span>→</span><span class="mk-tag red">换整台总成</span></div><div class="mk-row"><span class="mk-spinner"></span><span>出保自费结算中…</span></div></div>
```

### 常见变体

- **三合一**（3-in-1）：电机＋逆变器＋减速器共用壳体。这是目前的主流基线，维修性也最好——三件里的任一模块失效，仍有机会单独处理。

```html
<div class="mk" style="flex-direction:column;align-items:stretch"><div class="mk-row"><span class="mk-tag blue">电机</span><span class="mk-tag blue">逆变器</span><span class="mk-tag blue">减速器</span></div><div class="mk-row between"><span>共用壳体</span><span class="mk-tag gray">1 套</span></div></div>
```

- **六合一**（6-in-1）：在三合一基础上并入 DC-DC、高压配电盒与热管理模块。前舱布置明显改善，热量也开始集中在同一个壳里。

```html
<div class="mk" style="flex-direction:column;align-items:stretch"><div class="mk-row"><span class="mk-tag blue">电机</span><span class="mk-tag blue">逆变器</span><span class="mk-tag blue">减速器</span></div><div class="mk-row"><span class="mk-tag green">DC-DC</span><span class="mk-tag green">高压配电盒</span><span class="mk-tag green">热管理</span></div></div>
```

- **八合一**（8-in-1）：再并入车载充电机与整车控制器。截至 2026 年，这是中高端车型的主流档位，也是「多合一」这个词最常指向的形态。

```html
<div class="mk" style="flex-direction:column;align-items:stretch"><div class="mk-row"><span class="mk-tag blue">电机</span><span class="mk-tag blue">逆变器</span><span class="mk-tag blue">减速器</span></div><div class="mk-row"><span class="mk-tag green">DC-DC</span><span class="mk-tag green">OBC</span><span class="mk-tag green">PDU</span><span class="mk-tag green">热管理</span></div><div class="mk-row between"><span class="mk-tag orange">整车控制器</span><span class="mk-tag gray">共 8 件</span></div></div>
```

- **十六合一**（16-in-1）：把充电管理、BMS 高压侧、电动压缩机等一并纳入，是目前集成度的上限。省下的空间最多，代价是故障时要换整台总成。

```html
<div class="mk" style="flex-direction:column;align-items:stretch"><div class="mk-row"><span class="mk-tag blue">电机</span><span class="mk-tag blue">逆变器</span><span class="mk-tag blue">减速器</span></div><div class="mk-row"><span class="mk-tag green">DC-DC</span><span class="mk-tag green">OBC</span><span class="mk-tag green">PDU</span><span class="mk-tag green">热管理</span></div><div class="mk-row"><span class="mk-tag orange">整车控制器</span><span class="mk-tag orange">充电管理</span><span class="mk-tag orange">电动压缩机</span></div></div>
```

### 容易混淆

- vs **电驱系统**：多合一是电驱系统的一种集成度形态。电驱系统回答「是什么」，多合一回答「合到什么程度」。
- vs **平台化**：平台化讲的是跨车型复用；多合一讲的是单个总成内部装了多少件。两者经常同时出现，但不是一回事。

### 选择题

「八合一」比「三合一」多集成的那几件，主要是哪一类？

- A. 电池、电控与充电桩
- B. DC-DC、车载充电机、高压配电盒、热管理模块等高压侧能量管理部件
- C. 减速器与半轴总成

答案: B

解析: 三合一是电机＋逆变器＋减速器；再往上增加的是高压侧的能量管理部件——DC-DC、车载充电机（OBC）、高压配电盒（PDU）与热管理模块。

### 告诉 AI

列出某款车「八合一」电驱的部件清单，以及相比三合一在体积、重量、线束长度上的变化幅度，注明来源与统计口径。「几合一」各家口径不同——若该厂没有公布清单，请明确指出，不要按常见配置替它推断。

### 接下来学什么

- [[three-electric]] —— 往上一层：电驱在三电里只是其中一套
- [[start-here]] —— 回到图鉴总览：三个主题怎么排

### 来源

- 中国乘用车电驱系统集成度与装机量统计（2026 上半年）：https://www.sgpjbg.com/news/7225876.html
- 800V 高压电驱平台与多合一搭载率分析（2026）：https://www.iim.net.cn/103/view-311518-1.html
