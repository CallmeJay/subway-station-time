#!/usr/bin/env python3
"""
合成北京地铁时刻表 (Phase 2A · 立即可用)

原理: 真实数据需要 OCR bjsubway.com 时刻表 jpg, 网络受限时先用真实
首末班 + 真实运营间隔规律合成. 节奏完全符合北京地铁实际:
  - 5:00-7:00  早平峰  间隔 5 分
  - 7:00-9:30  早高峰  间隔 2-3 分
  - 9:30-17:00 平峰    间隔 5 分
  - 17:00-19:30 晚高峰 间隔 3 分
  - 19:30-21:30 晚平峰 间隔 5-6 分
  - 21:30-23:30 末段   间隔 7-10 分

输出: data/timetable.generated.js  (export getSchedule)
真实 OCR 数据可在 Phase 2B 跑通后逐站替换.
"""

import json
import random
from pathlib import Path
from typing import Iterator

ROOT = Path(__file__).resolve().parent.parent
LINES_FILE = ROOT / "data" / "lines.js"
OUT = ROOT / "data" / "timetable.generated.js"

random.seed(42)

# 各线首末班时间 (公开数据 · 工作日 · 朝两个方向略对称, 实际 +/-2 分内)
# 来源: bjsubway.com 文字部分 + 各线维基条目
LINE_OPS = {
    "line1":   {"first": (5, 5),  "last": (23, 58), "endsRotate": ["四惠", "四惠东", "环球度假区"]},
    "line2":   {"first": (5, 4),  "last": (23, 8)},
    "line3":   {"first": (5, 30), "last": (23, 0)},
    "line4":   {"first": (5, 0),  "last": (23, 15)},
    "line5":   {"first": (5, 15), "last": (23, 0)},
    "line6":   {"first": (5, 0),  "last": (23, 0)},
    "line7":   {"first": (5, 30), "last": (22, 50)},
    "line8":   {"first": (5, 5),  "last": (23, 0)},
    "line9":   {"first": (5, 30), "last": (22, 45)},
    "line10":  {"first": (4, 55), "last": (22, 56)},
    "line11":  {"first": (6, 0),  "last": (22, 30)},
    "line12":  {"first": (5, 30), "last": (22, 30)},
    "line13":  {"first": (5, 30), "last": (22, 56)},
    "line14":  {"first": (5, 30), "last": (22, 30)},
    "line15":  {"first": (5, 30), "last": (22, 27)},
    "line16":  {"first": (5, 35), "last": (22, 35)},
    "line17":  {"first": (5, 19), "last": (22, 31)},
    "line18":  {"first": (5, 30), "last": (22, 30)},
    "line19":  {"first": (5, 30), "last": (22, 30)},
    "s1":      {"first": (6, 0),  "last": (22, 30)},
    "cp":      {"first": (5, 10), "last": (23, 10)},
    "fs":      {"first": (5, 30), "last": (22, 50)},
    "yf":      {"first": (5, 50), "last": (22, 0)},
    "yz":      {"first": (5, 22), "last": (23, 0)},
    "airport": {"first": (6, 21), "last": (22, 51)},
    "dxap":    {"first": (5, 30), "last": (22, 30)},
    "xj":      {"first": (7, 0),  "last": (18, 0)},
}

# 方向 → 终点站名 (从 lines.js 已有 endpoints 推断, 对称)
# 简化: east/west 在小程序里只是标签; 这里映射到具体终点
LINE_DIRECTIONS = {
    "line1":  {"east": "环球度假区", "west": "古城"},
    "line2":  {"east": "西直门",     "west": "西直门"},
    "line3":  {"east": "东坝北",     "west": "东四十条"},
    "line4":  {"east": "安河桥北",   "west": "天宫院"},
    "line5":  {"east": "天通苑北",   "west": "宋家庄"},
    "line6":  {"east": "潞城",       "west": "金安桥"},
    "line7":  {"east": "环球度假区", "west": "北京西站"},
    "line8":  {"east": "瀛海",       "west": "朱辛庄"},
    "line9":  {"east": "国家图书馆", "west": "郭公庄"},
    "line10": {"east": "巴沟",       "west": "巴沟"},
    "line11": {"east": "新首钢",     "west": "模式口"},
    "line12": {"east": "四季青桥",   "west": "东坝北"},
    "line13": {"east": "东直门",     "west": "西直门"},
    "line14": {"east": "善各庄",     "west": "张郭庄"},
    "line15": {"east": "俸伯",       "west": "清华东路西口"},
    "line16": {"east": "宛平城",     "west": "北安河"},
    "line17": {"east": "未来科学城北","west": "嘉会湖"},
    "line18": {"east": "天通苑东",   "west": "马连洼"},
    "line19": {"east": "牡丹园",     "west": "新宫"},
    "s1":     {"east": "苹果园",     "west": "石厂"},
    "cp":     {"east": "蓟门桥",     "west": "昌平西山口"},
    "fs":     {"east": "国家图书馆", "west": "阎村东"},
    "yf":     {"east": "阎村东",     "west": "燕山"},
    "yz":     {"east": "亦庄火车站", "west": "宋家庄"},
    "airport":{"east": "T2/T3 航站楼","west": "北新桥"},
    "dxap":   {"east": "大兴机场",   "west": "草桥"},
    "xj":     {"east": "巴沟",       "west": "香山"},
}

# 节奏配置: (start_h, start_m, end_h, end_m, interval_min)
SCHEDULE_PROFILE_WEEKDAY = [
    (5, 0,   7, 0,   5),    # 早平峰
    (7, 0,   9, 30,  3),    # 早高峰
    (9, 30,  17, 0,  5),    # 平峰
    (17, 0,  19, 30, 3),    # 晚高峰
    (19, 30, 21, 30, 5),    # 晚平峰
    (21, 30, 24, 0,  8),    # 末段
]

SCHEDULE_PROFILE_WEEKEND = [
    # 数据依据: 北京市政府首都之窗 (2020-09 报道)
    # 双休日工作日早晚高峰间隔差 ~3.85-3.9 分钟; 平峰部分线路差至 12 分钟
    (5, 0,   8, 0,   8),    # 早间 (双休无通勤)
    (8, 0,   10, 0,  7),    # 双休"高峰"约 7 分 (工作日 3 分 + 3.85 差)
    (10, 0,  17, 0,  8),    # 平峰 (实测多数线 7-10 分, 6 号线甚至 12 分; 取 8 分中位)
    (17, 0,  20, 0,  7),    # 傍晚出行
    (20, 0,  22, 0,  9),
    (22, 0,  24, 0,  10),   # 末段
]

# 当前用的 profile, gen_schedule_for_line 时切换
SCHEDULE_PROFILE = SCHEDULE_PROFILE_WEEKDAY


def in_range(h: int, m: int, sh: int, sm: int, eh: int, em: int) -> bool:
    cur = h * 60 + m
    return sh * 60 + sm <= cur < eh * 60 + em


def interval_at(h: int, m: int, profile=None) -> int:
    p = profile if profile else SCHEDULE_PROFILE
    for sh, sm, eh, em, iv in p:
        if in_range(h, m, sh, sm, eh, em):
            return iv
    return 8


def gen_schedule_for_line(line_id: str, direction: str, first_last: tuple = None, daytype: str = "weekday") -> list[dict]:
    """生成单条线一个方向、一个站的时刻表.
    first_last: (fh, fm, lh, lm) 站级覆盖, None 时退回线路级 LINE_OPS.
    daytype: 'weekday' or 'weekend' (周末用更平缓的节奏)."""
    ops = LINE_OPS.get(line_id, {"first": (5, 30), "last": (22, 30)})
    if first_last:
        fh, fm, lh, lm = first_last
    else:
        fh, fm = ops["first"]
        lh, lm = ops["last"]
    profile = SCHEDULE_PROFILE_WEEKEND if daytype == "weekend" else SCHEDULE_PROFILE_WEEKDAY

    # 1 号线终点轮换, 其他线只一个终点
    if "endsRotate" in ops:
        ends_pool = ops["endsRotate"] if direction == "east" else [LINE_DIRECTIONS[line_id]["west"]]
    else:
        ends_pool = [LINE_DIRECTIONS.get(line_id, {}).get(direction, "终点")]

    line_color_map = LINE_COLOR_BY_ID
    default_color = line_color_map.get(line_id, "#888")
    end_colors = {
        "四惠":       "#F39800",
        "四惠东":     "#E91D8E",
        "环球度假区": default_color,
    }

    schedule = []
    h, m = fh, fm
    end_min = lh * 60 + lm
    rotate_idx = 0

    while h * 60 + m <= end_min:
        end = ends_pool[rotate_idx % len(ends_pool)]
        is_origin = (random.random() < 0.18)  # ~18% 班次本站始发

        schedule.append({
            "hour": h,
            "minute": m,
            "end": end,
            "endColor": end_colors.get(end, default_color),
            "isOrigin": is_origin,
        })

        rotate_idx += 1
        iv = interval_at(h, m, profile)
        m += iv
        while m >= 60:
            m -= 60
            h += 1
        if h >= 24:
            break

    # 最后一班强制设为末班车时间
    if schedule:
        schedule[-1]["hour"] = lh
        schedule[-1]["minute"] = lm
        schedule[-1]["isOrigin"] = False

    return schedule


# 占位, 在 main 里填充
LINE_COLOR_BY_ID = {}


def parse_lines_colors():
    """从 lines.js 文本里抠出 id → color 映射."""
    text = LINES_FILE.read_text(encoding="utf-8")
    out = {}
    import re
    for m in re.finditer(r"id:\s*'([^']+)',[^}]*?color:\s*'(#[0-9A-Fa-f]+)'", text):
        out[m.group(1)] = m.group(2)
    return out


def build_js(by_line_dir: dict) -> str:
    out = [
        "// AUTO-GENERATED by scripts/synthesize_timetable.py",
        "",
        "const _SCHEDULES = " + json.dumps(by_line_dir, ensure_ascii=False, indent=2) + ";",
        "",
        "function getSchedule(lineId, stationCn, direction, daytype) {",
        "  const key = lineId + ':' + direction;",
        "  return _SCHEDULES[key] || [];",
        "}",
        "",
        "module.exports = { getSchedule, _SCHEDULES };",
    ]
    return "\n".join(out)


def build_js_dual(weekday: dict, weekend: dict) -> str:
    """工作日 + 双休日两份合成时刻表."""
    out = [
        "// AUTO-GENERATED by scripts/synthesize_timetable.py",
        "// 合成时刻表 · 真实首末班 + 节奏分日 (工作日含早晚高峰加密, 双休全天平缓)",
        "",
        "const _SCHEDULES_WEEKDAY = " + json.dumps(weekday, ensure_ascii=False, indent=2) + ";",
        "",
        "const _SCHEDULES_WEEKEND = " + json.dumps(weekend, ensure_ascii=False, indent=2) + ";",
        "",
        "function getSchedule(lineId, stationCn, direction, daytype) {",
        "  const key = lineId + ':' + direction;",
        "  const map = daytype === 'weekend' ? _SCHEDULES_WEEKEND : _SCHEDULES_WEEKDAY;",
        "  return map[key] || [];",
        "}",
        "",
        "module.exports = { getSchedule, _SCHEDULES_WEEKDAY, _SCHEDULES_WEEKEND };",
    ]
    return "\n".join(out)


def load_mtr_overrides() -> dict:
    """加载京港地铁真实站级首末班 (data/mtr-timetables.json)"""
    p = ROOT / "data" / "mtr-timetables.json"
    if not p.exists():
        return {}
    return json.loads(p.read_text(encoding="utf-8"))


def parse_hhmm(s):
    """支持: '05:13' / '00:08' / '次日0:01' / '次日00:08' / '-'.
    跨零点小时数返回 +24 (24:01 等), 调用方负责后续折回."""
    if not s or s.strip() in ("-", "—", "--"):
        return None
    s = s.strip()
    overnight = False
    if s.startswith("次日"):
        s = s[2:]
        overnight = True
    parts = s.split(":")
    if len(parts) != 2:
        return None
    try:
        h, m = int(parts[0]), int(parts[1])
    except ValueError:
        return None
    if overnight:
        h += 24
    return (h, m)


def main():
    global LINE_COLOR_BY_ID
    LINE_COLOR_BY_ID = parse_lines_colors()

    mtr = load_mtr_overrides()
    real_lines = {k for k in mtr.keys() if not k.startswith("_")}
    print(f"京港地铁站级真实数据: {sorted(real_lines)}")

    # === 第一份: 线路级元数据 (紧凑首末班 + endsRotate, 班次运行时合成) ===
    line_meta = {}
    for line_id, ops in LINE_OPS.items():
        fh, fm = ops["first"]
        lh, lm = ops["last"]
        line_meta[line_id] = {
            "ft": f"{fh:02d}:{fm:02d}",
            "lt": f"{lh:02d}:{lm:02d}",
            "endsEast": LINE_DIRECTIONS.get(line_id, {}).get("east", "终点"),
            "endsWest": LINE_DIRECTIONS.get(line_id, {}).get("west", "起点"),
            "endsRotate": ops.get("endsRotate") or [],
        }
    line_js = [
        "// AUTO-GENERATED · 线路级元数据 (紧凑格式, 班次由 utils/scheduleSynth.js 合成)",
        "",
        "const _LINE_META = " + json.dumps(line_meta, ensure_ascii=False, separators=(',', ':')) + ";",
        "",
        "const _LINE_COLORS = " + json.dumps(LINE_COLOR_BY_ID, ensure_ascii=False, separators=(',', ':')) + ";",
        "",
        "const synth = require('../utils/scheduleSynth.js');",
        "",
        "function getSchedule(lineId, stationCn, direction, daytype) {",
        "  const meta = _LINE_META[lineId];",
        "  if (!meta) return [];",
        "  const color = _LINE_COLORS[lineId] || '#888';",
        "  // 终点轮换 (1 号线): 复制基本 schedule, 按周期改 end",
        "  if (meta.endsRotate && meta.endsRotate.length && direction === 'east') {",
        "    const base = synth.buildSchedule(meta.ft, meta.lt, daytype, '', color);",
        "    return base.map((c, i) => Object.assign({}, c, { end: meta.endsRotate[i % meta.endsRotate.length] }));",
        "  }",
        "  const end = direction === 'east' ? meta.endsEast : meta.endsWest;",
        "  const key = lineId + '|' + direction + '|' + (daytype || 'weekday');",
        "  return synth.buildScheduleCached(key, meta.ft, meta.lt, daytype, end, color);",
        "}",
        "",
        "module.exports = { getSchedule, _LINE_META };",
    ]
    OUT.write_text("\n".join(line_js), encoding="utf-8")

    # === 第二份: 站级元数据 (京港 4/14/16/17) ===
    station_meta = {}
    for line_id in real_lines:
        station_meta[line_id] = {}
        line_data = mtr[line_id]
        line_color = LINE_COLOR_BY_ID.get(line_id, "#888")
        for station, dirs in line_data.items():
            if not isinstance(dirs, dict):
                continue
            station_meta[line_id][station] = {}
            for direction, range_pair in dirs.items():
                if range_pair is None or not isinstance(range_pair, list) or len(range_pair) != 2:
                    continue
                ft_str, lt_str = range_pair
                if ft_str in ("-", "—") or lt_str in ("-", "—"):
                    continue
                # 终点站 (取该线路 east/west 端点)
                end = LINE_DIRECTIONS.get(line_id, {}).get(direction, "")
                station_meta[line_id][station][direction] = {
                    "ft": ft_str,
                    "lt": lt_str,
                    "end": end,
                    "endColor": line_color,
                }

    real_stations = sum(len(v) for v in station_meta.values())
    out2 = ROOT / "data" / "timetable.station.generated.js"
    js = [
        "// AUTO-GENERATED · 京港地铁站级元数据 (紧凑格式)",
        "// 班次由 utils/scheduleSynth.js 在运行时合成 (按 daytype)",
        "",
        "const _STATION_META = " + json.dumps(station_meta, ensure_ascii=False, separators=(',', ':')) + ";",
        "",
        "const synth = require('../utils/scheduleSynth.js');",
        "",
        "function getStationSchedule(lineId, stationCn, direction, daytype) {",
        "  const line = _STATION_META[lineId];",
        "  if (!line) return null;",
        "  const station = line[stationCn];",
        "  if (!station) return null;",
        "  const meta = station[direction];",
        "  if (!meta) return null;",
        "  const key = lineId + '|' + stationCn + '|' + direction + '|' + (daytype || 'weekday');",
        "  return synth.buildScheduleCached(key, meta.ft, meta.lt, daytype, meta.end, meta.endColor);",
        "}",
        "",
        "module.exports = { getStationSchedule, _STATION_META };",
    ]
    out2.write_text("\n".join(js), encoding="utf-8")

    print(f"\n✅ 线路级:  {OUT.relative_to(ROOT)}  ({len(line_meta)} 条线元数据)")
    print(f"✅ 站级:    {out2.relative_to(ROOT)}  ({real_stations} 站, 工作时合成班次)")
    for lid in real_lines:
        print(f"      · {lid}: {len(station_meta[lid])} 站")


if __name__ == "__main__":
    main()
