// ========================================
// Fonctions utilitaires multi-semaines
// ========================================

/**
 * Classe utilitaire pour les opérations sur les dates (multi-semaines)
 */
export class DateUtils {
  /**
   * Mapping des jours de la semaine
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
   */
  static getCurrentDay() {
    const today = new Date().getDay();
    return this.DAYS_MAP[today];
  }

  /**
   * Obtient le numéro de la semaine actuelle dans l'année
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
   */
  static getDateForDayInWeek(dayName, weekOffset = 0) {
    const normalizedDay = dayName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    const targetIndex = this.ISO_DAYS_MAP[normalizedDay];

    if (targetIndex === undefined) {
      console.error('Jour invalide:', dayName);
      return new Date();
    }

    const today = new Date();
    const jsDay = today.getDay();
    const isoTodayIndex = jsDay === 0 ? 6 : jsDay - 1;

    const diffInCurrentWeek = targetIndex - isoTodayIndex;
    const totalDaysDiff = diffInCurrentWeek + (weekOffset * 7);

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + totalDaysDiff);

    return targetDate;
  }

  /**
   * Obtient la date du prochain jour spécifié
   */
  static getDateForDay(dayName) {
    return this.getDateForDayInWeek(dayName, 0);
  }

  /**
   * Formate une date en string lisible
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
   */
  static getCurrentPlanningWeek(totalWeeks) {
    const weekNumber = this.getCurrentWeekNumber();
    return ((weekNumber - 1) % totalWeeks) + 1;
  }

  /**
   * Obtient le premier jour de la semaine (lundi)
   */
  static getStartOfWeek(weekOffset = 0) {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff + (weekOffset * 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  /**
   * Obtient le dernier jour de la semaine (dimanche)
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
  static capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  static truncate(str, maxLength = 50) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  }
}

/**
 * Classe utilitaire pour le debouncing
 */
export class DebounceUtils {
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