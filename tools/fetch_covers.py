#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
封面本地化(修复"图片不显示")
============================
背景: avnight 接口的 cover64/thumb64 URL, 响应体是 **base64 文本 + 前导 'a' 混淆**
      (服务端防盗链)。网页 <img src=coverURL> 直接加载 base64 文本 → 无法显示。
正解: 用 download_cover 同款逻辑(去混淆 + 补 padding + base64 解码 + 魔数识图),
      把封面下载解码成**本地真图**存到 frontend/data/covers/,
      并把 cards 的 cover 改为本地路径 "data/covers/<file>", 前端 <img> 直接加载本地图。

用法: python3 tools/fetch_covers.py [--cards frontend/data/cards]
说明: 若封面 CDN(vstonlook) 返回 530/503(外部不可达), 该图跳过 → 卡片走文字海报兜底;
      将来 CDN 恢复后再跑本脚本即自动补全本地封面。
"""
import argparse, base64, os, sys
from pathlib import Path
import requests

ROOT = Path(__file__).parent.parent
_MAGIC = [(b"\xff\xd8\xff", "jpg"), (b"\x89PNG", "png"), (b"RIFF", "webp"), (b"GIF8", "gif"), (b"BM", "bmp")]
UA = "okhttp/3.12.10"
NO_PROXY = ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY")
VISITED = {}   # 缓存 URL -> 结果, 避免重复下载


def _ext(data):
    for m, e in _MAGIC:
        if data.startswith(m):
            return e
    return None


def decode_cover(raw: bytes):
    """URL 响应 -> 真实图片字节(兼容 base64+前导混淆 / 直接图片流); (bytes, ext) 或 (None,None)"""
    text = raw.strip()
    if text and not text.startswith((b"http", b"<", b"{", b"\x89", b"\xff", b"R")):
        for cut in range(0, 4):               # 原样 + 去前 1-3 个混淆字符
            cand = text[cut:]
            pad = (-len(cand)) % 4
            try:
                data = base64.b64decode(cand + b"=" * pad, validate=False)
            except Exception:
                continue
            ext = _ext(data)
            if ext:
                return data, ext
    ext = _ext(raw)
    return (raw, ext) if ext else (None, None)


def fetch_one(url: str, save_dir: Path, key: str) -> str | None:
    """下载+解码一个封面, 存为 covers/<key>.<ext>; 成功返回文件名, 失败返回 None"""
    if key == "cover" or not key:
        return None
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=12)
        if r.status_code != 200:
            return None
        data, ext = decode_cover(r.content)
        if not data or not ext:
            return None
        fname = f"{key}.{ext}"
        (save_dir / fname).write_bytes(data)
        return fname
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cards", default=str(ROOT / "frontend" / "data" / "cards"))
    args = ap.parse_args()
    for k in NO_PROXY:
        os.environ.pop(k, None)
    covers_dir = ROOT / "frontend" / "data" / "covers"
    covers_dir.mkdir(parents=True, exist_ok=True)

    files = sorted(Path(args.cards).rglob("*.json"))
    total = updated = ok = failed = 0
    for f in files:
        if f.name == "index.json":
            continue
        arr = json_load(f)
        changed = False
        for card in arr:
            url = card.get("cover") or ""
            if not url or not url.startswith("http"):
                continue
            total += 1
            # 已缓存该 URL(同图): 复用
            if url in VISITED:
                fname = VISITED[url]
            else:
                key = (card.get("code") or card.get("key") or "cover").replace("/", "_")
                fname = fetch_one(url, covers_dir, key)
                VISITED[url] = fname
            if fname:
                card["cover"] = "data/covers/" + fname      # 前端相对根路径
                card["thumb"] = card.get("thumb", "")
                changed = True; ok += 1
            else:
                failed += 1
        if changed:
            arr.sort(key=lambda x: (x.get("type"), x.get("code") or x.get("key") or ""))
            json_dump(f, arr)
            updated += 1
    print(f"✅ 处理 {total} 个封面: 下载成功 {ok}, 失败(跳过/海报) {failed}, 更新文件 {updated}")
    print(f"📁 本地封面目录: {covers_dir} ({len(list(covers_dir.iterdir())) if covers_dir.exists() else 0} 个文件)")


def json_load(p): return __import__("json").loads(p.read_text(encoding="utf-8"))
def json_dump(p, o): p.write_text(__import__("json").dumps(o, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
