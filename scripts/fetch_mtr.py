#!/usr/bin/env python3
"""
抓取京港地铁 mtr.bj.cn 全部 timetable 页 (4/14/16/17 号线)

输出:
  data/mtr-timetables.json   全站真实首末班 (升级合成数据精度用)
  data/mtr-stations.json     新发现的站点列表 (回填到 stations.generated.js)

用法:
  python3 scripts/fetch_mtr.py                # 抓全部
  python3 scripts/fetch_mtr.py --line line17  # 单线

依赖: requests beautifulsoup4 lxml
"""

import argparse
import json
import sys
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from pypinyin import lazy_pinyin, Style

ROOT = Path(__file__).resolve().parent.parent
OUT_TT = ROOT / "data" / "mtr-timetables.json"
OUT_ST = ROOT / "data" / "mtr-stations.json"
OUT_JS = ROOT / "data" / "stations.mtr.generated.js"

DIRECTION_CHARS = {"东", "西", "南", "北", "中"}


def to_pinyin(cn: str) -> str:
    parts = lazy_pinyin(cn, style=Style.NORMAL)
    if not parts:
        return cn
    out = []
    buf = ""
    for ch, py in zip(cn, parts):
        if ch in DIRECTION_CHARS and buf:
            out.append(buf.capitalize())
            out.append(py.capitalize())
            buf = ""
        else:
            buf += py
    if buf:
        out.append(buf.capitalize())
    return " ".join(out)

# 京港地铁实运营的线路 (有真实 timetable, 不是站距表)
MTR_LINES = ["line4", "line14", "line16", "line17"]

# url slug → 我们的 line_id
SLUG_TO_ID = {f"line-{n}": f"line{n}" for n in [4, 14, 16, 17]}

# 上下行 → east/west 映射 (按 LINE_DIRECTIONS 定义)
DIR_MAP = {
    "line4":  {"上行": "east", "下行": "west"},   # 上行=天宫院→安河桥北 → east 终点安河桥北
    "line14": {"上行": "east", "下行": "west"},   # 上行=张郭庄→善各庄 → east 终点善各庄
    "line16": {"上行": "west", "下行": "east"},   # 上行=宛平城→北安河 → west 终点北安河
    "line17": {"上行": "east", "下行": "west"},   # 上行=嘉会湖→未来科学城北 → east 终点未来科学城北
}

HEADERS = {"User-Agent": "Mozilla/5.0"}


def fetch_html(slug: str) -> str:
    url = f"https://www.mtr.bj.cn/service/line/timetable/{slug}.html"
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.text


def parse_table(table) -> list[dict]:
    """tr → list of (station, first, last)"""
    rows = []
    trs = table.find_all("tr")
    for tr in trs[1:]:  # skip header
        cells = [c.get_text(strip=True) for c in tr.find_all(["th", "td"])]
        if len(cells) >= 3:
            station, first, last = cells[0], cells[1], cells[2]
            if station and first not in ("--", "—", ""):
                rows.append({"station": station, "first": first, "last": last})
    return rows


def parse_line(html: str, line_id: str) -> tuple[dict, list[str]]:
    """返回 (timetable_dict, station_order)"""
    soup = BeautifulSoup(html, "lxml")
    tables = soup.select(".timetable table")
    if not tables:
        return {}, []

    direction_data = {}  # {direction: [{station, first, last}]}
    headers_seen = []
    for t in tables:
        trs = t.find_all("tr")
        if not trs:
            continue
        header_cells = [c.get_text(strip=True) for c in trs[0].find_all(["th", "td"])]
        if not header_cells:
            continue
        # header 第一格是上行 / 下行
        dir_label = header_cells[0]
        if dir_label not in ("上行", "下行"):
            continue
        rows = parse_table(t)
        direction_data[dir_label] = rows
        headers_seen.append(dir_label)

    if not direction_data:
        return {}, []

    # 转化为 {station: {east|west: [first, last]}}
    out = {}
    station_order = []
    seen_stations = set()

    dir_map = DIR_MAP.get(line_id, {"上行": "east", "下行": "west"})

    for dir_label, rows in direction_data.items():
        target_dir = dir_map[dir_label]
        for r in rows:
            st = r["station"]
            if st not in seen_stations:
                station_order.append(st)
                seen_stations.add(st)
            out.setdefault(st, {"east": None, "west": None})
            out[st][target_dir] = [r["first"], r["last"]]

    # 处理终点站只在另一方向出现的情况
    # (上行表里末站没数据, 下行表首站对应它有数据 → 已捕获)
    return out, station_order


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--line", choices=MTR_LINES, help="只处理某条线")
    args = parser.parse_args()

    target_lines = [args.line] if args.line else MTR_LINES

    timetables = {
        "_source": "京港地铁官网 mtr.bj.cn /service/line/timetable/line-{N}.html",
        "_fetched_at": "auto",
        "_note": "京港地铁运营 4/14/16/17 号线全站真实首末班.",
        "_direction_map": DIR_MAP,
    }

    stations = {}

    for line_id in target_lines:
        slug = f"line-{line_id.replace('line', '')}"
        print(f"\n[{line_id}] fetching {slug}.html...")
        try:
            html = fetch_html(slug)
            tt, order = parse_line(html, line_id)
            if not tt:
                print(f"  ⚠ 没解析到 timetable")
                continue
            timetables[line_id] = tt
            stations[line_id] = order
            print(f"  ✓ {len(tt)} 站, 顺序: {order[0]} → ... → {order[-1]}")
        except Exception as e:
            print(f"  ❌ 失败: {e}")

    OUT_TT.write_text(json.dumps(timetables, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_ST.write_text(json.dumps(stations, ensure_ascii=False, indent=2), encoding="utf-8")

    # 同时输出 .js 文件 (含拼音), 给 lines.js 合并用
    js = [
        "// AUTO-GENERATED by scripts/fetch_mtr.py · 京港地铁 4/14/16/17 号线站点 + 拼音",
        "",
        "const MTR_STATIONS = {",
    ]
    for line_id, order in stations.items():
        js.append(f"  {line_id}: [")
        for idx, cn in enumerate(order, start=1):
            py = to_pinyin(cn)
            tags = []
            if idx == 1:
                tags.append('endpoint: "west"')
            elif idx == len(order):
                tags.append('endpoint: "east"')
            tag_str = (", " + ", ".join(tags)) if tags else ""
            js.append(f'    {{ idx: {idx:2d}, cn: "{cn}", py: "{py}"{tag_str} }},')
        js.append("  ],")
    js.append("};")
    js.append("")
    js.append("module.exports = { MTR_STATIONS };")
    OUT_JS.write_text("\n".join(js), encoding="utf-8")

    print(f"\n✅ 写入 {OUT_TT.relative_to(ROOT)}")
    print(f"✅ 写入 {OUT_ST.relative_to(ROOT)}")
    print(f"✅ 写入 {OUT_JS.relative_to(ROOT)}")
    total = sum(len(v) for v in stations.values())
    print(f"   总计: {len(stations)} 条线, {total} 站")


if __name__ == "__main__":
    sys.exit(main())
