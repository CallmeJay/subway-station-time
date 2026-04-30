/**
 * 云端数据加载与缓存
 *
 * 数据流:
 *   1. 启动: 拉 manifest.json 检查版本
 *   2. 版本变化: 异步下载新数据 → 写入 wx.setStorage
 *   3. 同版本 / 离线: 直接用本地缓存
 *   4. 全冷启动 + 离线: 退回主包内嵌的 mini-snapshot (保底体验)
 *
 * 配置: 改 CLOUD_BASE 指向你自己的 CDN / 微信云开发文件 URL
 */

// 两种云端模式 (二选一):
//   1. WX_CLOUD_ENV: 微信云开发 (推荐, 用 wx.cloud SDK, 无需配域名白名单)
//   2. CLOUD_BASE: 普通 HTTPS CDN (OSS / COS / GitHub Pages, 需配 request 合法域名)
const WX_CLOUD_ENV = 'cloud1-d3gyjnq3q7410a857';
const CLOUD_BASE   = '';  // 例: 'https://your-cdn.com/subway-data/'

const MANIFEST_KEY  = '__cloudManifest';
const DATA_KEY_PREFIX = '__cloudData_';
const CACHE_TTL_MS = 30 * 24 * 3600 * 1000;  // 30 天

let _ready = false;
let _readyResolvers = [];
let _data = {};            // { lineId: { stations: {}, timetable: {} } }

function _waitReady() {
  if (_ready) return Promise.resolve();
  return new Promise(resolve => _readyResolvers.push(resolve));
}

function _resolveReady() {
  _ready = true;
  _readyResolvers.forEach(r => r());
  _readyResolvers = [];
}

function _readCache(key) {
  try { return wx.getStorageSync(key) || null; } catch (e) { return null; }
}

function _writeCache(key, value) {
  try { wx.setStorageSync(key, value); } catch (e) {}
}

function _httpGetJson(url) {
  return new Promise((resolve, reject) => {
    wx.request({
      url, timeout: 10000,
      success: res => res.statusCode === 200 ? resolve(res.data) : reject(new Error('HTTP ' + res.statusCode)),
      fail: reject
    });
  });
}

// 微信云数据库: 用 db.collection.doc.get() 取数据 (无需 fileID)
function _dbGetDoc(collectionName, docId) {
  if (!wx.cloud) return Promise.reject(new Error('wx.cloud unavailable'));
  const db = wx.cloud.database();
  return db.collection(collectionName).doc(docId).get()
    .then(res => res.data)
    .catch(err => {
      // doc not found → 返回 null (被调用方降级)
      if (err && (err.errCode === -1 || /not exist/i.test(err.errMsg || ''))) return null;
      throw err;
    });
}

// 普通 HTTPS CDN 路径
function _httpFetchByPath(relativePath) {
  return _httpGetJson(CLOUD_BASE + relativePath);
}

/**
 * 启动加载流程. 在 app.js onLaunch 里调一次即可.
 *  - 无 CLOUD_BASE 配置: 直接 ready, 全部走主包内嵌
 *  - 有配置: 异步拉 manifest, 后台增量下载, ready 不阻塞 (用本地缓存先开)
 */
function init() {
  // 没配置任何云端 → 全走主包内嵌
  if (!WX_CLOUD_ENV && !CLOUD_BASE) {
    _resolveReady();
    return Promise.resolve();
  }

  // 微信云开发 SDK 初始化
  if (WX_CLOUD_ENV && wx.cloud) {
    try {
      wx.cloud.init({ env: WX_CLOUD_ENV, traceUser: false });
    } catch (e) {
      console.warn('[cloud] wx.cloud.init failed:', e);
    }
  }

  // 1. 先用本地缓存数据让页面立即可用
  _hydrateFromCache();
  _resolveReady();

  // 2. 后台异步检查更新
  const fetchManifest = WX_CLOUD_ENV
    ? _dbGetDoc('subway_meta', 'manifest')   // 云数据库: 集合 subway_meta, 文档 _id=manifest
    : _httpFetchByPath('manifest.json');     // CDN: 直接拉文件

  return fetchManifest
    .then(remote => {
      const local = _readCache(MANIFEST_KEY) || {};
      if (remote.version === local.version) return;  // 版本一致, 不动

      // 版本升级 → 增量下载变化的 line file
      const changed = (remote.lines || []).filter(l => {
        const localEntry = (local.lines || []).find(x => x.lineId === l.lineId);
        return !localEntry || localEntry.hash !== l.hash;
      });

      // 拉变化的 line: 数据库 collection 'subway_lines' / doc = lineId
      const fetchLine = (lineId) => WX_CLOUD_ENV
        ? _dbGetDoc('subway_lines', lineId)
        : _httpFetchByPath(`lines/${lineId}.json`);

      return Promise.all(changed.map(l =>
        fetchLine(l.lineId).then(data => {
          if (!data) return;
          _writeCache(DATA_KEY_PREFIX + l.lineId, data);
          _data[l.lineId] = data;
        }).catch(e => console.warn('[cloud] line ' + l.lineId + ' fetch fail', e))
      )).then(() => {
        _writeCache(MANIFEST_KEY, remote);
      });
    })
    .catch(e => {
      console.warn('[cloud] manifest fetch failed (offline?), using cache only:', e);
    });
}

function _hydrateFromCache() {
  const manifest = _readCache(MANIFEST_KEY);
  if (!manifest || !manifest.lines) return;
  for (const l of manifest.lines) {
    const cached = _readCache(DATA_KEY_PREFIX + l.lineId);
    if (cached) _data[l.lineId] = cached;
  }
}

/**
 * 取某条线的云端数据.
 * @return null 表示未加载; 调用方需走主包内嵌兜底
 */
function getLineData(lineId) {
  return _data[lineId] || null;
}

/**
 * 强制清空所有云端缓存 (设置 → 清缓存)
 */
function clearAllCache() {
  try {
    wx.removeStorageSync(MANIFEST_KEY);
    const info = wx.getStorageInfoSync();
    (info.keys || []).forEach(k => {
      if (k.indexOf(DATA_KEY_PREFIX) === 0) wx.removeStorageSync(k);
    });
    _data = {};
  } catch (e) {}
}

module.exports = {
  CLOUD_BASE,
  init,
  waitReady: _waitReady,
  getLineData,
  clearAllCache
};
