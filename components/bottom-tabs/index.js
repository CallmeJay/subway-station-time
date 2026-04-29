// 全局共享底部 tab bar
// 用法: <bottom-tabs current="me" />
// current 取值: index | picker | favorites | me

const TAB_URLS = {
  index:     '/pages/index/index',
  picker:    '/pages/picker/picker',
  favorites: '/pages/favorites/favorites',
  me:        '/pages/me/me'
};

Component({
  options: {
    addGlobalClass: true   // 允许外部 page 的 .theme-dark 样式作用到组件内
  },
  properties: {
    current: { type: String, value: '' }
  },
  methods: {
    goTab(e) {
      const tab = e.currentTarget.dataset.tab;
      const url = TAB_URLS[tab];
      if (!url || tab === this.data.current) return;
      // reLaunch 关闭所有页面再打开目标 (tab 切换语义), 避免栈无限增长
      wx.reLaunch({ url });
    }
  }
});
