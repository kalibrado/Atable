// ========================================
// Système de Notifications Push avec VAPID
// ========================================

let vapidPublicKey = null;
let notificationSettings = {
    enabled: false,
    hour: 8,
    minute: 0
};

/**
 * Récupère la clé publique VAPID du serveur
 */
async function getVapidPublicKey() {
    if (vapidPublicKey) {
        return vapidPublicKey;
    }

    try {
        const response = await fetch('/api/notifications/vapid-public-key');
        const data = await response.json();
        vapidPublicKey = data.publicKey;
        return vapidPublicKey;
    } catch (error) {
        console.error('Erreur récupération clé VAPID:', error);
        return null;
    }
}

/**
 * Convertit une clé VAPID en Uint8Array
 */
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

/**
 * Enregistre le Service Worker
 */
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service Workers non supportés');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        await navigator.serviceWorker.ready;
        console.log('Service Worker enregistré:', registration);
        return registration;
    } catch (error) {
        console.error('Erreur Service Worker:', error);
        return null;
    }
}

/**
 * Demande la permission pour les notifications
 */
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('Notifications non supportées');
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



/**
 * S'abonne aux notifications push
 */
async function subscribeToPush(settings = {}) {
    try {
        // Vérifier la permission
        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
            throw new Error('Permission refusée');
        }

        // Enregistrer le Service Worker
        const registration = await registerServiceWorker();
        if (!registration) {
            throw new Error('Service Worker non disponible');
        }

        // Récupérer la clé publique VAPID
        const publicKey = await getVapidPublicKey();
        if (!publicKey) {
            throw new Error('Clé VAPID non disponible');
        }
        // S'abonner aux notifications push
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
        // Envoyer la subscription au serveur
        const response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subscription,
                settings: {
                    enabled: settings.enabled !== undefined ? settings.enabled : true,
                    hour: settings.hour || 8,
                    minute: settings.minute || 0
                }
            })
        });
        const data = await response.json();
        console.log('Réponse abonnement:', data);
        if (!response.ok) {
            throw new Error('Erreur serveur lors de l\'inscription');
        }
        return data;

    } catch (error) {
        console.error('Erreur abonnement push:', error);
        return false;
    }
}

/**
 * Se désabonne des notifications push
 */
async function unsubscribeFromPush() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();
        }

        // Notifier le serveur
        const response = await fetch('/api/notifications/unsubscribe', {
            method: 'DELETE'
        });
        const data = await response.json();
        console.log('Réponse désabonnement:', data);
        if (!response.ok) {
            throw new Error(data.error || 'Erreur serveur lors de la désinscription');
        }
        return data;

    } catch (error) {
        console.error('Erreur désabonnement:', error);
        return false;
    }
}

/**
 * Met à jour les paramètres de notification sur le serveur
 */
async function updateNotificationSettings(settings) {
    try {
        
        console.log(notificationSettings)
        const response = await fetch('/api/notifications/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        })
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error('Erreur serveur');
        }
        // Mettre à jour localement
        console.log('Mise à jour paramètres:', data);
        return true;

    } catch (error) {
        console.error('Erreur mise à jour paramètres:', error);
        return false;
    }
}

/**
 * Récupère les paramètres de notification du serveur
 */
async function loadNotificationSettings() {
    try {
        const response = await fetch('/api/notifications/settings');
        const data = await response.json();
        console.log('Paramètres chargés:', data);
        return data;

    } catch (error) {
        console.error('Erreur chargement paramètres:', error);
        return null;
    }
}

/**
 * Vérifie si l'utilisateur est abonné aux notifications
 */
async function isSubscribed() {
    try {
        if (!('serviceWorker' in navigator)) {
            return false;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        console.log('Subscription actuelle:', subscription);
        return subscription !== null;

    } catch (error) {
        console.error('Erreur vérification subscription:', error);
        return false;
    }
}

// Export des fonctions
window.notificationSystem = {
    requestPermission: requestNotificationPermission,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
    updateSettings: updateNotificationSettings,
    loadSettings: loadNotificationSettings,
    isSubscribed: isSubscribed,
    getTime: () => ({ hour: notificationSettings.hour, minute: notificationSettings.minute }),
    saveTime: (hour, minute) => {
        notificationSettings.hour = hour;
        notificationSettings.minute = minute;
        return updateNotificationSettings({ hour, minute });
    },
    isEnabled: () => notificationSettings.enabled,
    setEnabled: (enabled) => {
        notificationSettings.enabled = enabled;
        return updateNotificationSettings({ enabled });
    },
    start: async () => {
        // Charger les paramètres au démarrage
        await loadNotificationSettings();
        // Enregistrer le Service Worker
        await registerServiceWorker();
    }
};

// Initialisation au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerServiceWorker);
} else {
    registerServiceWorker();
}