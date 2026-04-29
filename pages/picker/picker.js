const { LINES, findStations } = require('../../data/lines.js');
const theme = require('../../utils/theme.js');

Page({
  data: {
    lines: LINES,
    activeLineId: 'line1',
    stations: [],
    activeLine: null,
    statusBarHeight: 20,
    navTotalHeight: 64,
    theme: 'light'
  },

  onShow() {
    theme.applyTheme(this);
  },

  onLoad() {
    // 计算安全区域: 系统状态栏 + 导航栏胶囊(常量 32, padding 各 6 = 44 height)
    try {
      const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const sb = sys.statusBarHeight || 20;
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      const navHeight = menu ? (menu.top - sb) * 2 + menu.height : 44;
      this.setData({
        statusBarHeight: sb,
        navTotalHeight: sb + navHeight
      });
    } catch (e) {
      this.setData({ statusBarHeight: 20, navTotalHeight: 64 });
    }

    const app = getApp();
    const id = app.globalData.currentLineId || 'line1';
    this.selectLine({ currentTarget: { dataset: { id } } });
  },

  selectLine(e) {
    const id = e.currentTarget.dataset.id;
    const activeLine = LINES.find(l => l.id === id);
    const stations = findStations(id);
    this.setData({ activeLineId: id, activeLine, stations });
  },

  selectStation(e) {
    const cn = e.currentTarget.dataset.cn;
    const app = getApp();
    app.globalData.currentLineId = this.data.activeLineId;
    app.globalData.currentStationCn = cn;

    wx.redirectTo({
      url: `/pages/index/index?line=${this.data.activeLineId}&station=${encodeURIComponent(cn)}`
    });
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
    } else {
      wx.redirectTo({ url: '/pages/index/index' });
    }
  }
});
