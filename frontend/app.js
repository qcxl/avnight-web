/* AVNight 展示站 — 前端逻辑
   II 期: 左菜单(逆向展示站/首页/VIP/分类) + 子Tab内容卡片; 逆向展示站保留 文档/数据浏览/API控制台 */
"use strict";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* 私有 Worker 地址(真实调用). 留空 = 纯回放 */
const CONFIG = { workerUrl: "https://avnight-proxy.157676363.workers.dev" };

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
/* ===== AI中配 Tab 专门渲染(chinese_dubbing) ===== */
function dubMedia(url, fbCls, title) {
  const box=document.createElement("div"); box.className=fbCls+"-img";
  if (url){ const img=document.createElement("img"); img.loading="lazy"; img.alt=""; img.src=url;
    img.onerror=()=>{ box.innerHTML='<div class="'+fbCls+'-fb"><span>'+esc(title||"")+'</span></div>'; };
    box.appendChild(img);
  } else { box.innerHTML='<div class="'+fbCls+'-fb"><span>'+esc(title||"")+'</span></div>'; }
  return box;
}
function hmedia(v){ // 横滑单集卡(封面上图下文)
  const el=document.createElement("div"); el.className="hmedia-card"; el.title=v.title||"";
  const m=dubMedia(v.cover64, "hm", v.title||v.code||""); el.appendChild(m);
  const t=document.createElement("div"); t.className="hm-title"; t.textContent=v.title||v.code||"";
  el.appendChild(t); return el;
}
function collectionVideo(v){ // item 下方横滑视频卡
  const el=document.createElement("div"); el.className="ci-video"; el.title=v.title||"";
  const m=dubMedia(v.cover64, "cv", v.title||v.code||""); el.appendChild(m);
  const t=document.createElement("div"); t.className="cv-title"; t.textContent=v.title||v.code||"";
  el.appendChild(t); return el;
}
function collectionItem(it){ // 左小图+右文字(collection_type/title) + 下方横滑 videos
  const el=document.createElement("div"); el.className="collection-item";
  const head=document.createElement("div"); head.className="ci-head";
  const m=document.createElement("div"); m.className="ci-media";
  if(it.cover64){ const img=document.createElement("img"); img.loading="lazy"; img.alt=""; img.src=it.cover64; img.onerror=()=>{m.classList.add("ci-fb")}; m.appendChild(img);} else m.classList.add("ci-fb");
  head.appendChild(m);
  const info=document.createElement("div"); info.className="ci-info";
  const ty=document.createElement("div"); ty.className="ci-type"; ty.textContent=it.collection_type||"";
  const ti=document.createElement("div"); ti.className="ci-title"; ti.textContent=it.title||"";
  info.appendChild(ty); info.appendChild(ti); head.appendChild(info); el.appendChild(head);
  const vids=document.createElement("div"); vids.className="ci-videos";
  (it.videos||[]).forEach(v=>vids.appendChild(collectionVideo(v)));
  el.appendChild(vids); return el;
}
async function loadAiDubbing(grid) {
  grid.innerHTML='<div class="placeholder">加载中…</div>';
  try{
    const [ms,coll]=await Promise.all([
      (await fetch("data/home/chineseDubbingMainscreen.json")).json().catch(()=>({currently_airing:{}})),
      (await fetch("data/home/chineseDubbingCollections.json")).json().catch(()=>({data:[],next:0}))
    ]);
    const wrap=document.createElement("div"); wrap.className="ai-wrap";
    const ca=ms.currently_airing||{};
    [ {title:"日本AV深夜剧场",sub:"中文配音加持,越夜越来劲",list:ca.LONG||[]},
      {title:"里番次元剧场",sub:"中文声线入戏,剧情越走越带劲",list:ca.ANIMATION||[]}
    ].forEach(sec=>{
      const s=document.createElement("section"); s.className="hero-section";
      const t=document.createElement("div"); t.className="hero-title"; t.textContent=sec.title;
      const sub=document.createElement("div"); sub.className="hero-sub"; sub.textContent=sec.sub;
      s.appendChild(t); s.appendChild(sub);
      const hs=document.createElement("div"); hs.className="hscroll";
      (sec.list||[]).forEach(v=>hs.appendChild(hmedia(v)));
      s.appendChild(hs); wrap.appendChild(s);
      const g=document.createElement("div"); g.className="hero-gap"; wrap.appendChild(g);
    });
    // 最新/最热/最推 三Tab
    const TYPES=[{k:"new",l:"最新"},{k:"hot",l:"最热"},{k:"recommend",l:"最推"}];
    const tabs=document.createElement("div"); tabs.className="dub-tabs";
    const listBox=document.createElement("div"); listBox.className="collection-list";
    const more=document.createElement("button"); more.className="ai-more"; more.textContent="加载更多";
    let curType="new", curNext=0, moreUrl=null;
    function resetTabs(activeBtn){ tabs.querySelectorAll(".dub-tab").forEach(x=>x.classList.toggle("active",x===activeBtn)); }
    TYPES.forEach(tp=>{ const b=document.createElement("button"); b.className="dub-tab"+(tp.k==="new"?" active":"");
      b.textContent=tp.l; b.onclick=()=>{ resetTabs(b); curType=tp.k; curNext=0; loadDubs(true); };
      tabs.appendChild(b); });
    async function loadDubs(reset){
      if(reset){ listBox.innerHTML=""; more.disabled=false; more.textContent="加载更多"; }
      const mk=(base)=>{ try{ const u=new URL(base); if(reset&&curNext===0)u.searchParams.set("next","0"); else if(!reset&&curNext)u.searchParams.set("next",String(curNext)); return u.href; }catch(e){ return base; } };
      try{
        if(CONFIG.workerUrl){
          let url=CONFIG.workerUrl+"/proxy/chinese_dubbing/collections?type="+curType+"&order_by=DESC"+(curNext?"&next="+curNext:"");
          const r=await fetch(url); const j=await r.json();
          const data=j.data||[]; const nxt=j.next;
          data.forEach(it=>listBox.appendChild(collectionItem(it)));
          if(nxt===0||!data.length){ more.disabled=true; more.textContent="没有更多了"; } else curNext=nxt;
        } else {
          // 回放: 首次用样本; 更多标记
          if(reset){ (coll.data||[]).forEach(it=>listBox.appendChild(collectionItem(it))); }
          more.disabled=true; more.textContent="(回放样本; 配置 Worker 可真实分页/换type)";
        }
      }catch(e){ if(reset){ (coll.data||[]).forEach(it=>listBox.appendChild(collectionItem(it))); } more.disabled=true; }
    }
    wrap.appendChild(tabs); wrap.appendChild(listBox); wrap.appendChild(more);
    grid.innerHTML=""; grid.appendChild(wrap);
    more.onclick=()=>loadDubs(false);
    loadDubs(true);
  }catch(e){ grid.innerHTML='<div class="placeholder">加载失败: '+esc(e)+'</div>'; }
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
