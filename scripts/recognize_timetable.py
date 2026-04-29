#!/usr/bin/env python3
"""
Phase 2B · 真实时刻表 OCR 管线 (用户侧运行)

完整三步闭环:
  1. 抓 bjsubway.com 全 27 线站点页所有 jpg → data/timetable_imgs/
  2. 调 Anthropic Claude API 多模态识别每张 jpg → 结构化 schedule JSON
  3. 合并所有站点结果 → data/timetable.real.js (替换 timetable.generated.js)

依赖:
  pip install requests beautifulsoup4 lxml anthropic

环境变量:
  ANTHROPIC_API_KEY=sk-ant-xxx   (https://console.anthropic.com)

使用:
  # 1) 先抓图 (需 bjsubway.com 可达)
  python scripts/scrape_full.py --lines line1

  # 2) OCR 识别本地 jpg (本脚本)
  python scripts/recognize_timetable.py --line line1
  python scripts/recognize_timetable.py --line line1 --station 复兴门
  python scripts/recognize_timetable.py --all                  # 全量

  # 3) 输出
  data/timetable.real.js              # 最终给小程序用
  data/recognized/{line}/{station}.json  # 单站缓存 (断点续跑用)

成本估算: ~2000 张 jpg × $0.015 ≈ $30 一次性, 后续增量 < $1/月
"""

import argparse
import base64
import json
import os
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMGS_DIR = ROOT / "data" / "timetable_imgs"
CACHE_DIR = ROOT / "data" / "recognized"
OUT = ROOT / "data" / "timetable.real.js"

PROMPT = """你正在分析北京地铁某站某方向的官方时刻表图片. 图片每行是一个小时, 每行后面跟着该小时内每一班的发车分钟数.

部分分钟数字旁边有不同颜色的圆圈:
- 实心圆 = 标注此班终点站不同 (与默认终点不同)
- 空心圆 = 标注此班为本站始发车 (有座)

不同颜色对应不同终点站, 图片底部或侧边一般有色例说明.

请输出严格的 JSON, schema:
{
  "line": "1号线",
  "station": "复兴门",
  "direction": "环球度假区方向",
  "daytype": "工作日",
  "default_end": "环球度假区",
  "legend": {"色例颜色": "对应终点站名 或 始发标记"},
  "schedule": [
    {"hour": 5, "minute": 13, "end": "四惠东", "isOrigin": true},
    {"hour": 5, "minute": 22, "end": "环球度假区"},
    ...
  ]
}

约束:
- 每个小时所有班次必须列出, 不要跳过
- 没有特殊标注的班次只填 hour/minute, 其余字段省略 (默认终点, 非始发)
- 终点站名用图片底部色例的中文站名, 别自创
- 输出仅 JSON, 不要任何前后说明文字 / markdown 围栏
"""


def encode_image(path: Path) -> tuple[str, str]:
    """jpg → (media_type, base64)"""
    media_type = "image/jpeg"
    return media_type, base64.standard_b64encode(path.read_bytes()).decode("ascii")


def parse_filename(jpg_path: Path) -> dict:
    """data/timetable_imgs/line1/复兴门/环球度假区站方向-工作日.jpg → meta"""
    parts = jpg_path.parts
    line_id = parts[-3]
    station = parts[-2]
    name = jpg_path.stem
    bits = name.split("-")
    direction = bits[0] if bits else ""
    daytype = bits[1] if len(bits) > 1 else "工作日"
    return {"line_id": line_id, "station": station, "direction": direction, "daytype": daytype}


def call_claude(jpg_path: Path) -> dict:
    """调 Anthropic API 识别 jpg, 返回结构化 schedule."""
    try:
        from anthropic import Anthropic
    except ImportError:
        print("❌ 缺依赖: pip install anthropic", file=sys.stderr)
        sys.exit(1)

    client = Anthropic()
    media_type, b64 = encode_image(jpg_path)

    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8192,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
                {"type": "text", "text": PROMPT},
            ],
        }],
    )

    text = msg.content[0].text.strip()
    # 兜底剥 markdown 围栏
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
    return json.loads(text)


def recognize_one(jpg_path: Path) -> dict | None:
    meta = parse_filename(jpg_path)
    cache_path = CACHE_DIR / meta["line_id"] / meta["station"] / (jpg_path.stem + ".json")

    if cache_path.exists():
        return json.loads(cache_path.read_text(encoding="utf-8"))

    try:
        result = call_claude(jpg_path)
        result["_source"] = str(jpg_path.relative_to(ROOT))
        result["_meta"] = meta
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ {jpg_path.name}  →  {len(result.get('schedule', []))} 班次")
        return result
    except Exception as e:
        print(f"  ⚠ {jpg_path.name}  fail: {e}")
        return None


def normalize_direction(direction: str) -> str:
    """'环球度假区站方向' / '环球度假区方向' / '开往东方向' → 'east' or 'west'  (启发式)"""
    east_keywords = ["环球", "东", "潞城", "瀛海", "亦庄", "T2", "T3", "宛平", "善各", "俸伯", "巴沟"]
    if any(k in direction for k in east_keywords):
        return "east"
    return "west"


def aggregate(line_filter: list[str] | None = None) -> dict:
    """合并所有 cached 结果 → {line:direction → [classes]}"""
    out = {}
    for json_path in CACHE_DIR.glob("**/*.json"):
        try:
            data = json.loads(json_path.read_text(encoding="utf-8"))
        except Exception:
            continue
        meta = data.get("_meta") or {}
        line_id = meta.get("line_id")
        if not line_id:
            continue
        if line_filter and line_id not in line_filter:
            continue
        if meta.get("daytype") != "工作日":
            continue  # MVP 只合并工作日
        direction = normalize_direction(meta.get("direction", ""))
        key = f"{line_id}:{direction}"
        # 站点级数据展开为按站存储
        out.setdefault(key, {})
        out[key][meta["station"]] = data.get("schedule", [])
    return out


def write_real_js(by_line_dir: dict):
    out = [
        "// AUTO-GENERATED by scripts/recognize_timetable.py — 真实 OCR 数据",
        "// Source: bjsubway.com 官方时刻表 jpg + Anthropic Claude Sonnet 4.6 多模态识别",
        "",
        "const _SCHEDULES_BY_STATION = " + json.dumps(by_line_dir, ensure_ascii=False, indent=2) + ";",
        "",
        "function getSchedule(lineId, stationCn, direction, daytype) {",
        "  const key = lineId + ':' + direction;",
        "  const lineMap = _SCHEDULES_BY_STATION[key] || {};",
        "  return lineMap[stationCn] || [];",
        "}",
        "",
        "module.exports = { getSchedule, _SCHEDULES_BY_STATION };",
    ]
    OUT.write_text("\n".join(out), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--line", help="只处理某条线 (e.g. line1)")
    parser.add_argument("--station", help="只处理某站 (与 --line 联用)")
    parser.add_argument("--all", action="store_true", help="全量处理")
    parser.add_argument("--aggregate-only", action="store_true", help="只合并已识别的, 不再调 API")
    args = parser.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("⚠ 环境变量 ANTHROPIC_API_KEY 未设置, --aggregate-only 模式仍可用")

    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    if not args.aggregate_only:
        if not IMGS_DIR.exists():
            print(f"❌ 图片目录不存在: {IMGS_DIR}", file=sys.stderr)
            print(f"   请先运行: python scripts/scrape_full.py --lines all", file=sys.stderr)
            sys.exit(1)

        targets = []
        for jpg in IMGS_DIR.glob("**/*.jpg"):
            meta = parse_filename(jpg)
            if args.line and meta["line_id"] != args.line:
                continue
            if args.station and meta["station"] != args.station:
                continue
            targets.append(jpg)

        print(f"待处理 jpg 数: {len(targets)}")
        for i, jpg in enumerate(targets, 1):
            print(f"\n[{i}/{len(targets)}] {jpg.relative_to(ROOT)}")
            recognize_one(jpg)
            time.sleep(0.5)  # API 限速

    # 合并
    line_filter = [args.line] if args.line else None
    by_line_dir = aggregate(line_filter)
    write_real_js(by_line_dir)
    total = sum(len(stations) for stations in by_line_dir.values())
    print(f"\n✅ 合并完成 → {OUT.relative_to(ROOT)}")
    print(f"   线路 × 方向: {len(by_line_dir)}")
    print(f"   覆盖站点: {total}")
    print(f"\n下一步: 修改 data/timetable-mock.js")
    print(f"  - require('./timetable.generated.js')  →  require('./timetable.real.js')")


if __name__ == "__main__":
    main()
