// ========================================
// Gestionnaire de notifications push (web-push)
// Ce module gère les notifications, les paramètres de notification et l'envoi des notifications push aux utilisateurs.
// Les données sont stockées dans un fichier JSON (notifications.json) avec la structure suivante :
// [
//   {
//     "userId": "123",
//     "notification": { ... }, // L'objet PushNotification du navigateur
//     "settings": {
//       "enabled": true,
//       "hour": 8,
//       "minute": 0
//     },
//     "createdAt": "2024-01-01T00:00:00.000Z",
//     "updatedAt": "2024-01-01T00:00:00.000Z"
//   },
//   ...
// ]
// Le module utilise la bibliothèque web-push pour envoyer les notifications.
// En cas d'erreur lors de l'envoi, si la notification est expirée (410 Gone), elle est automatiquement supprimée.
// ========================================

const webPush = require('web-push');
const fs = require('fs').promises;
const CONFIG = require('../../config');

/**
 * Constantes de configuration
 */
const SUBSCRIPTIONS_FILE = CONFIG.subscribeFile;

/**
 * Configuration de web-push avec les clés VAPID
 */
function setupWebPush() {
    const publicKey = CONFIG.vapidPublicKey;
    const privateKey = CONFIG.vapidPrivateKey;
    const subject = CONFIG.vapidSubject;

    if (!publicKey || !privateKey) {
        console.warn('Clés VAPID non configurées. Exécutez: npm run generate-vapid');
        return false;
    }

    webPush.setVapidDetails(subject, publicKey, privateKey);
    console.log('Web-push configuré avec VAPID');
    return true;
}

/**
 * Initialise le fichier des notifications
 */
async function initializeNotificationsFile() {
    try {
        await fs.access(SUBSCRIPTIONS_FILE);
    } catch (error) {
        // Le fichier n'existe pas, on le crée
        await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify([], null, 2));
        console.log('Fichier notifications.json créé');
    }
}

/**
 * Lit toutes les notifications
 */
async function readNotifications() {
    try {
        const data = await fs.readFile(SUBSCRIPTIONS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur lecture notifications:', error);
        return [];
    }
}

/**
 * Sauvegarde les notifications
 */
async function writeNotifications(permissionNotification) {
    await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(permissionNotification, null, 2));
}

/**
 * Ajoute ou met à jour une notification pour un utilisateur
 * @param {string} userId
 * @param {Object} notification - L'objet PushNotification du navigateur
 * @param {Object} settings - Paramètres de notification { enabled, hour, minute }
 */
async function saveNotification(userId, machineId, permissionNotification, settings = {}) {
    const notifications = await readNotifications();

    // Vérifier si l'utilisateur a déjà une notification
    const existingIndex = notifications.findIndex(s => s.userId === userId);

    const notificationData = {
        userId,
        machineId,
        permissionNotification,
        settings: {
            enabled: settings.enabled !== undefined ? settings.enabled : true,
            hour: settings.hour || 8,
            minute: settings.minute || 0
        },
        createdAt: existingIndex === -1 ? new Date().toISOString() : notifications[existingIndex].createdAt,
        updatedAt: new Date().toISOString()
    };

    if (existingIndex !== -1) {
        // Mettre à jour
        notifications[existingIndex] = notificationData;
    } else {
        // Ajouter
        notifications.push(notificationData);
    }

    await writeNotifications(notifications);
}

/**
 * Met à jour les paramètres de notification d'un utilisateur
 * @param {string} userId
 * @param {Object} settings - { enabled, hour, minute }
 */
async function updateNotificationSettings(userId, machineId, settings) {
    const notifications = await readNotifications();
    const index = notifications.findIndex(s => s.userId === userId && s.machineId === machineId);

    if (index !== -1) {
        notifications[index].settings = {
            ...notifications[index].settings,
            ...settings
        };
        notifications[index].updatedAt = new Date().toISOString();
        await writeNotifications(notifications);
        console.log(`Paramètres mis à jour pour utilisateur ${userId}`)
        return true;
    }

    return false;
}

/**
 * Récupère la notification d'un utilisateur
 * @param {string} userId
 */
async function getUserNotification(userId, machineId) {
    const notifications = await readNotifications();
    const notification = notifications.find(s => s.userId === userId && s.machineId === machineId);
    return notification;
}

/**
 * Supprime la notification d'un utilisateur
 * @param {string} userId
 */
async function disabledNotification(userId, machineId) {
    console.log(`Notification désactivé pour utilisateur ${userId}`);
    await updateNotificationSettings(userId, machineId, { enabled: false });
    const notification = await getUserNotification(userId, machineId)
    return notification
}

/**
 * Envoie une notification push à un utilisateur
 * @param {string} userId
 * @param {Object} payload - { title, body, icon, data }
 */
async function sendNotificationToUser(userId, permissionNotification, payload) {

    try {
        await webPush.sendNotification(
            permissionNotification,
            JSON.stringify(payload)
        );
        console.log(`📬 Notification envoyée à utilisateur ${userId}`);
        return { success: true };
    } catch (error) {
        console.error(`❌ Erreur envoi notification à ${userId}:`, error);

        // Si la notification est invalide (410 Gone), la supprimer
        if (error.statusCode === 410) {
            await disabledNotification(userId, machineId);
            return { success: false, reason: 'expired' };
        }

        return { success: false, reason: 'error', error: error.message };
    }
}


module.exports = {
    setupWebPush,
    initializeNotificationsFile,
    saveNotification,
    updateNotificationSettings,
    getUserNotification,
    disabledNotification,
    sendNotificationToUser,
    readNotifications
};