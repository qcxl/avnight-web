/* AVNight 展示站 — 前端逻辑
   II 期: 左菜单(逆向展示站/首页/VIP/分类) + 子Tab内容卡片; 逆向展示站保留 文档/数据浏览/API控制台 */
"use strict";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* 私有 Worker 地址(真实调用). 留空 = 纯回放 */
const CONFIG = { workerUrl: "" }; // 同源: 经 Pages _worker.js 代理(同源无CORS)

/* ======================================================================
   逆向展示站 — 文档 / 数据浏览 / API 控制台(原样保留)
====================================================================== */
/* ---------- Tab 切换 ---------- */
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + btn.dataset.tab));
    if (btn.dataset.tab === "docs") loadDocs();
    if (btn.dataset.tab === "browse") loadBrowse();
    if (btn.dataset.tab === "console") loadConsole();
  });
});

/* ---------- Tab 1: 文档 ---------- */
const DOC_FILES = ["00_总览与通用约定", "01_开屏页与启动链", "02_首页模块",
  "03_VIP模块", "04_分类模块", "05_视频详情页与播放链路"];

async function loadDocs() {
  const list = $("#doc-list");
  if (list.dataset.loaded) return;
  list.dataset.loaded = "1";
  list.innerHTML = "";
  for (const name of DOC_FILES) {
    const item = document.createElement("div");
    item.className = "item";
    item.textContent = name;
    item.onclick = async () => {
      list.querySelectorAll(".item").forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      try {
        const resp = await fetch("docs/" + name + ".md");
        const md = await resp.text();
        $("#doc-view").innerHTML = '<div class="doc-body">' + marked.parse(md) + "</div>";
        $("#doc-view").scrollTop = 0;
      } catch (e) {
        $("#doc-view").innerHTML = '<div class="placeholder">加载失败: ' + esc(e) + "</div>";
      }
    };
    list.appendChild(item);
  }
}

/* ---------- Tab 2: 数据浏览 ---------- */
let SAMPLE_INDEX = null;

async function loadBrowse() {
  const list = $("#module-list");
  if (list.dataset.loaded) return;
  list.dataset.loaded = "1";
  try {
    SAMPLE_INDEX = await (await fetch("data/index.json")).json();
  } catch {
    $("#sample-view").innerHTML = '<div class="placeholder">数据未生成 — 先运行 tools/build.py</div>';
    return;
  }
  list.innerHTML = "";
  for (const mod of Object.keys(SAMPLE_INDEX)) {
    const g = document.createElement("div");
    g.className = "group";
    g.textContent = mod + " (" + SAMPLE_INDEX[mod].length + ")";
    list.appendChild(g);
    for (const f of SAMPLE_INDEX[mod]) {
      const item = document.createElement("div");
      item.className = "item";
      item.textContent = f;
      item.onclick = async () => {
        list.querySelectorAll(".item").forEach((i) => i.classList.remove("active"));
        item.classList.add("active");
        try {
          const txt = await (await fetch("data/" + mod + "/" + f)).text();
          let html;
          try { html = "<pre class='response-box'>" + esc(JSON.stringify(JSON.parse(txt), null, 2)) + "</pre>"; }
          catch { html = "<pre class='response-box'>" + esc(txt) + "</pre>"; }
          $("#sample-view").innerHTML = "<h3>" + esc(f) + "</h3>" + html;
        } catch (e) {
          $("#sample-view").innerHTML = "<h3>" + esc(f) + "</h3><div class='placeholder'>" + esc(e) + "</div>";
        }
      };
      list.appendChild(item);
    }
  }
}

/* ---------- Tab 3: API 控制台(回放 + 私有真实调用) ---------- */
let MANIFEST = null;
let ACTIVE_API = null;

async function loadConsole() {
  const list = $("#api-list");
  if (list.dataset.loaded) return;
  list.dataset.loaded = "1";
  try {
    MANIFEST = await (await fetch("data/manifest.json")).json();
  } catch {
    $("#api-form-area").innerHTML = '<div class="placeholder">manifest 未生成 — 先运行 tools/build.py</div>';
    return;
  }
  list.innerHTML = "";
  for (const mod of Object.keys(MANIFEST)) {
    const g = document.createElement("div");
    g.className = "group";
    g.textContent = mod;
    list.appendChild(g);
    for (const api of MANIFEST[mod]) {
      const item = document.createElement("div");
      item.className = "item";
      item.textContent = api.key;
      item.title = api.path;
      item.onclick = () => {
        list.querySelectorAll(".item").forEach((i) => i.classList.remove("active"));
        item.classList.add("active");
        ACTIVE_API = api;
        renderApiForm(api);
      };
      list.appendChild(item);
    }
  }
}

function renderApiForm(api) {
  const method = api.method || "GET";
  const params = (api.params || []).map((p, i) =>
    '<div class="param-row"><label>' + esc(p.name) + (p.required ? " *" : "") + "</label>" +
    '<input id="p' + i + '" placeholder="' + esc(p.example || "") + '" ' +
    (p.workerInjected ? "disabled title='Worker 注入, 前端不填'" : "") + "></div>").join("");
  $("#api-form-area").innerHTML =
    '<div><span id="api-method" class="' + esc(method) + '">' + esc(method) + "</span>" +
    '<span id="api-path"> ' + esc(api.path) + "</span>" +
    (api.liveOnly ? '<span class="tag live">仅真实</span>' : '<span class="tag replay">回放</span>') +
    '</div>' +
    params +
    '<div class="note">' + esc(api.note || "") + "</div>" +
    '<button id="api-replay-btn">▶ 回放</button> ' +
    '<button id="api-live-btn" ' + (CONFIG.workerUrl ? "" : "disabled title='未配置私有 Worker'") + ">⚡ 真实调用</button>";
  $("#api-replay-btn").onclick = () => collectAnd(api, replayApi);
  $("#api-live-btn").onclick = () => collectAnd(api, callLive);
}

function collectAnd(api, fn) {
  const args = {};
  (api.params || []).forEach((p, i) => {
    const v = $("#p" + i).value.trim();
    if (v && !p.workerInjected) args[p.name] = v;
  });
  fn(api, args);
}

async function replayApi(api, args) {
  const box = $("#api-response");
  box.textContent = "▶ 回放 " + api.path + " " + JSON.stringify(args) + "\n";
  if (api.sampleFile) {
    const txt = await (await fetch("data/samples/" + api.sampleFile)).catch((e) => { throw e; }).text();
    box.textContent = txt.length < 4 ? "样本为空" : txt.slice(0, 200000);
  } else {
    box.textContent += "\n(该接口无回放样本 — 需真实调用)";
  }
}

async function callLive(api, args) {
  const box = $("#api-response");
  box.textContent = "⚡ 真实调用 " + api.path + "\n";
  const q = new URLSearchParams();
  (api.params || []).forEach((p) => { if (p.type === "path") return; if (args[p.name]) q.set(p.name, args[p.name]); });
  const pathFilled = (api.path.split("?")[0]).replace(/\{(\w+)\}/g, (_, n) => args[n] || "{MISSING}");
  const qs = q.toString();
  const url = CONFIG.workerUrl + "/proxy" + pathFilled + (qs ? "?" + qs : "");
  if (url.includes("{MISSING}")) { box.textContent = "❌ 缺少必填路径参数, 无法构造 URL"; return; }
  box.textContent += "→ " + url + "\n";
  try {
    const resp = await fetch(url);
    if (resp.status === 429) {
      box.textContent += "\n⚠️ 429 服务端限流 — 已降级为回放(建议稍后再试或使用回放模式)";
      box.textContent += "\n" + await resp.text();
      return;
    }
    if (resp.status === 403) {
      box.textContent += "\n⛔ 403 — Worker 未开启真实调用(需设置 ALLOW_REAL_CALLS=true)";
      return;
    }
    const txt = await resp.text();
    box.textContent += "\nHTTP " + resp.status + "\n" + txt.slice(0, 200000);
  } catch (e) {
    box.textContent += "\n❌ 网络错误: " + e + "\n(降级建议: 使用回放模式)";
  }
}

/* ======================================================================
   站点菜单 + hash 路由 + 内容卡片(II 期)
====================================================================== */
const SITE_TABS = { home: "home-sub", vip: "vip-sub", category: "category-sub" };
let CARDS_INDEX = null;

function parseRoute() {
  const m = location.hash.match(/^#\/(reverse|home|vip|category)(?:\/([a-z_]+))?/);
  return { site: m ? m[1] : "home", tab: m ? m[2] : null };
}

function switchSite(site, tabId) {
  document.querySelectorAll(".site-item").forEach((b) => b.classList.toggle("active", b.dataset.site === site));
  document.querySelectorAll(".site-panel").forEach((p) => p.classList.toggle("active", p.id === "site-" + site));
  if (site === "reverse") {
    loadDocs();
    if (location.hash !== "#/reverse") history.replaceState(null, "", "#/reverse");
  } else {
    ensureSubTabs(site, tabId);
  }
}

document.querySelectorAll(".site-item").forEach((btn) => {
  btn.onclick = () => {
    const site = btn.dataset.site;
    if (site === "reverse") history.pushState(null, "", "#/reverse");
    else { ensureSubTabs(site, null); history.pushState(null, "", "#/" + site); }
  };
});
window.addEventListener("hashchange", () => {
  const m = location.hash.match(/^#\/dub\/([^/]+)(?:\/([^/]+))?/);
  if (m) { openDubbingDetail(decodeURIComponent(m[1]), m[2] ? decodeURIComponent(m[2]) : null); return; }
  const { site, tab } = parseRoute();
  switchSite(site, tab);
});

async function ensureSubTabs(site, tabId) {
  const nav = $("#" + SITE_TABS[site]);
  const siteLabel = { home: "首页", vip: "VIP", category: "分类" }[site] || "";
  nav.innerHTML = '<span class="sub-tabs-title">' + siteLabel + '</span>';
  if (!CARDS_INDEX) {
    try { CARDS_INDEX = await (await fetch("data/cards/index.json")).json(); }
    catch { return; }
  }
  const tabs = CARDS_INDEX[site] || [];
  const active = tabId || (tabs[0] && tabs[0].id) || "";
  nav.innerHTML = "";
  for (const t of tabs) {
    const b = document.createElement("button");
    b.className = "sub-tab" + (t.id === active ? " active" : "");
    b.textContent = t.label + (t.low_data ? " (空)" : "");
    b.onclick = () => { history.pushState(null, "", "#/" + site + "/" + t.id); ensureSubTabs(site, t.id); };
    nav.appendChild(b);
  }
  loadCards(site, active || (tabs[0] && tabs[0].id));
}

async function loadCards(site, tabId) {
  const grid = $("#" + site + "-cards");
  if (!tabId) return;
  if (site === "home" && tabId === "ai_dubbing") { loadAiDubbing(grid); return; }
  grid.innerHTML = '<div class="placeholder">加载中…</div>';
  try {
    const arr = await (await fetch("data/cards/" + site + "/" + tabId + ".json")).json();
    if (!arr.length) { grid.innerHTML = '<div class="placeholder">暂无数据</div>'; return; }
    grid.innerHTML = "";
    arr.forEach((c) => grid.appendChild(renderCard(c)));
  } catch (e) {
    grid.innerHTML = '<div class="placeholder">加载失败: ' + esc(e) + "</div>";
  }
}
/* ===== 封面解码加载器(活域 tlcl1 CORS=* + base64去'a'混淆) ===== */
const LIVE_DOMS = ["tlcl1.yjior.com", "stlcl-1.yjior.com", "qlaops2.humenhd.com", "9qcl3.poiu012.com"];
function liveDomainFor(url) {
  if (url.includes("/dubbing/") || url.includes("/xchina/")) return "stlcl-1.yjior.com"; // self_cover 池
  return "tlcl1.yjior.com";                                                              // cover 池
}
async function fetchOnce(u) {
  const r = await fetch(u, { mode: "cors" });
  return r.ok ? r : null;
}
async function coverBlob(rawUrl) {
  if (!rawUrl) return null;
  const primary = liveDomainFor(rawUrl);
  const hosts = [primary, ...LIVE_DOMS.filter((h) => h !== primary), new URL(rawUrl).host];
  for (const h of hosts) {
    try {
      const u = rawUrl.replace(/^https?:\/\/[^\/]+/, "https://" + h);
      let r = null;
      try { r = await fetchOnce(u); } catch (_) { r = await fetchOnce(u); } // 网络瞬时失败重试一次
      if (!r) continue;
      const buf = new Uint8Array(await r.arrayBuffer());
      // 直接图片流
      if ((buf[0] === 0xff && buf[1] === 0xd8) || (buf[0] === 0x89 && buf[1] === 0x50) ||
          (buf[0] === 0x52 && buf[1] === 0x49)) {
        let type = "image/webp";
        if (buf[0] === 0xff) type = "image/jpeg";
        else if (buf[0] === 0x89) type = "image/png";
        return new Blob([buf], { type });
      }
      // base64 文本(可能带 1-2 个前导混淆字符)
      const s = new TextDecoder().decode(buf).trim();
      for (let cut = 0; cut < 3; cut++) {
        try {
          const t = s.slice(cut);
          const pad = t.length % 4 ? "=".repeat(4 - (t.length % 4)) : "";
          const bin = atob(t + pad);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          // 校验是有效图片(魔数), 否则当失败处理(避免无效 blob → 白/破图占位)
          const img = (bytes[0] === 0xff && bytes[1] === 0xd8) || (bytes[0] === 0x89 && bytes[1] === 0x50) ||
                      (bytes[0] === 0x52 && bytes[1] === 0x49) || (bytes[0] === 0x47 && bytes[1] === 0x49);
          if (!img) continue;
          return new Blob([bytes], { type: "image/webp" });
        } catch (_) {}
      }
    } catch (_) {}
  }
  return null;
}
async function setCover(img, fb, rawUrl) {
  try {
    const blob = await coverBlob(rawUrl);
    if (blob && blob.size > 0) { img.src = URL.createObjectURL(blob); img.style.display = "block"; return; }
  } catch (_) {}
  // 失败: 移除残留 img(否则浏览器渲染默认白/破图占位), 只留深色圆角占位(fb)
  if (img && img.parentNode) img.parentNode.removeChild(img);
  if (fb) fb.style.display = "flex";
}

/* ===== AI中配 Tab 专门渲染(chinese_dubbing) ===== */
// 时长秒数 -> 00:00 / 00:00:00 (>=1h 含小时)
function fmtDur(sec) {
  sec = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = String(m).padStart(2, "0"), ss = String(s).padStart(2, "0");
  return h > 0 ? String(h).padStart(2, "0") + ":" + mm + ":" + ss : mm + ":" + ss;
}
// 图片右下角时长角标
function durBadge(sec) {
  const b = document.createElement("span"); b.className = "dur-badge"; b.textContent = fmtDur(sec);
  return b;
}
function dubMedia(url, fbCls, title) {
  const box = document.createElement("div"); box.className = fbCls + "-img";
  const fb = document.createElement("div"); fb.className = fbCls + "-fb"; fb.style.display = "flex";  // 纯深色圆角占位(不带文字)
  box.appendChild(fb);
  if (url) {
    const img = document.createElement("img"); img.alt = ""; img.style.display = "none";  // 加载中不显示(避免白框)
    img.onload = () => { img.style.display = "block"; fb.style.display = "none"; };       // 就绪后才显示图
    img.onerror = () => { try { img.parentNode.removeChild(img); } catch (_) {} };        // 失败移除, fb占位保持
    box.appendChild(img);
    setCover(img, fb, url);
  }
  return box;
}
function hmedia(v) {
  const el = document.createElement("div"); el.className = "hmedia-card"; el.title = v.title || "";
  const m = dubMedia(v.cover64, "hm", v.title || v.code || "");
  if (v.duration != null) m.appendChild(durBadge(v.duration));
  el.appendChild(m);
  const t = document.createElement("div"); t.className = "hm-title"; t.textContent = v.title || v.code || ""; el.appendChild(t);
  el.onclick = () => openDubbingDetail(v.code, v.code);
  return el;
}
function collectionVideo(v, colCode) {
  const el = document.createElement("div"); el.className = "ci-video"; el.title = v.title || "";
  const m = dubMedia(v.cover64, "cv", v.title || v.code || "");
  if (v.duration != null) m.appendChild(durBadge(v.duration));
  el.appendChild(m);
  const t = document.createElement("div"); t.className = "cv-title"; t.textContent = v.title || v.code || ""; el.appendChild(t);
  el.onclick = () => openDubbingDetail(colCode || v.code, v.code);
  return el;
}
function collectionItem(it) {
  const el = document.createElement("div"); el.className = "collection-item";
  const head = document.createElement("div"); head.className = "ci-head";
  const m = document.createElement("div"); m.className = "ci-media";
  const fb = document.createElement("div"); fb.className = "ci-fb"; fb.style.display = "flex"; m.appendChild(fb);  // 纯深色圆角占位
  if (it.cover64) {
    const img = document.createElement("img"); img.alt = ""; img.style.display = "none";  // 加载中不显示(避免白框)
    img.onload = () => { img.style.display = "block"; fb.style.display = "none"; };
    img.onerror = () => { try { img.parentNode.removeChild(img); } catch (_) {} };
    m.appendChild(img); setCover(img, fb, it.cover64);
  }
  head.appendChild(m);
  const info = document.createElement("div"); info.className = "ci-info";
  const ty = document.createElement("div"); ty.className = "ci-type"; ty.textContent = it.collection_type || "";
  const ti = document.createElement("div"); ti.className = "ci-title"; ti.textContent = it.title || "";
  info.appendChild(ty); info.appendChild(ti); head.appendChild(info); el.appendChild(head);
  const vids = document.createElement("div"); vids.className = "ci-videos";
  (it.videos || []).forEach((v) => vids.appendChild(collectionVideo(v, it.collection_sid || it.sid)));
  el.appendChild(vids);
  el.onclick = (ev) => { if (ev.target.closest(".ci-video")) return; openDubbingDetail(it.collection_sid || it.sid, (it.videos && it.videos[0] && it.videos[0].code) || null); };
  return el;
}
const DUB_CACHE = {};   // 模块级缓存: type -> {items:[], next, done} (切Tab不重载)
let DUB_SAMPLES = null;  // 本地多页样本缓存
async function loadAiDubbing(grid) {
  grid.innerHTML = '<div class="placeholder">加载中…</div>';
  try {
    const [ms, coll] = await Promise.all([
      (await fetch("data/home/chineseDubbingMainscreen.json")).json().catch(() => ({ currently_airing: {} })),
      (await fetch("data/home/chineseDubbingCollections.json")).json().catch(() => ({ data: [], next: 0 }))
    ]);
    const wrap = document.createElement("div"); wrap.className = "ai-wrap";
    const ca = ms.currently_airing || {};
    [ { title: "日本AV深夜剧场", sub: "中文配音加持,越夜越来劲", list: ca.LONG || [] },
      { title: "里番次元剧场", sub: "中文声线入戏,剧情越走越带劲", list: ca.ANIMATION || [] }
    ].forEach((sec) => {
      const s = document.createElement("section"); s.className = "hero-section";
      const t = document.createElement("div"); t.className = "hero-title"; t.textContent = sec.title;
      const sub = document.createElement("div"); sub.className = "hero-sub"; sub.textContent = sec.sub;
      s.appendChild(t); s.appendChild(sub);
      const hs = document.createElement("div"); hs.className = "hscroll";
      (sec.list || []).forEach((v) => hs.appendChild(hmedia(v)));
      s.appendChild(hs); wrap.appendChild(s);
      const g = document.createElement("div"); g.className = "hero-gap"; wrap.appendChild(g);
    });
    const TYPES = [{ k: "new", l: "最新" }, { k: "hot", l: "最热" }, { k: "recommend", l: "最推" }];
    const tabs = document.createElement("div"); tabs.className = "dub-tabs";
    const endBox = document.createElement("div"); endBox.className = "ai-end";   // 底部提示(加载中/加载更多/到底了)
    let curType = "new";
    let listBox = null;   // 当前 tab 的列表容器(每个 tab 独立, 由 selectType 创建并保留=不重渲染)


    function showEnd(text, cls) { endBox.textContent = text || ""; endBox.className = "ai-end" + (cls ? " " + cls : ""); }
    function renderAppendData(arr) { arr.forEach((it) => listBox.appendChild(collectionItem(it))); }
    // 列表容器顶部相对 grid 滚动内容顶的偏移(恒定值, 供计算“从该tab列表内滚了多少”)
    function listOffset(el) {
      return el.getBoundingClientRect().top - grid.getBoundingClientRect().top + grid.scrollTop;
    }

    TYPES.forEach((tp) => {
      const b = document.createElement("button"); b.className = "dub-tab" + (tp.k === curType ? " active" : "");
      b.textContent = tp.l; b.dataset.k = tp.k;
      b.onclick = () => selectType(tp.k);
      tabs.appendChild(b);
    });

    async function fetchPage(type, next) {
      // 本地多页样本分页. 游标语义与服务端一致: 传入 next(0 表示第一页),
      // 返回 { data, next }: next 为下一页游标, next === null 表示没有更多(到底).
      if (!DUB_SAMPLES) {
        try { DUB_SAMPLES = await (await fetch("data/home/dub_collections.json")).json(); } catch (_) { DUB_SAMPLES = {}; }
      }
      const pages = DUB_SAMPLES[type] || [];
      const idx = (next || 0) / 30;          // 以 next 为游标定位页
      const data = pages[idx] || [];
      if (!data.length) return { data: [], next: null };   // 无下一页
      const hasMore = !!((pages[idx + 1] || []).length);
      return { data, next: hasMore ? (idx + 1) * 30 : null };  // null = 到底
    }

    async function loadMore(type) {
      const c = DUB_CACHE[type]; if (!c || c.loading) return;
      if (c.done) { showEnd("到底了, 没有更多AI中配", "done"); return; }
      c.loading = true;
      if (!c.items.length) showEnd("加载中, 请稍后…");
      try {
        const { data, next } = await fetchPage(type, c.next);
        if (data && data.length) {
          // 去重(按 code)后追加渲染 + 缓存
          const seen = new Set(c.items.map((it) => it.collection_sid || it.title));
          const fresh = data.filter((it) => !seen.has(it.collection_sid || it.title));
          renderAppendData(fresh);
          c.items = c.items.concat(fresh);
          c.next = next;
          if (!next) c.done = true;
        } else { c.done = true; }
      } catch (e) {
        c.fails = (c.fails || 0) + 1;   // 失败累计
      }
      c.loading = false;
      if (c.done) showEnd("到底了, 没有更多AI中配", "done");
      else if (c.items.length) showEnd("下拉加载更多…", "more");
      else if (c.fails >= 3) showEnd("加载失败, 请检查网络", "err");
    }

    function selectType(type) {
      // 切走前记住“从当前tab列表顶部滚了多少”(相对该tab内部, 而非外部整体)
      if (curType && curType !== type && DUB_CACHE[curType] && DUB_CACHE[curType].el) {
        const el = DUB_CACHE[curType].el;
        DUB_CACHE[curType].offset = Math.max(0, grid.scrollTop - listOffset(el));
      }
      curType = type;
      [...tabs.querySelectorAll(".dub-tab")].forEach((x) => x.classList.toggle("active", x.dataset.k === type));
      let c = DUB_CACHE[type];
      if (!c) c = DUB_CACHE[type] = { items: [], next: 0, done: false, fails: 0, el: null, offset: 0 };
      // 每个 tab 独立列表容器, 首次创建后保留(切回不重渲染/不重抓)
      if (!c.el) { c.el = document.createElement("div"); c.el.className = "collection-list"; wrap.appendChild(c.el); }
      Object.keys(DUB_CACHE).forEach((k) => { if (DUB_CACHE[k].el) DUB_CACHE[k].el.style.display = k === type ? "" : "none"; });
      listBox = c.el;
      wrap.appendChild(endBox);               // 底部状态保持在列表后面
      grid.scrollTop = (c.offset || 0) + listOffset(c.el);   // 恢复到该tab内部对应位置
      if (!c.items.length && !c.done) { showEnd("加载中, 请稍后…"); loadMore(type); }   // 首次
      else if (c.done) showEnd("到底了, 没有更多AI中配", "done");
      else showEnd("下拉加载更多…", "more");
    }

    wrap.appendChild(tabs);
    endBox.textContent = "";
    grid.innerHTML = ""; grid.appendChild(wrap);
    selectType("new");

    // 滚动到底自动加载分页: IntersectionObserver + window scroll 距底检测双保险
    const io = new IntersectionObserver((ents) => {
      if (ents.some((e) => e.isIntersecting)) { const c = DUB_CACHE[curType]; if (c && !c.done && !c.loading) loadMore(curType); }
    });
    if (endBox) io.observe(endBox);
    grid.addEventListener("scroll", () => {
      const c = DUB_CACHE[curType]; if (!c || c.done || c.loading) return;
      if (grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 400) loadMore(curType);
    });
  } catch (e) { grid.innerHTML = '<div class="placeholder">加载失败: ' + esc(e) + '</div>'; }
}

function renderCard(c) {
  const el = document.createElement("div");
  el.className = "card" + (c.type === "actor" ? " actor" : "");
  const cover = c.cover || c.thumb || "";
  const media = document.createElement("div");
  media.className = "card-media";
  /* 无封面(或加载失败) → 文字海报: 标题大字 + 编号, 避免空深色块 */
  const showPoster = () => {
    media.classList.add("has-poster");
    media.innerHTML =
      '<div class="card-poster">' +
        '<div class="poster-title">' + esc(c.title || c.name || c.code || "AVNight") + "</div>" +
        (c.code ? '<div class="poster-code">' + esc(c.code) + "</div>" : "") +
      "</div>";
  };
  if (cover) {
    const img = document.createElement("img");
    img.loading = "lazy"; img.alt = ""; img.src = cover;
    img.onerror = () => { media.replaceChildren(); showPoster(); };
    media.appendChild(img);
  } else {
    showPoster();
  }
  el.appendChild(media);
  /* 下方: 仅补充信息(标题已在海报) */
  const info = document.createElement("div");
  if (c.type === "actor") {
    if (c.country) { const s = document.createElement("div"); s.className = "card-sub"; s.textContent = c.country; info.appendChild(s); }
  } else {
    const actors = (c.actors || []).map((a) => typeof a === "string" ? a : (a && a.name) || "").filter(Boolean).slice(0, 2).join(" / ");
    const sub = [c.duration, actors].filter(Boolean).join(" · ");
    if (sub) { const s = document.createElement("div"); s.className = "card-sub"; s.textContent = sub; info.appendChild(s); }
  }
  el.appendChild(info);
  el.title = c.title || c.name || c.code || "";
  return el;
}

/* ======================================================================
   初始
====================================================================== */
loadDocs();
const _r = parseRoute();
switchSite(_r.site, _r.tab);

/* ================= 视频详情页 (openDubbingDetail) ================= */
let DD = { col: null, videos: [], cur: null, hls: null };

function $D(id) { return document.getElementById(id); }
async function videoCryptDecrypt(tsMs, cipherB64) {
  // tsMs = 响应头 x-avnight-time(秒)*1000; 日期 = GMT+8 yyyyMMdd-HHmmss
  const d = new Date(tsMs + 8 * 3600 * 1000);
  const pad = (x) => String(x).padStart(2, "0");
  const ds = "" + d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "-" +
             pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds());
  const hex = md5("a@v*9$QAQ" + ds);            // 32 个 hex 字符
  const keyBytes = new TextEncoder().encode(hex);  // key = hex 字符串的 ASCII 字节(32B), 非 hex→2byte
  const iv = new TextEncoder().encode(ds + "#");
  const data = Uint8Array.from(atob(cipherB64), (c) => c.charCodeAt(0));
  const k = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-CBC" }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, k, data);
  return new TextDecoder().decode(plain);
}
function playProxyUrl(u) { return CONFIG.workerUrl + "/proxy/play?u=" + encodeURIComponent(u); }
function toFetch(url, opts, ms) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms || 8000);
  return fetch(url, Object.assign({ signal: ctl.signal }, opts || {})).finally(() => clearTimeout(t));
}

function openDubbingDetail(colCode, initVcode) {
  $D("dub-detail").style.display = "flex";
  if (location.hash !== "#/dub/" + encodeURIComponent(colCode))
    history.pushState(null, "", "#/dub/" + encodeURIComponent(colCode));
  DD.col = colCode; DD.cur = initVcode || null;
  $D("dd-side").innerHTML = '<div style="color:var(--text-dim);padding:20px;font-size:13px">加载中…</div>';
  $D("dd-video").removeAttribute("src"); if (DD.hls) { try { DD.hls.destroy(); } catch (_) {} DD.hls = null; }
  $D("dd-playbtn").style.display = "flex";
  $D("dd-pstat").textContent = "";
  loadDdInfo(colCode);
}

async function loadDdInfo(colCode) {
  let videos = [];
  try {
    // 同源 _worker.js 实时; 失败回退本地样本
    const r = await toFetch("/proxy/v3/chinese_dubbing/collections/" + encodeURIComponent(colCode) + "/info", { headers: { "accept": "application/json" } });
    if (r.ok) { const j = await r.json(); videos = j.videos || []; }
  } catch (_) {}
  if (!videos.length) {
    const j = await (await fetch("data/home/chineseDubbingCodeInfo.json")).json().catch(() => ({ videos: [] }));
    videos = j.videos || [];
  }
  DD.videos = videos;
  if (!DD.cur && videos[0]) DD.cur = videos[0].code;
  renderDdSide(videos);
}

function renderDdSide(videos) {
  const box = $D("dd-side"); box.innerHTML = "";
  const hasActive = videos.some((v) => v.code === DD.cur);
  videos.forEach((v, i) => {
    // 用 AI中配 collection-item 图文样式: 左图(88x60) + 右侧标题, 下方进度? 简化为左图右文卡
    const el = document.createElement("div"); el.className = "dd-item collection-item" + ((v.code === DD.cur || (!hasActive && i === 0)) ? " active" : "");
    const head = document.createElement("div"); head.className = "ci-head";
    const md = document.createElement("div"); md.className = "ci-media";
    const fb = document.createElement("div"); fb.className = "ci-fb"; fb.style.display = "none";
    md.appendChild(fb);
    if (v.cover64) { const img = document.createElement("img"); img.alt = ""; img.style.display = "none";
      img.onload = () => { img.style.display = "block"; fb.style.display = "none"; };
      img.onerror = () => { try { img.parentNode.removeChild(img); } catch (_) {} fb.style.display = "flex"; };
      md.appendChild(img); setCover(img, fb, v.cover64); }
    else fb.style.display = "flex";
    if (v.duration != null) md.appendChild(durBadge(v.duration));
    head.appendChild(md);
    const info = document.createElement("div"); info.className = "ci-info";
    const ty = document.createElement("div"); ty.className = "ci-type"; ty.textContent = v.code || "";
    const ti = document.createElement("div"); ti.className = "ci-title"; ti.textContent = v.title || "";
    info.appendChild(ty); info.appendChild(ti); head.appendChild(info); el.appendChild(head);
    el.onclick = () => { DD.cur = v.code; renderDdSide(videos); promptPlay(v.code); };
    box.appendChild(el);
  });
}

function promptPlay(vcode) {
  $D("dd-playbtn").style.display = "flex";
  $D("dd-pstat").textContent = "";
  if ($D("dd-video").dataset.vcode === vcode && $D("dd-video").src) {
    // 已加载该视频, 用户再点播放
    $D("dd-video").play().catch(() => {});
    return;
  }
  $D("dd-video").dataset.vcode = vcode;
  if (DD.hls) { try { DD.hls.destroy(); } catch (_) {} DD.hls = null; }
}

async function onDdPlay() {
  const vcode = DD.cur; const video = $D("dd-video");
  if (!vcode) { $D("dd-pstat").textContent = "无视频可播放"; return; }
  $D("dd-playbtn").style.display = "none";
  $D("dd-pstat").textContent = "正在获取播放地址…";
  try {
    const r = await toFetch("/proxy/v3/video/" + encodeURIComponent(vcode) + "/info?cdn=c", { headers: { "accept": "application/json" } });
    if (!r.ok) throw new Error("info HTTP " + r.status);
    const ts = parseInt(r.headers.get("x-avnight-time"), 10);
    const plain = await videoCryptDecrypt(ts * 1000, await r.text());
    const info = JSON.parse(plain); const vd = info.video || {};
    const m3u8 = (vd.sources && (vd.sources["240"] || vd.sources["480"])) || "";
    if (!m3u8) { $D("dd-pstat").textContent = "未获取到播放地址"; return; }
    $D("dd-pstat").textContent = "播放地址已获取, 正在加载…";
    // 经 Worker 取 m3u8 并重写分片/密钥 URL 为 Worker 代理(跨域 CORS)
    const m3u8Text = await (await toFetch(playProxyUrl(m3u8))).text();
    const rewritten = m3u8Text.replace(/(https?:\/\/[^\s"'<>]+)/g, (m) => playProxyUrl(m));
    const blobUrl = URL.createObjectURL(new Blob([rewritten], { type: "application/vnd.apple.mpegurl" }));
    if (window.Hls && Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 60 }); DD.hls = hls;
      hls.loadSource(blobUrl); hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { $D("dd-pstat").textContent = ""; video.play().catch(() => $D("dd-pstat").textContent = "请点击播放器播放"); });
      hls.on(Hls.Events.ERROR, (e, data) => { if (data && data.fatal) $D("dd-pstat").textContent = "播放出错: " + (data.type || ""); });
    } else {
      video.src = blobUrl; $D("dd-pstat").textContent = "";
      video.play().catch(() => $D("dd-pstat").textContent = "请点击播放器播放");
    }
  } catch (e) { $D("dd-playbtn").style.display = "flex"; $D("dd-pstat").textContent = "播放失败: " + String(e).slice(0, 60); }
}

function closeDubbingDetail() {
  $D("dub-detail").style.display = "none";
  if (location.hash.startsWith("#/dub/")) { const h = location.hash.replace(/^#\/dub\/[^/]*/, "#/home/ai_dubbing"); history.replaceState(null, "", h); switchSite("home", "ai_dubbing"); }
  if (DD.hls) { try { DD.hls.destroy(); } catch (_) {} DD.hls = null; }
  const v = $D("dd-video"); v.pause(); v.removeAttribute("src");
}

document.addEventListener("DOMContentLoaded", () => {
  const back = $D("dd-back"); if (back) back.onclick = closeDubbingDetail;
  const pb = $D("dd-playbtn"); if (pb) pb.onclick = onDdPlay;
  const m = location.hash.match(/^#\/dub\/([^/]+)/);
  if (m) openDubbingDetail(decodeURIComponent(m[1]), null);
});
