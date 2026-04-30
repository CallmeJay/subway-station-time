#!/usr/bin/env python3
"""
把当前 main 分支的全量数据 (站点 + 时刻表) 转成云端 per-line JSON.

输入:
  data/lines.js                            (28 条线色值 + 端点)
  data/stations.amap.generated.js          (高德 27 条线 525 站)
  data/stations.mtr.generated.js           (京港 4/14/16/17)
  data/stations.generated.js               (历史快照, 兜底)
  data/timetable.amap.station.generated.js (高德站级时刻表)
  data/timetable.station.generated.js      (京港站级时刻表)
  data/timetable.generated.js              (线路级合成兜底)

输出:
  data/cloud/lines/line1.json
  data/cloud/lines/line2.json
  ... 27 个文件
  data/cloud/manifest.json                 (版本 + 索引)

下一步:
  1. 微信开发者工具 → 云开发 → 文件存储 → 拖拽 data/cloud/ 整个目录上传
  2. 或: python3 scripts/upload_to_cloud.py --provider wxcloud
"""

import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CLOUD_DIR = ROOT / "data" / "cloud"
LINES_DIR = CLOUD_DIR / "lines"
DB_LINES_NDJSON = CLOUD_DIR / "subway_lines.json"   # 云数据库批量导入 (NDJSON 格式 + .json 后缀)
DB_META_NDJSON  = CLOUD_DIR / "subway_meta.json"


def js_eval(filepath: Path, var_name: str) -> dict:
    """用 node 把 .generated.js 求值出来 (比手撕 JS 字符串靠谱)"""
    script = f"""
        const m = require('{filepath}');
        const v = m.{var_name} || m._AMAP_META || m._STATION_META || m._LINE_META || m._SCHEDULES_WEEKDAY;
        process.stdout.write(JSON.stringify(v));
    """
    out = subprocess.check_output(["node", "-e", script], cwd=str(ROOT))
    return json.loads(out)


def hash_str(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:12]


def main():
    LINES_DIR.mkdir(parents=True, exist_ok=True)

    print("[1/4] 加载 lines.js (色值 + 端点)...")
    # lines.js 比较特殊, 含 helper 函数; 直接 require 拿 LINES + STATIONS_BY_LINE
    lines_data = json.loads(subprocess.check_output(
        ["node", "-e", "const m=require('./data/lines.js'); process.stdout.write(JSON.stringify({lines:m.LINES, stations:m.STATIONS_BY_LINE}));"],
        cwd=str(ROOT)
    ))
    LINES = lines_data["lines"]
    STATIONS = lines_data["stations"]
    print(f"  ✓ {len(LINES)} 条线, {sum(len(v) for v in STATIONS.values())} 站")

    print("[2/4] 加载时刻表 (mtr + amap + 合成)...")
    # 三层时刻表都加载
    mtr_meta  = json.loads(subprocess.check_output(
        ["node", "-e", "const m=require('./data/timetable.station.generated.js'); process.stdout.write(JSON.stringify(m._STATION_META || {}));"],
        cwd=str(ROOT)
    ))
    amap_meta = json.loads(subprocess.check_output(
        ["node", "-e", "const m=require('./data/timetable.amap.station.generated.js'); process.stdout.write(JSON.stringify(m._AMAP_META || {}));"],
        cwd=str(ROOT)
    ))
    line_meta = json.loads(subprocess.check_output(
        ["node", "-e", "const m=require('./data/timetable.generated.js'); process.stdout.write(JSON.stringify(m._LINE_META || {}));"],
        cwd=str(ROOT)
    ))
    print(f"  ✓ 京港站级 {len(mtr_meta)} 线, 高德站级 {len(amap_meta)} 线, 线路级 {len(line_meta)} 线")

    print("[3/4] 拆分 per-line JSON + 同步生成数据库 NDJSON 导入文件...")
    manifest_lines = []
    db_lines_lines = []   # 写入 subway_lines.ndjson 每行一条 doc

    for line in LINES:
        line_id = line["id"]
        payload = {
            "_id": line_id,        # 云数据库主键
            "lineId": line_id,
            "name": line["name"],
            "shortName": line["shortName"],
            "color": line["color"],
            "colorDeep": line["colorDeep"],
            "stations": STATIONS.get(line_id, []),
            "timetable": {
                "mtr":  mtr_meta.get(line_id, {}),
                "amap": amap_meta.get(line_id, {}),
                "line": line_meta.get(line_id, {}),
            },
            "schemaVersion": 1,
        }
        out = LINES_DIR / f"{line_id}.json"
        text = json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
        out.write_text(text, encoding="utf-8")

        # NDJSON 一行一条文档 (无 _id 字段时云数据库自动分配, 这里强制用 lineId)
        db_lines_lines.append(json.dumps(payload, ensure_ascii=False, separators=(',', ':')))

        manifest_lines.append({
            "lineId": line_id,
            "url": f"lines/{line_id}.json",
            "hash": hash_str(text),
            "size": len(text.encode("utf-8")),
        })
        print(f"  · {line_id:8s}  {len(text)//1024:4d} KB  {len(payload['stations'])} 站")

    DB_LINES_NDJSON.write_text("\n".join(db_lines_lines) + "\n", encoding="utf-8")

    print("[4/4] 写 manifest.json + manifest NDJSON...")
    manifest = {
        "version": datetime.now(timezone.utc).strftime("%Y%m%d.%H%M"),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "schema": "v1",
        "lines": manifest_lines,
    }
    manifest_path = CLOUD_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    # 数据库版的 manifest: 单条文档, _id = "manifest"
    db_meta_doc = dict(manifest)
    db_meta_doc["_id"] = "manifest"
    DB_META_NDJSON.write_text(json.dumps(db_meta_doc, ensure_ascii=False, separators=(',', ':')) + "\n", encoding="utf-8")

    total_size = sum(l["size"] for l in manifest_lines)
    print(f"\n✅ 写入 {CLOUD_DIR.relative_to(ROOT)}/")
    print(f"   {len(manifest_lines)} 条线 · 总 {total_size // 1024} KB ({total_size / 1024 / 1024:.2f} MB)")
    print(f"   manifest version: {manifest['version']}")
    print(f"\n下一步 (推荐用云数据库):")
    print(f"   1. 微信开发者工具 → 云开发 → 数据库")
    print(f"   2. 创建集合 'subway_lines' → 导入 → 选 {DB_LINES_NDJSON.relative_to(ROOT)}")
    print(f"      (导入选项: 数据冲突时覆盖, 文件类型 ndjson)")
    print(f"   3. 创建集合 'subway_meta' → 导入 → 选 {DB_META_NDJSON.relative_to(ROOT)}")
    print(f"   4. 两个集合权限改成 '所有用户可读, 仅创建者可读写'")
    print(f"   5. cloudData.js 已配置 WX_CLOUD_ENV, 重启小程序生效")


if __name__ == "__main__":
    sys.exit(main())
