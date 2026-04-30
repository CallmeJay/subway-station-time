/**
 * 时刻表数据入口
 *
 * 当前数据源:
 *   合成数据 (data/timetable.generated.js)
 *   - 真实首末班时间
 *   - 真实运营间隔节奏 (早高峰 3min / 平峰 5min / 末段 8min)
 *   - 1 号线终点站轮换 (四惠 / 四惠东 / 环球度假区)
 *
 * 升级到真实数据:
 *   1. 跑 scripts/recognize_timetable.py (Phase 2B), 接入 Anthropic API
 *      把 bjsubway.com 各站时刻表 jpg 识别为结构化 JSON
 *   2. 输出到 data/timetable.real.js
 *   3. 修改本文件 require 路径
 */

const { getSchedule: lineLevel } = require('./timetable.generated.js');
const { getStationSchedule } = require('./timetable.station.generated.js');
const { getAmapStationSchedule } = require('./timetable.amap.station.generated.js');
const cloud = require('../utils/cloudData.js');
const synth = require('../utils/scheduleSynth.js');

const LINES_WITH_ROTATING_ENDS = new Set(['line1']);

// 从云端 line 文档的 timetable 字段解出 schedule
function _scheduleFromCloud(cloudLine, lineId, stationCn, direction, daytype) {
  if (!cloudLine || !cloudLine.timetable) return null;
  const tt = cloudLine.timetable;

  // 站级 mtr (京港)
  const mtrStation = (tt.mtr || {})[stationCn];
  if (mtrStation && mtrStation[direction]) {
    const m = mtrStation[direction];
    const key = 'cloud|mtr|' + lineId + '|' + stationCn + '|' + direction + '|' + (daytype || 'weekday');
    return synth.buildScheduleCached(key, m.ft, m.lt, daytype, m.end, m.endColor);
  }

  // 站级 amap (高德)
  const amapStation = (tt.amap || {})[stationCn];
  if (amapStation && amapStation[direction]) {
    const m = amapStation[direction];
    const key = 'cloud|amap|' + lineId + '|' + stationCn + '|' + direction + '|' + (daytype || 'weekday');
    return synth.buildScheduleCached(key, m.ft, m.lt, daytype, m.end, m.endColor);
  }

  // 线路级合成 (兜底, 含 endsRotate 处理)
  const lm = tt.line;
  if (lm && lm.ft && lm.lt) {
    const color = cloudLine.color || '#888';
    if (lm.endsRotate && lm.endsRotate.length && direction === 'east') {
      const base = synth.buildSchedule(lm.ft, lm.lt, daytype, '', color);
      return base.map((c, i) => Object.assign({}, c, { end: lm.endsRotate[i % lm.endsRotate.length] }));
    }
    const end = direction === 'east' ? lm.endsEast : lm.endsWest;
    const key = 'cloud|line|' + lineId + '|' + direction + '|' + (daytype || 'weekday');
    return synth.buildScheduleCached(key, lm.ft, lm.lt, daytype, end, color);
  }
  return null;
}

function getSchedule(lineId, stationCn, direction, daytype) {
  // 0. 优先云端数据 (cloudData.init() 已加载, 实时切换不需要等待)
  const cloudLine = cloud.getLineData(lineId);
  if (cloudLine) {
    const cs = _scheduleFromCloud(cloudLine, lineId, stationCn, direction, daytype);
    if (cs && cs.length) return cs;
  }

  // 1. 本地兜底 (主包内嵌 - bjsubway/amap 数据不可达时也能用)
  if (LINES_WITH_ROTATING_ENDS.has(lineId) && direction === 'east') {
    return lineLevel(lineId, stationCn, direction, daytype);
  }
  const mtrReal = getStationSchedule(lineId, stationCn, direction, daytype);
  if (mtrReal && mtrReal.length) return mtrReal;
  const amapReal = getAmapStationSchedule(lineId, stationCn, direction, daytype);
  if (amapReal && amapReal.length) return amapReal;
  return lineLevel(lineId, stationCn, direction, daytype);
}

module.exports = { getSchedule };
