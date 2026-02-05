// ========================================
// Gestionnaire de notifications push (web-push)
// Ce module gère les subscriptions, les paramètres de notification et l'envoi des notifications push aux utilisateurs.
// Les données sont stockées dans un fichier JSON (subscriptions.json) avec la structure suivante :
// [
//   {
//     "userId": "123",
//     "subscription": { ... }, // L'objet PushSubscription du navigateur
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
// En cas d'erreur lors de l'envoi, si la subscription est expirée (410 Gone), elle est automatiquement supprimée.
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
 * Initialise le fichier des subscriptions
 */
async function initializeSubscriptionsFile() {
    try {
        await fs.access(SUBSCRIPTIONS_FILE);
    } catch (error) {
        // Le fichier n'existe pas, on le crée
        await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify([], null, 2));
        console.log('Fichier subscriptions.json créé');
    }
}

/**
 * Lit toutes les subscriptions
 */
async function readSubscriptions() {
    try {
        const data = await fs.readFile(SUBSCRIPTIONS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur lecture subscriptions:', error);
        return [];
    }
}

/**
 * Sauvegarde les subscriptions
 */
async function writeSubscriptions(subscriptions) {
    await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
}

/**
 * Ajoute ou met à jour une subscription pour un utilisateur
 * @param {string} userId
 * @param {Object} subscription - L'objet PushSubscription du navigateur
 * @param {Object} settings - Paramètres de notification { enabled, hour, minute }
 */
async function saveSubscription(userId, machineId, subscription, settings = {}) {
    const subscriptions = await readSubscriptions();

    // Vérifier si l'utilisateur a déjà une subscription
    const existingIndex = subscriptions.findIndex(s => s.userId === userId);

    const subscriptionData = {
        userId,
        machineId,
        subscription,
        settings: {
            enabled: settings.enabled !== undefined ? settings.enabled : true,
            hour: settings.hour || 8,
            minute: settings.minute || 0
        },
        createdAt: existingIndex === -1 ? new Date().toISOString() : subscriptions[existingIndex].createdAt,
        updatedAt: new Date().toISOString()
    };

    if (existingIndex !== -1) {
        // Mettre à jour
        subscriptions[existingIndex] = subscriptionData;
    } else {
        // Ajouter
        subscriptions.push(subscriptionData);
    }

    await writeSubscriptions(subscriptions);
    console.log(`Subscription sauvegardée pour utilisateur ${userId}`);
}

/**
 * Met à jour les paramètres de notification d'un utilisateur
 * @param {string} userId
 * @param {Object} settings - { enabled, hour, minute }
 */
async function updateNotificationSettings(userId, machineId, settings) {
    const subscriptions = await readSubscriptions();
    const index = subscriptions.findIndex(s => s.userId === userId && s.machineId === machineId);

    if (index !== -1) {
        subscriptions[index].settings = {
            ...subscriptions[index].settings,
            ...settings
        };
        subscriptions[index].updatedAt = new Date().toISOString();
        await writeSubscriptions(subscriptions);
        console.log(`Paramètres mis à jour pour utilisateur ${userId}`);
        return true;
    }

    return false;
}

/**
 * Récupère la subscription d'un utilisateur
 * @param {string} userId
 */
async function getUserSubscription(userId, machineId) {
    const subscriptions = await readSubscriptions();
    const subscription = subscriptions.find(s => s.userId === userId && s.machineId === machineId);
    return subscription;
}

/**
 * Supprime la subscription d'un utilisateur
 * @param {string} userId
 */
async function deleteSubscription(userId, machineId) {
    const subscriptions = await readSubscriptions();
    const filtered = subscriptions.filter(s => s.userId !== userId);
    await writeSubscriptions(filtered);
    console.log(`Subscription supprimée pour utilisateur ${userId}`);
}

/**
 * Envoie une notification push à un utilisateur
 * @param {string} userId
 * @param {Object} payload - { title, body, icon, data }
 */
async function sendNotificationToUser(userId, subscription, payload) {

    try {
        await webPush.sendNotification(
            subscription,
            JSON.stringify(payload)
        );
        console.log(`📬 Notification envoyée à utilisateur ${userId}`);
        return { success: true };
    } catch (error) {
        console.error(`❌ Erreur envoi notification à ${userId}:`, error);

        // Si la subscription est invalide (410 Gone), la supprimer
        if (error.statusCode === 410) {
            await deleteSubscription(userId, machineId);
            return { success: false, reason: 'expired' };
        }

        return { success: false, reason: 'error', error: error.message };
    }
}

/**
 * Récupère toutes les subscriptions actives pour une heure donnée
 * @param {number} hour
 * @param {number} minute
 */
async function getSubscriptionsForTime(hour, minute) {
    const subscriptions = await readSubscriptions();

    return subscriptions.filter(s =>
        s.settings.enabled &&
        s.settings.hour === hour &&
        s.settings.minute === minute
    );
}

module.exports = {
    setupWebPush,
    initializeSubscriptionsFile,
    saveSubscription,
    updateNotificationSettings,
    getUserSubscription,
    deleteSubscription,
    sendNotificationToUser,
    getSubscriptionsForTime,
    readSubscriptions
};