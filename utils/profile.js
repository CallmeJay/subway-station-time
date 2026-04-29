/**
 * 用户配置与统计 · 基于 wx.setStorageSync
 * key: subway_profile
 *
 * {
 *   nickname: '通勤客 #4321',
 *   firstUseAt: 1714471232100,
 *   queryCount: 42,
 *   homeLine: 'line1',
 *   homeStation: '复兴门',
 *   homeDirection: 'east',
 *   theme: 'auto',     // auto | light | dark
 *   haptic: true,
 *   refreshInterval: 1   // seconds
 * }
 */

const KEY = 'subway_profile';

const DEFAULTS = {
  nickname: '',
  avatarUrl: '',
  firstUseAt: 0,
  queryCount: 0,
  homeLine: '',
  homeStation: '',
  homeDirection: 'east',
  theme: 'auto',
  haptic: true,
  refreshInterval: 1
};

function read() {
  try {
    const raw = wx.getStorageSync(KEY);
    if (!raw || typeof raw !== 'object') return ensureInit({});
    return ensureInit(raw);
  } catch (e) {
    return ensureInit({});
  }
}

function ensureInit(p) {
  const merged = Object.assign({}, DEFAULTS, p);
  if (!merged.firstUseAt) merged.firstUseAt = Date.now();
  if (!merged.nickname) {
    const seed = Math.floor(Math.random() * 9000) + 1000;
    merged.nickname = '地铁通勤客 #' + seed;
  }
  write(merged);
  return merged;
}

function write(p) {
  try {
    wx.setStorageSync(KEY, p);
  } catch (e) {
    console.warn('[profile] write failed:', e);
  }
}

function update(patch) {
  const cur = read();
  const next = Object.assign({}, cur, patch || {});
  write(next);
  return next;
}

function bumpQuery() {
  const cur = read();
  cur.queryCount = (cur.queryCount || 0) + 1;
  write(cur);
}

function reset() {
  try {
    wx.removeStorageSync(KEY);
  } catch (e) {}
  return ensureInit({});
}

function daysSinceFirst(p) {
  if (!p.firstUseAt) return 0;
  return Math.max(1, Math.floor((Date.now() - p.firstUseAt) / 86400000));
}

module.exports = {
  read, write, update, bumpQuery, reset, daysSinceFirst
};
