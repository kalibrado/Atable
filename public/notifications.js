// ========================================
// Système de Notifications Navigateur
// ========================================

/**
 * Configuration des notifications
 */
const NOTIFICATION_CONFIG = {
    defaultHour: 8,
    defaultMinute: 0,
    storageKey: 'meal-planner-notification-time',
    enabledKey: 'meal-planner-notification-enabled',
    checkInterval: 60000 // Vérifier toutes les minutes
};

/**
 * Enregistre le Service Worker
 */
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service Workers non supportés par ce navigateur');
        return null;
    }
    
    try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
            scope: '/'
        });
        
        console.log('✅ Service Worker enregistré avec succès');
        
        // Attendre que le Service Worker soit actif
        await navigator.serviceWorker.ready;
        
        return registration;
    } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement du Service Worker:', error);
        return null;
    }
}

/**
 * Demande la permission pour les notifications
 * @returns {Promise<boolean>} True si la permission est accordée
 */
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('Ce navigateur ne supporte pas les notifications');
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
 * Obtient l'heure de notification configurée
 * @returns {Object} {hour, minute}
 */
function getNotificationTime() {
    const stored = localStorage.getItem(NOTIFICATION_CONFIG.storageKey);
    if (stored) {
        const [hour, minute] = stored.split(':').map(Number);
        return { hour, minute };
    }
    return { 
        hour: NOTIFICATION_CONFIG.defaultHour, 
        minute: NOTIFICATION_CONFIG.defaultMinute 
    };
}

/**
 * Sauvegarde l'heure de notification
 * @param {number} hour - L'heure (0-23)
 * @param {number} minute - Les minutes (0-59)
 */
function saveNotificationTime(hour, minute) {
    const timeString = `${hour}:${minute}`;
    localStorage.setItem(NOTIFICATION_CONFIG.storageKey, timeString);
}

/**
 * Vérifie si les notifications sont activées
 * @returns {boolean}
 */
function areNotificationsEnabled() {
    const enabled = localStorage.getItem(NOTIFICATION_CONFIG.enabledKey);
    return enabled === 'true';
}

/**
 * Active ou désactive les notifications
 * @param {boolean} enabled
 */
function setNotificationsEnabled(enabled) {
    localStorage.setItem(NOTIFICATION_CONFIG.enabledKey, enabled.toString());
}

/**
 * Vérifie si c'est l'heure d'envoyer la notification
 * @returns {boolean}
 */
function isNotificationTime() {
    const now = new Date();
    const { hour, minute } = getNotificationTime();
    
    return now.getHours() === hour && now.getMinutes() === minute;
}

/**
 * Vérifie si la notification a déjà été envoyée aujourd'hui
 * @returns {boolean}
 */
function wasNotificationSentToday() {
    const lastSent = localStorage.getItem('meal-planner-last-notification');
    if (!lastSent) return false;
    
    const lastSentDate = new Date(lastSent);
    const today = new Date();
    
    return lastSentDate.toDateString() === today.toDateString();
}

/**
 * Marque la notification comme envoyée aujourd'hui
 */
function markNotificationAsSent() {
    localStorage.setItem('meal-planner-last-notification', new Date().toISOString());
}

/**
 * Récupère les repas du jour actuel
 * @returns {Object} {midi, soir, hasData}
 */
function getTodayMeals() {
    const currentDay = getCurrentDay();
    const dayData = mealsData[currentDay] || { midi: '', soir: '' };
    
    return {
        midi: dayData.midi.trim(),
        soir: dayData.soir.trim(),
        hasData: dayData.midi.trim() !== '' || dayData.soir.trim() !== ''
    };
}

/**
 * Formate le texte des repas pour la notification
 * @param {string} midi
 * @param {string} soir
 * @returns {string}
 */
function formatMealsText(midi, soir) {
    const parts = [];
    
    if (midi) {
        // Limite à 50 caractères + ...
        const midiShort = midi.length > 50 ? midi.substring(0, 50) + '...' : midi;
        parts.push(`🌞 Midi: ${midiShort}`);
    }
    
    if (soir) {
        const soirShort = soir.length > 50 ? soir.substring(0, 50) + '...' : soir;
        parts.push(`🌙 Soir: ${soirShort}`);
    }
    
    return parts.join('\n');
}

/**
 * Envoie une notification avec les repas du jour
 */
function sendMealNotification() {
    if (!areNotificationsEnabled()) return;
    if (Notification.permission !== 'granted') return;
    if (wasNotificationSentToday()) return;
    
    const { midi, soir, hasData } = getTodayMeals();
    const currentDay = getCurrentDay();
    const dayCapitalized = currentDay.charAt(0).toUpperCase() + currentDay.slice(1);
    
    let title, body, icon;
    
    if (hasData) {
        title = `🍽️ Vos repas du ${dayCapitalized}`;
        body = formatMealsText(midi, soir);
        icon = '🍽️';
    } else {
        title = `⚠️ Aucun repas prévu pour ${dayCapitalized}`;
        body = 'Vous n\'avez pas encore défini vos repas pour aujourd\'hui.\nCliquez pour planifier vos repas !';
        icon = '⚠️';
    }
    
    const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico', // Optionnel
        badge: '/favicon.ico', // Optionnel
        tag: 'meal-reminder',
        requireInteraction: false,
        silent: false
    });
    
    // Au clic sur la notification, ouvrir/focus l'application
    notification.onclick = function() {
        window.focus();
        notification.close();
    };
    
    markNotificationAsSent();
}

/**
 * Vérifie régulièrement s'il faut envoyer une notification
 */
function startNotificationChecker() {
    setInterval(async () => {
        if (!areNotificationsEnabled()) return;
        if (!isNotificationTime()) return;
        if (wasNotificationSentToday()) return;
        
        // Utilise le Service Worker si disponible
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            const { hour, minute } = getNotificationTime();
            const lastSent = localStorage.getItem('meal-planner-last-notification');
            
            navigator.serviceWorker.controller.postMessage({
                type: 'CHECK_NOTIFICATION_TIME',
                config: {
                    hour,
                    minute,
                    enabled: areNotificationsEnabled(),
                    lastSent
                }
            });
        } else {
            // Fallback : notification normale
            sendMealNotification();
        }
    }, NOTIFICATION_CONFIG.checkInterval);
    
    // Vérification immédiate au démarrage
    if (isNotificationTime() && !wasNotificationSentToday()) {
        sendMealNotification();
    }
}

/**
 * Écoute les messages du Service Worker
 */
if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'NOTIFICATION_SENT') {
            localStorage.setItem('meal-planner-last-notification', event.data.timestamp);
            console.log('✅ Notification envoyée via Service Worker');
        }
    });
}

/**
 * Envoie une notification de test
 */
function sendTestNotification() {
    if (Notification.permission !== 'granted') {
        alert('Veuillez d\'abord autoriser les notifications');
        return;
    }
    
    const { midi, soir, hasData } = getTodayMeals();
    const currentDay = getCurrentDay();
    const dayCapitalized = currentDay.charAt(0).toUpperCase() + currentDay.slice(1);
    
    let title, body;
    
    if (hasData) {
        title = `🍽️ TEST - Vos repas du ${dayCapitalized}`;
        body = formatMealsText(midi, soir);
    } else {
        title = `⚠️ TEST - Aucun repas prévu pour ${dayCapitalized}`;
        body = 'Vous n\'avez pas encore défini vos repas pour aujourd\'hui.';
    }
    
    const notification = new Notification(title, {
        body: body,
        tag: 'meal-test',
        requireInteraction: false
    });
    
    notification.onclick = function() {
        window.focus();
        notification.close();
    };
}

// Export des fonctions pour utilisation globale
window.notificationSystem = {
    registerServiceWorker: registerServiceWorker,
    requestPermission: requestNotificationPermission,
    getTime: getNotificationTime,
    saveTime: saveNotificationTime,
    isEnabled: areNotificationsEnabled,
    setEnabled: setNotificationsEnabled,
    sendTest: sendTestNotification,
    start: startNotificationChecker
};
