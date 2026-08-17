# AVNight API 接入文档 · 模块三：VIP

> 覆盖: VIP 页三大部分(推荐 / 视频 / OnlyFans)。请求头统一: `Authorization: Bearer <JWT>` + `Accept: application/json` + `User-Agent: okhttp/3.12.10`。
> ⚠️ 部分接口(VIP 专区)响应可能受限, 访客 token 只能看到部分内容; 完整内容需 VIP 权限。

---

## 1. 推荐区

### 1.1 置顶(VIP 首页顶部)
| 项 | 值 |
|---|---|
| 方式 | `GET` / `https://api.atzxyff.com/v3/vip/topic` |
| 功能 | 置顶推荐位列表 |

### 1.2 置顶专题内容
| 接口 | 说明 |
|---|---|
| `/v3/result/popular_week/video/general` | 本周淫幕亮点(某置顶全部) |
| `/v3/vip/topic/{id}/videos` | 某置顶的分页视频(`next=0`) |

**示例**: `GET /v3/vip/topic/38/videos?next=0`

### 1.3 VR 必看神片
| 项 | 值 |
|---|---|
| 方式 | `GET` / `https://api.atzxyff.com/v3/vip/vr` |

### 1.4 VIP 热刷排行榜
| 项 | 值 |
|---|---|
| 方式 | `GET` / `https://api.atzxyff.com/v3/vip/ranking/videos` |
| 功能 | 优质榜 / 人气榜 / 小众榜 |

### 1.5 热门片商
```
GET /v3/vip/company                              # 热门片商列表
GET /v3/company/1/videos?next=0&limit=4          # 最热门前 4 个片商视频
GET /v3/company/2/videos?next=0                  # 某片商全部视频
```

### 1.6 全部片商(VR 片商)
```
GET /v3/vr_studio/tab                            # Tab 列表
GET /v3/vr_studio?tab=all&next=0                 # 全部片商
GET /v3/vr_studio/309/videos?next=0              # 某片商视频(309=片商id)
GET /v3/result/topic/video                       # 主题视频
GET /v3/result/popular_week/video/vr             # 本周淫幕亮点·VR
```

### 1.7 揭秘专题(dinabz)
| 项 | 值 |
|---|---|
| 方式 | `GET` / `https://api.atzxyff.com/v3/vip/dinabz` |
| 功能 | "揭秘！顶不住偷拍视角 顶臀X街射X偷摸XSM" 专题 |

**标签全部**:
```
GET /v3/result/popular_week/video/ngs            # 本周淫幕亮点
GET /v3/genre/2427/videos?video_type=ngs&video_origin=DINABZ&next=0   # 标签分页视频
```

### 1.8 SWAG 主播
```
GET /v3/vip/actor?next=0                        # 主播列表
GET /v3/result/popular_week/video/general       # 本周淫幕亮点
GET /v3/actor/35747/videos?actor_type=ngs&limit=20&next=0   # 主播分页视频
```

### 1.9 主编精选
```
GET /v3/vip/categorys                           # 主编精选列表
GET /v3/result/popular_week/video/general       # 点击 item 打开的页面
GET /v3/lite/category/6/videos?video_type=vip&next=0     # 精选视频列表
```

### 1.10 动漫异世界 / 最香肉番 / 力推污漫
```
GET /v3/vip/wumi/categorys                      # 动漫分类
GET /v3/result/popular_week/video/general       # 本周淫幕亮点
GET /v3/lite/category/1/videos?video_type=vip_wumi&next=0   # 动漫分页视频
GET /v3/vip/wumi/videos                         # 最香肉番
GET /v3/vip/wumi/comics                         # 力推污漫
```

### 1.11 AV 解说(fpie)
```
GET /v3/vip/fpie                                # AV解说首页
GET /v3/fpie?next=0                             # AV解说分页
GET /v3/video/FPIE-701/info?cdn=c               # AV解说视频详情(密文, 见 05 文档)
```

---

## 2. 视频区(顶部标签)

**标签来源**: `/v3/android` 响应的 `VipMenu` 列表(见 01 文档)。

**标签视频列表**:
| 项 | 值 |
|---|---|
| 方式 | `GET` / `https://api.atzxyff.com/v3/genre/{id}/videos` |
| 参数 | `video_type=ngs`、`video_origin=ALL`、`next` |

**示例**:
```
GET /v3/genre/26490/videos?video_type=ngs&video_origin=ALL&next=0
GET /v3/genre/26224/videos?video_type=ngs&video_origin=ALL&next=0
```

---

## 3. OnlyFans 区

### 3.1 OF 总览
| 项 | 值 |
|---|---|
| 方式 | `GET` / `https://api.atzxyff.com/v3/onlyfans` |
| 功能 | 顶部红人榜 + 头条女神共筹 + 驻站博主 |

**响应体**:
```json
{
  "card": [ ... ],      // 红人榜
  "present": [ ... ],   // 头条女神共筹
  "ranking": [ ... ]    // 驻站博主
}
```

### 3.2 女神共筹
| 项 | 值 |
|---|---|
| 方式 | `GET` / `https://api.atzxyff.com/v3/gong_chou` |

### 3.3 驻站博主
```
GET /v3/gong_chou/onlyfans/newest?next=0     # 最新博主
GET /v3/gong_chou/onlyfans/popular?next=0    # 人气博主
GET /v3/gong_chou/onlyfans/most?next=0       # 最多作品
```

### 3.4 博主详情
| 接口 | 说明 |
|---|---|
| `/v3/onlyfans/actor/{id}` | 博主资料(如 38761) |
| `/v3/onlyfans/actor/{id}/videos?next=0` | 博主视频 |
| `/v3/onlyfans/actor/{id}/images?next=0` | 博主美图 |

### 3.5 今日博主 / 发烧头牌
```
GET /v3/onlyfans/fever/videos?next=0
```

---

## 4. 首页 VIP 色圈入口(汇总)

首页的"VIP色圈"板块即跳转至本模块, 对应接口:
```
GET /v3/vip_main_screen_2024          # 色圈首页聚合
GET /v3/vr_studio/tab                 # 片商 Tab
GET /v3/videos/tagged?next=0          # 中字无码
```

---

## 5. 调用组合示例

```python
from client import ApiClient
c = ApiClient(); c.get_visitor_token(device_id="f413d4ef3f36c416")

# VIP 置顶 + 分页
r = c.get("/v3/vip/topic")
topics = r.json()["data"]
for t in topics[:3]:
    c.get(f"/v3/vip/topic/{t['id']}/videos", params={"next": 0})

# 排行榜
r = c.get("/v3/vip/ranking/videos")

# 主播三排序
for order in ["newest", "popular", "most"]:
    c.get(f"/v3/gong_chou/onlyfans/{order}", params={"next": 0})

# OF 博主
c.get("/v3/onlyfans/actor/38761")
c.get("/v3/onlyfans/actor/38761/videos", params={"next": 0})
```
