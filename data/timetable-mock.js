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

// 终点轮换的线 (1 号线四惠/四惠东/环球) - 这种线优先走合成数据(有 endsRotate 逻辑)
const LINES_WITH_ROTATING_ENDS = new Set(['line1']);

function getSchedule(lineId, stationCn, direction, daytype) {
  // line1 east 走线路级合成 (有终点轮换逻辑)
  const useSynthesis = LINES_WITH_ROTATING_ENDS.has(lineId) && direction === 'east';
  if (useSynthesis) {
    return lineLevel(lineId, stationCn, direction, daytype);
  }

  // 优先级 (全部传 daytype):
  //   1. 京港地铁 mtr.bj.cn (4/14/16/17) — 工作日/双休
  //   2. 高德 amap (其他线) — 工作日/双休
  //   3. 线路级合成 (兜底) — 工作日/双休
  const mtrReal = getStationSchedule(lineId, stationCn, direction, daytype);
  if (mtrReal && mtrReal.length) return mtrReal;

  const amapReal = getAmapStationSchedule(lineId, stationCn, direction, daytype);
  if (amapReal && amapReal.length) return amapReal;

  return lineLevel(lineId, stationCn, direction, daytype);
}

module.exports = { getSchedule };
