/**
 * 云端上传配置示例 (复制为 config/cloud.js, 填入你的 bucket 信息)
 *
 * 三种主流云存储任选其一:
 *
 *  A. 微信云开发 (官方推荐, 集成度最高)
 *     - 在微信开发者工具开通云开发, 拿到 cloud env ID
 *     - 用 cloudfunction 上传 / 直接用开发者工具的"文件存储" UI 拖拽
 *
 *  B. 阿里 OSS / 腾讯 COS (国内稳, 按量付费 < ¥10/月)
 *     - 控制台开 bucket, 配置公网读取权限
 *     - 安装 ossutil 配置 access key, 此脚本调用 cli 上传
 *
 *  C. GitHub Pages (零成本, 国内访问偶有不稳)
 *     - 单独建个 data 仓 (subway-station-time-data), 开 Pages
 *     - 数据 commit 到 gh-pages 分支即可
 */

module.exports = {
  // === A. 微信云开发 ===
  WXCLOUD_ENV_ID: 'your-cloud-env-id',

  // === B. 阿里 OSS ===
  OSS_BUCKET_URL: 'oss://your-bucket/subway-data',
  // 公网访问 base (供 utils/cloudData.js CLOUD_BASE 用)
  PUBLIC_BASE_URL: 'https://your-bucket.oss-cn-beijing.aliyuncs.com/subway-data/',

  // === C. GitHub Pages ===
  GITHUB_PAGES_URL: 'https://callmejay.github.io/subway-station-time/'
};
