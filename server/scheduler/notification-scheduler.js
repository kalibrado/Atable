// ========================================
// Scheduler de notifications (node-cron)
// Ce module utilise node-cron pour exécuter une tâche toutes les minutes.
// La tâche vérifie les utilisateurs qui ont activé les notifications pour l'heure actuelle,
// récupère leurs repas du jour et leur envoie une notification push.
// En cas d'erreur lors de l'envoi, elle est loguée pour être corrigée.
// ========================================

const cron = require('node-cron');
const pushManager = require('../managers/push-manager');
const atableManager = require('../managers/atable-manager');
const CONFIG = require('../../config');

/**
 * Formate le texte des repas pour la notification
 */
function formatatableText(midi, soir) {
    const parts = [];

    if (midi) {
        const midiShort = midi.length > 50 ? midi.substring(0, 50) + '...' : midi;
        parts.push(`🌞 Midi: ${midiShort}`);
    }

    if (soir) {
        const soirShort = soir.length > 50 ? soir.substring(0, 50) + '...' : soir;
        parts.push(`🌜 Soir: ${soirShort}`);
    }

    return parts.join('\n');
}

/**
 * Obtient le jour actuel en français
 */
function getCurrentDay() {
    const daysMap = CONFIG.validDays;
    const today = new Date().getDay() - 1;
    return daysMap[today];
}

function formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

function isNotificationTime(settings, currentTime) {
    const targetTime = `${String(settings.hour).padStart(2, '0')}:${String(settings.minute).padStart(2, '0')}`;
    return currentTime === targetTime;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

async function sendUserNotification(userId, subscription, date) {
    const currentDay = getCurrentDay();
    const dayLabel = capitalize(currentDay);

    const atable = await atableManager.readUseratable(userId);
    const dayatable = atable[currentDay] || { midi: '', soir: '' };

    const hasatable = dayatable.midi.trim() || dayatable.soir.trim();

    const notification = hasatable
        ? {
            title: `🍽️ Vos repas du ${dayLabel}`,
            body: formatatableText(dayatable.midi, dayatable.soir)
        }
        : {
            title: `⚠️ Aucun repas prévu pour ${dayLabel}`,
            body: 'Vous n\'avez pas encore défini vos repas pour aujourd\'hui.'
        };

    await pushManager.sendNotificationToUser(userId, subscription, {
        ...notification,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'atable-reminder',
        data: {
            day: currentDay,
            url: '/'
        }
    });

    console.log(`Notification envoyée à l'utilisateur ${userId} à ${formatTime(date)}`);
}

/**
 * Démarre le scheduler de notifications
 * Vérifie chaque minute si des notifications doivent être envoyées
 */
function startNotificationScheduler() {
    console.log('Démarrage du scheduler de notifications...');

    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const currentTime = formatTime(now);
            const subscriptions = await pushManager.readSubscriptions();
            for (const { userId, subscription, settings } of subscriptions) {
                if (!settings.enabled) continue;
                if (!isNotificationTime(settings, currentTime)) continue;
                await sendUserNotification(userId, subscription, now);
            }
        } catch (error) {
            console.error('Erreur scheduler notifications:', error);
        }
    });
}

module.exports = {
    startNotificationScheduler
};