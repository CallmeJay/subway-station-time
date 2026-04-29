const { findLine, findStation } = require('../../data/lines.js');
const { getSchedule } = require('../../data/timetable-mock.js');
const { computeNext } = require('../../utils/nextTrain.js');
const fav = require('../../utils/favorites.js');
const theme = require('../../utils/theme.js');

Page({
  data: {
    items: [],
    statusBarHeight: 20,
    navTotalHeight: 64,
    theme: 'light'
  },

  _ticker: null,

  onLoad() {
    try {
      const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const sb = sys.statusBarHeight || 20;
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      const navHeight = menu ? (menu.top - sb) * 2 + menu.height : 44;
      this.setData({ statusBarHeight: sb, navTotalHeight: sb + navHeight });
    } catch (e) {}
  },

  onShow() {
    theme.applyTheme(this);
    this.refresh();
    this._ticker = setInterval(() => this.refresh(), 30 * 1000);
  },

  onHide() {
    if (this._ticker) clearInterval(this._ticker);
    this._ticker = null;
  },

  // 渲染所有收藏 + 计算每个的下一班
  refresh() {
    const all = fav.readAll();
    const now = new Date();
    const daytype = (now.getDay() === 0 || now.getDay() === 6) ? 'weekend' : 'weekday';

    const items = all.map(f => {
      const line = findLine(f.lineId);
      const station = findStation(f.lineId, f.stationCn) || { cn: f.stationCn, py: '' };
      const sched = getSchedule(f.lineId, f.stationCn, f.direction, daytype);
      const r = computeNext(sched, now, 0);
      const dirLabel = (line.endpoints && line.endpoints.length === 2)
        ? (f.direction === 'east' ? line.endpoints[1] : line.endpoints[0])
        : f.direction;

      return {
        id: f.id,
        lineId: f.lineId,
        stationCn: f.stationCn,
        direction: f.direction,
        dirLabel,
        lineColor: line.color,
        lineColorDeep: line.colorDeep,
        lineNo: line.no,
        lineShortName: line.shortName,
        stationPy: station.py,
        next: r.current ? {
          minute: r.current.minute,
          eta: r.current.eta,
          end: r.current.end,
          display: r.current.display
        } : null,
        last: r.last
      };
    });

    this.setData({ items });
  },

  // 点击收藏卡片 → 打开 index
  goStation(e) {
    const { lineid, station, direction } = e.currentTarget.dataset;
    const app = getApp();
    app.globalData.currentLineId = lineid;
    app.globalData.currentStationCn = station;
    app.globalData.currentDirection = direction;
    wx.redirectTo({
      url: `/pages/index/index?line=${lineid}&station=${encodeURIComponent(station)}&direction=${direction}`
    });
  },

  // 删除收藏
  removeItem(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '取消收藏',
      content: '确定要从收藏中移除？',
      confirmText: '移除',
      confirmColor: '#C8161D',
      success: (res) => {
        if (res.confirm) {
          fav.remove(id);
          this.refresh();
          wx.showToast({ title: '已移除', icon: 'none', duration: 800 });
        }
      }
    });
  },

  // 返回
  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
    } else {
      wx.redirectTo({ url: '/pages/index/index' });
    }
  }
});
