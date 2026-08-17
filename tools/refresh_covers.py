#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
补抓封面(封面缺失修复)
========================
背景: cards 样本里的封面是旧 CDN 池(如 vstonlook v4/v6), 域名已轮换失效。
办法: 真实调用各子Tab对应的列表接口, 收集 {code: 当前cover64} 映射,
      刷新 frontend/data/cards/**/*.json 中匹配 code 的 cover/thumb 字段。
      封面 URL 更新后, 公网浏览器可加载(本机可能连不上 vstonlook, 但不影响公网)。

用法: python3 tools/refresh_covers.py [--source <avnight_api路径>]
输出: 更新统计 + 写回 cards
注意: 会真实调用 avnight 服务端(触发接口), 可能有限流, 每调用间隔 2s, 失败跳过。
"""
import argparse, json, os, sys, time
from pathlib import Path

AVNIGHT = Path("/Users/weifeng/PycharmProjects/Spider/avnight_api")
NO_PROXY = ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy","ALL_PROXY")

# 子Tab场景 -> 列表接口(返回视频列表含 cover64)
SOURCES = [
    (["/v3/new/videos"], {"next": "0"}),                 # 最新
    (["/v3/chinese_dubbing/mainscreen"], {}),            # AI中配/中字
    (["/v3/clean_mosaic/leaderboard"], {}),              # 去码
    (["/v3/clean_mosaic/schedule"], {}),
    (["/v3/breast_coin_video/bonus"], {}),               # 奶币
    (["/v3/comic"], {}),                                 # 动漫
    (["/v3/comic/hot"], {}),
    (["/v3/anime/hot"], {}),
    (["/v3/anime/all"], {}),
    (["/v3/video_clip"], {"tz": "Asia/Taipei"}),         # 短视频
    (["/v3/category/actors"], {}),                       # 分类-女优
    (["/v3/category/top_actors"], {}),
    (["/v3/genre/"], {}),                                # 分类-类型
]

def collect(obj, m):
    """递归收集 code -> 首个 cover64/thumb64"""
    if isinstance(obj, dict):
        code = obj.get("code") or obj.get("video_code")
        if code:
            c = obj.get("cover64") or obj.get("thumb64")
            t = obj.get("thumb64") or obj.get("cover64")
            if c and isinstance(c, str) and c.startswith("http"):
                m[str(code)] = (c, t if isinstance(t, str) and t.startswith("http") else "")
        for v in obj.values():
            collect(v, m)
    elif isinstance(obj, list):
        for x in obj:
            collect(x, m)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", default=str(AVNIGHT))
    ap.add_argument("--cards", default=str(Path(__file__).parent.parent / "frontend" / "data" / "cards"))
    args = ap.parse_args()
    for k in NO_PROXY:
        os.environ.pop(k, None)
    sys.path.insert(0, args.source)
    from client import ApiClient

    c = ApiClient()
    try:
        tok = c.get_visitor_token(device_id="f413d4ef3f36c416")
        print(f"✅ token ok={bool(tok)}")
    except Exception as e:
        print("❌ token:", e); return 1

    mapping = {}
    for paths, params in SOURCES:
        for path in paths:
            try:
                r = c.get(path, params)
                if r.status_code != 200:
                    print(f"  ⚠️ {path} HTTP {r.status_code}"); time.sleep(2); continue
                collect(r.json(), mapping)
                print(f"  ✅ {path}: 累计映射 {len(mapping)}")
            except Exception as e:
                print(f"  ⚠️ {path}: {type(e).__name__} {str(e)[:60]}")
            time.sleep(2)
    print(f"\n共收集 {len(mapping)} 个 code->cover 映射")

    cards_root = Path(args.cards)
    updated = skipped = 0
    for f in sorted(cards_root.rglob("*.json")):
        if f.name == "index.json":
            continue
        arr = json.loads(f.read_text(encoding="utf-8"))
        changed = False
        for card in arr:
            if card.get("type") != "video":
                continue
            code = card.get("code")
            if code and code in mapping:
                cov, thumb = mapping[code]
                if cov != card.get("cover") or thumb != card.get("thumb"):
                    card["cover"] = cov
                    card["thumb"] = thumb or card.get("thumb", "")
                    changed = True
        if changed:
            arr.sort(key=lambda x: (x.get("type"), x.get("code") or x.get("key") or ""))
            f.write_text(json.dumps(arr, ensure_ascii=False, indent=1), encoding="utf-8")
            updated += 1
    print(f"✅ 更新 {updated} 个卡片文件(其余无匹配/无变化)")
    print("提示: 封面 URL 已刷新, push 后公网可加载新封面; 未匹配的 code 仍为文字海报。")


if __name__ == "__main__":
    sys.exit(main())
