/**
 * 运行时合成班次时刻表
 *
 * 输入: ft / lt 首末班 (字符串 'HH:MM' 或 [h, m]) + daytype + 终点站
 * 输出: schedule[] = [{hour, minute, end, endColor, isOrigin?}]
 *
 * 抓手: 把工作日/双休 ~9000 班次硬写在 JS 文件里 = 24MB.
 * 改成首末班存元数据 + 运行时合成 → ~150KB.
 */

const PROFILE_WEEKDAY = [
  [5,0,7,0,5], [7,0,9,30,3], [9,30,17,0,5],
  [17,0,19,30,3], [19,30,21,30,5], [21,30,24,0,8]
];
const PROFILE_WEEKEND = [
  [5,0,8,0,8], [8,0,10,0,7], [10,0,17,0,8],
  [17,0,20,0,7], [20,0,22,0,9], [22,0,24,0,10]
];

function parseHHMM(s) {
  if (!s) return null;
  if (Array.isArray(s)) return s;
  if (s === '-' || s === '--:--') return null;
  let str = String(s).trim();
  let overnight = false;
  if (str.indexOf('次日') === 0) {
    str = str.slice(2);
    overnight = true;
  }
  const parts = str.split(':');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return [overnight ? h + 24 : h, m];
}

function intervalAt(h, m, profile) {
  const cur = h * 60 + m;
  for (let i = 0; i < profile.length; i++) {
    const p = profile[i];
    if (p[0] * 60 + p[1] <= cur && cur < p[2] * 60 + p[3]) return p[4];
  }
  return 8;
}

/**
 * 从 ft/lt + daytype + end + endColor 合成 schedule.
 * @param ft       首班 'HH:MM' or [h, m]
 * @param lt       末班 'HH:MM' or [h, m] (可能跨零点)
 * @param daytype  'weekday' or 'weekend'
 * @param end      终点站名 (写入每个 entry)
 * @param endColor 终点色 (写入每个 entry)
 */
function buildSchedule(ft, lt, daytype, end, endColor) {
  const first = parseHHMM(ft);
  const last  = parseHHMM(lt);
  if (!first || !last) return [];

  let [fh, fm] = first;
  let [lh, lm] = last;
  // 跨零点: 末班 < 首班 → +24h
  if (lh * 60 + lm < fh * 60 + fm) lh += 24;

  const profile = daytype === 'weekend' ? PROFILE_WEEKEND : PROFILE_WEEKDAY;
  const sched = [];
  let h = fh, m = fm;
  const endMin = lh * 60 + lm;

  while (h * 60 + m <= endMin) {
    const entry = { hour: h, minute: m };
    if (end) entry.end = end;
    if (endColor) entry.endColor = endColor;
    sched.push(entry);
    m += intervalAt(h, m, profile);
    while (m >= 60) { m -= 60; h += 1; }
    if (h >= 30) break;
  }
  if (sched.length) {
    sched[sched.length - 1].hour = lh;
    sched[sched.length - 1].minute = lm;
  }
  return sched;
}

// 缓存 (station+dir+daytype 维度)
const _cache = {};
function buildScheduleCached(key, ft, lt, daytype, end, endColor) {
  if (_cache[key]) return _cache[key];
  const r = buildSchedule(ft, lt, daytype, end, endColor);
  _cache[key] = r;
  return r;
}

function clearCache() {
  for (const k in _cache) delete _cache[k];
}

module.exports = { buildSchedule, buildScheduleCached, clearCache, parseHHMM };
