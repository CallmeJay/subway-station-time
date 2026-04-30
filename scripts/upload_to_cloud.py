#!/usr/bin/env python3
"""
打包数据 → 上传云端 (按线分文件 + manifest 版本控制)

bjsubway.com 恢复 → 跑完 OCR → 跑此脚本 → 数据落云端 → 小程序自动 fetch.

支持云端:
  - 微信云开发 (推荐, 需配 cloud env)
  - 阿里 OSS / 腾讯 COS / 七牛
  - GitHub Pages / raw.githubusercontent.com (零成本但国内不稳)

使用:
  # 1. 把 OCR 后的真实时刻表 JSON 放到 data/cloud/lines/{lineId}.json
  # 2. 配置 config/cloud.js (从 cloud.example.js 复制)
  # 3. 跑此脚本生成 manifest + 上传
  python3 scripts/upload_to_cloud.py --provider wxcloud
  python3 scripts/upload_to_cloud.py --provider ossutil
  python3 scripts/upload_to_cloud.py --dry-run   # 只生成 manifest, 不上传
"""

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CLOUD_DIR = ROOT / "data" / "cloud"
LINES_DIR = CLOUD_DIR / "lines"
MANIFEST = CLOUD_DIR / "manifest.json"


def hash_file(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()[:12]


def build_manifest():
    LINES_DIR.mkdir(parents=True, exist_ok=True)
    line_files = sorted(LINES_DIR.glob("*.json"))
    if not line_files:
        print("⚠ 没找到 data/cloud/lines/*.json. 跑 OCR 后把数据放进去再来.")
        return None

    manifest = {
        "version": datetime.now(timezone.utc).strftime("%Y%m%d.%H%M"),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "schema": "v1",
        "lines": [],
    }
    for f in line_files:
        manifest["lines"].append({
            "lineId": f.stem,
            "url": f"lines/{f.name}",
            "hash": hash_file(f),
            "size": f.stat().st_size,
        })
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def upload_wxcloud(manifest):
    """微信云开发存储上传 (需先安装 wx-server-sdk + 配置环境)"""
    print("⚠ 微信云开发上传需要 Node.js + wx-server-sdk, 此处仅 stub.")
    print("   建议路径:")
    print("   1. 微信开发者工具 → 云开发 → 文件存储 → 手动上传 manifest.json + lines/*.json")
    print("   2. 或写 cloudfunction 实现 putObject (参考 https://docs.cloudbase.net/api-reference/storage)")
    return False


def upload_oss(manifest):
    """阿里 OSS / 腾讯 COS 通过 ossutil 上传"""
    import subprocess
    try:
        from config import cloud
    except ImportError:
        print("❌ 缺 config/cloud.js, 复制 cloud.example.js 配置后再来")
        return False

    # 假设 ossutil 已安装并配置好 ~/.ossutilconfig
    bucket_url = getattr(cloud, "OSS_BUCKET_URL", None)
    if not bucket_url:
        print("❌ config/cloud.js 缺 OSS_BUCKET_URL")
        return False

    files = [MANIFEST] + list(LINES_DIR.glob("*.json"))
    for f in files:
        rel = f.relative_to(CLOUD_DIR)
        target = f"{bucket_url}/{rel}"
        cmd = ["ossutil", "cp", "-f", str(f), target]
        print("  $", " ".join(cmd))
        rc = subprocess.run(cmd).returncode
        if rc != 0:
            print(f"  ⚠ upload {f.name} failed")
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--provider", default="wxcloud", choices=["wxcloud", "oss", "github"])
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print("[1/2] 生成 manifest...")
    m = build_manifest()
    if not m:
        sys.exit(1)
    print(f"  ✓ {len(m['lines'])} 条线, version = {m['version']}")
    print(f"  ✓ {MANIFEST.relative_to(ROOT)}")

    if args.dry_run:
        print("\n[dry-run] 不上传, 检查 data/cloud/ 然后手动上传到你的 CDN")
        print("\n上传后, 把 utils/cloudData.js 里的 CLOUD_BASE 改成实际 URL, 例:")
        print("  CLOUD_BASE = 'https://your-cdn.com/subway-data/';")
        return

    print(f"\n[2/2] 上传 ({args.provider})...")
    if args.provider == "wxcloud":
        upload_wxcloud(m)
    elif args.provider == "oss":
        upload_oss(m)
    elif args.provider == "github":
        print("⚠ GitHub Pages 路径: 把 data/cloud/* commit 到 gh-pages 分支即可")
        print(f"  CLOUD_BASE 设为: https://callmejay.github.io/subway-station-time/")


if __name__ == "__main__":
    sys.exit(main())
