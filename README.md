# AVNight 展示站

把 AVNight 逆向成果(接口文档 + 真实响应样本 + API 控制台)做成公网可浏览的静态站。

## 架构

```
公网(GitHub Pages 静态): 文档 / 数据浏览 / 控制台回放 — 无真实 API 调用
私有(Cloudflare Worker): 真实调用代理 + token 管理(默认关闭 ALLOW_REAL_CALLS)
```

## 快速开始(本地预览)

```bash
cd frontend && python3 -m http.server 8000   # 浏览器打开 http://localhost:8000
```

生成数据(frontend/data 已作为产物入库, 不依赖 avnight_api 在线):

```bash
python3 tools/build.py --source /path/to/avnight_api   # 重新生成 frontend/data + worker 白名单
python3 -m unittest tools.tests.test_build             # 单元测试
git add frontend/data worker/src/whitelist.json && git commit   # 数据变更后提交(CI 自动发布)
```

## 启用真实调用(可选, 需 Cloudflare)

1. 建 KV namespace, 把 id 填入 `worker/wrangler.toml`
2. 部署 Worker: `wrangler deploy worker/wrangler.toml --var ALLOW_REAL_CALLS:true`
3. 把地址填入 `frontend/app.js` 的 `CONFIG.workerUrl`

## 目录

```
frontend/   静态站(index.html + app.js + styles.css + marked.js + data/ + docs/)
worker/     Cloudflare Worker 代理(src/index.js + wrangler.toml)
tools/      build.py(数据管道) + tests/
scripts/    本地服务脚本
```

## 合规说明

内容按用户知情选择**保持原样**展示(含敏感类目)。token 字段已在数据管道脱敏为 `__REDACTED__`。
被下架/需私有时: 用 `scripts/serve_local.sh` 本地/局域网展示。
