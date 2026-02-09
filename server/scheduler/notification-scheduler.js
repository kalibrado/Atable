// ========================================
// Scheduler de notifications
// ========================================

const cron = require('node-cron');
const pushManager = require('../managers/push-manager');
const usersManager = require('../managers/users-manager');
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
    return daysMap[today < 0 ? 6 : today];
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

/**
 * Obtient la semaine actuelle basée sur le numéro de semaine de l'année
 */
function getCurrentWeekNumber(numberOfWeeks) {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const weekNumber = Math.ceil((diff / oneWeek) + 1);
    return ((weekNumber - 1) % numberOfWeeks) + 1;
}

async function sendUserNotification(userId, permissionNotification, date) {
    try {
        const currentDay = getCurrentDay();
        const dayLabel = capitalize(currentDay);

        const userData = await usersManager.readUserData(userId);
        if (!userData || !userData.weeksPlans) {
            return;
        }

        const numberOfWeeks = userData.preference?.showWeeks || CONFIG.defaultWeeks;
        const currentWeek = getCurrentWeekNumber(numberOfWeeks);
        const weekKey = `week${currentWeek}`;

        const weekPlan = userData.weeksPlans[weekKey];
        if (!weekPlan || !weekPlan.enabled) {
            return;
        }

        const dayatable = weekPlan.days[currentDay] || { midi: '', soir: '' };
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

        await pushManager.sendNotificationToUser(userId, permissionNotification, {
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
    } catch (error) {
        console.error(`Erreur envoi notification à ${userId}:`, error);
    }
}

/**
 * Démarre le scheduler de notifications
 */
function startNotificationScheduler() {
    console.log('Démarrage du scheduler de notifications...');

    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const currentTime = formatTime(now);
            const notifications = await pushManager.readNotifications();

            for (const { userId, permissionNotification, settings } of notifications) {
                if (!settings.enabled) continue;
                if (!isNotificationTime(settings, currentTime)) continue;
                await sendUserNotification(userId, permissionNotification, now);
            }
        } catch (error) {
            console.error('Erreur scheduler notifications:', error);
        }
    });
}

module.exports = {
    startNotificationScheduler
};