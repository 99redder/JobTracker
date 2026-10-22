// Apply the saved theme before the first paint so the page never flashes the
// wrong colors. Light is the default; dark is only used when chosen with the
// header toggle (see THEME in app.js). Loaded from <head> because the CSP
// does not allow inline scripts.
(function () {
    var theme = 'light';
    try {
        if (localStorage.getItem('jobtracker-theme') === 'dark') theme = 'dark';
    } catch (e) {
        // Storage can be unavailable (private mode); fall back to light.
    }
    document.documentElement.setAttribute('data-theme', theme);

    var themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff');
})();
