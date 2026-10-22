// ============================================
// APP INSTALL (PWA)
// One-tap install where the browser supports it (Chrome, Edge and Samsung
// Internet fire `beforeinstallprompt`), and step-by-step instructions with a
// device switcher everywhere else (iPhone/iPad, Firefox, in-app browsers).
//
// Loaded from <head> so the one-time prompt event is never missed; the UI is
// wired up on DOMContentLoaded. Independent of Firebase, so it also works on
// the login and pending-approval screens. Wrapped in an IIFE so nothing here
// collides with globals in app.js.
//
// Entry points: [data-install-banner] cards (login, pending approval, Home tab;
// hidden in the installed app, dismissal remembered per device), the header
// download button, and the #install link (used by "Invite Others").
// ============================================
(function () {
    const APP_URL = 'https://99redder.github.io/JobTracker/';
    const DISMISSED_KEY = 'jobtracker-install-dismissed';

    let deferredPrompt = null;
    let installedThisSession = false;
    let lastPromptOutcome = null;
    let selectedGuideKey = null;

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;
        refreshInstallUI();
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        installedThisSession = true;
        refreshInstallUI();
    });

    // ============================================
    // DEVICE DETECTION
    // ============================================
    function isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    // Facebook, Instagram, TikTok, the Google app, Android WebViews, etc. open
    // links in their own viewer, which cannot install apps.
    function isInAppBrowser(ua) {
        if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|KAKAOTALK|Snapchat|LinkedInApp|Pinterest|TikTok|BytedanceWebview|GSA\/|; wv\)/.test(ua)) {
            return true;
        }
        const isIOS = /iPhone|iPad|iPod/.test(ua);
        return isIOS && !/Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    }

    function getInstallPlatform() {
        const ua = navigator.userAgent || '';
        // iPadOS reports itself as a Mac; touch support gives it away.
        const isIPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
        const isIOS = /iPhone|iPad|iPod/.test(ua) || isIPadOS;

        if (isIOS) {
            if (isInAppBrowser(ua)) return 'in-app';
            if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return 'ios-other';
            return 'ios-safari';
        }
        if (/Android/.test(ua)) {
            if (isInAppBrowser(ua)) return 'in-app';
            if (/SamsungBrowser/.test(ua)) return 'android-samsung';
            if (/Firefox/.test(ua)) return 'android-firefox';
            return 'android-chrome';
        }
        if (/Firefox/.test(ua)) return 'desktop-firefox';
        if (/Safari/.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) return 'desktop-safari';
        return 'desktop-chromium';
    }

    function isAndroid() {
        return /Android/.test(navigator.userAgent || '');
    }

    // ============================================
    // INSTALL GUIDES
    // `hint` is a small mock of the button to look for.
    // ============================================
    const INSTALL_GUIDES = {
        'ios-safari': {
            label: 'iPhone or iPad — Safari',
            note: 'The installed app keeps its own sign-in, separate from Safari, so you will log in once inside it.',
            steps: [
                { title: 'Tap the Share button', detail: "It's the square with an arrow pointing up — at the bottom of Safari on iPhone, or at the top on iPad. If you only see •••, tap that first, then Share.", hint: { icon: 'share', label: 'Share' } },
                { title: 'Choose “Add to Home Screen”', detail: "Scroll down the list to find it. If it's not there, tap “View More” or “Edit Actions”.", hint: { icon: 'add', label: 'Add to Home Screen' } },
                { title: 'Tap “Add”', detail: 'Keep the name “Job Tracker”. If you see “Open as Web App”, leave it switched on.', hint: { icon: 'confirm', label: 'Add' } },
                { title: 'Open it from your Home Screen', detail: 'Tap the yellow Job Tracker icon and log in.', hint: { icon: 'app', label: 'Job Tracker' } }
            ]
        },
        'ios-other': {
            label: 'iPhone or iPad — Chrome, Edge, or Firefox',
            note: 'The installed app keeps its own sign-in, so you will log in once inside it.',
            steps: [
                { title: 'Tap the Share button', detail: "In Chrome it's in the address bar at the top. In Edge or Firefox, open the menu and choose Share.", hint: { icon: 'share', label: 'Share' } },
                { title: 'Choose “Add to Home Screen”', detail: "Scroll down to find it. If you don't see it, open this page in Safari and use the Safari steps instead.", hint: { icon: 'add', label: 'Add to Home Screen' }, action: 'copy-link' },
                { title: 'Tap “Add”', detail: 'Keep the name “Job Tracker”.', hint: { icon: 'confirm', label: 'Add' } },
                { title: 'Open it from your Home Screen', detail: 'Tap the yellow Job Tracker icon and log in.', hint: { icon: 'app', label: 'Job Tracker' } }
            ]
        },
        'android-chrome': {
            label: 'Android — Chrome',
            oneTap: true,
            steps: [
                { title: 'Tap the menu', detail: "It's the three dots ⋮ in the top-right corner of Chrome.", hint: { icon: 'dots-vertical', label: 'Menu' } },
                { title: 'Tap “Add to Home screen” or “Install app”', detail: 'Chrome may use either name, depending on your phone.', hint: { icon: 'add', label: 'Install app' } },
                { title: 'Tap “Install”', detail: 'Chrome adds Job Tracker to your home screen.', hint: { icon: 'confirm', label: 'Install' } },
                { title: 'Open it from your home screen', detail: "Tap the yellow Job Tracker icon. You'll also find it in your app drawer.", hint: { icon: 'app', label: 'Job Tracker' } }
            ]
        },
        'android-samsung': {
            label: 'Android — Samsung Internet',
            oneTap: true,
            steps: [
                { title: 'Tap the menu', detail: "It's the three lines ≡ at the bottom right. (If you see an install icon in the address bar, you can tap that instead.)", hint: { icon: 'menu', label: 'Menu' } },
                { title: 'Tap “Add page to”, then “Home screen”', detail: 'On some versions this is called “Install” or “Add to Home screen”.', hint: { icon: 'add', label: 'Home screen' } },
                { title: 'Tap “Add”', detail: 'Job Tracker is added to your home screen.', hint: { icon: 'confirm', label: 'Add' } },
                { title: 'Open it from your home screen', detail: 'Tap the yellow Job Tracker icon.', hint: { icon: 'app', label: 'Job Tracker' } }
            ]
        },
        'android-firefox': {
            label: 'Android — Firefox',
            steps: [
                { title: 'Tap the menu', detail: "It's the three dots ⋮ — at the top right or bottom right, depending on your toolbar setting.", hint: { icon: 'dots-vertical', label: 'Menu' } },
                { title: 'Tap “Add to Home screen”', detail: 'It may be called “Add app to Home screen” or “Install”.', hint: { icon: 'add', label: 'Add to Home screen' } },
                { title: 'Tap “Add”', detail: 'Job Tracker is added to your home screen.', hint: { icon: 'confirm', label: 'Add' } },
                { title: 'Open it from your home screen', detail: 'Tap the yellow Job Tracker icon.', hint: { icon: 'app', label: 'Job Tracker' } }
            ]
        },
        'desktop-chromium': {
            label: 'Computer — Chrome or Edge',
            oneTap: true,
            steps: [
                { title: 'Click the install icon in the address bar', detail: 'At the right end of the address bar, look for a small screen with a down arrow.', hint: { icon: 'install', label: 'Install Job Tracker' } },
                { title: 'No icon? Use the browser menu', detail: 'Chrome: ⋮ → Cast, save, and share → Install page as app. Edge: ··· → Apps → Install this site as an app.', hint: { icon: 'dots-vertical', label: 'Menu' } },
                { title: 'Click “Install”', detail: 'Job Tracker opens in its own window.', hint: { icon: 'confirm', label: 'Install' } },
                { title: 'Open it like any other app', detail: 'Find Job Tracker in your Dock, taskbar, Start menu, or Applications folder.', hint: { icon: 'app', label: 'Job Tracker' } }
            ]
        },
        'desktop-safari': {
            label: 'Mac — Safari',
            note: 'The installed app keeps its own sign-in, separate from Safari, so you will log in once inside it.',
            steps: [
                { title: 'Choose File → Add to Dock', detail: 'In the menu bar at the top of your screen. You can also click the Share button and choose “Add to Dock”. (Requires macOS Sonoma or later.)', hint: { icon: 'share', label: 'Add to Dock' } },
                { title: 'Click “Add”', detail: 'Keep the name “Job Tracker”.', hint: { icon: 'confirm', label: 'Add' } },
                { title: 'Open it from your Dock', detail: 'Job Tracker opens in its own window.', hint: { icon: 'app', label: 'Job Tracker' } }
            ]
        },
        'desktop-firefox': {
            label: 'Computer — Firefox',
            unsupported: true,
            steps: [
                { title: "Firefox on computers can't install apps", detail: 'Open this page in Chrome, Edge, or Safari to install it — or install it on your phone instead.', hint: { icon: 'browser', label: 'Open in another browser' }, action: 'copy-link' }
            ]
        },
        'in-app': {
            label: 'Inside Facebook, Instagram, or another app',
            steps: [
                { title: 'Open this page in your browser', detail: "Apps like Facebook and Instagram open links in their own viewer, which can't install apps. Tap the ••• or ⋮ menu (usually at the top right) and choose “Open in browser” or “Open in Safari”.", hint: { icon: 'dots-horizontal', label: 'Open in browser' } },
                { title: 'Or copy the link', detail: 'Then paste it into Safari (iPhone) or Chrome (Android).', hint: { icon: 'browser', label: '99redder.github.io/JobTracker' }, action: 'copy-link' },
                { title: 'Then follow the steps for your browser', detail: 'Once the page is open in your browser, come back to this guide for the next steps.', hint: { icon: 'app', label: 'Job Tracker' }, action: 'switch-to-browser' }
            ]
        }
    };

    // Static icon markup for the hint chips (no user data).
    const HINT_ICONS = {
        share: '<path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 11v8a2 2 0 002 2h10a2 2 0 002-2v-8"/>',
        add: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>',
        menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
        install: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><path d="M12 7v6M9.5 10.5L12 13l2.5-2.5"/>',
        browser: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>',
        'dots-vertical': '<circle cx="12" cy="5" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="19" r="1.8" fill="currentColor"/>',
        'dots-horizontal': '<circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/>'
    };

    // ============================================
    // INSTALL ACTIONS
    // ============================================
    async function promptInstall() {
        if (!deferredPrompt) {
            openInstallGuide();
            return;
        }
        // The event can only be used once.
        const prompt = deferredPrompt;
        deferredPrompt = null;
        refreshInstallUI();
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        lastPromptOutcome = outcome;
        refreshInstallUI();
    }

    function readDismissed() {
        try {
            return localStorage.getItem(DISMISSED_KEY) === '1';
        } catch (e) {
            return false;
        }
    }

    function dismissBanners() {
        try {
            localStorage.setItem(DISMISSED_KEY, '1');
        } catch (e) {
            // Storage unavailable; the banners just come back next visit.
        }
        refreshInstallUI();
    }

    async function copyAppLink(button) {
        try {
            await navigator.clipboard.writeText(APP_URL);
            button.textContent = 'Link copied!';
            setTimeout(() => { button.textContent = 'Copy link'; }, 2500);
        } catch (e) {
            const fallback = document.createElement('p');
            fallback.className = 'install-link-fallback';
            fallback.textContent = APP_URL;
            button.replaceWith(fallback);
        }
    }

    // ============================================
    // UI
    // ============================================
    function refreshInstallUI() {
        const installed = isStandalone() || installedThisSession;
        const dismissed = readDismissed();
        const oneTap = deferredPrompt !== null;

        document.querySelectorAll('[data-install-banner]').forEach(banner => {
            banner.classList.toggle('hidden', installed || dismissed);
            const primary = banner.querySelector('[data-install-primary]');
            const guide = banner.querySelector('[data-install-guide]');
            if (primary) primary.textContent = oneTap ? 'Install' : 'Show me how';
            if (guide) guide.classList.toggle('hidden', !oneTap);
        });

        const headerButton = document.getElementById('install-btn');
        if (headerButton) headerButton.classList.toggle('hidden', installed);

        const installModal = document.getElementById('install-modal');
        if (installModal && !installModal.classList.contains('hidden')) {
            renderInstallGuide();
        }
    }

    function createHint(hint) {
        const chip = document.createElement('span');
        chip.className = `install-hint${hint.icon === 'confirm' ? ' install-hint-confirm' : ''}`;
        chip.setAttribute('aria-hidden', 'true');

        if (hint.icon === 'app') {
            const img = document.createElement('img');
            img.src = 'apple-touch-icon.png';
            img.alt = '';
            chip.appendChild(img);
        } else if (HINT_ICONS[hint.icon]) {
            chip.insertAdjacentHTML('beforeend', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${HINT_ICONS[hint.icon]}</svg>`);
        }

        chip.appendChild(document.createTextNode(hint.label));
        return chip;
    }

    function createStatusCard(title, text) {
        const card = document.createElement('div');
        card.className = 'install-status';
        const heading = document.createElement('p');
        heading.className = 'install-status-title';
        heading.textContent = title;
        const body = document.createElement('p');
        body.textContent = text;
        card.append(heading, body);
        return card;
    }

    function renderInstallGuide() {
        const body = document.getElementById('install-body');
        if (!body) return;
        body.innerHTML = '';

        if (isStandalone()) {
            body.appendChild(createStatusCard("You're using the installed app", "You're all set — Job Tracker is on your home screen."));
            return;
        }
        if (installedThisSession) {
            body.appendChild(createStatusCard('Job Tracker is installed', 'Open it from your home screen or app list.'));
            return;
        }

        const detectedKey = getInstallPlatform();
        const guideKey = selectedGuideKey || detectedKey;
        const guide = INSTALL_GUIDES[guideKey];
        const oneTap = deferredPrompt !== null;

        if (oneTap) {
            const card = document.createElement('div');
            card.className = 'install-one-tap';
            const title = document.createElement('p');
            title.className = 'install-status-title';
            title.textContent = 'Install with one tap';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-primary';
            button.textContent = 'Install Job Tracker';
            button.addEventListener('click', promptInstall);
            card.append(title, button);
            body.appendChild(card);
        } else if (lastPromptOutcome === 'dismissed') {
            const note = document.createElement('p');
            note.className = 'install-note';
            note.textContent = 'No problem — you can install it any time with the steps below.';
            body.appendChild(note);
        }

        const heading = document.createElement('div');
        heading.className = 'install-steps-heading';
        const headingTitle = document.createElement('h4');
        headingTitle.textContent = oneTap ? 'Or do it yourself' : 'How to install';
        const headingTag = document.createElement('span');
        headingTag.textContent = guideKey === detectedKey ? 'Steps for this device' : 'Steps for another device';
        heading.append(headingTitle, headingTag);
        body.appendChild(heading);

        const deviceLabel = document.createElement('label');
        deviceLabel.setAttribute('for', 'install-device');
        deviceLabel.className = 'install-device-label';
        deviceLabel.textContent = 'Your device';
        const deviceSelect = document.createElement('select');
        deviceSelect.id = 'install-device';
        deviceSelect.className = 'install-device-select';
        Object.entries(INSTALL_GUIDES).forEach(([key, option]) => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = option.label + (key === detectedKey ? ' (this device)' : '');
            opt.selected = key === guideKey;
            deviceSelect.appendChild(opt);
        });
        deviceSelect.addEventListener('change', () => {
            selectedGuideKey = deviceSelect.value;
            renderInstallGuide();
        });
        body.append(deviceLabel, deviceSelect);

        const steps = document.createElement('ol');
        steps.className = 'install-steps';
        guide.steps.forEach((step, index) => {
            const item = document.createElement('li');
            item.className = 'install-step';

            const number = document.createElement('span');
            number.className = 'install-step-number';
            number.textContent = String(index + 1);

            const content = document.createElement('div');
            content.className = 'install-step-content';
            const title = document.createElement('p');
            title.className = 'install-step-title';
            title.textContent = step.title;
            const detail = document.createElement('p');
            detail.className = 'install-step-detail';
            detail.textContent = step.detail;
            content.append(title, detail);
            if (step.hint) content.appendChild(createHint(step.hint));

            if (step.action === 'copy-link') {
                const copyButton = document.createElement('button');
                copyButton.type = 'button';
                copyButton.className = 'btn btn-small btn-primary install-step-action';
                copyButton.textContent = 'Copy link';
                copyButton.addEventListener('click', () => copyAppLink(copyButton));
                content.appendChild(copyButton);
            } else if (step.action === 'switch-to-browser') {
                const browserKey = isAndroid() ? 'android-chrome' : 'ios-safari';
                const switchButton = document.createElement('button');
                switchButton.type = 'button';
                switchButton.className = 'btn btn-small btn-text install-step-action';
                switchButton.textContent = `Show steps for ${INSTALL_GUIDES[browserKey].label}`;
                switchButton.addEventListener('click', () => {
                    selectedGuideKey = browserKey;
                    renderInstallGuide();
                });
                content.appendChild(switchButton);
            }

            item.append(number, content);
            steps.appendChild(item);
        });
        body.appendChild(steps);

        if (guide.unsupported) {
            const alternatives = document.createElement('div');
            alternatives.className = 'install-alternatives';
            [['ios-safari', 'On an iPhone'], ['android-chrome', 'On an Android phone']].forEach(([key, label]) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'btn btn-small btn-secondary';
                button.textContent = label;
                button.addEventListener('click', () => {
                    selectedGuideKey = key;
                    renderInstallGuide();
                });
                alternatives.appendChild(button);
            });
            body.appendChild(alternatives);
        }

        if (guide.note) {
            const note = document.createElement('p');
            note.className = 'install-note';
            note.textContent = guide.note;
            body.appendChild(note);
        }
    }

    function openInstallGuide() {
        selectedGuideKey = null;
        renderInstallGuide();
        document.getElementById('install-modal').classList.remove('hidden');
    }

    function closeInstallGuide() {
        document.getElementById('install-modal').classList.add('hidden');
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-install-banner]').forEach(banner => {
            banner.querySelector('[data-install-primary]').addEventListener('click', promptInstall);
            banner.querySelector('[data-install-guide]').addEventListener('click', openInstallGuide);
            banner.querySelector('[data-install-dismiss]').addEventListener('click', dismissBanners);
        });

        document.getElementById('install-btn').addEventListener('click', promptInstall);

        const installModal = document.getElementById('install-modal');
        document.getElementById('install-close').addEventListener('click', closeInstallGuide);
        document.getElementById('install-close-btn').addEventListener('click', closeInstallGuide);
        installModal.addEventListener('click', (e) => {
            if (e.target === installModal) closeInstallGuide();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !installModal.classList.contains('hidden')) closeInstallGuide();
        });

        const standaloneQuery = window.matchMedia('(display-mode: standalone)');
        if (standaloneQuery.addEventListener) standaloneQuery.addEventListener('change', refreshInstallUI);

        refreshInstallUI();

        // Invite links end in #install so the guide opens straight away.
        if (window.location.hash === '#install') {
            history.replaceState(null, '', window.location.pathname + window.location.search);
            if (!isStandalone()) openInstallGuide();
        }
    });
})();
