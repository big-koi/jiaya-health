export default defineAppConfig({
  pages: [
    'pages/login/index',
    'pages/home/index',
    'pages/record-create/index',
    'pages/family/index',
    'pages/family-create/index',
    'pages/family-profile-add/index',
    'pages/family-profile/index',
    'pages/mine/index',
    'pages/record-history/index',
    'pages/record-result/index',
    'pages/reminder/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '家压',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f4f7f5',
  },
  tabBar: {
    color: '#8a9a94',
    selectedColor: '#1fa97a',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        iconPath: 'assets/tab/home.png',
        selectedIconPath: 'assets/tab/home-active.png',
      },
      {
        pagePath: 'pages/family/index',
        text: '家人',
        iconPath: 'assets/tab/family.png',
        selectedIconPath: 'assets/tab/family-active.png',
      },
      {
        pagePath: 'pages/record-create/index',
        text: '记录',
        iconPath: 'assets/tab/record.png',
        selectedIconPath: 'assets/tab/record-active.png',
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'assets/tab/mine.png',
        selectedIconPath: 'assets/tab/mine-active.png',
      },
    ],
  },
})
