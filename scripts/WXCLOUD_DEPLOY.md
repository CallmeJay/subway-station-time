# 微信云开发 · main 分支瘦身部署 SOP

> 把 main 分支的 ~40MB 数据搬到云开发存储 → 主包仅 ~300KB → 通过审核

## 全流程 (一次性, ~15 分钟)

### 1. 在微信开发者工具开通云开发

1. 打开微信开发者工具 → 项目 → 顶部菜单「云开发」
2. 提示开通 → 「立即开通」 → 选「按量付费」(注: 免费额度 5GB 存储 + 5GB/月流量足够本项目)
3. 创建环境, 名字随意 (如 `subway-prod`), 拿到 **Cloud Env ID** (形如 `subway-prod-1abc23def`)
4. 把 ID 填到 `utils/cloudData.js` 的 `WX_CLOUD_ENV`:

   ```js
   const WX_CLOUD_ENV = 'subway-prod-1abc23def';   // 替换为你拿到的
   ```

### 2. 生成云端数据包

```bash
cd /Users/jaybian/WeChatProjects/bjsubway-mini
python3 scripts/build_cloud_payload.py
```

输出:
```
data/cloud/
├── manifest.json        ~3 KB (索引 + 版本号)
└── lines/
    ├── line1.json       ~9 KB
    ├── line2.json       ~4 KB
    ... 28 个文件
    总计 ~92 KB
```

(等 bjsubway.com 复活 + OCR 跑完后, 这个体积会变成 ~3-5 MB, 仍在云开发免费额度内)

### 3. 上传到云开发存储

**方案 A: 用开发者工具 UI 拖拽 (推荐, 5 分钟)**

1. 开发者工具 → 云开发面板 → 「文件存储」标签
2. 在根目录拖拽:
   - `manifest.json` (放根)
   - 整个 `lines/` 文件夹 (变成 `lines/line1.json` 等)
3. 上传完检查每个文件的「FileID」, 形如:
   ```
   cloud://subway-prod-1abc23def.7368-xxx/manifest.json
   cloud://subway-prod-1abc23def.7368-xxx/lines/line1.json
   ```
4. 把 manifest.json 内的 url 字段改成对应 FileID:
   ```bash
   # 简化: 在每条 manifest.lines[] 里加 fileID 字段
   # 客户端 cloudData.js 优先用 fileID
   ```

**方案 B: 写云函数批量上传 (适合 CI/CD, 复杂一点)**

```bash
# 1. 在开发者工具创建云函数 deployData
# 2. 函数体调 cloud.uploadFile() 上传 data/cloud/* 全部
# 3. 部署 → 调用 → 自动产出更新后的 manifest
```

### 4. 删主包大文件 (体积清理)

```bash
# 备份 (以防万一)
cp -r data data.bak

# 删大文件 (lines.js 之外的 generated 全删, 由云端取代)
rm data/timetable.amap.station.generated.js   # 24M (已紧凑过的版本只有 44K, 但仍删)
rm data/timetable.station.generated.js
rm data/timetable.generated.js
rm data/stations.amap.generated.js
rm data/stations.generated.js
rm data/stations.mtr.generated.js
rm data/amap-timetables.json
rm data/mtr-timetables.json
rm data/mtr-stations.json
```

### 5. 改 timetable-mock.js + lines.js 走云端

把这两个文件改成「先查云端, 没有就退回 mini-fallback」:

```js
// data/timetable-mock.js
const cloud = require('../utils/cloudData.js');
const fallback = require('./mini-fallback.js');  // 主包内嵌, 仅 6 条核心线

function getSchedule(lineId, stationCn, direction, daytype) {
  const line = cloud.getLineData(lineId);
  if (line && line.timetable) {
    // 用云端真数据 (mtr / amap / 合成 三层 fallback)
    // ... 解析逻辑
  }
  return fallback.getSchedule(lineId, stationCn, direction, daytype);
}
```

(我可以帮你写完整的 mini-fallback + 改造 timetable-mock.js, 等你确认要做这一步)

### 6. 验证

1. 微信开发者工具 → 编译 → 启动小程序
2. 检查控制台:
   ```
   [cloud] init done, env: subway-prod-1abc23def
   [cloud] manifest fetched, version: 20260430.0318
   [cloud] line line1 cached
   ```
3. 切到 1 号线复兴门 → 应该秒开 (本地缓存已写)
4. 杀小程序重启 → 应该秒开 (从 wx.setStorage 取)
5. 飞行模式重启 → 应该仍能看到上次缓存的数据

### 7. 体积验证

```
微信开发者工具 → 详情 → 代码质量 → 重新扫描

主包大小: ~300 KB ✓ (远低于 1.5 MB)
图片资源: 0 KB ✓
```

## 故障排查

| 现象 | 可能原因 | 修法 |
|---|---|---|
| `wx.cloud is not defined` | 未开通云开发 | 走步骤 1 |
| `init failed: ENV_NOT_FOUND` | env ID 拼错 | 检查 WX_CLOUD_ENV 字符串 |
| `downloadFile failed: -403` | 文件存储权限 | 控制台 → 文件存储 → 权限 → 「所有用户可读」 |
| 第一次启动数据为空 | manifest 未到达 | 检查 manifest.json 是否真的在云端根目录 |
| 切线路时数据不对 | 缓存版本错乱 | 用户在「我的」页点「重置数据」清缓存 |

## 数据更新流程 (无需重新提交小程序审核)

```bash
# 1. bjsubway.com 复活 + 跑完 OCR
python3 scripts/recognize_timetable.py --all

# 2. 重新打包云端 payload
python3 scripts/build_cloud_payload.py

# 3. 上传 (开发者工具拖拽 / 云函数自动)
#    manifest.version 会自动 bump

# 4. 用户下次打开小程序:
#    - cloudData.init() 异步拉新 manifest
#    - 发现版本变了 → 后台增量下载
#    - 用户切站时已有真数据
#
# 整个过程小程序不需要重新审核, 数据热更新.
```

## 成本估算 (微信云开发免费额度)

| 项 | 用量 | 免费额度 | 余量 |
|---|---|---|---|
| 存储 | 92 KB (现在) - 5 MB (OCR 后) | 5 GB | 99% |
| CDN 流量 | 假设 1000 用户/月 × 4 MB | 5 GB/月 | 99% |
| 调用次数 | 假设 1000 用户/月 × 50 次 | 不限 | ✓ |

**结论**: 完全在免费额度内, 个人项目不会产生任何费用.
