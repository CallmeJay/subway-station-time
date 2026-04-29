/**
 * 主题解析
 *
 * profile.theme = 'auto' | 'light' | 'dark'
 *   auto → 跟随系统 (wx.getSystemInfoSync().theme)
 *   light → 强制浅色
 *   dark → 强制深色
 */

const profile = require('./profile.js');

function getSystemTheme() {
  try {
    const sys = wx.getSystemInfoSync();
    return sys.theme === 'dark' ? 'dark' : 'light';
  } catch (e) {
    return 'light';
  }
}

function effectiveTheme() {
  const p = profile.read();
  const setting = p.theme || 'auto';
  if (setting === 'dark') return 'dark';
  if (setting === 'light') return 'light';
  return getSystemTheme();
}

/**
 * 给 Page 实例自动注入 theme 状态 + 监听系统主题变化.
 * 在 Page 的 onShow 里调用 applyTheme(this).
 */
function applyTheme(pageInstance) {
  const theme = effectiveTheme();
  pageInstance.setData({ theme });
}

/**
 * App 级订阅系统主题变化, 推送到当前页面.
 */
function subscribeSystemTheme(onChange) {
  if (wx.onThemeChange) {
    wx.onThemeChange(({ theme }) => {
      onChange(theme);
    });
  }
}

module.exports = {
  effectiveTheme,
  applyTheme,
  subscribeSystemTheme,
  getSystemTheme
};
