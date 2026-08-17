#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AVNight 展示站 — 数据管道
==========================
读取 avnight_api 的 data/(218 样本)、docs/(6 文档)、endpoints.py(接口清单),
输出前端静态资源到 frontend/:

  frontend/data/index.json            样本索引(模块 -> 文件列表)
  frontend/data/<module>/<file>.json  样本(含 token 脱敏)
  frontend/data/samples/*.json        解密样本(vc_samples)
  frontend/data/manifest.json         接口清单(方法/路径/参数/sampleFile)
  frontend/docs/*.md                  文档(原样复制, 前端 marked 渲染)

用法: python3 tools/build.py [--source <avnight_api路径>]
"""
import argparse
import json
import re
import shutil
import sys
from pathlib import Path

TOKEN_FIELDS = {"token", "authorization", "x-avnight-string"}
KEEP_FIELDS = {"user_id", "device_id"}   # 用户知情选择保留


def redact(obj):
    """递归替换 token 类字段为占位符(user_id/device_id 保留)"""
    if isinstance(obj, dict):
        return {k: ("__REDACTED__" if k in TOKEN_FIELDS and isinstance(v, str) and len(v) > 20
                    else redact(v)) for k, v in obj.items()}
    if isinstance(obj, list):
        return [redact(i) for i in obj]
    return obj


def load_endpoints(endpoints_py: Path) -> list[dict]:
    """从 endpoints.py 提取接口清单(模块 -> key/path)"""
    src = endpoints_py.read_text(encoding="utf-8")
    mods = re.findall(r"^([A-Z_]+) = \{", src, re.M)
    apis = []
    cur_mod = "misc"
    for line in src.split("\n"):
        m = re.match(r'^([A-Z_]+) = \{', line)
        if m:
            cur_mod = m.group(1).lower()
            continue
        m = re.match(r'^\s*"([a-z0-9_]+)":\s*"([^"]+)"', line)
        if m:
            key, path = m.group(1), m.group(2)
            apis.append({"module": cur_mod, "key": key, "path": path})
    return apis


def guess_params(api: dict, data_dir: Path) -> list[dict]:
    """推断参数: 路径占位 + 常见 query 参数; token 类标记 worker_injected"""
    params = []
    for m in re.finditer(r"\{(\w+)\}", api["path"]):
        params.append({"name": m.group(1), "type": "path", "required": True, "example": "MISM-325-"})
    # 常见 query 参数(从文档规律: next/page/type/sort/order/order_by/is_collections)
    common = {"next": "0", "page": "1", "type": "new", "sort": "today",
              "order": "hot", "order_by": "onshelf_tm", "is_collections": "0",
              "video_type": "ngs", "platform": "android", "tz": "Asia/Taipei"}
    if "?" in api["path"]:
        for kv in api["path"].split("?")[1].split("&"):
            k = kv.split("=")[0]
            params.append({"name": k, "type": "query", "required": True,
                           "example": common.get(k, ""), "workerInjected": k in {"token", "authorization"}})
    return params


def match_sample(api: dict, data_dir: Path) -> str | None:
    """尝试匹配样本文件 data/<module>/<key驼峰>.json"""
    mod_dir = data_dir / api["module"]
    if not mod_dir.is_dir():
        return None
    # 尝试 key 的驼峰/原样
    for cand in {api["key"], api["key"].replace("_", ""),
                 api["key"].title().replace("_", "")}:
        for f in mod_dir.glob("*.json"):
            if f.stem.lower() in {cand.lower(), api["key"].lower()}:
                return f.name
    return None


# ==================== II 期: 内容卡片(cards) 数据管道 ====================
# 子Tab -> 样本 glob(从交接文档模块划分映射)。提取视频/演员卡片, 归一化+子Tab内去重, 幂等输出。
SITE_MENUS = {
    "home": [
        {"id": "ai_dubbing", "label": "AI中配",
         "samples": ["boot/chineseDubbing*.json", "home/chineseDubbing*.json", "comic/chineseDubbing*.json"]},
        {"id": "clean_mosaic", "label": "AI无码",
         "samples": ["home/cleanMosaic*.json", "misc/cleanMosaic*.json", "misc/deepfake*.json", "home/deepfake*.json", "misc/cleanMosaicRecord.json"]},
        {"id": "breast_coin", "label": "奶币福利", "samples": ["breast_coin/*.json"]},
        {"id": "latest", "label": "最新",
         "samples": ["home/newVideos.json", "video/newVideos.json", "home/newVideos_p20.json"]},
        {"id": "hot", "label": "热门",
         "samples": ["video/newTopVideos.json", "home/cleanMosaicLeaderboard.json", "video/resultPopularVideo.json", "video/videoHighlight.json"]},
        {"id": "comic", "label": "动漫",
         "samples": ["comic/comic*.json", "home/comic*.json", "home/anime*.json", "misc/anime*.json"]},
        {"id": "vclip", "label": "短视频",
         "samples": ["video/videoClip*.json", "misc/liteCategory*.json", "category/videoClipTopic.json", "misc/videoClip.json"]},
        {"id": "vip_circle", "label": "VIP色圈",
         "samples": ["home/vipMainScreen2024.json", "vip/vipMainScreen*.json", "vip/vipDinabz.json", "vip/vipVr.json", "misc/vrStudio*.json", "misc/vrStudioTab.json"]},
        {"id": "zhongzi", "label": "中字无码",
         "samples": ["boot/chineseDubbing*.json", "home/chineseDubbing*.json", "misc/cleanMosaic*.json"]},
    ],
    "vip": [
        {"id": "recommend", "label": "推荐",
         "samples": ["vip/vipMainScreen.json", "home/vipMainScreen2024.json", "vip/vipMainScreenHighEnergy.json"]},
        {"id": "videos", "label": "视频", "samples": ["vip/vipDinabz.json", "vip/vipVr.json", "vip/vipActor.json"]},
        {"id": "onlyfans", "label": "OnlyFans",
         "samples": ["home/onlyfans*.json", "misc/onlyfans*.json", "home/gongChouOnlyfans*.json", "misc/onlyfansActor*.json"]},
    ],
    "category": [
        {"id": "actors", "label": "AV女优",
         "samples": ["category/*actor*.json", "category/actors.json", "vip/vipActor.json", "misc/onlyfansActor*.json"]},
        {"id": "genres", "label": "视频类型",
         "samples": ["category/genre*.json", "category/mainScreenCategory*.json"]},
        {"id": "topics", "label": "驻站主编",
         "samples": ["video/resultTopicVideo.json", "category/videoClipTopic.json", "video/resultPopularVideo.json"]},
        {"id": "youtube", "label": "油管视频",
         "samples": ["misc/ytstudio.json", "misc/studio.json", "home/companyVideos.json", "category/companyVideos.json"]},
    ],
}
CARD_CAP_PER_LIST = 40   # 每个列表里最多取前 N 条, 避免超大
URL_FIELDS = ("cover64", "thumb64", "cover", "thumb", "avatar", "actor_thumb64")


def _first_url(d):
    for k in URL_FIELDS:
        v = d.get(k)
        if isinstance(v, str) and v.startswith(("http://", "https://")):
            return v
    return ""


def _norm_actor(d):
    name = d.get("name") or d.get("actor_name") or d.get("an") or ""
    cover = _first_url(d)
    if not name:
        return None
    return {"type": "actor", "key": str(d.get("id") or d.get("actor_id") or name),
            "name": name, "cover": cover,
            "country": d.get("country") or d.get("area") or ""}


def _norm_video(d):
    code = str(d.get("code") or d.get("video_code") or "")
    title = d.get("title") or d.get("video_name") or ""
    if not code and not title:
        return None
    dur = d.get("duration") or d.get("src_duration") or d.get("video_duration") or ""
    if isinstance(dur, (int, float)):
        dur = str(int(dur))
    if isinstance(dur, str) and not dur.strip():
        dur = ""
    def _list(v):
        return v if isinstance(v, list) else []
    return {"type": "video", "code": code, "title": title,
            "cover": _first_url(d), "thumb": d.get("thumb64") or d.get("cover64") or "",
            "duration": dur, "actors": _list(d.get("actors")), "genres": _list(d.get("genres"))}


def _is_actor_entry(d):
    return any(k in d for k in ("actor_type", "birthday", "birth", "cup", "collection_count")) and not d.get("code")


def _is_video_entry(d):
    return ("code" in d or "video_code" in d) and ("title" in d or "cover64" in d or "duration" in d)


def _is_entry(d):
    return _is_video_entry(d) or _is_actor_entry(d) or (bool(d.get("name")) and bool(_first_url(d)))


def _collect_cards(j, cards, seen):
    """递归收集卡片; 列表中按首元素判断类型; 子Tab 内按 (type,key) 去重"""
    if isinstance(j, list):
        if j and isinstance(j[0], dict):
            if _is_entry(j[0]):
                for it in j[:CARD_CAP_PER_LIST]:
                    card = None
                    if _is_video_entry(it):
                        card = _norm_video(it)
                    elif _is_actor_entry(it):
                        card = _norm_actor(it)
                    elif it.get("name"):
                        card = _norm_actor(it)
                    if card:
                        key = (card["type"], card.get("code") or card.get("key"))
                        if key not in seen:
                            seen.add(key)
                            cards.append(card)
                return
            for x in j:
                _collect_cards(x, cards, seen)
        return
    if isinstance(j, dict):
        for v in j.values():
            _collect_cards(v, cards, seen)


def build_cards(src_data: Path, data_out: Path) -> None:
    """生成 frontend/data/cards/<site>/<tab>.json + index.json(幂等: 稳定排序)"""
    cards_root = data_out / "cards"
    cards_root.mkdir(parents=True, exist_ok=True)
    site_index = {}
    total = 0
    for site, tabs in SITE_MENUS.items():
        (cards_root / site).mkdir(parents=True, exist_ok=True)
        tab_list = []
        for tab in tabs:
            seen = set()
            cards = []
            covers = set()
            for pat in tab["samples"]:
                for f in sorted(src_data.glob(pat)):
                    try:
                        j = json.loads(f.read_text(encoding="utf-8"))
                    except Exception:
                        continue
                    _collect_cards(j, cards, seen)
                    for c in cards:
                        if c.get("cover"):
                            covers.add(c["cover"])
            # 幂等: 按 (type, key) 稳定排序
            cards.sort(key=lambda c: (c["type"], c.get("code") or c.get("key") or ""))
            # 去重封面占位: 全部无封面 → 记 low_data? 卡片仍保留(文字卡)
            have_cover = sum(1 for c in cards if c.get("cover"))
            meta = {"id": tab["id"], "label": tab["label"], "count": len(cards),
                    "with_cover": have_cover, "low_data": len(cards) == 0}
            (cards_root / site / f"{tab['id']}.json").write_text(
                json.dumps(cards, ensure_ascii=False, indent=1), encoding="utf-8")
            tab_list.append(meta)
            total += len(cards)
        site_index[site] = tab_list
    (cards_root / "index.json").write_text(
        json.dumps(site_index, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✅ cards: {total} 张卡片 / {len(site_index)} 站点菜单")
    for site, tabs in site_index.items():
        for t in tabs:
            flag = "⚠️低数据" if t["low_data"] else (f"🖼{t['with_cover']}图" if t["with_cover"] else "🈚图")
            print(f"    {site}/{t['id']}: {t['count']} 卡 {flag}")

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", default="/Users/weifeng/PycharmProjects/Spider/avnight_api")
    ap.add_argument("--out", default=Path(__file__).parent.parent / "frontend")
    args = ap.parse_args()
    src = Path(args.source)
    out = Path(args.out)
    data_out = out / "data"
    docs_out = out / "docs"

    shutil.rmtree(data_out, ignore_errors=True)
    data_out.mkdir(parents=True, exist_ok=True)

    # 1) 样本复制 + 脱敏 + 索引
    index = {}
    src_data = src / "data"
    for mod_dir in sorted(p for p in src_data.iterdir() if p.is_dir()):
        files = sorted(mod_dir.glob("*.json"))
        if not files:
            continue
        (data_out / mod_dir.name).mkdir(parents=True, exist_ok=True)
        index[mod_dir.name] = []
        for f in files:
            try:
                j = json.loads(f.read_text(encoding="utf-8"))
                jr = redact(j)
                (data_out / mod_dir.name / f.name).write_text(
                    json.dumps(jr, ensure_ascii=False, indent=1), encoding="utf-8")
                index[mod_dir.name].append(f.name)
            except Exception as e:
                print(f"  ⚠️  {mod_dir.name}/{f.name}: {e}")
    (data_out / "index.json").write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")

    # 1.5) 内容卡片(II 期)
    build_cards(src_data, data_out)
    print(f"✅ 样本: {sum(len(v) for v in index.values())} 个(含 token 脱敏), 索引 {len(index)} 模块")

    # 2) 解密样本
    samples_src = src / "samples"
    if samples_src.is_dir():
        (data_out / "samples").mkdir(exist_ok=True)
        for f in samples_src.glob("*.json"):
            shutil.copy(f, data_out / "samples" / f.name)
        print(f"✅ 解密样本: 已复制到 data/samples/")

    # 3) 接口清单 manifest
    apis = load_endpoints(src / "endpoints.py")
    manifest = {}
    for api in apis:
        manifest.setdefault(api["module"], []).append({
            "key": api["key"], "path": api["path"], "method": "POST" if "/mkt_report" in api["path"] or "page" in api["path"] and "GET" not in api["path"] else "GET",
            "params": guess_params(api, src_data),
            "sampleFile": match_sample(api, src_data),
            "note": "回放样本", "liveOnly": False,
        })
    (data_out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✅ manifest: {sum(len(v) for v in manifest.values())} 接口 / {len(manifest)} 模块")

    # 3.5) Worker 白名单(模板参数 -> 正则)
    whitelist = []
    for api in apis:
        p = api["path"].split("?")[0]
        if p.endswith("/"):
            # 前缀型(尾斜杠): 匹配其下所有子路径, 但排除任何含 ".." 的段(防路径穿越)
            regex = "^" + re.escape(p.rstrip("/")) + "/(?!.*(\.\.)).*$"
        else:
            regex = "^(?!.*(\.\.))" + re.sub(r"\{\w+\}", "[^/]+", p) + "$"
        if regex not in whitelist:
            whitelist.append(regex)
    (src / "..").resolve()
    worker_wl = out.parent / "worker" / "src" / "whitelist.json"
    worker_wl.parent.mkdir(parents=True, exist_ok=True)
    worker_wl.write_text(json.dumps(whitelist, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"✅ whitelist: {len(whitelist)} 条(正则) -> worker/src/whitelist.json")

    # 4) 文档复制
    docs_src = src / "docs"
    if docs_src.is_dir():
        shutil.rmtree(docs_out, ignore_errors=True)
        docs_out.mkdir(parents=True)
        n = 0
        for f in sorted(docs_src.glob("API接入文档_*.md")):
            # 去 "API接入文档_" 前缀, 与前端 DOC_FILES 匹配(即 00_总览与通用约定.md)
            shutil.copy(f, docs_out / f.name.replace("API接入文档_", ""))
            n += 1
        print(f"✅ 文档: {n} 份复制到 docs/")

    print("\n🎉 构建完成 →", out)


if __name__ == "__main__":
    main()
