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
   * Obtient le numéro de la semaine actuelle dans l'année
   * @returns {number} Numéro de semaine (1-53)
   */
  static getCurrentWeekNumber() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.ceil((diff / oneWeek) + 1);
  }

  /**
   * Obtient la date pour un jour spécifique dans une semaine donnée
   * @param {string} dayName - Nom du jour ('lundi', 'mardi', etc.)
   * @param {number} weekOffset - Décalage de semaine (0 = semaine actuelle, 1 = semaine suivante, etc.)
   * @returns {Date} La date correspondante
   */
  static getDateForDayInWeek(dayName, weekOffset = 0) {
    // Normaliser le nom du jour
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

    // Calculer la différence de jours dans la semaine actuelle
    const diffInCurrentWeek = targetIndex - isoTodayIndex;

    // Ajouter le décalage de semaine (en jours)
    const totalDaysDiff = diffInCurrentWeek + (weekOffset * 7);

    // Créer la date cible
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + totalDaysDiff);

    return targetDate;
  }

  /**
   * Obtient la date du prochain jour spécifié (pour compatibilité)
   * @param {string} dayName - Le nom du jour en français
   * @returns {Date} La date correspondante
   */
  static getDateForDay(dayName) {
    return this.getDateForDayInWeek(dayName, 0);
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

  /**
   * Obtient la semaine courante parmi les semaines de planification
   * Basé sur le numéro de semaine dans l'année
   * @param {number} totalWeeks - Nombre total de semaines de planification (1-4)
   * @returns {number} Numéro de la semaine dans la planification (1-4)
   */
  static getCurrentPlanningWeek(totalWeeks) {
    const weekNumber = this.getCurrentWeekNumber();
    // Cycle à travers les semaines de planification
    return ((weekNumber - 1) % totalWeeks) + 1;
  }

  /**
   * Obtient le premier jour de la semaine (lundi)
   * @param {number} weekOffset - Décalage de semaine (0 = semaine actuelle)
   * @returns {Date}
   */
  static getStartOfWeek(weekOffset = 0) {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Ajuster pour commencer le lundi
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff + (weekOffset * 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  /**
   * Obtient le dernier jour de la semaine (dimanche)
   * @param {number} weekOffset - Décalage de semaine (0 = semaine actuelle)
   * @returns {Date}
   */
  static getEndOfWeek(weekOffset = 0) {
    const monday = this.getStartOfWeek(weekOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  }

  /**
   * Formate une plage de dates pour une semaine
   * @param {number} weekOffset - Décalage de semaine
   * @returns {string} Plage formatée (ex: "5-11 février")
   */
  static formatWeekRange(weekOffset = 0) {
    const start = this.getStartOfWeek(weekOffset);
    const end = this.getEndOfWeek(weekOffset);

    const startDay = start.getDate();
    const endDay = end.getDate();
    const month = end.toLocaleDateString('fr-FR', { month: 'long' });

    if (start.getMonth() === end.getMonth()) {
      return `${startDay}-${endDay} ${month}`;
    } else {
      const startMonth = start.toLocaleDateString('fr-FR', { month: 'short' });
      return `${startDay} ${startMonth} - ${endDay} ${month}`;
    }
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
        func(...args);
      }, delay);
    };
  }
}