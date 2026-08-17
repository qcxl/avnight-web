/**
 * AVNight 展示站 — Cloudflare Worker 私有代理
 * ============================================
 * 职责:
 *   GET  /proxy/token         获取/刷新 visitor token(KV 缓存, TTL 6 天)
 *   GET  /proxy/v3/*          代理 avnight API(Authorization 注入) + 401 重取重试 + 响应脱敏
 *   OTHER                    403(白名单外) / 404
 *
 * 开关:
 *   env.ALLOW_REAL_CALLS = "true"(私有实例) — 允许真实代理
 *   默认 "false"(公网实例只回放, 无 Worker 依赖; 此处返回 403)
 *
 * 构建: tools/build.py 生成 whitelist.json(白名单路径) 到本目录
 */
import whitelist from "./whitelist.json";

const API_BASE = "https://api.atzxyff.com";       // 主 API 域名(CDN 池, 可轮换)
const DEVICE_ID = "avnight_web_visitor_001";       // 固定 device_id(签名用)
const CHANNEL = "Night_Official_SPapk";
const KV_KEY = "visitor_token";
const TTL_MS = 6 * 24 * 3600 * 1000;               // 6 天 < 7 天 JWT 有效期
const TOKEN_FIELDS = new Set(["token", "authorization", "x-avnight-string", "access_token"]);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8",
               "access-control-allow-origin": "*" },
  });
}

/* 递归脱敏 token 类字段(与 build.py redact 一致) */
function redact(o) {
  if (Array.isArray(o)) return o.map(redact);
  if (o && typeof o === "object") {
    const r = {};
    for (const [k, v] of Object.entries(o)) {
      r[k] = (TOKEN_FIELDS.has(k) && typeof v === "string" && v.length > 20)
        ? "__REDACTED__" : redact(v);
    }
    return r;
  }
  return o;
}

async function getToken(env) {
  // KV 缓存命中且未过期
  const cached = await env.AVNIGHT_KV.get(KV_KEY, "json").catch(() => null);
  if (cached && Date.now() < cached.exp) {
    return cached.token;
  }
  // 重新获取
  const url = `${API_BASE}/v3/202306/visitor?device_id=${DEVICE_ID}&platform=android&channel_code=${CHANNEL}`;
  const r = await fetch(url, { headers: { "accept": "application/json", "user-agent": "okhttp/3.12.10" } });
  if (!r.ok) throw new Error("visitor fetch failed " + r.status);
  const j = await r.json();
  const token = j.token;
  await env.AVNIGHT_KV.put(KV_KEY, JSON.stringify({ token, exp: Date.now() + TTL_MS }), { expirationTtl: Math.floor(TTL_MS / 1000) });
  return token;
}

async function proxyV3(env, urlPath, req) {
  if (env.ALLOW_REAL_CALLS !== "true") {
    return json({ ok: false, error: "真实调用未开启(公网实例只回放)" }, 403);
  }
  // 白名单校验(正则匹配, 支持路径模板参数)
  const matched = whitelist.some((p) => new RegExp("^" + p + "$").test(urlPath));
  if (!matched) return json({ ok: false, error: "路径不在白名单" }, 403);

  // 注入 Authorization
  const token = await getToken(env);
  const target = API_BASE + urlPath;
  const method = req.method;
  const headers = new Headers(req.headers);
  headers.set("authorization", "Bearer " + token);
  headers.set("user-agent", "okhttp/3.12.10");
  headers.set("accept", "application/json");

  // 首次转发
  let resp = await fetch(target, { method, headers, body: method === "GET" ? undefined : await req.text() });
  if (resp.status === 401) {
    // 401 → 强制重取 token, 重试一次
    await env.AVNIGHT_KV.delete(KV_KEY).catch(() => {});
    const token2 = await getToken(env);
    headers.set("authorization", "Bearer " + token2);
    resp = await fetch(target, { method, headers, body: req.bodyUsed ? undefined : await req.arrayBuffer(), });
  }

  // 响应脱敏(JSON)
  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("json")) {
    const j = await resp.json();
    return json(redact(j), resp.status);
  }
  const buf = await resp.arrayBuffer();
  return new Response(buf, {
    status: resp.status,
    headers: { "content-type": ct, "access-control-allow-origin": "*" },
  });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { "access-control-allow-origin": "*",
                   "access-control-allow-methods": "GET,POST,OPTIONS",
                   "access-control-allow-headers": "content-type,authorization" },
      });
    }

    // 纵深防御: 路径穿越 + 空段拦截(白名单正则外第二道)
    if (path.includes("..") || path.includes("//")) {
      return json({ ok: false, error: "非法路径" }, 400);
    }

    if (path === "/proxy/token") {
      try {
        const token = await getToken(env);
        return json({ ok: true, token: "__REDACTED__" });  // 不暴露真实 token
      } catch (e) {
        return json({ ok: false, error: String(e) }, 500);
      }
    }

    if (path.startsWith("/proxy/v3/") && req.method === "GET") {
      return proxyV3(env, path.slice("/proxy".length), req);
    }

    return json({ ok: false, error: "not found" }, 404);
  },
};
