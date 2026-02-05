// ========================================
// Configuration et constantes de l'application
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
 * Jours de la semaine en français
 * Ordre : du lundi au dimanche
 */
export const DAYS = [
    'lundi', 
    'mardi', 
    'mercredi', 
    'jeudi', 
    'vendredi', 
    'samedi', 
    'dimanche'
];

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
    NOTIFICATION_TIME_UPDATED: '⏰ Heure de notification mise à jour'
};

/**
 * Types de messages de statut
 */
export const STATUS_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning'
};