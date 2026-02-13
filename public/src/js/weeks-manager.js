// ========================================
// Gestion des semaines basées sur les jours du mois
// ========================================

import { APIManager } from './api.js';
import { UIRenderer } from './ui-renderer.js';
import { UIManager } from './ui-handlers.js';
import { MonthDaysUtils } from './utils.js';

/**
 * Classe de gestion des semaines basées sur les jours du mois
 */
export class WeeksManager {

  /**
   * État des semaines
   * @private
   */
  static state = {
    numberOfWeeks: 1,
    currentWeek: 1,
    weeksData: {},
    weekRanges: [] // Contient les plages de jours pour chaque semaine
  };

  /**
   * Calcule la semaine actuelle basée sur le jour du mois
   * @private
   */
  static getCurrentWeekNumber() {
    const currentDay = MonthDaysUtils.getCurrentDayOfMonth();
    return MonthDaysUtils.findWeekForDay(currentDay, this.state.numberOfWeeks);
  }

  /**
   * Initialise le gestionnaire de semaines
   * @param {number} numberOfWeeks - Nombre de semaines
   * @param {Object} weeksData - Données de toutes les semaines
   */
  static initialize(numberOfWeeks, weeksData) {
    this.state.numberOfWeeks = numberOfWeeks;
    this.state.weeksData = weeksData || {};

    // Calculer les plages de jours pour chaque semaine
    const totalDays = MonthDaysUtils.getDaysInCurrentMonth();
    this.state.weekRanges = MonthDaysUtils.calculateWeekRanges(totalDays, numberOfWeeks);

    // Sélection automatique de la semaine en cours
    this.state.currentWeek = this.getCurrentWeekNumber();

    this.renderWeeksTabs();
  }

  /**
   * Rend les onglets de semaines
   */
  static renderWeeksTabs() {
    const container = document.getElementById('weeks-tabs-container');
    if (!container) return;

    if (this.state.numberOfWeeks === 1) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';

    const tabsHTML = [];

    for (let i = 1; i <= this.state.numberOfWeeks; i++) {
      const isActive = i === this.state.currentWeek ? 'active' : '';
      const label = MonthDaysUtils.formatWeekLabel(i, this.state.numberOfWeeks);

      tabsHTML.push(`
        <button 
          class="week-tab ${isActive}" 
          data-week="${i}"
          onclick="window.weeksHandlers.switchWeek(${i})"
        >
          ${label}
        </button>
      `);
    }

    container.innerHTML = tabsHTML.join('');
    const tabs = document.querySelectorAll('#weeks-tabs-container .week-tab');
    if (!tabs.length) return;

    const isMobile = window.innerWidth <= 600;

    tabs.forEach(tab => {
      if (!tab.dataset.fullLabel) {
        tab.dataset.fullLabel = tab.textContent.trim();
      }

      tab.textContent = isMobile
        ? `S. ${tab.dataset.week}`
        : tab.dataset.fullLabel;
    });
  }

  /**
   * Change la semaine affichée
   * @param {number} weekNumber
   */
  static async switchWeek(weekNumber) {
    if (
      weekNumber < 1 ||
      weekNumber > this.state.numberOfWeeks ||
      weekNumber === this.state.currentWeek
    ) {
      return;
    }

    // Changement
    this.state.currentWeek = weekNumber;

    // Chargement sécurisé
    const weekKey = `week${weekNumber}`;
    // this.state.weeksData[weekKey] || {};
    const response = await fetch(`/api/atable/${weekNumber}`)
    let weekData = {}
    if (response.ok) {
      weekData = await response.json()
    }

    UIManager.getState().mealsData = weekData;
    // Mise à jour UI
    this.renderWeeksTabs();

    // Obtenir les jours de cette semaine
    const daysInWeek = MonthDaysUtils.getDaysForWeek(weekNumber, this.state.numberOfWeeks);
    UIRenderer.renderDaysForWeek(weekData, daysInWeek);
    UIManager.attachEventListeners();
  }

  /**
   * Obtient toutes les données des semaines
   */
  static getAllWeeksData() {
    const currentWeekData = UIManager.getState().mealsData;
    this.state.weeksData[`week${this.state.currentWeek}`] = currentWeekData;

    return this.state.weeksData;
  }

  /**
   * Met à jour le nombre de semaines
   */
  static async updateNumberOfWeeks(newNumberOfWeeks) {
    if (newNumberOfWeeks < 1 || newNumberOfWeeks > 4) {
      throw new Error('Le nombre de semaines doit être entre 1 et 4');
    }

    try {
      await this.saveAllWeeks();

      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ numberOfWeeks: newNumberOfWeeks })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      window.location.reload();

    } catch (error) {
      console.error('Erreur mise à jour nombre de semaines:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde toutes les semaines
   */
  static async saveAllWeeks() {
    const allWeeksData = this.getAllWeeksData();
    await APIManager.saveMeals(allWeeksData);
  }

  /**
   * Retourne la semaine actuelle
   */
  static getCurrentWeek() {
    return this.state.currentWeek;
  }

  /**
   * Retourne le nombre total de semaines
   */
  static getNumberOfWeeks() {
    return this.state.numberOfWeeks;
  }

  /**
   * Obtient les jours de la semaine actuelle
   * @returns {Array<number>} Liste des jours
   */
  static getCurrentWeekDays() {
    return MonthDaysUtils.getDaysForWeek(this.state.currentWeek, this.state.numberOfWeeks);
  }

  /**
   * Obtient les plages de toutes les semaines
   * @returns {Array<Object>} Plages des semaines
   */
  static getWeekRanges() {
    return this.state.weekRanges;
  }
}