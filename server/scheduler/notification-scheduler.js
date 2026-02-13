// ========================================
// Scheduler de notifications - Basé sur les jours du mois
// ========================================

const cron = require('node-cron');
const pushManager = require('../managers/push-manager');
const usersManager = require('../managers/users-manager');
const CONFIG = require('../../config');
const logger = require('../../logger');

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
 * Obtient le jour actuel du mois
 */
function getCurrentDayOfMonth() {
    return new Date().getDate();
}

/**
 * Obtient le nom du jour actuel
 */
function getCurrentDayName() {
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    return days[new Date().getDay()];
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
 * Obtient la semaine actuelle basée sur le jour du mois
 * Calcule quelle semaine contient le jour actuel
 */
function getCurrentWeekNumber(numberOfWeeks, currentDay) {
    const now = new Date();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    // Calculer combien de jours par semaine
    const baseDaysPerWeek = Math.floor(totalDays / numberOfWeeks);
    const extraDays = totalDays % numberOfWeeks;
    
    let cumulativeDays = 0;
    
    for (let week = 1; week <= numberOfWeeks; week++) {
        const daysInThisWeek = baseDaysPerWeek + (week <= extraDays ? 1 : 0);
        cumulativeDays += daysInThisWeek;
        
        if (currentDay <= cumulativeDays) {
            return week;
        }
    }
    
    return numberOfWeeks; // Par défaut, dernière semaine
}

async function sendUserNotification(userId, permissionNotification, date) {
    try {
        const currentDay = getCurrentDayOfMonth();
        const dayName = capitalize(getCurrentDayName());

        const userData = await usersManager.readUserData(userId);
        if (!userData || !userData.weeksPlans) {
            return;
        }

        const numberOfWeeks = userData.preference?.showWeeks || CONFIG.defaultWeeks;
        const currentWeek = getCurrentWeekNumber(numberOfWeeks, currentDay);
        const weekKey = `week${currentWeek}`;

        const weekPlan = userData.weeksPlans[weekKey];
        if (!weekPlan || !weekPlan.enabled) {
            return;
        }

        // Récupérer les repas pour le jour du mois actuel
        const dayatable = weekPlan.days[currentDay] || { midi: '', soir: '' };
        const hasatable = dayatable.midi.trim() || dayatable.soir.trim();

        const notification = hasatable
            ? {
                title: `🍽️ Vos repas du ${dayName} ${currentDay}`,
                body: formatatableText(dayatable.midi, dayatable.soir)
            }
            : {
                title: `⚠️ Aucun repas prévu pour ${dayName} ${currentDay}`,
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

        logger.info(`Notification envoyée à l'utilisateur ${userId} à ${formatTime(date)} pour le jour ${currentDay}`);
    } catch (error) {
        logger.error(`Erreur envoi notification à ${userId}:`, error);
    }
}

/**
 * Démarre le scheduler de notifications
 */
function startNotificationScheduler() {
    logger.info('Démarrage du scheduler de notifications...');

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
            logger.error('Erreur scheduler notifications:', error);
        }
    });
}

module.exports = {
    startNotificationScheduler
};