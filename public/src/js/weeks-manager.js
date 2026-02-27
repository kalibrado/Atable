/**
 * @fileoverview Gestion des semaines basées sur les jours du mois
 * @module weeks-manager
 */

import { APIManager } from './api.js';
import { UIRenderer } from './ui-renderer.js';
import { UIManager } from './ui-handlers.js';
import { MonthDaysUtils } from './utils.js';
import { ResponseHandler } from './response-handler.js';

/**
 * Classe de gestion des semaines basées sur les jours du mois
 */
export class WeeksManager {
  /**
   * État des semaines
   * @private
   * @type {Object}
   */
  static state = {
    numberOfWeeks: 1,
    currentWeek: 1,
    weeksData: {},
    weekRanges: []
  };

  /**
   * Calcule la semaine actuelle basée sur le jour du mois
   * @private
   * @returns {number} Numéro de la semaine actuelle
   */
  static getCurrentWeekNumber() {
    const currentDay = MonthDaysUtils.getCurrentDayOfMonth();
    return MonthDaysUtils.findWeekForDay(currentDay);
  }

  /**
   * Initialise le gestionnaire de semaines
   * @param {number} numberOfWeeks - Nombre de semaines
   * @param {Object} weeksData - Données de toutes les semaines
   * @returns {void}
   */
  static initialize(numberOfWeeks, weeksData) {
    this.state.numberOfWeeks = numberOfWeeks;
    this.state.weeksData = weeksData || {};
    const totalDays = MonthDaysUtils.getDaysInCurrentMonth();
    this.state.weekRanges = MonthDaysUtils.calculateWeekRanges(totalDays, numberOfWeeks);

    this.state.currentWeek = this.getCurrentWeekNumber();

    this.renderWeeksTabs();
  }

  /**
   * Rend les onglets de semaines
   * @returns {void}
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
    const isMobile = window.innerWidth <= 600;

    for (let i = 1; i <= this.state.numberOfWeeks; i++) {
      const isActive = i === this.state.currentWeek ? 'active' : '';
      const label = MonthDaysUtils.formatWeekLabel(i, isMobile);
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
  }

  /**
   * Change la semaine affichée
   * @param {number} weekNumber - Numéro de la semaine
   * @returns {Promise<void>}
   */
  static async switchWeek(weekNumber) {
    if (
      weekNumber < 1 ||
      weekNumber > this.state.numberOfWeeks ||
      weekNumber === this.state.currentWeek
    ) {
      return;
    }

    this.state.currentWeek = weekNumber;

    const response = await fetch(`/api/atable/${weekNumber}`);
    let weekData = {};
    ResponseHandler.handle(response, {
      showMessage: true,
      onSuccess: (data) => {
        // console.log(`✅ Semaine ${weekNumber} chargée`);
        weekData = data;
        UIManager.getState().mealsData = weekData;
      },
      onError: (error) => {
        // console.error(`❌ Erreur chargement semaine ${weekNumber}:`, error.message);
      }
    });

    this.renderWeeksTabs();

    const daysInWeek = MonthDaysUtils.getDaysForWeek(weekNumber, this.state.numberOfWeeks);
    UIRenderer.renderDaysForWeek(weekData, daysInWeek);
    UIManager.attachEventListeners();
  }
  /**
   * Obtient toutes les données des semaines
   * @returns {Object} Les données de toutes les semaines
   */
  static getAllWeeksData() {
    return this.state.weeksData;
  }

  /**
   * Met à jour le nombre de semaines
   * @param {number} newNumberOfWeeks - Nouveau nombre de semaines
   * @returns {Promise<void>}
   * @throws {Error} Si le nombre est invalide
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

      ResponseHandler.handle(response, {
        showMessage: true,
        onSuccess: () => {
          // console.log(`✅ Nombre de semaines mis à jour: ${newNumberOfWeeks}`);
          this.state.numberOfWeeks = newNumberOfWeeks;
          this.renderWeeksTabs();
          window.location.reload();
        },
        onError: (error) => {
          // console.error('❌ Erreur mise à jour nombre de semaines:', error.message);
        }
      });
    } catch (error) {
      // console.error('Erreur mise à jour nombre de semaines:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde toutes les semaines
   * @returns {Promise<void>}
   */
  static async saveAllWeeks() {
    const allWeeksData = this.getAllWeeksData();
    // console.log('Données à sauvegarder pour toutes les semaines:', allWeeksData);
    await APIManager.saveMeals(allWeeksData);
  }

  /**
   * Retourne la semaine actuelle
   * @returns {number} Numéro de la semaine actuelle
   */
  static getCurrentWeek() {
    return this.state.currentWeek;
  }

  /**
   * Retourne le nombre total de semaines
   * @returns {number} Nombre de semaines
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