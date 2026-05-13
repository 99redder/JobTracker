// Register service worker and check for updates
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then((registration) => {
        // Check for updates on page load
        registration.update();

        // Check for updates every 60 seconds
        setInterval(() => {
            registration.update();
        }, 60000);

        // When a new service worker is available, reload the page
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New version available - reload to get updates
                    if (confirm('A new version is available! Reload to update?')) {
                        window.location.reload();
                    }
                }
            });
        });
    });

    // Reload when the new service worker takes over
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
    });
}
