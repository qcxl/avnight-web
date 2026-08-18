// GENERATED service-worker bundle (single file, no imports)
const whitelist = ["^(?!.*(\\.\\.))/v3/speed_test$", "^(?!.*(\\.\\.))/v3/android$", "^(?!.*(\\.\\.))/v3/202306/visitor$", "^(?!.*(\\.\\.))/v3/main_screen$", "^(?!.*(\\.\\.))/v3/main_screen/breast_coin_video$", "^(?!.*(\\.\\.))/v3/inform$", "^(?!.*(\\.\\.))/v3/country_codes$", "^(?!.*(\\.\\.))/v3/mkt_report$", "^(?!.*(\\.\\.))/v3/personal/menu$", "^(?!.*(\\.\\.))/v3/livebroadcast$", "^(?!.*(\\.\\.))/v3/livebroadcast/genres$", "^(?!.*(\\.\\.))/v3/livebroadcast/videos$", "^(?!.*(\\.\\.))/v3/livebroadcast/sponsors$", "^(?!.*(\\.\\.))/v3/chinese_dubbing/mainscreen$", "^(?!.*(\\.\\.))/v3/chinese_dubbing/collections$", "^(?!.*(\\.\\.))/v3/gong_chou/main_screen$", "^(?!.*(\\.\\.))/v3/new/subscriptions$", "^(?!.*(\\.\\.))/v3/new/subscriptions/videos$", "^(?!.*(\\.\\.))/v3/member/subscriptions$", "^(?!.*(\\.\\.))/v3/202212/folder/get$", "^(?!.*(\\.\\.))/v3/202212/folder/collection/get$", "^(?!.*(\\.\\.))/v3/202212/folder/comic/get$", "^(?!.*(\\.\\.))/v3/login$", "^(?!.*(\\.\\.))/v3/register$", "^(?!.*(\\.\\.))/v3/add_email$", "^(?!.*(\\.\\.))/v3/forgot_password/reset$", "^(?!.*(\\.\\.))/v3/info$", "^/v3/friend/(?!.*(\\.\\.)).*$", "^/v3/installed_records/(?!.*(\\.\\.)).*$", "^/v3/retention_records/(?!.*(\\.\\.)).*$", "^/v3/active_records/(?!.*(\\.\\.)).*$", "^/v3/actor/subscribe/(?!.*(\\.\\.)).*$", "^/v3/actor/unsubscribe/(?!.*(\\.\\.)).*$", "^/v3/follow/add/(?!.*(\\.\\.)).*$", "^/v3/follow/delete/(?!.*(\\.\\.)).*$", "^/v3/genre/subscribe/(?!.*(\\.\\.)).*$", "^/v3/genre/unsubscribe/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/videos$", "^(?!.*(\\.\\.))/v3/videos/info$", "^(?!.*(\\.\\.))/v3/videos/index/full/0$", "^(?!.*(\\.\\.))/v3/videos/tagged$", "^(?!.*(\\.\\.))/v3/video/[^/]+/info$", "^(?!.*(\\.\\.))/v3/video/[^/]+/suggestions$", "^(?!.*(\\.\\.))/v3/video_speed_test$", "^(?!.*(\\.\\.))/v3/new/videos$", "^(?!.*(\\.\\.))/v3/new/top/videos$", "^(?!.*(\\.\\.))/v3/recommend$", "^/v3/result/popular_week/video/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/result/topic/video$", "^(?!.*(\\.\\.))/v3/yt/hot/videos$", "^(?!.*(\\.\\.))/v3/video/[^/]+/highlight$", "^(?!.*(\\.\\.))/v3/watch/video/[^/]+$", "^(?!.*(\\.\\.))/v3/video_clip$", "^(?!.*(\\.\\.))/v3/video_clip/information_station$", "^(?!.*(\\.\\.))/v3/video_page_prompt_project$", "^(?!.*(\\.\\.))/v3/videos/page$", "^(?!.*(\\.\\.))/v3/refresh_token$", "^/v3/actor/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/actor/[^/]+$", "^(?!.*(\\.\\.))/v3/category/actors$", "^(?!.*(\\.\\.))/v3/category/top_actors$", "^/v3/category/search/(?!.*(\\.\\.)).*$", "^/v3/discover/genre/(?!.*(\\.\\.)).*$", "^/v3/genre/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/filter/category$", "^/v3/topics/(?!.*(\\.\\.)).*$", "^/v3/topic/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/video_clip/topic$", "^(?!.*(\\.\\.))/v3/company/[^/]+/videos$", "^(?!.*(\\.\\.))/v3/categorys$", "^(?!.*(\\.\\.))/v3/filter/category/[^/]+/[^/]+/videos$", "^(?!.*(\\.\\.))/v3/main_screen/popular_classic/comic$", "^(?!.*(\\.\\.))/v3/vip/topic$", "^(?!.*(\\.\\.))/v3/vip/ranking/videos$", "^/v3/breast_coin/buy/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/breast_coin/rebate_table$", "^(?!.*(\\.\\.))/v3/breast_coin_video/info$", "^(?!.*(\\.\\.))/v3/breast_coin_video/buy$", "^(?!.*(\\.\\.))/v3/breast_coin_video/bonus$", "^/v3/breast_coin_video/collections/(?!.*(\\.\\.)).*$", "^/v3/breast_coin_video/gossip/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/member/breast_coin_video/profit$", "^(?!.*(\\.\\.))/v3/exchange/redeem_code$", "^(?!.*(\\.\\.))/v3/breast_coin_video/[^/]+$", "^(?!.*(\\.\\.))/v3/breast_coin_video/collections/info$", "^(?!.*(\\.\\.))/v3/breast_coin_video/bonus/video_list$", "^(?!.*(\\.\\.))/v3/vip/categorys$", "^(?!.*(\\.\\.))/v3/vip/company$", "^(?!.*(\\.\\.))/v3/vip/dinabz$", "^(?!.*(\\.\\.))/v3/vip/fpie$", "^(?!.*(\\.\\.))/v3/vip/vr$", "^(?!.*(\\.\\.))/v3/vip/wumi/categorys$", "^(?!.*(\\.\\.))/v3/vip/wumi/comics$", "^(?!.*(\\.\\.))/v3/vip/wumi/videos$", "^(?!.*(\\.\\.))/v3/member_page/duration$", "^(?!.*(\\.\\.))/v3/member_page/genres$", "^(?!.*(\\.\\.))/v3/member_page/set_visibility$", "^(?!.*(\\.\\.))/v3/leaderboard/me$", "^/v3/gong_chou/(?!.*(\\.\\.)).*$", "^/v3/gong_chou/project/(?!.*(\\.\\.)).*$", "^/v3/gong_chou/visit/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/vip/actor$", "^(?!.*(\\.\\.))/v3/vip/anli$", "^(?!.*(\\.\\.))/v3/vip/topic/[^/]+/videos$", "^(?!.*(\\.\\.))/v3/fpie$", "^(?!.*(\\.\\.))/v3/vip_main_screen_2024$", "^(?!.*(\\.\\.))/v3/vip_main_screen_2024/high_energy/120-$", "^/v3/watch/livebroadcast/(?!.*(\\.\\.)).*$", "^/v3/live/kr/genre/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/comic$", "^/v3/comic/author/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/comic/category$", "^/v3/comic/content/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/comic/heaven/anime$", "^(?!.*(\\.\\.))/v3/comic/heaven/comic$", "^(?!.*(\\.\\.))/v3/comics/info$", "^/v3/result/popular_week/comic/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/result/topic/comic$", "^(?!.*(\\.\\.))/v3/xchina/models$", "^/v3/xchina/model/(?!.*(\\.\\.)).*$", "^/v3/xchina/models/country/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/chinese_dubbing/buy$", "^/v3/chinese_dubbing/collections/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/comic/all$", "^(?!.*(\\.\\.))/v3/comic/category/[^/]+/videos$", "^(?!.*(\\.\\.))/v3/comic/category/[^/]+/comics$", "^(?!.*(\\.\\.))/v3/comic/hot$", "^(?!.*(\\.\\.))/v3/xchina/collection/[^/]+$", "^(?!.*(\\.\\.))/v3/collection/add$", "^(?!.*(\\.\\.))/v3/collection/delete$", "^(?!.*(\\.\\.))/v3/collection/comic/add$", "^(?!.*(\\.\\.))/v3/collection/comic/delete$", "^(?!.*(\\.\\.))/v3/collections/info$", "^(?!.*(\\.\\.))/v3/folder/add$", "^(?!.*(\\.\\.))/v3/folder/delete$", "^/v3/folder/rename/(?!.*(\\.\\.)).*$", "^/v3/folder/update/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/folder/pin$", "^(?!.*(\\.\\.))/v3/folder/collection/add$", "^(?!.*(\\.\\.))/v3/folder/collection/delete$", "^(?!.*(\\.\\.))/v3/folder/collection/pin$", "^/v3/folder/collection/rename/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/folder/comic/add$", "^(?!.*(\\.\\.))/v3/folder/comic/delete$", "^/v3/import/folder/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/highlight/add$", "^(?!.*(\\.\\.))/v3/highlight/delete$", "^(?!.*(\\.\\.))/v3/wishes/add$", "^/v3/config/app/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/mission/check_in$", "^(?!.*(\\.\\.))/v3/draw/start$", "^(?!.*(\\.\\.))/v3/draw/reward_pool$", "^/v3/coupons/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/coupon/delete_used$", "^(?!.*(\\.\\.))/v3/coupon/delete_expired$", "^(?!.*(\\.\\.))/v3/download/info$", "^(?!.*(\\.\\.))/v3/download/history/overview$", "^/v3/download/video/(?!.*(\\.\\.)).*$", "^/v3/feedback/(?!.*(\\.\\.)).*$", "^/v3/search/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/clean_mosaic/help_power/boost$", "^(?!.*(\\.\\.))/v3/clean_mosaic/help_power/count$", "^(?!.*(\\.\\.))/v3/clean_mosaic/leaderboard$", "^(?!.*(\\.\\.))/v3/clean_mosaic/record$", "^(?!.*(\\.\\.))/v3/clean_mosaic/record/delete$", "^(?!.*(\\.\\.))/v3/clean_mosaic/record/schedule$", "^/v3/studio/(?!.*(\\.\\.)).*$", "^/v3/vr_studio/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/vr_studio/tab$", "^/v3/onlyfans/actor/(?!.*(\\.\\.)).*$", "^/v3/ytstudio/(?!.*(\\.\\.)).*$", "^/v3/index_viewer/(?!.*(\\.\\.)).*$", "^(?!.*(\\.\\.))/v3/yt/studios$", "^(?!.*(\\.\\.))/v3/yt/new/videos$", "^(?!.*(\\.\\.))/API/GetDevice$", "^(?!.*(\\.\\.))/API/GetConfig$", "^(?!.*(\\.\\.))/v3/anime/all$", "^(?!.*(\\.\\.))/v3/anime/hot$", "^(?!.*(\\.\\.))/v3/deepfake/actors$", "^(?!.*(\\.\\.))/v3/deepfake/actor/[^/]+/videos$", "^(?!.*(\\.\\.))/v3/deepfake/actor/[^/]+/collections$", "^(?!.*(\\.\\.))/v3/deepfake/collection/[^/]+$", "^(?!.*(\\.\\.))/v3/lite/category/[^/]+/videos$", "^(?!.*(\\.\\.))/v3/onlyfans$", "^(?!.*(\\.\\.))/v3/onlyfans/fever/videos$", "^(?!.*(\\.\\.))/v3/clean_mosaic/schedule$", "^(?!.*(\\.\\.))/v3/clean_mosaic/[^/]+/count$"];

// 全局 KV binding(service worker 格式经 metadata bindings 注入为全局变量)
const KV = (typeof AVNIGHT_KV !== 'undefined') ? AVNIGHT_KV : null;
const envGet = (k) => KV ? KV.get(k, 'json').catch(() => null) : Promise.resolve(null);
const envPut = (k, v, o) => KV ? KV.put(k, v, o).catch(() => {}) : Promise.resolve();
const envDelete = (k) => KV ? KV.delete(k).catch(() => {}) : Promise.resolve();

const API_BASE = "https://api.atzxyff.com";
const DEVICE_ID = "avnight_web_visitor_001";
const CHANNEL = "Night_Official_SPapk";
const KV_KEY = "visitor_token";
const TTL_MS = 6 * 24 * 3600 * 1000;
const TOKEN_FIELDS = new Set(["token","authorization","x-avnight-string","access_token"]);

function json(body, status) {
  return new Response(JSON.stringify(body), { status: status || 200,
    headers: { "content-type":"application/json; charset=utf-8", "access-control-allow-origin":"*" } });
}
// 播放代理: 转发 m3u8/分片/密钥(跨域 CORS), host 白名单防 SSRF
const PLAY_HOSTS = ["api.atzxyff.com", "cel.hscammq.com"];
const PLAY_SUFFIX = ["atzxyff.com", "hscammq.com"];
async function playProxy(u, req, method) {
  if (!u || !/^https?:\/\//i.test(u)) return json({ ok:false, error:"bad url" }, 400);
  const host = new URL(u).host.toLowerCase();
  if (!PLAY_SUFFIX.some((sfx) => host === sfx || host.endsWith("." + sfx)))
    return json({ ok:false, error:"host not allowed" }, 403);
  const headers = new Headers(req ? req.headers : undefined);
  headers.set("user-agent", "okhttp/3.12.10");
  const resp = await fetch(u, { method: method || "GET", headers,
    body: method && method !== "GET" ? await req.text() : undefined });
  const out = new Response(resp.body, { status: resp.status,
    headers: { "content-type": resp.headers.get("content-type") || "application/octet-stream",
      "access-control-allow-origin": "*", "cache-control":"no-store" } });
  return out;
}
function redact(o) {
  if (Array.isArray(o)) return o.map(redact);
  if (o && typeof o === "object") { const r = {};
    for (const [k,v] of Object.entries(o)) r[k] = (TOKEN_FIELDS.has(k) && typeof v === "string" && v.length > 20) ? "__REDACTED__" : redact(v);
    return r; }
  return o;
}
async function getToken() {
  const cached = await envGet(KV_KEY);
  if (cached && Date.now() < cached.exp) return cached.token;
  const url = API_BASE + "/v3/202306/visitor?device_id=" + DEVICE_ID + "&platform=android&channel_code=" + CHANNEL;
  const r = await fetch(url, { headers: { "accept":"application/json", "user-agent":"okhttp/3.12.10" } });
  if (!r.ok) throw new Error("visitor fetch failed " + r.status);
  const j = await r.json();
  await envPut(KV_KEY, JSON.stringify({ token: j.token, exp: Date.now() + TTL_MS }), { expirationTtl: Math.floor(TTL_MS/1000) });
  return j.token;
}
async function proxy(path, req) {
  if (typeof ALLOW_REAL_CALLS === 'undefined' || ALLOW_REAL_CALLS !== "true")
    return json({ ok:false, error:"真实调用未开启" }, 403);
  const matched = whitelist.some((p) => new RegExp("^" + p + "$").test(path));
  if (!matched) return json({ ok:false, error:"路径不在白名单" }, 403);
  const token = await getToken();
  const target = API_BASE + path;
  const headers = new Headers(req.headers);
  headers.set("authorization", "Bearer " + token);
  headers.set("user-agent", "okhttp/3.12.10");
  headers.set("accept", "application/json");
  let resp = await fetch(target, { method: req.method, headers, body: req.method === "GET" ? undefined : await req.text() });
  if (resp.status === 401) {
    await envDelete(KV_KEY);
    const token2 = await getToken();
    headers.set("authorization", "Bearer " + token2);
    resp = await fetch(target, { method: req.method, headers });
  }
  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("json")) { const j = await resp.json(); return json(redact(j), resp.status); }
  const buf = await resp.arrayBuffer();
  return new Response(buf, { status: resp.status, headers: { "content-type": ct, "access-control-allow-origin":"*" } });
}
async function handle(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: { "access-control-allow-origin":"*", "access-control-allow-methods":"GET,POST,OPTIONS", "access-control-allow-headers":"content-type,authorization" } });
  if (path === "/proxy/token") { try { await getToken(); return json({ ok:true, token:"__REDACTED__" }); } catch(e){ return json({ok:false,error:String(e)},500); } }
  if (path === "/proxy/play") return playProxy(url.searchParams.get("u") || "", req, req.method);
  if (path.startsWith("/proxy/v3/") && req.method === "GET") return proxy(path.slice("/proxy".length), req);
  return json({ ok:false, error:"not found" }, 404);
}
addEventListener("fetch", (event) => { event.respondWith(handle(event.request)); });
