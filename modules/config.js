
// 依赖顺序：最先加载（无依赖）

// reducedMotion: false = 忽略系统"减弱动画"偏好，动画始终完整播放。
//   开启系统减弱动画后，CSS 媒体查询会把所有 transition/animation 压成 0.01ms，

//   改回 true 可恢复响应系统偏好。
window.MACOS_CONFIG = {
    reducedMotion: false
};

const appConfig = {
    finder:   { title: "访达", src: "apps/finder.html", defaultW: 650, defaultH: 450, iconClass: "fas fa-folder", iconColor: "#007aff" },
    safari:   { title: "Safari", src: "apps/safari.html", defaultW: 700, defaultH: 480, iconClass: "fas fa-compass", iconColor: "#007aff" },
    calendar: { title: "日历", src: "apps/calendar.html", defaultW: 600, defaultH: 450, iconClass: "fas fa-calendar-alt", iconColor: "#ff3b30" },
    photos:   { title: "照片", src: "apps/photos.html", defaultW: 700, defaultH: 500, iconClass: "fas fa-images", iconColor: "#ff9500" },
    settings: { title: "设置", src: "apps/settings.html", defaultW: 600, defaultH: 450, iconClass: "fas fa-cog", iconColor: "#8e8e93" },
    weather:  { title: "天气", src: "apps/weather.html", defaultW: 700, defaultH: 480, iconClass: "fas fa-cloud-sun", iconColor: "#30d158" },
    map:      { title: "地图", src: "apps/map.html", defaultW: 800, defaultH: 600, iconClass: "fas fa-map-marked-alt", iconColor: "#34c759" },
    yd:       { title: "有道", src: "https://youdao.com/", defaultW: 650, defaultH: 450, iconClass: "fas fa-language", iconColor: "#30d158" },
    about:    { title: "关于本机", src: "apps/about.html", defaultW: 500, defaultH: 400, iconClass: "fas fa-info-circle", iconColor: "#007aff" },
    quest:    { title: "待办", src: "apps/quest.html", defaultW: 500, defaultH: 400, iconClass: "fas fa-check-square", iconColor: "#ff9500" },
    xn:       { title: "JHAI", src: "https://page.goose.gs.cn/s/jhai", defaultW: 700, defaultH: 500, iconClass: "fas fa-robot", iconColor: "#007aff" },
    text:     { title: "测试", src: "apps/text.html", defaultW: 500, defaultH: 400, iconClass: "fas fa-file-alt", iconColor: "#007aff" },
    appstore: { title: "App Store", src: "apps/appstore.html", defaultW: 550, defaultH: 400, iconClass: "fas fa-store", iconColor: "#007aff" },
    terminal: { title: "终端", src: "apps/terminal.html", defaultW: 680, defaultH: 440, iconClass: "fas fa-terminal", iconColor: "#1d1d1f" }
};
window.appConfig = appConfig;

// 否则任何访问者都能看到并盗用这些 Key。
window.SIRI_API_CONFIG = {
    // Pollinations（普通对话）
    pollinations: {
        endpoint: 'https://gen.pollinations.ai/v1/chat/completions',
        apiKey: 'sk_TOxWNstVMtFQPaUUYzF8bNXXiQ3IXinL'
    },
    // 智谱 GLM（Agent 模式）
    zhipu: {
        endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        apiKey: '9e541b61d67d4326a5408c3a7be3e22a.T8xvDySFI9bYykxI',
        model: 'glm-4-flash'
    }
};
