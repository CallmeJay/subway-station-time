const { findLine, findStation } = require('../../data/lines.js');
const { getSchedule } = require('../../data/timetable-mock.js');
const themeUtil = require('../../utils/theme.js');

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

Page({
  data: {
    line: null,
    station: null,
    direction: 'east',
    daytype: 'weekday',

    hourBlocks: [],
    nowHour: 0,
    nowMinute: 0,
    totalCount: 0,
    fixedEnd: '',
    hasVaryingEnd: false,

    statusBarHeight: 20,
    navTotalHeight: 64,
    theme: 'light'
  },

  _didScroll: false,

  _ticker: null,

  onLoad(opts) {
    try {
      const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const sb = sys.statusBarHeight || 20;
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      const navHeight = menu ? (menu.top - sb) * 2 + menu.height : 44;
      this.setData({ statusBarHeight: sb, navTotalHeight: sb + navHeight });
    } catch (e) {}

    const app = getApp();
    const lineId = opts.line || app.globalData.currentLineId;
    const rawSt = opts.station || app.globalData.currentStationCn;
    const stationCn = rawSt ? decodeURIComponent(rawSt) : '';
    const direction = opts.direction || app.globalData.currentDirection;

    const line = findLine(lineId);
    const station = findStation(lineId, stationCn) || { cn: stationCn, py: '' };

    this.setData({ line, station, direction });
  },

  onShow() {
    themeUtil.applyTheme(this);
    this.refresh();
    // 每分钟刷新一次 (高亮"已过/正在/未来")
    this._ticker = setInterval(() => this.refresh(), 60 * 1000);
  },

  onHide() {
    if (this._ticker) clearInterval(this._ticker);
    this._ticker = null;
  },

  // 切换日类型 (重置滚动锚点)
  switchDaytype(e) {
    const dt = e.currentTarget.dataset.dt;
    this._didScroll = false;
    this.setData({ daytype: dt });
    this.refresh();
  },

  refresh() {
    const { line, station, direction, daytype } = this.data;
    if (!line || !station) return;

    const sched = getSchedule(line.id, station.cn, direction, daytype) || [];

    const now = new Date();
    const nowH = now.getHours();
    const nowM = now.getMinutes();
    const nowAbs = nowH * 60 + nowM;

    // 检查终点是否轮换
    const ends = new Set(sched.map(s => s.end).filter(Boolean));
    const hasVaryingEnd = ends.size > 1;
    const fixedEnd = !hasVaryingEnd && sched.length ? (sched[0].end || '') : '';

    // 按小时分组
    const byHour = new Map();
    for (const s of sched) {
      const h = s.hour;
      if (!byHour.has(h)) byHour.set(h, []);
      const itemAbs = s.hour * 60 + s.minute;
      const isPast = itemAbs < nowAbs;
      const isNow = !isPast && itemAbs - nowAbs <= 2; // 2 分钟内为"正在到达"
      byHour.get(h).push({
        minute: s.minute,
        minuteText: pad2(s.minute),
        time: pad2(s.hour % 24) + ':' + pad2(s.minute),
        end: s.end || '',
        endColor: s.endColor || line.color,
        isOrigin: !!s.isOrigin,
        isPast,
        isNow
      });
    }

    // 转 array, 按小时升序
    const hourBlocks = Array.from(byHour.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([h, items]) => ({
        hour: h,
        hourLabel: (h % 24).toString().padStart(2, '0') + ' 时' + (h >= 24 ? ' (次日)' : ''),
        items,
        id: 'hour-' + h,
        isCurrent: h === nowH || (h === nowH + 24)
      }));

    // 找当前小时, 渲染后用 pageScrollTo 跳过去
    const currentBlock = hourBlocks.find(b => b.isCurrent);
    const scrollTargetId = currentBlock ? currentBlock.id : '';

    this.setData({
      hourBlocks,
      nowHour: nowH,
      nowMinute: nowM,
      totalCount: sched.length,
      fixedEnd,
      hasVaryingEnd
    }, () => {
      // setData 完成后再算 boundingClientRect, 自动跳到当前小时块
      if (!this._didScroll && scrollTargetId) {
        this._didScroll = true;
        wx.createSelectorQuery()
          .select('#' + scrollTargetId)
          .boundingClientRect(rect => {
            if (rect) {
              wx.pageScrollTo({
                scrollTop: Math.max(0, rect.top - 280),  // 上方留出 head + toggle 视野
                duration: 300
              });
            }
          })
          .exec();
      }
    });
  },

  goBack() {
    if (getCurrentPages().length > 1) wx.navigateBack();
    else wx.redirectTo({ url: '/pages/index/index' });
  }
});
