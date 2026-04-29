/**
 * 高德地图开放平台 Key 配置 (示例)
 *
 * 申请地址: https://lbs.amap.com
 *
 * 使用步骤:
 *   1. cp config/amap.example.js config/amap.js
 *   2. 把 KEY 字段填入你的 Web 服务 / 小程序 Key
 *   3. config/amap.js 已加入 .gitignore, 不会被提交
 */

module.exports = {
  // Web服务 Key (用于 scripts/fetch_amap_official.py 抓数据)
  WEB_KEY: 'YOUR_WEB_SERVICE_KEY_HERE',

  // 小程序 Key (用于运行时调 restapi.amap.com)
  MP_KEY: 'YOUR_MINIPROGRAM_KEY_HERE',

  // 高德 WebService API base
  WEB_BASE: 'https://restapi.amap.com'
};
