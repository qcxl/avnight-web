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
