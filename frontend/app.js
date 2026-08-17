/* AVNight 展示站 — 前端逻辑(三 Tab: 文档/数据浏览/控制台) */
"use strict";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* 私有 Worker 地址(真实调用). 留空 = 纯回放. 例: "https://avnight-proxy.xxx.workers.dev" */
const CONFIG = { workerUrl: "https://avnight-proxy.157676363.workers.dev" }; // 真实调用 Worker

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
  const inMode = typeof api.method !== "undefined" ? "GET" : api.method;
  const params = (api.params || []).map((p, i) =>
    '<div class="param-row"><label>' + esc(p.name) + (p.required ? " *" : "") + "</label>" +
    '<input id="p' + i + '" placeholder="' + esc(p.example || "") + '" ' +
    (p.workerInjected ? "disabled title='Worker 注入, 前端不填'" : "") + "></div>").join("");
  $("#api-form-area").innerHTML =
    '<div><span id="api-method" class="' + inMode + '">' + inMode + "</span>" +
    '<span id="api-path"> ' + esc(api.path) + "</span>" +
    (api.liveOnly ? '<span class="tag live">仅真实</span>' : '<span class="tag replay">回放</span>') +
    '<span class="tag replay">模式</span></div>' +
    params +
    '<div class="note">' + esc(api.note || "") + "</div>" +
    '<button id="api-replay-btn">▶ 回放</button> ' +
    '<button id="api-live-btn" ' + (CONFIG.workerUrl ? "" : "disabled title='未配置私有 Worker(见 app.js CONFIG.workerUrl)'") + ">⚡ 真实调用</button>";
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

/* 回放: 读本地样本 */
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

/* 真实调用: 经私有 Worker 代理 */
async function callLive(api, args) {
  const box = $("#api-response");
  box.textContent = "⚡ 真实调用 " + api.path + "\n";
  const path = api.path.split("?")[0];
  const q = new URLSearchParams();
  (api.params || []).forEach((p) => { if (p.type === "path") return; if (args[p.name]) q.set(p.name, args[p.name]); });
  const pathFilled = (api.path.split("?")[0]).replace(/\{(\w+)\}/g, (_, n) => args[n] || "{MISSING}");
  const qs = q.toString();
  const url = CONFIG.workerUrl + "/proxy" + pathFilled + (qs ? "?" + qs : "");
  if (url.includes("{MISSING}")) {
    box.textContent = "❌ 缺少必填路径参数, 无法构造 URL";
    return;
  }
  box.textContent += "→ " + url + "\n";
  try {
    const resp = await fetch(url);
    if (resp.status === 429) {
      box.textContent += "\n⚠️ 429 触发服务端限流 — 已降级为回放(建议稍后再试或使用回放模式)";
      const txt = await resp.text();
      box.textContent += "\n" + txt;
      return;
    }
    if (resp.status === 403) {
      box.textContent += "\n⛔ 403 — Worker 未开启真实调用(需私有实例设置 ALLOW_REAL_CALLS=true)";
      return;
    }
    const txt = await resp.text();
    box.textContent += "\nHTTP " + resp.status + "\n" + (txt.slice(0, 200000));
  } catch (e) {
    box.textContent += "\n❌ 网络错误: " + e + "\n(降级建议: 使用回放模式 / 检查 CONFIG.workerUrl)";
  }
}

/* 初始 */
loadDocs();
