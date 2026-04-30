# 云端数据架构设置指南

> bjsubway.com 恢复 → 跑 OCR → 数据上云 → 小程序自动 fetch
> 整套链路准备好, 等数据来填.

## 全流程一览

```
[bjsubway.com 复活]
   ↓ scripts/monitor_bjsubway.sh --auto  (自动监控)
[抓 jpg]                                 scrape_full.py
   ↓
[OCR 识别]                               recognize_timetable.py
   ↓
[数据落 data/cloud/lines/{id}.json]
   ↓
[upload_to_cloud.py 生成 manifest + 上传]
   ↓
[utils/cloudData.js 客户端按需 fetch + 缓存]
```

## 一次性配置 (15 分钟)

### 步骤 1 · 选云存储

| 选项 | 适合 | 成本 |
|---|---|---|
| 微信云开发 | 主推, 集成度最高 | 免费 5GB |
| 阿里 OSS | 国内访问稳 | < ¥10/月 |
| 腾讯 COS | 同上 | < ¥10/月 |
| GitHub Pages | 个人项目, 零成本 | 0 (国内偶慢) |

### 步骤 2 · 配置文件

```bash
cp config/cloud.example.js config/cloud.js
# 编辑 config/cloud.js, 填你的 bucket / env / key
# config/cloud.js 已 gitignore, 不会泄漏
```

### 步骤 3 · 客户端 base URL

编辑 `utils/cloudData.js` 第 11 行:

```js
// 改成你的实际 CDN 路径
const CLOUD_BASE = 'https://your-bucket.oss-cn-beijing.aliyuncs.com/subway-data/';
```

### 步骤 4 · app.js 启动加载

编辑 `app.js` onLaunch:

```js
const cloud = require('./utils/cloudData.js');

App({
  onLaunch() {
    cloud.init();  // 异步, 不阻塞
    // ... 其他启动逻辑
  }
});
```

### 步骤 5 · 改 timetable-mock.js 路由

```js
const cloud = require('../utils/cloudData.js');

function getSchedule(lineId, stationCn, direction, daytype) {
  // 1. 优先用云端真数据 (OCR)
  const line = cloud.getLineData(lineId);
  if (line && line.timetable && line.timetable[stationCn]) {
    const dirData = line.timetable[stationCn][direction];
    if (dirData && dirData[daytype]) return dirData[daytype];
  }

  // 2. 兜底: 用主包内嵌的合成数据
  return _localFallback(lineId, stationCn, direction, daytype);
}
```

## bjsubway.com 复活后的标准流程

```bash
# 1. 监控 (后台跑, 通了自动抓 jpg)
./scripts/monitor_bjsubway.sh --auto &

# 2. 通了之后, 看 jpg 数 (应 ~2000)
ls data/timetable_imgs/ | wc -l

# 3. OCR (~$30, 跑 1-2 小时)
export ANTHROPIC_API_KEY=sk-ant-xxx
python3 scripts/recognize_timetable.py --all

# 4. 重排数据为 cloud 格式 (按线分文件)
python3 scripts/build_cloud_data.py    # TODO: 待实现的最后一步合成器

# 5. 生成 manifest + 上传
python3 scripts/upload_to_cloud.py --provider oss

# 6. 小程序什么都不用改, 启动后自动拉新版本数据
```

## 调试

```bash
# 模拟无 CLOUD_BASE: utils/cloudData.js CLOUD_BASE = ''
# 启动后 cloud.getLineData(...) 永远 null, 全部走本地兜底

# 模拟首次安装: 微信开发者工具 → 详情 → 清除全部数据
# 应该看到: 主包内嵌兜底数据 → 后台拉云端 → 用户切站时已有真数据
```

## 监控

```bash
# 实时探 bjsubway.com 状态
./scripts/monitor_bjsubway.sh --once

# 后台 30 分钟一次, 通了语音提示
./scripts/monitor_bjsubway.sh

# 通了自动启动抓取
./scripts/monitor_bjsubway.sh --auto
```

## 数据更新策略

- 用户启动 → init() 异步拉 manifest
- 版本号变化 → 后台增量下载变化的 line 文件
- 写到 wx.setStorage, 下次启动直接秒开
- 无网络 → 用本地缓存
- 完全冷启动 + 无网 → 主包内嵌 mini-snapshot 兜底
