// ========================================
// Fonctions utilitaires
// ========================================

/**
 * Classe utilitaire pour les opérations sur les dates
 */
export class DateUtils {
    /**
     * Mapping des jours de la semaine
     * Index 0 = dimanche (format JavaScript Date)
     * @private
     */
    static DAYS_MAP = [
        'dimanche',
        'lundi',
        'mardi',
        'mercredi',
        'jeudi',
        'vendredi',
        'samedi'
    ];

    /**
     * Mapping des jours pour le format ISO (lundi = 0)
     * @private
     */
    static ISO_DAYS_MAP = {
        'lundi': 0,
        'mardi': 1,
        'mercredi': 2,
        'jeudi': 3,
        'vendredi': 4,
        'samedi': 5,
        'dimanche': 6
    };

    /**
     * Obtient le jour actuel en français
     * @returns {string} Le jour actuel (ex: 'lundi', 'mardi', etc.)
     */
    static getCurrentDay() {
        const today = new Date().getDay();
        return this.DAYS_MAP[today];
    }

    /**
     * Obtient la date du prochain jour spécifié
     * Normalise le nom du jour pour gérer les accents et la casse
     * @param {string} dayName - Le nom du jour en français (ex: 'Lundi', 'Mardi', etc.)
     * @returns {Date} La date correspondante
     */
    static getDateForDay(dayName) {
        // Normaliser le nom du jour (minuscules, sans accents)
        const normalizedDay = dayName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();

        // Trouver l'index du jour cible (format ISO)
        const targetIndex = this.ISO_DAYS_MAP[normalizedDay];

        if (targetIndex === undefined) {
            console.error('Jour invalide:', dayName);
            return new Date();
        }

        const today = new Date();

        // Conversion du format JavaScript (dimanche=0) vers ISO (lundi=0)
        const jsDay = today.getDay(); // 0=dimanche
        const isoTodayIndex = jsDay === 0 ? 6 : jsDay - 1;

        // Calculer la différence de jours
        const diff = targetIndex - isoTodayIndex;

        // Créer la date cible
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + diff);

        return targetDate;
    }

    /**
     * Formate une date en string lisible
     * @param {Date} date - La date à formater
     * @returns {string} Date formatée (ex: "lundi 5 février")
     */
    static formatDate(date) {
        return date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    }
}

/**
 * Classe utilitaire pour les opérations sur les strings
 */
export class StringUtils {
    /**
     * Capitalise la première lettre d'une chaîne
     * @param {string} str - La chaîne à capitaliser
     * @returns {string} La chaîne capitalisée
     */
    static capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Tronque une chaîne si elle dépasse une longueur maximale
     * @param {string} str - La chaîne à tronquer
     * @param {number} maxLength - Longueur maximale
     * @returns {string} La chaîne tronquée avec "..." si nécessaire
     */
    static truncate(str, maxLength = 50) {
        if (!str || str.length <= maxLength) return str;
        return str.substring(0, maxLength) + '...';
    }
}

/**
 * Classe utilitaire pour le debouncing
 */
export class DebounceUtils {
    /**
     * Crée une fonction debounced
     * Retarde l'exécution jusqu'à ce que l'utilisateur arrête d'appeler la fonction
     * @param {Function} func - La fonction à debouncer
     * @param {number} delay - Le délai en millisecondes
     * @returns {Function} La fonction debouncée
     */
    static debounce(func, delay) {
        let timeoutId;

        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }
}