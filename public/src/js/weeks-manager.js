// ========================================
// Gestion des semaines multiples
// ========================================

import { APIManager } from './api.js';
import { UIRenderer } from './ui-renderer.js';
import { UIManager } from './ui-handlers.js';

/**
 * Classe de gestion des semaines multiples
 */
export class WeeksManager {

  /**
   * État des semaines
   * @private
   */
  static state = {
    numberOfWeeks: 1,
    currentWeek: 1,
    weeksData: {}
  };

  /**
   * Calcule la semaine actuelle du mois (1 à numberOfWeeks max)
   * @private
   */
  static getCurrentWeekOfMonth() {
    const today = new Date();
    const week = Math.ceil(today.getDate() / 7);

    // Ne jamais dépasser le nombre configuré
    return Math.min(week, this.state.numberOfWeeks);
  }

  /**
   * Initialise le gestionnaire de semaines
   * @param {number} numberOfWeeks - Nombre de semaines
   * @param {Object} weeksData - Données de toutes les semaines
   */
  static initialize(numberOfWeeks, weeksData) {
    this.state.numberOfWeeks = numberOfWeeks;
    this.state.weeksData = weeksData || {};

    // Sélection automatique de la semaine en cours
    this.state.currentWeek = this.getCurrentWeekOfMonth();

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

      tabsHTML.push(`
        <button 
          class="week-tab ${isActive}" 
          data-week="${i}"
          onclick="window.weeksHandlers.switchWeek(${i})"
        >
          Semaine ${i}
        </button>
      `);
    }

    container.innerHTML = tabsHTML.join('');
  }

  /**
   * Change la semaine affichée
   * @param {number} weekNumber
   */
  static switchWeek(weekNumber) {
    if (
      weekNumber < 1 ||
      weekNumber > this.state.numberOfWeeks ||
      weekNumber === this.state.currentWeek
    ) {
      return;
    }

    // Sauvegarde de la semaine actuelle
    const currentWeekData = UIManager.getState().mealsData;
    this.state.weeksData[`week${this.state.currentWeek}`] = currentWeekData;

    // Changement
    this.state.currentWeek = weekNumber;

    // Chargement sécurisé
    const weekKey = `week${weekNumber}`;
    const weekData = this.state.weeksData[weekKey] || {};

    UIManager.getState().mealsData = weekData;

    // Mise à jour UI
    this.renderWeeksTabs();
    UIRenderer.renderAllDays(weekData);
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
}
