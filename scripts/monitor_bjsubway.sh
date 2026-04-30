#!/bin/bash
# bjsubway.com 恢复监控
#
# 用法:
#   ./scripts/monitor_bjsubway.sh             # 后台跑, 每 30 分钟探测一次
#   ./scripts/monitor_bjsubway.sh --once      # 只探一次, 看当前状态
#   ./scripts/monitor_bjsubway.sh --auto      # 通了自动跑 scrape_full.py 抓全量
#
# 关闭: 按 Ctrl+C 或 kill 进程
#
# 配套: 通了之后会:
#   - macOS terminal-notifier 弹通知 (如已装)
#   - say "bjsubway 恢复了" 语音提示
#   - 写日志到 /tmp/bjsubway-monitor.log

set -u

URL="https://www.bjsubway.com/station/xltcx/line1/"
LOG=/tmp/bjsubway-monitor.log
INTERVAL=1800   # 30 分钟
AUTO_SCRAPE=0
ONCE=0

for arg in "$@"; do
  case "$arg" in
    --auto) AUTO_SCRAPE=1 ;;
    --once) ONCE=1 ;;
    --interval=*) INTERVAL="${arg#--interval=}" ;;
  esac
done

probe() {
  curl -sf --max-time 8 -A "Mozilla/5.0" -o /dev/null -w "%{http_code}" "$URL" 2>&1
}

notify() {
  msg="$1"
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $msg" | tee -a "$LOG"

  # macOS 桌面通知 (装了 brew install terminal-notifier 才生效)
  command -v terminal-notifier >/dev/null && \
    terminal-notifier -title "bjsubway.com 监控" -message "$msg" -sound Glass

  # 语音 (macOS 自带)
  command -v say >/dev/null && say "bjsubway 恢复了"

  # 浏览器打开
  command -v open >/dev/null && open "$URL"
}

run_once() {
  code=$(probe)
  if [ "$code" = "200" ]; then
    notify "✓ 已恢复! HTTP 200"
    if [ "$AUTO_SCRAPE" = "1" ]; then
      echo "  → 自动跑 scrape_full.py..." | tee -a "$LOG"
      python3 "$(dirname "$0")/scrape_full.py" --lines all --skip-imgs &
    fi
    return 0
  else
    echo "[$(date +'%H:%M:%S')] HTTP $code (still down)" | tee -a "$LOG"
    return 1
  fi
}

if [ "$ONCE" = "1" ]; then
  run_once
  exit $?
fi

echo "== bjsubway.com 监控启动 (每 ${INTERVAL}s 一次) =="
echo "   日志: $LOG"
echo "   按 Ctrl+C 退出"
echo ""

while true; do
  if run_once; then
    echo "== 监控结束 (站点已恢复) =="
    break
  fi
  sleep "$INTERVAL"
done
