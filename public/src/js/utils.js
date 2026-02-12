// ========================================
// Fonctions utilitaires pour la gestion des jours du mois
// ========================================

/**
 * Classe utilitaire pour les opérations sur les jours du mois
 */
export class MonthDaysUtils {
  /**
   * Obtient le nombre de jours dans le mois actuel
   */
  static getDaysInCurrentMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }

  /**
   * Obtient le jour actuel du mois (1-31)
   */
  static getCurrentDayOfMonth() {
    return new Date().getDate();
  }

  /**
   * Obtient le nom du jour de la semaine pour un jour du mois
   * @param {number} dayOfMonth - Jour du mois (1-31)
   * @returns {string} Nom du jour (lundi, mardi, etc.)
   */
  static getDayName(dayOfMonth) {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    return days[date.getDay()];
  }

  /**
   * Obtient le nom du mois actuel
   * @returns {string} Nom du mois et année
   */
  static getCurrentMonthName() {
    return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  /**
   * Calcule la répartition des jours par semaine
   * @param {number} totalDays - Nombre total de jours dans le mois
   * @param {number} numberOfWeeks - Nombre de semaines à afficher
   * @returns {Array<Object>} Tableau d'objets {weekNumber, startDay, endDay}
   */
  static calculateWeekRanges(totalDays, numberOfWeeks) {
    const ranges = [];
    const baseDaysPerWeek = Math.floor(totalDays / numberOfWeeks);
    const extraDays = totalDays % numberOfWeeks;

    let currentDay = 1;

    for (let week = 1; week <= numberOfWeeks; week++) {
      const daysInThisWeek = baseDaysPerWeek + (week <= extraDays ? 1 : 0);
      const startDay = currentDay;
      const endDay = currentDay + daysInThisWeek - 1;

      ranges.push({
        weekNumber: week,
        startDay,
        endDay,
        days: this.generateDaysList(startDay, endDay)
      });

      currentDay = endDay + 1;
    }

    return ranges;
  }

  /**
   * Génère une liste de jours entre start et end
   * @param {number} startDay - Jour de début
   * @param {number} endDay - Jour de fin
   * @returns {Array<number>} Liste des jours
   */
  static generateDaysList(startDay, endDay) {
    const days = [];
    for (let day = startDay; day <= endDay; day++) {
      days.push(day);
    }
    return days;
  }

  /**
   * Trouve la semaine qui contient un jour donné
   * @param {number} dayOfMonth - Jour du mois
   * @param {number} numberOfWeeks - Nombre de semaines configuré
   * @returns {number} Numéro de la semaine (1-4)
   */
  static findWeekForDay(dayOfMonth, numberOfWeeks) {
    const totalDays = this.getDaysInCurrentMonth();
    const ranges = this.calculateWeekRanges(totalDays, numberOfWeeks);

    for (const range of ranges) {
      if (dayOfMonth >= range.startDay && dayOfMonth <= range.endDay) {
        return range.weekNumber;
      }
    }

    return 1; // Par défaut
  }

  /**
   * Obtient les jours d'une semaine spécifique
   * @param {number} weekNumber - Numéro de la semaine (1-4)
   * @param {number} numberOfWeeks - Nombre total de semaines
   * @returns {Array<number>} Liste des jours de cette semaine
   */
  static getDaysForWeek(weekNumber, numberOfWeeks) {
    const totalDays = this.getDaysInCurrentMonth();
    const ranges = this.calculateWeekRanges(totalDays, numberOfWeeks);

    const weekRange = ranges.find(r => r.weekNumber === weekNumber);
    return weekRange ? weekRange.days : [];
  }

  /**
   * Formate une date pour affichage
   * @param {number} dayOfMonth - Jour du mois
   * @returns {string} Date formatée
   */
  static formatDate(dayOfMonth) {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  /**
   * Formate le label d'une semaine
   * @param {number} weekNumber - Numéro de la semaine
   * @param {number} numberOfWeeks - Nombre total de semaines
   * @returns {string} Label formaté (ex: "Semaine 1 (1-7 février)")
   */
  static formatWeekLabel(weekNumber, numberOfWeeks) {
    const totalDays = this.getDaysInCurrentMonth();
    const ranges = this.calculateWeekRanges(totalDays, numberOfWeeks);
    const range = ranges.find(r => r.weekNumber === weekNumber);

    if (!range) return `Semaine ${weekNumber}`;

    const monthName = new Date().toLocaleDateString('fr-FR', { month: 'long' });
    return `Semaine ${weekNumber} (${range.startDay}-${range.endDay} ${monthName})`;
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