const profile = require('../../utils/profile.js');
const fav = require('../../utils/favorites.js');
const themeUtil = require('../../utils/theme.js');
const { findLine, findStation } = require('../../data/lines.js');

const APP_VERSION = '0.1.0 · MVP';

Page({
  data: {
    theme: 'light',
    statusBarHeight: 20,
    navTotalHeight: 64,

    p: {},
    favCount: 0,
    daysUsed: 1,
    homeLabel: '',

    version: APP_VERSION,
    sources: [
      { name: '京港地铁 mtr.bj.cn', covers: '4 / 14 / 16 / 17 号线 · 站级首末班 (真实)' },
      { name: '高德地图 amap', covers: '其他 21 条线 · 站级首末班 (真实)' },
      { name: '北京市首都之窗', covers: '工作日/双休日 间隔差异参考数据' },
      { name: '维基百科 / DB11/T657.2', covers: '线路色值 (Pantone)' },
      { name: '⚠ 中间班次', covers: '按真实节奏规律合成, 非 OCR 官方时刻表; 实际以官方为准' }
    ],

    editingNick: false,
    nickInput: ''
  },

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
    themeUtil.applyTheme(this);
    this.refresh();
  },

  refresh() {
    const p = profile.read();
    const favCount = fav.readAll().length;
    const daysUsed = profile.daysSinceFirst(p);

    let homeLabel = '未设置';
    if (p.homeLine && p.homeStation) {
      const line = findLine(p.homeLine);
      homeLabel = `${line.shortName} · ${p.homeStation}`;
    }

    // 资料还是默认状态 (头像没设 / 昵称还是随机生成的) 时显示提示 banner
    const isDefaultNick = /^地铁通勤客\s*#\d+$/.test(p.nickname || '');
    const showHint = !p.avatarUrl || isDefaultNick;

    this.setData({ p, favCount, daysUsed, homeLabel, showHint });
  },

  // === 编辑昵称 ===
  startEditNick() {
    this.setData({ editingNick: true, nickInput: this.data.p.nickname });
  },
  onNickInput(e) {
    this.setData({ nickInput: e.detail.value });
  },
  saveNick() {
    const v = (this.data.nickInput || '').trim();
    if (!v) {
      this.setData({ editingNick: false });
      return;
    }
    const p = profile.update({ nickname: v.slice(0, 20) });
    this.setData({ p, editingNick: false });
    wx.showToast({ title: '昵称已更新', icon: 'none', duration: 1000 });
  },
  cancelEditNick() {
    this.setData({ editingNick: false });
  },

  // === 选择微信头像 ===
  onChooseAvatar(e) {
    const tempUrl = e.detail && e.detail.avatarUrl;
    if (!tempUrl) return;

    const fs = wx.getFileSystemManager();
    fs.saveFile({
      tempFilePath: tempUrl,
      success: (res) => {
        const p = profile.update({ avatarUrl: res.savedFilePath });
        this.setData({ p });
        this._afterAvatarChosen();
      },
      fail: () => {
        const p = profile.update({ avatarUrl: tempUrl });
        this.setData({ p });
        this._afterAvatarChosen();
      }
    });
  },

  // 头像选完后, 如果还是默认昵称就自动唤起昵称输入框,
  // 让用户在 type=nickname 输入框里一键应用微信昵称, 把"两步"压成一气呵成
  _afterAvatarChosen() {
    const nick = this.data.p.nickname || '';
    const isDefault = /^地铁通勤客\s*#\d+$/.test(nick);
    if (isDefault) {
      wx.showToast({ title: '头像已设 · 请填昵称', icon: 'none', duration: 1200 });
      setTimeout(() => {
        this.setData({ editingNick: true, nickInput: '' });
      }, 600);
    } else {
      wx.showToast({ title: '头像已更新', icon: 'success', duration: 1000 });
    }
  },

  // 设置默认开屏站
  setHomeFromCurrent() {
    const app = getApp();
    const lineId = app.globalData.currentLineId;
    const station = app.globalData.currentStationCn;
    const direction = app.globalData.currentDirection;
    if (!lineId || !station) {
      wx.showToast({ title: '请先到主页选好站再来', icon: 'none' });
      return;
    }
    profile.update({ homeLine: lineId, homeStation: station, homeDirection: direction });
    this.refresh();
    wx.showToast({ title: '已设为默认开屏', icon: 'success', duration: 1200 });
  },

  clearHome() {
    profile.update({ homeLine: '', homeStation: '', homeDirection: 'east' });
    this.refresh();
    wx.showToast({ title: '已清除', icon: 'none' });
  },

  // 主题切换
  cycleTheme() {
    const order = ['auto', 'light', 'dark'];
    const cur = this.data.p.theme || 'auto';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    const p = profile.update({ theme: next });
    this.setData({ p });
    themeUtil.applyTheme(this);
    const labels = { auto: '跟随系统', light: '浅色模式', dark: '深色模式' };
    wx.showToast({ title: labels[next], icon: 'none', duration: 1000 });
  },

  toggleHaptic() {
    const p = profile.update({ haptic: !this.data.p.haptic });
    this.setData({ p });
  },

  // 收藏入口
  goFavorites() {
    wx.navigateTo({ url: '/pages/favorites/favorites' });
  },

  // 数据来源弹窗
  showSources() {
    const lines = this.data.sources.map(s => `· ${s.name}\n  ${s.covers}`).join('\n\n');
    wx.showModal({
      title: '数据来源',
      content: lines,
      showCancel: false,
      confirmText: '了解'
    });
  },

  // 清空收藏
  clearFavorites() {
    wx.showModal({
      title: '清空全部收藏？',
      content: '此操作不可恢复',
      confirmText: '清空',
      confirmColor: '#C8161D',
      success: (res) => {
        if (res.confirm) {
          fav.clear();
          this.refresh();
          wx.showToast({ title: '已清空', icon: 'none' });
        }
      }
    });
  },

  // 重置所有数据
  resetAll() {
    wx.showModal({
      title: '重置全部数据？',
      content: '将清空所有收藏、个人资料和使用统计，此操作不可恢复',
      confirmText: '重置',
      confirmColor: '#C8161D',
      success: (res) => {
        if (res.confirm) {
          fav.clear();
          profile.reset();
          this.refresh();
          wx.showToast({ title: '已重置', icon: 'none' });
        }
      }
    });
  },

  // 反馈
  showFeedback() {
    wx.showModal({
      title: '反馈与建议',
      content: '本应用为个人 MVP 项目. 如发现数据错误, 以官方为准.',
      showCancel: false,
      confirmText: '了解'
    });
  },

  // 完整免责声明
  showDisclaimer() {
    wx.showModal({
      title: '免责声明',
      content: [
        '1. 本应用为个人开发的 MVP 工具, 与北京地铁运营公司、京港地铁公司无任何隶属或合作关系, 非官方应用.',
        '',
        '2. 数据来源:',
        '   · 站点结构与首末班时间: 高德地图开放接口 (公开数据)',
        '   · 京港 4/14/16/17 号线: mtr.bj.cn 官方时刻表',
        '   · 中间班次: 基于真实首末班 + 官方间隔规律算法合成',
        '',
        '3. 时刻表为参考估算, 实际班次、节假日调整、突发情况以北京地铁、京港地铁官方公告为准.',
        '',
        '4. 因数据偏差导致的出行不便, 本应用不承担责任.',
        '',
        '5. 线路色值采用 DB11/T657.2-2015 北京市公共交通地方标准.',
      ].join('\n'),
      showCancel: false,
      confirmText: '我已知悉'
    });
  },

  goBack() {
    if (getCurrentPages().length > 1) wx.navigateBack();
    else wx.redirectTo({ url: '/pages/index/index' });
  }
});
