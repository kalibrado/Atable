// ========================================
// Configuration et constantes de l'application - Jours du mois
// ========================================

/**
 * Configuration de l'API
 */
export const API_CONFIG = {
    // URL de l'API des repas
    MEALS_URL: '/api/atable',

    // Délai avant sauvegarde automatique (en millisecondes)
    SAVE_DELAY: 1000,

    // Timeout pour les requêtes réseau (en millisecondes)
    REQUEST_TIMEOUT: 5000
};

/**
 * Obtient les jours du mois actuel
 * @returns {Array<number>} Liste des jours (1 à 28/29/30/31)
 */
export function getCurrentMonthDays() {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }
    return days;
}

/**
 * Obtient le nombre de jours dans le mois actuel
 * @returns {number} Nombre de jours
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
 * @returns {string} Nom du mois en français
 */
export function getCurrentMonthName() {
    return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

/**
 * Configuration du stockage local
 */
export const STORAGE_KEYS = {
    // Cache des données des repas
    CACHE: 'atable-planner-cache',

    // Données en attente de synchronisation
    PENDING_SAVE: 'atable-planner-pending-save'
};

/**
 * Types de repas disponibles
 */
export const MEAL_TYPES = {
    MIDI: 'midi',
    SOIR: 'soir'
};

/**
 * Emojis pour les types de repas
 */
export const MEAL_EMOJIS = {
    [MEAL_TYPES.MIDI]: '☀️',
    [MEAL_TYPES.SOIR]: '🌙'
};

/**
 * Messages de statut pour l'utilisateur
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
 */
export const STATUS_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning'
};