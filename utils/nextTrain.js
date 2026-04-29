/**
 * 下一班 / 后续班次 / 末班车 计算
 *
 * 输入: schedule (来自 timetable-mock.js 的 getSchedule), now (Date)
 * 输出: { current, upcoming[5], last }
 */

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

// 显示时把 ≥24 的小时折回 (跨零点末班车 24:01 → 00:01)
function timeStr(h, m) { return pad2(h % 24) + ':' + pad2(m); }

function diffMinutes(now, h, m) {
  // 支持跨零点: h 可能 ≥24, 表示次日凌晨
  const target = new Date(now);
  target.setHours(0, 0, 0, 0);
  target.setMinutes(h * 60 + m);
  const diff = Math.round((target - now) / 60000);
  return diff;
}

function diffHumanZh(minutes) {
  if (minutes < 60) return minutes + ' 分钟';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? h + ' 小时' : h + ' 小时 ' + m + ' 分';
}

// ETA 简短化: +12分 或 +6时12分
function diffEtaShort(minutes) {
  if (minutes < 60) return '+' + minutes + ' 分';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? '+' + h + ' 时' : '+' + h + ' 时 ' + m + ' 分';
}

// 主倒计时显示拆分: <60 = 单数字 + 单位, >=60 = h+m 双段
function formatCountdown(minutes) {
  if (minutes < 60) {
    return { isLong: false, big: String(minutes), unit: '分钟' };
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return {
    isLong: true,
    big: String(h),
    unit: '小时',
    minPart: m,
    minUnit: '分'
  };
}

/**
 * @param schedule  班次列表（升序）
 * @param now       当前时刻 Date
 * @param topN      返回多少个后续班次（不含当前下一班）
 */
function computeNext(schedule, now = new Date(), topN = 5) {
  if (!schedule || schedule.length === 0) {
    return { current: null, upcoming: [], last: null };
  }

  // 找到 ≥ now 的第一班 (用绝对分钟比较, 支持跨零点 hour ≥ 24)
  const nowH = now.getHours();
  const nowM = now.getMinutes();
  const nowMin = nowH * 60 + nowM;
  const idx = schedule.findIndex(t => (t.hour * 60 + t.minute) > nowMin);

  let current = null;
  let upcoming = [];

  if (idx === -1) {
    // 当前时间已过末班车
    current = null;
  } else {
    const t = schedule[idx];
    const min = diffMinutes(now, t.hour, t.minute);
    current = {
      ...t,
      minute: min,                    // 还有几分钟
      eta: timeStr(t.hour, t.minute), // HH:MM 到站
      etaLabel: '预计 ' + timeStr(t.hour, t.minute) + ' 到站',
      display: formatCountdown(min)   // {isLong, big, unit, minPart, minUnit}
    };

    upcoming = schedule.slice(idx + 1, idx + 1 + topN).map(s => {
      const m = diffMinutes(now, s.hour, s.minute);
      return {
        ...s,
        time: timeStr(s.hour, s.minute),
        etaMin: m,
        etaText: diffEtaShort(m)
      };
    });
  }

  // 末班 = 当天最后一班
  const lastTrain = schedule[schedule.length - 1];
  const lastDiff = diffMinutes(now, lastTrain.hour, lastTrain.minute);
  const last = {
    ...lastTrain,
    time: timeStr(lastTrain.hour, lastTrain.minute),
    remainingMin: lastDiff,
    remainingLabel: lastDiff > 0
      ? '距末班车 ' + diffHumanZh(lastDiff)
      : '末班车已过'
  };

  return { current, upcoming, last, now: timeStr(nowH, nowM) };
}

module.exports = {
  computeNext,
  timeStr,
  pad2
};
