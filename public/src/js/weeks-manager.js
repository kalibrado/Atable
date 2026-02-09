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
   * Initialise le gestionnaire de semaines
   * @param {number} numberOfWeeks - Nombre de semaines
   * @param {Object} weeksData - Données de toutes les semaines
   */
  static initialize(numberOfWeeks, weeksData) {
    this.state.numberOfWeeks = numberOfWeeks;
    this.state.weeksData = weeksData;
    this.state.currentWeek = 1;

    this.renderWeeksTabs();
  }

  /**
   * Rend les onglets de semaines
   */
  static renderWeeksTabs() {
    const container = document.getElementById('weeks-tabs-container');
    if (!container) return;

    // Si une seule semaine, ne pas afficher les onglets
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
   * @param {number} weekNumber - Numéro de la semaine (1-4)
   */
  static switchWeek(weekNumber) {
    if (weekNumber < 1 || weekNumber > this.state.numberOfWeeks) {
      return;
    }

    // Sauvegarder les données de la semaine actuelle avant de changer
    const currentWeekData = UIManager.getState().mealsData;
    this.state.weeksData[`week${this.state.currentWeek}`] = currentWeekData;

    // Changer de semaine
    this.state.currentWeek = weekNumber;

    // Charger les données de la nouvelle semaine
    const weekData = this.state.weeksData[`week${weekNumber}`];
    UIManager.getState().mealsData = weekData;

    // Mettre à jour l'UI
    this.renderWeeksTabs();
    UIRenderer.renderAllDays(
      weekData,
      UIManager.getState().collapsedDays
    );

    // Réattacher les événements
    UIManager.attachEventListeners();
  }

  /**
   * Obtient toutes les données des semaines
   * @returns {Object}
   */
  static getAllWeeksData() {
    // Sauvegarder la semaine actuelle
    const currentWeekData = UIManager.getState().mealsData;
    this.state.weeksData[`week${this.state.currentWeek}`] = currentWeekData;

    return this.state.weeksData;
  }

  /**
   * Met à jour le nombre de semaines
   * @param {number} newNumberOfWeeks
   */
  static async updateNumberOfWeeks(newNumberOfWeeks) {
    if (newNumberOfWeeks < 1 || newNumberOfWeeks > 4) {
      throw new Error('Le nombre de semaines doit être entre 1 et 4');
    }

    try {
      // Sauvegarder d'abord les données actuelles
      await this.saveAllWeeks();

      // Mettre à jour les préférences sur le serveur
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

      // Recharger l'application avec le nouveau nombre de semaines
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
   * Obtient le numéro de la semaine actuelle
   * @returns {number}
   */
  static getCurrentWeek() {
    return this.state.currentWeek;
  }

  /**
   * Obtient le nombre total de semaines
   * @returns {number}
   */
  static getNumberOfWeeks() {
    return this.state.numberOfWeeks;
  }
}