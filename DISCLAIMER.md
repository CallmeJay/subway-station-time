# 免责声明 / Disclaimer

## 中文版

### 关于本项目

「下一班 · 地铁助手」是个人开发者制作的开源 MVP 工具。本项目与北京市地铁运营有限公司、北京京港地铁有限公司及任何北京地铁运营单位**无任何隶属、授权、合作或赞助关系**。本应用为非官方第三方工具。

### 数据来源声明

| 数据 | 来源 | 性质 |
|---|---|---|
| 站点结构、首末班时间 | [高德地图开放接口](https://lbs.amap.com) (公开数据) | 第三方公开数据 |
| 京港地铁 4/14/16/17 号线 | [mtr.bj.cn](https://www.mtr.bj.cn) 官方时刻表 | 公开网页抓取 |
| 中间班次具体分钟 | 基于真实首末班 + 官方间隔规律算法合成 | 合成估算数据 |
| 工作日 / 双休日间隔差异 | [北京市首都之窗官方报道](https://www.beijing.gov.cn/gongkai/hygq/202009/t20200914_2059201.html) | 公开权威 |
| 线路色值 | DB11/T657.2-2015 北京市公共交通地方标准 | 国家标准 |

### 数据准确性声明

- 站级首末班时间来自第三方公开渠道，已尽合理努力保证准确，但无法替代官方数据
- 中间具体分钟班次为**算法合成**，非官方时刻表 OCR 结果，可能与实际有偏差
- 节假日特殊调整、突发线路调整、临时停运等情况未纳入数据
- **使用本应用规划出行时，请以北京地铁、京港地铁官方公告为准**

### 责任限制

本应用按"现状"提供，开发者不对以下情况承担责任：
- 因数据偏差导致的错过列车、迟到、误时
- 因实际运营调整与本应用显示不符引起的不便
- 因网络、设备、第三方服务异常引起的功能异常

### 商标与品牌

- "北京地铁"、"京港地铁"、各线路 logo、列车 logo 等均为各自所有者的注册商标
- 本应用使用的线路色值依据国标公开，不构成商标使用
- 本应用 logo / 名称与上述官方标识无任何视觉混淆设计

### 商业化与第三方使用

- 本项目代码采用 MIT 协议开源
- **数据本身的合规性使用**仍受第三方服务条款约束（如高德地图开放平台条款）
- 如需商业化使用本数据，使用者需自行获得高德 / 京港 / 北京地铁等数据所有方的授权

---

## English Version

### About

"NextTrain · Beijing Metro Helper" (`subwway-station-time`) is an open-source MVP tool by an individual developer. This project has **no affiliation, authorization, partnership, or sponsorship** with Beijing Subway Operation Co., MTR Beijing Co., or any Beijing metro operator. This is an unofficial third-party tool.

### Data Sources

- Station structure & first/last train times: Amap public endpoints
- Lines 4/14/16/17 timetable: MTR Beijing official website
- Intermediate train minutes: synthesized from real first/last + interval rules
- Weekday/weekend differential: Beijing Government Capital Window 2020 report
- Line color codes: DB11/T657.2-2015 Beijing local standard

### Accuracy Notice

Train data is best-effort and may differ from official schedules. Always verify with official Beijing Subway / MTR Beijing announcements before relying on it for actual travel planning.

### Liability

Software is provided "AS IS" without warranty. Developer assumes no liability for missed trains, lateness, or any inconvenience caused by data discrepancies.

### Trademarks

"Beijing Subway", "MTR Beijing", line logos, train logos are registered trademarks of their respective owners. This application uses standardized public color codes only.
