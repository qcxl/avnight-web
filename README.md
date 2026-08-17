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


## 部署路线 B(推荐): Cloudflare Pages 托管

域名在 Cloudflare 管理时最省事——托管/DNS/SSL/CDN 全部一家搞定, 无需 GitHub Pages 那套 CNAME 手动验证。

### 手动配置(面板操作, 需 Cloudflare 与 GitHub 授权)

1. 登录 https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 首次点击会跳到 GitHub 安装 **Cloudflare Pages** GitHub App 到账号 `qcxl`, 只勾选 `avnight-web` 仓库 → Install
3. **Build settings**:
   ```
   Project name:      avnight-web
   Framework preset:  None
   Build command:     echo "noop"                      # 产物(frontend/)已入库, 无需重建
   Build output dir:  frontend
   ```
4. Save and Deploy → 首轮发布到 `avnight-web.pages.dev`
5. 部署成功后 → **Custom domains** → Add custom domain → 填 `www.pyenv.cn`
   (Cloudflare 自动加 DNS 记录 + 签发 SSL, 代理默认开启)

### 可选: 关闭 GitHub Pages 侧的自定义域名

`qcxl` 账号 GitHub Pages 当前把 github.io 301 到 www.pyenv.cn(死链)。
走 Cloudflare Pages 后 DNS 由 Cloudflare 决定, GitHub 301 不影响新站点, 但建议在
GitHub → Settings → Pages 里清空 Custom domain 避免混淆。

### 可选: R2 存数据

你已有 R2 S3 凭据(访问密钥 d4455... + 端点 e5255fac...r2.cloudflarestorage.com)。
若数据量大, 可把 frontend/data 上传到 R2 桶, 用 Cloudflare 的 R2 → Pages 绑定(custom domain 或 fetch handler)托管。

### 一键上传 frontend/data 到 R2(S3 客户端示例)

```bash
# 用 aws cli(s3api 兼容) 或 rclone
export AWS_ACCESS_KEY_ID=d44556f68e228b32515b258a6c676408
export AWS_SECRET_ACCESS_KEY=710e1dc7...
export AWS_ENDPOINT_URL=https://e5255fac5c2538d361eeca869d10cf62.r2.cloudflarestorage.com
aws s3 sync frontend/data s3://<bucket>/ --endpoint-url $AWS_ENDPOINT_URL
```
