/**
 * 收藏存储 · 基于 wx.setStorageSync
 *
 * 数据结构: [{id, lineId, stationCn, direction, addedAt}]
 *   id = `${lineId}|${stationCn}|${direction}` (唯一键, 同站同方向去重)
 */

const KEY = 'bjsubway_favorites';

function makeId(lineId, stationCn, direction) {
  return `${lineId}|${stationCn}|${direction}`;
}

function readAll() {
  try {
    const raw = wx.getStorageSync(KEY);
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function writeAll(list) {
  try {
    wx.setStorageSync(KEY, list);
  } catch (e) {
    console.warn('[fav] persist failed:', e);
  }
}

function isFavorite(lineId, stationCn, direction) {
  const id = makeId(lineId, stationCn, direction);
  return readAll().some(f => f.id === id);
}

function toggle(lineId, stationCn, direction) {
  const id = makeId(lineId, stationCn, direction);
  const list = readAll();
  const idx = list.findIndex(f => f.id === id);
  if (idx >= 0) {
    list.splice(idx, 1);
    writeAll(list);
    return false; // removed
  }
  list.unshift({ id, lineId, stationCn, direction, addedAt: Date.now() });
  writeAll(list);
  return true; // added
}

function remove(id) {
  const list = readAll().filter(f => f.id !== id);
  writeAll(list);
}

function clear() {
  writeAll([]);
}

module.exports = {
  makeId,
  readAll,
  isFavorite,
  toggle,
  remove,
  clear
};
