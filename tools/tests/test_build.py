# -*- coding: utf-8 -*-
"""build.py 单元测试(标准库 unittest, 零依赖): 脱敏/接口解析/manifest 结构"""
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from build import redact, load_endpoints, guess_params  # noqa: E402

ROOT = Path(__file__).parent.parent.parent
AVNIGHT = ROOT.parent / "avnight_api"


class TestRedact(unittest.TestCase):
    def test_token_redacted(self):
        obj = {"token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3ODY4MDA2MDUxfQ.signature_value_here", "user_id": "271397838",
               "device_id": "f413d4ef3f36c416", "name": "正常字段",
               "nested": {"token": "another_long_token_value_here"}}
        r = redact(obj)
        self.assertEqual(r["token"], "__REDACTED__")
        self.assertEqual(r["nested"]["token"], "__REDACTED__")
        self.assertEqual(r["user_id"], "271397838")     # 用户知情保留
        self.assertEqual(r["device_id"], "f413d4ef3f36c416")
        self.assertEqual(r["name"], "正常字段")

    def test_short_token_kept(self):
        r = redact({"token": "abc"})
        self.assertEqual(r["token"], "abc")


class TestEndpoints(unittest.TestCase):
    def test_count(self):
        apis = load_endpoints(AVNIGHT / "endpoints.py")
        self.assertGreater(len(apis), 150)

    def test_params(self):
        api = {"path": "/v3/video/{code}/info?cdn=c"}
        params = guess_params(api, AVNIGHT / "data")
        names = [p["name"] for p in params]
        self.assertIn("code", names)
        self.assertIn("cdn", names)
        self.assertEqual(params[0]["type"], "path")
        self.assertTrue(params[0]["required"])


class TestOutputs(unittest.TestCase):
    def test_manifest(self):
        mf = ROOT / "frontend" / "data" / "manifest.json"
        self.assertTrue(mf.exists(), "先运行 tools/build.py")
        d = json.loads(mf.read_text(encoding="utf-8"))
        self.assertGreater(sum(len(v) for v in d.values()), 150)

    def test_index(self):
        idx = ROOT / "frontend" / "data" / "index.json"
        self.assertTrue(idx.exists(), "先运行 tools/build.py")
        d = json.loads(idx.read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(d), 13)
        self.assertGreaterEqual(sum(len(v) for v in d.values()), 200)


if __name__ == "__main__":
    unittest.main(verbosity=2)


from build import _norm_video, _norm_actor, _collect_cards, SITE_MENUS  # noqa: E402


class TestCards(unittest.TestCase):
    def test_norm_video(self):
        c = _norm_video({"code": "ABC-123", "title": "片名", "cover64": "https://x/y.jpg",
                         "thumb64": "https://x/t.jpg", "duration": "02:11:22",
                         "actors": [{"name": "某优"}], "genres": ["剧情"]})
        self.assertEqual(c["type"], "video")
        self.assertEqual(c["code"], "ABC-123")
        self.assertEqual(c["title"], "片名")
        self.assertTrue(c["cover"].startswith("https://"))
        self.assertEqual(c["thumb"], "https://x/t.jpg")
        self.assertEqual(c["duration"], "02:11:22")
        self.assertEqual(c["actors"][0]["name"], "某优")

    def test_norm_video_no_code_skipped(self):
        self.assertIsNone(_norm_video({"title": "", "cover64": "https://x/y.jpg"}))

    def test_norm_actor(self):
        c = _norm_actor({"name": "Umi", "cover64": "https://x/a.jpg", "country": "other"})
        self.assertEqual(c["type"], "actor")
        self.assertEqual(c["name"], "Umi")
        self.assertTrue(c["cover"].startswith("https://"))

    def test_collect_dedup(self):
        """嵌套结构提取 + 同 code 去重(子Tab内)"""
        j = {
            "data": {
                "ace": [
                    {"code": "X-1", "title": "A", "cover64": "https://x/1.jpg"},
                    {"code": "X-1", "title": "A 重复", "cover64": "https://x/1.jpg"},  # 同 code → 去重
                    {"code": "X-2", "title": "B", "cover64": "https://x/2.jpg"},
                ],
                "other": [{"name": "only_name", "cover64": "https://x/n.jpg"}],  # actor
            }
        }
        cards, seen = [], set()
        _collect_cards(j, cards, seen)
        self.assertEqual(len(cards), 3, "X-1/X-2 video + 1 actor")
        keys = [(c["type"], c.get("code") or c.get("key")) for c in cards]
        codes = [k for k in keys if k[0] == "video"]
        self.assertEqual(len(codes), len(set(codes)), "同 code 不重复")

    def test_cards_output(self):
        """生成的 cards 产物存在且字段完整"""
        ci = ROOT / "frontend" / "data" / "cards" / "index.json"
        self.assertTrue(ci.exists(), "先运行 tools/build.py")
        idx = json.loads(ci.read_text(encoding="utf-8"))
        self.assertIn("home", idx)
        self.assertTrue(idx["home"], "home 至少一个子Tab")
        tab = json.loads((ROOT / "frontend" / "data" / "cards" / "home" / (idx["home"][0]["id"] + ".json")).read_text(encoding="utf-8"))
        self.assertTrue(tab)
        self.assertIn("type", tab[0])
        self.assertTrue(any(k in tab[0] for k in ("code", "name")))

    def test_menus_cover_all_sites(self):
        for site, tabs in SITE_MENUS.items():
            self.assertTrue(tabs, f"{site} 有子Tab")
            self.assertTrue(all(t.get("label") and t.get("samples") for t in tabs))
