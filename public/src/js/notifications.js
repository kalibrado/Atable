let vapidPublicKey = null;
let notificationSettings = {
    enabled: false,
    hour: 8,
    minute: 0
};

async function getVapidPublicKey() {
    if (vapidPublicKey) {
        return vapidPublicKey;
    }

    try {
        const response = await fetch('/api/notifications/vapid-public-key');

        const result = await ResponseHandler.handle(response, {
            showMessage: false,
            
            onSuccess: (data) => {
                vapidPublicKey = data.publicKey;
                // console.log('✅ Clé VAPID récupérée');
            },
            
            onError: (error) => {
                // console.error('❌ Erreur récupération clé VAPID:', error.message);
            }
        });

        return result.success ? result.data.publicKey : null;

    } catch (error) {
        // console.error('Erreur récupération clé VAPID:', error);
        return null;
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        // console.warn('Service Workers non supportés');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        await navigator.serviceWorker.ready;
        // console.log('✅ Service Worker enregistré');
        return registration;
    } catch (error) {
        // console.error('❌ Erreur Service Worker:', error);
        return null;
    }
}

async function requestPermission() {
    if (!('Notification' in window)) {
        // console.warn('Notifications non supportées');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

async function subscribe(settings = {}) {
    try {
        const hasPermission = await requestPermission();
        if (!hasPermission) {
            throw new Error('Permission refusée');
        }

        const registration = await registerServiceWorker();
        if (!registration) {
            throw new Error('Service Worker non disponible');
        }

        const publicKey = await getVapidPublicKey();
        if (!publicKey) {
            throw new Error('Clé VAPID non disponible');
        }

        const permissionNotification = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        const response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                permissionNotification,
                settings: {
                    enabled: settings.enabled !== undefined ? settings.enabled : true,
                    hour: settings.hour || 8,
                    minute: settings.minute || 0
                }
            })
        });

        const result = await ResponseHandler.handle(response, {
            showMessage: true,
            
            onSuccess: (data) => {
                // console.log('✅ Notifications activées');
                notificationSettings = {
                    enabled: true,
                    hour: settings.hour || 8,
                    minute: settings.minute || 0
                };
            },
            
            onError: (error) => {
                // console.error('❌ Erreur abonnement:', error.message);
            }
        });

        return result.success ? result.data : false;

    } catch (error) {
        // console.error('❌ Erreur abonnement push:', error);
        ResponseHandler.handleNetworkError(error, 'subscribe');
        return false;
    }
}

async function unsubscribe() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const notification = await registration.pushManager.getSubscription();

        if (notification) {
            await notification.unsubscribe();
        }

        const response = await fetch('/api/notifications/unsubscribe', {
            method: 'DELETE'
        });

        const result = await ResponseHandler.handle(response, {
            showMessage: true,
            
            onSuccess: () => {
                // console.log('✅ Notifications désactivées');
                notificationSettings = {
                    enabled: false,
                    hour: 8,
                    minute: 0
                };
            },
            
            onError: (error) => {
                // console.error('❌ Erreur désabonnement:', error.message);
            }
        });

        return result.success;

    } catch (error) {
        // console.error('❌ Erreur désabonnement:', error);
        ResponseHandler.handleNetworkError(error, 'unsubscribe');
        return false;
    }
}

window.notificationSystem = {
    subscribe,
    unsubscribe,
    start: async () => await registerServiceWorker()
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerServiceWorker);
} else {
    registerServiceWorker();
}