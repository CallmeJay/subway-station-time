# 数据生成管线 · README

## 当前状态

| 数据 | 状态 | 文件 |
|---|---|---|
| 28 条线路色值 + 端点 | ✅ 真实 | `data/lines.js` |
| 20 条线 390 站站点列表 (含拼音) | ✅ 真实 (开源数据集) | `data/stations.generated.js` |
| 时刻表 (40 个线路×方向, 9598 班次) | 🟡 合成 (节奏真实, 班次为算法生成) | `data/timetable.generated.js` |

## 如何升级到真实时刻表

需要三步, 依赖 `bjsubway.com` 网络可达 + 一个 Anthropic API Key.

```bash
# 0. 准备依赖
pip install requests beautifulsoup4 lxml pypinyin anthropic

export ANTHROPIC_API_KEY=sk-ant-xxxxxxx

# 1. 抓时刻表 jpg (~2000 张, ~2GB)
python scripts/scrape_full.py --lines all

# 2. OCR 识别 (~$30 一次性, 断点可续)
python scripts/recognize_timetable.py --all
# 调试: python scripts/recognize_timetable.py --line line1 --station 复兴门

# 3. 合并并切换数据源
# 修改 data/timetable-mock.js:
#   require('./timetable.generated.js')  →  require('./timetable.real.js')
```

## 各脚本职责

| 脚本 | 用途 |
|---|---|
| `build_stations.py` | 从开源数据集生成站点列表 (已跑过, 不需重跑) |
| `scrape_full.py` | 抓 bjsubway.com 时刻表 jpg (Phase 1) |
| `recognize_timetable.py` | 调 Anthropic API 识别 jpg (Phase 2B) |
| `synthesize_timetable.py` | 生成合成时刻表 (Phase 2A · 已跑过) |

## 增量更新

bjsubway.com 上时刻表图的发布日期在 URL 里, 可以做 diff 增量更新:

```bash
# 每月 / 每季跑一次
python scripts/scrape_full.py --lines all      # 抓的 jpg 自动跳过已存在的
python scripts/recognize_timetable.py --all    # 缓存了的也自动跳过
```

只识别新增/变更的图, 增量成本 < $1/月.
