#!/bin/bash
# 退路: 本地/局域网展示(被下架或不想公网时)
cd "$(dirname "$0")/../frontend" || exit 1
PORT="${1:-8000}"
BIND="${2:-127.0.0.1}"   # 第二个参数: 0.0.0.0 = 局域网分享
echo "AVNight 展示站 → http://$BIND:$PORT  (Ctrl+C 停止)"
python3 -m http.server "$PORT" --bind "$BIND"
