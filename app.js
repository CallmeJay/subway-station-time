const profile = require('./utils/profile.js');

App({
  onLaunch() {
    // 加载鸿蒙字体 (失败退化到系统字体)
    if (wx.loadFontFace) {
      wx.loadFontFace({
        family: 'HarmonyOS Sans SC',
        source: 'url("https://cdn.jsdelivr.net/gh/lxgw/HarmonyOS-Sans/HarmonyOS_Sans_SC_Medium.ttf")',
        scopes: ['webview', 'native'],
        complete: () => {}
      });
    }

    // 读取用户默认开屏站, 覆盖全局 default
    const p = profile.read();
    if (p.homeLine && p.homeStation) {
      this.globalData.currentLineId = p.homeLine;
      this.globalData.currentStationCn = p.homeStation;
      this.globalData.currentDirection = p.homeDirection || 'east';
    }

    // 监听系统主题变化, 推送到当前可见页面 (auto 模式生效)
    if (wx.onThemeChange) {
      wx.onThemeChange(() => {
        const pages = getCurrentPages();
        const cur = pages[pages.length - 1];
        if (cur && cur.setData) {
          const themeUtil = require('./utils/theme.js');
          cur.setData({ theme: themeUtil.effectiveTheme() });
        }
      });
    }
  },

  globalData: {
    currentLineId: 'line1',
    currentStationCn: '复兴门',
    currentDirection: 'east'
  }
});
