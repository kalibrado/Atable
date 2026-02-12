// ========================================
// Générateur automatique de repas - Jours du mois
// ========================================

const CONFIG = require('../../config');

/**
 * Classe de gestion de la génération automatique de repas
 */
class MealGenerator {
  /**
   * Génère les repas pour une semaine (ensemble de jours)
   * @param {Object} ingredients - Les préférences alimentaires
   * @param {number} weekNumber - Numéro de la semaine (1-4)
   * @param {Array<number>} daysInWeek - Liste des jours de cette semaine
   * @returns {Object} Les repas générés
   */
  static generateWeek(ingredients, weekNumber = 1, daysInWeek = null) {
    // Si pas de jours spécifiés, générer pour tous les jours du mois
    if (!daysInWeek) {
      const totalDays = CONFIG.getDaysInCurrentMonth();
      daysInWeek = [];
      for (let day = 1; day <= totalDays; day++) {
        daysInWeek.push(day);
      }
    }

    const state = this.initializeState(ingredients);
    const mealsData = {};
    const generatedMeals = new Set();

    for (const day of daysInWeek) {
      mealsData[day] = {
        midi: '',
        soir: ''
      };

      // Générer midi
      const midiCategories = this.getActiveCategories(ingredients, 'midi');
      if (midiCategories.length > 0) {
        let attempts = 0;
        let midiMeal;
        do {
          midiMeal = this.generateMeal(state, midiCategories, 'midi');
          attempts++;
        } while (generatedMeals.has(midiMeal) && attempts < 10);

        if (!generatedMeals.has(midiMeal)) {
          mealsData[day].midi = midiMeal;
          generatedMeals.add(midiMeal);
        }
      }

      // Générer soir
      const soirCategories = this.getActiveCategories(ingredients, 'soir');
      if (soirCategories.length > 0) {
        let attempts = 0;
        let soirMeal;
        do {
          soirMeal = this.generateMeal(state, soirCategories, 'soir');
          attempts++;
        } while (generatedMeals.has(soirMeal) && attempts < 10);

        if (!generatedMeals.has(soirMeal)) {
          mealsData[day].soir = soirMeal;
          generatedMeals.add(soirMeal);
        }
      }
    }

    return mealsData;
  }

  /**
   * Initialise l'état de rotation pour chaque catégorie
   * @param {Object} ingredients - Les ingrédients
   * @returns {Object} État initial
   */
  static initializeState(ingredients) {
    const state = {
      rotations: {},
      used: {}
    };

    for (const [category, data] of Object.entries(ingredients)) {
      if (data.items && data.items.length > 0) {
        // Mélanger les items pour varier
        const shuffled = this.shuffle([...data.items]);
        state.rotations[category] = {
          items: shuffled,
          index: 0,
          cycleCount: 0
        };
        state.used[category] = new Set();
      }
    }

    return state;
  }

  /**
   * Récupère les catégories actives pour un type de repas
   * @param {Object} ingredients - Les ingrédients
   * @param {string} mealType - 'midi' ou 'soir'
   * @returns {Array} Catégories actives
   */
  static getActiveCategories(ingredients, mealType) {
    return Object.entries(ingredients)
      .filter(([category, data]) =>
        data.repas &&
        data.repas[mealType] &&
        data.items &&
        data.items.length > 0
      )
      .map(([category]) => category);
  }

  /**
   * Génère un repas à partir des catégories
   * @param {Object} state - État de rotation
   * @param {Array} categories - Catégories à utiliser
   * @param {string} mealType - Type de repas
   * @returns {string} Le repas généré
   */
  static generateMeal(state, categories, mealType) {
    const ingredients = [];

    for (const category of categories) {
      const ingredient = this.getNextIngredient(state, category);
      if (ingredient) {
        ingredients.push(ingredient);
      }
    }

    if (ingredients.length === 0) {
      return '';
    }

    // Formater le repas
    return this.formatMeal(ingredients);
  }

  /**
   * Récupère le prochain ingrédient d'une catégorie en rotation
   * @param {Object} state - État de rotation
   * @param {string} category - Catégorie
   * @returns {string} Ingrédient
   */
  static getNextIngredient(state, category) {
    const rotation = state.rotations[category];
    if (!rotation || rotation.items.length === 0) {
      return null;
    }

    // Vérifier si tous les items ont été utilisés
    if (state.used[category].size >= rotation.items.length) {
      // Nouveau cycle : réinitialiser
      state.used[category].clear();
      rotation.cycleCount++;

      // Re-mélanger pour le nouveau cycle
      rotation.items = this.shuffle([...rotation.items]);
      rotation.index = 0;
    }

    // Récupérer le prochain item non utilisé
    let item = rotation.items[rotation.index];
    let safetyCounter = 0;

    while (state.used[category].has(item) && safetyCounter < rotation.items.length) {
      rotation.index = (rotation.index + 1) % rotation.items.length;
      item = rotation.items[rotation.index];
      safetyCounter++;
    }

    // Marquer comme utilisé
    state.used[category].add(item);

    // Avancer l'index
    rotation.index = (rotation.index + 1) % rotation.items.length;

    return item;
  }

  /**
   * Formate un repas à partir d'une liste d'ingrédients
   * @param {Array} ingredients - Liste d'ingrédients
   * @returns {string} Repas formaté
   */
  static formatMeal(ingredients) {
    if (ingredients.length === 0) return '';
    if (ingredients.length === 1) return ingredients[0];
    if (ingredients.length === 2) return ingredients.join(' avec ');

    // 3+ ingrédients
    const last = ingredients[ingredients.length - 1];
    const others = ingredients.slice(0, -1).join(', ');
    return `${others} et ${last}`;
  }

  /**
   * Mélange un tableau (Fisher-Yates)
   * @param {Array} array - Tableau à mélanger
   * @returns {Array} Tableau mélangé
   */
  static shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Calcule les plages de jours pour chaque semaine
   * @param {number} totalDays - Nombre total de jours dans le mois
   * @param {number} numberOfWeeks - Nombre de semaines
   * @returns {Array} Plages de jours pour chaque semaine
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

      const days = [];
      for (let day = startDay; day <= endDay; day++) {
        days.push(day);
      }

      ranges.push({
        weekNumber: week,
        startDay,
        endDay,
        days
      });

      currentDay = endDay + 1;
    }

    return ranges;
  }

  /**
   * Génère tous les repas pour toutes les semaines
   * @param {Object} ingredients - Les préférences alimentaires
   * @param {number} numberOfWeeks - Nombre de semaines
   * @returns {Object} Tous les repas générés
   */
  static generateAllWeeks(ingredients, numberOfWeeks) {
    const weeks = {};
    const totalDays = CONFIG.getDaysInCurrentMonth();
    const weekRanges = this.calculateWeekRanges(totalDays, numberOfWeeks);

    for (const range of weekRanges) {
      weeks[`week${range.weekNumber}`] = this.generateWeek(
        ingredients,
        range.weekNumber,
        range.days
      );
    }

    return weeks;
  }

  /**
   * Valide les ingrédients avant génération
   * @param {Object} ingredients - Les ingrédients à valider
   * @returns {boolean} True si valide
   */
  static validateIngredients(ingredients) {
    if (!ingredients || typeof ingredients !== 'object') {
      return false;
    }

    // Vérifier qu'il y a au moins une catégorie avec des items
    const hasItems = Object.values(ingredients).some(category =>
      category.items && Array.isArray(category.items) && category.items.length > 0
    );

    return hasItems;
  }

  /**
   * Génère une suggestion pour un seul repas
   * @param {Object} ingredients - Les préférences alimentaires
   * @param {string} mealType - 'midi' ou 'soir'
   * @param {Set} usedMeals - Repas déjà utilisés
   * @returns {string} Suggestion de repas
   */
  static generateSingleMeal(ingredients, mealType, usedMeals = new Set()) {
    const state = this.initializeState(ingredients);
    const categories = this.getActiveCategories(ingredients, mealType);

    if (categories.length === 0) {
      return '';
    }

    let attempts = 0;
    let meal;

    do {
      meal = this.generateMeal(state, categories, mealType);
      attempts++;
    } while (usedMeals.has(meal) && attempts < 20);

    return meal;
  }
}

module.exports = MealGenerator;