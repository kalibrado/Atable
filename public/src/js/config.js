/**
 * @fileoverview Configuration et constantes de l'application
 * @module config
 */

/**
 * Configuration de l'API
 * @constant {Object}
 * @property {string} MEALS_URL - URL de l'endpoint API des repas
 * @property {number} SAVE_DELAY - Délai avant sauvegarde automatique en millisecondes
 */
export const API_CONFIG = {
    MEALS_URL: '/api/atable',
    SAVE_DELAY: 1000
};

/**
 * Obtient le nombre de jours dans le mois actuel
 * @returns {number} Nombre de jours dans le mois
 */
export function getDaysInCurrentMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

/**
 * Obtient le jour actuel du mois
 * @returns {number} Le jour actuel (1-31)
 */
export function getCurrentDayOfMonth() {
    return new Date().getDate();
}

/**
 * Obtient le nom du mois actuel
 * @returns {string} Nom du mois en français avec l'année
 */
export function getCurrentMonthName() {
    return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

/**
 * Configuration du stockage local
 * @constant {Object}
 * @property {string} CACHE - Clé pour le cache des données des repas
 * @property {string} PENDING_SAVE - Clé pour les données en attente de synchronisation
 */
export const STORAGE_KEYS = {
    CACHE: 'atable-planner-cache',
    PENDING_SAVE: 'atable-planner-pending-save'
};

/**
 * Types de repas disponibles
 * @constant {Object}
 * @property {string} MIDI - Repas du midi
 * @property {string} SOIR - Repas du soir
 */
export const MEAL_TYPES = {
    MIDI: 'midi',
    SOIR: 'soir'
};

/**
 * Emojis pour les types de repas
 * @constant {Object}
 */
export const MEAL_EMOJIS = {
    [MEAL_TYPES.MIDI]: '☀️',
    [MEAL_TYPES.SOIR]: '🌙'
};

/**
 * Messages de statut pour l'utilisateur
 * @constant {Object}
 */
export const STATUS_MESSAGES = {
    SAVED: '✓ Sauvegardé',
    PENDING_OFFLINE: '💾 Sauvegarde en attente (hors ligne)',
    LOCAL_SAVE: '⚠️ Sauvegarde locale (erreur réseau)',
    SYNC_SUCCESS: '✓ Synchronisation réussie',
    CONNECTION_RESTORED: '🌐 Connexion rétablie',
    OFFLINE_MODE: '📡 Hors ligne - Les modifications seront synchronisées plus tard',
    CACHE_LOADED: '📱 Chargement depuis le cache local',
    LOGOUT_SUCCESS: 'Déconnexion réussie',
    NOTIFICATION_TIME_UPDATED: '⏰ Heure de notification mise à jour',
    NOTIFICATION_ENABLED: '🔔 Notifications activées',
    NOTIFICATION_DISABLED: '🔕 Notifications désactivées',
    ERROR: '❌ Une erreur s\'est produite'
};

/**
 * Types de messages de statut
 * @constant {Object}
 * @property {string} SUCCESS - Type de message de succès
 * @property {string} ERROR - Type de message d'erreur
 * @property {string} WARNING - Type de message d'avertissement
 */
export const STATUS_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning'
};
