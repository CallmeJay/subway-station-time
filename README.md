# 下一班 · 地铁助手

> 北京地铁站点下一班车时刻查询小程序 · 个人 MVP 项目

⚠️ **非官方应用** — 本项目与北京市地铁运营有限公司、北京京港地铁有限公司**无任何关联**。详见 [DISCLAIMER.md](./DISCLAIMER.md)。

## 功能

- 📍 **下一班** — 当前站点下一班车几分钟后到，含终点站、始发车提示
- 🗓️ **全天时刻表** — 按小时分组、当前时段自动定位、工作日/双休切换
- ⭐ **收藏** — 常用站点 + 方向一键收藏
- 🎨 **深色模式** — 跟随系统 / 强制浅色 / 强制深色
- 🏠 **默认开屏站** — 设为首站，下次启动直达

## 数据规模

- 27 条北京地铁线路（含京港 4/14/16/17）
- 525 个车站（含拼音、换乘、首末班）
- 463 个方向 × 站级真实首末班数据
- 12958 个工作日合成班次 + 10350 个双休日合成班次

## 数据来源

- 京港地铁 mtr.bj.cn — 4/14/16/17 号线官方时刻表
- 高德地图开放接口 — 其他 21 条线
- 北京市首都之窗 — 工作日/双休间隔差异参考
- DB11/T657.2-2015 — 线路色值国标
- 维基百科 — 线路概览

## 项目结构

```
bjsubway-mini/
├── app.json / app.js / app.wxss     主入口 + 全局样式 (含深浅主题)
├── pages/
│   ├── index/         主页 (下一班实时倒计时)
│   ├── picker/        线路 + 站点选择 (两列 master-detail)
│   ├── schedule/      全天时刻表 (按小时分组)
│   ├── favorites/     收藏管理
│   └── me/            个人资料 + 设置 + 数据来源
├── data/              数据层 (auto-generated)
├── utils/             工具函数 (主题 / 收藏 / 时间计算 / 用户配置)
└── scripts/           Python 抓取/合成脚本
```

## 开发

需要微信开发者工具。导入项目后选「使用测试号」或填自己的 AppID 即可运行。

数据更新（每月一次即可）：

```bash
pip install requests beautifulsoup4 lxml pypinyin
python3 scripts/fetch_mtr.py            # 京港 4 条线真实数据
python3 scripts/fetch_amap.py           # 高德 27 条线
python3 scripts/synthesize_timetable.py # 合成兜底
```

## License

MIT — see [LICENSE](./LICENSE)

代码采用 MIT 开源；**数据合规使用**仍受第三方服务条款约束（如高德开放平台条款）。

## Disclaimer

详见 [DISCLAIMER.md](./DISCLAIMER.md)。简言之：本应用为参考工具，**实际班次以北京地铁/京港地铁官方公告为准**。
