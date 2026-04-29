const { findLine, findStation } = require('../../data/lines.js');
const { getSchedule } = require('../../data/timetable-mock.js');
const { computeNext, pad2 } = require('../../utils/nextTrain.js');
const fav = require('../../utils/favorites.js');
const theme = require('../../utils/theme.js');

Page({
  data: {
    line: null,
    station: null,
    direction: 'east',
    directionLabel: { east: '环球度假区方向', west: '古城方向' },

    nowText: '00:00:00',
    next: null,
    upcoming: [],
    last: null,

    isFavorite: false,
    statusBarHeight: 20,
    theme: 'light'
  },

  _ticker: null,

  onLoad(opts) {
    const sys = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 20 });

    const app = getApp();
    const lineId    = opts.line     || app.globalData.currentLineId;
    // wx.navigateTo / redirectTo 的 query 不会自动 decode, 需要手动还原中文
    const rawStation = opts.station || app.globalData.currentStationCn;
    const stationCn  = rawStation ? decodeURIComponent(rawStation) : '';
    const direction  = opts.direction|| app.globalData.currentDirection;

    const line = findLine(lineId);
    const station = findStation(lineId, stationCn) || { cn: stationCn, py: '', isOrigin: false };

    this.setData({ line, station, direction });
    this.refreshFavorite();
    this.refresh();
  },

  onShow() {
    this._ticker = setInterval(() => this.refresh(), 1000);
    this.refreshFavorite();
    theme.applyTheme(this);
  },

  onHide() {
    if (this._ticker) clearInterval(this._ticker);
    this._ticker = null;
  },

  onUnload() { this.onHide(); },

  refresh() {
    const { line, station, direction } = this.data;
    if (!line || !station) return;

    const now = new Date();
    const daytype = (now.getDay() === 0 || now.getDay() === 6) ? 'weekend' : 'weekday';
    const schedule = getSchedule(line.id, station.cn, direction, daytype);
    const result = computeNext(schedule, now, 5);

    const nowText = pad2(now.getHours()) + ':' + pad2(now.getMinutes()) + ':' + pad2(now.getSeconds());

    // 终点是否轮换 (1 号线类有 四惠/四惠东/环球, 其他线一般固定单终点)
    const upcoming = result.upcoming;
    const ends = new Set(upcoming.map(t => t.end));
    const upcomingHasVaryingEnd = ends.size > 1;
    const fixedEnd = upcoming.length && !upcomingHasVaryingEnd ? upcoming[0].end : '';

    this.setData({
      nowText,
      next: result.current,
      upcoming,
      upcomingHasVaryingEnd,
      upcomingFixedEnd: fixedEnd,
      last: result.last
    });
  },

  // 切换方向
  switchDirection(e) {
    const dir = e.currentTarget.dataset.dir;
    this.setData({ direction: dir });
    getApp().globalData.currentDirection = dir;
    this.refreshFavorite();
    this.refresh();
  },

  // 当前 (line, station, direction) 是否已收藏
  refreshFavorite() {
    const { line, station, direction } = this.data;
    if (!line || !station) return;
    this.setData({ isFavorite: fav.isFavorite(line.id, station.cn, direction) });
  },

  // 切换收藏
  toggleFavorite() {
    const { line, station, direction } = this.data;
    if (!line || !station || !station.cn) return;
    const added = fav.toggle(line.id, station.cn, direction);
    this.setData({ isFavorite: added });
    wx.showToast({
      title: added ? '已加入收藏' : '已取消收藏',
      icon: 'none',
      duration: 1200
    });
  },

  // tab 切换 (用 reLaunch 重置栈, 与底部 bottom-tabs 一致)
  goFavorites() { wx.reLaunch({ url: '/pages/favorites/favorites' }); },
  goMe()        { wx.reLaunch({ url: '/pages/me/me' }); },
  goPicker()    { wx.reLaunch({ url: '/pages/picker/picker' }); },

  // 全天时刻表是子页, 用 navigateTo 保留返回
  goSchedule() {
    const { line, station, direction } = this.data;
    if (!line || !station) return;
    wx.navigateTo({
      url: `/pages/schedule/schedule?line=${line.id}&station=${encodeURIComponent(station.cn)}&direction=${direction}`
    });
  }
});
