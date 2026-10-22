// Register the service worker and offer new versions with an in-app "Update"
// bar instead of reloading on its own, so nobody loses a half-filled form.
if ('serviceWorker' in navigator) {
    let updateRequested = false;

    function showUpdateBanner(registration) {
        const banner = document.getElementById('update-banner');
        const reloadBtn = document.getElementById('update-reload-btn');
        if (!banner || !reloadBtn) return;

        banner.classList.remove('hidden');
        reloadBtn.onclick = () => {
            updateRequested = true;
            if (registration.waiting) {
                // controllerchange below reloads once the new version takes over
                registration.waiting.postMessage('skipWaiting');
            } else {
                // Already activated (e.g. from another tab)
                window.location.reload();
            }
        };
    }

    navigator.serviceWorker.register('./sw.js').then((registration) => {
        // A new version may have downloaded during an earlier visit
        if (registration.waiting && navigator.serviceWorker.controller) {
            showUpdateBanner(registration);
        }

        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    showUpdateBanner(registration);
                }
            });
        });

        // Check for updates on load and every 60 seconds
        registration.update();
        setInterval(() => {
            registration.update();
        }, 60000);
    });

    // Reload once the new version takes over, but only when the user asked for it
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!updateRequested) return;
        updateRequested = false;
        window.location.reload();
    });
}
