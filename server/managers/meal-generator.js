/**
 * @fileoverview Générateur automatique de repas basé sur les jours du mois
 * @module managers/meal-generator
 */

const CONFIG = require('../../config');
const logger = require('../../logger');

/**
 * Classe de gestion de la génération automatique de repas
 */
class MealGenerator {
    // Constantes pour les jours de la semaine
    static DAYS_OF_WEEK = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

    /**
     * Obtient le jour de la semaine pour un jour du mois (1-31)
     * @param {number} dayOfMonth - Jour du mois (1-31)
     * @returns {string} Jour de la semaine ('lundi', 'mardi', etc.)
     */
    static getDayOfWeek(dayOfMonth) {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        const date = new Date(currentYear, currentMonth, dayOfMonth);
        const dayIndex = date.getDay(); // 0 = dimanche, 1 = lundi, etc.
        
        // Conversion: dimanche (0) -> dimanche (6 en fin de semaine)
        const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
        
        return this.DAYS_OF_WEEK[adjustedIndex];
    }

    /**
     * Génère les repas pour une semaine (ensemble de jours)
     * @param {Object} ingredients - Les préférences alimentaires
     * @param {number} [weekNumber=1] - Numéro de la semaine (1-4)
     * @param {Array<number>} [daysInWeek=null] - Liste des jours de cette semaine
     * @returns {Object} Les repas générés par jour
     */
    static generateWeek(ingredients, weekNumber = 1, daysInWeek = null) {
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

            // Obtenir le jour de la semaine pour ce jour du mois
            const dayOfWeek = this.getDayOfWeek(day);

            // Générer le repas de midi
            const midiCategories = this.getActiveCategories(ingredients, 'midi', dayOfWeek);
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

            // Générer le repas du soir
            const soirCategories = this.getActiveCategories(ingredients, 'soir', dayOfWeek);
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
     * @returns {Object} État initial avec rotations et items utilisés
     */
    static initializeState(ingredients) {
        const state = {
            rotations: {},
            used: {}
        };

        for (const [category, data] of Object.entries(ingredients)) {
            if (data.items && data.items.length > 0) {
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
     * Récupère les catégories actives pour un type de repas et un jour spécifique
     * @param {Object} ingredients - Les ingrédients
     * @param {string} mealType - 'midi' ou 'soir'
     * @param {string} dayOfWeek - Jour de la semaine ('lundi', 'mardi', etc.)
     * @returns {Array<string>} Catégories actives
     */
    static getActiveCategories(ingredients, mealType, dayOfWeek) {
        return Object.entries(ingredients)
            .filter(([category, data]) => {
                // Vérifier le type de repas
                const repasActive = data.repas && data.repas[mealType];
                
                // Vérifier le jour de la semaine
                const dayActive = data.days && data.days[dayOfWeek];
                
                // Vérifier que la catégorie a des items
                const hasItems = data.items && Array.isArray(data.items) && data.items.length > 0;
                
                return repasActive && dayActive && hasItems;
            })
            .map(([category]) => category);
    }

    /**
     * Génère un repas à partir des catégories
     * @param {Object} state - État de rotation
     * @param {Array<string>} categories - Catégories à utiliser
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

        return this.formatMeal(ingredients);
    }

    /**
     * Récupère le prochain ingrédient d'une catégorie en rotation
     * @param {Object} state - État de rotation
     * @param {string} category - Catégorie
     * @returns {string|null} Ingrédient ou null
     */
    static getNextIngredient(state, category) {
        const rotation = state.rotations[category];
        if (!rotation || rotation.items.length === 0) {
            return null;
        }

        if (state.used[category].size >= rotation.items.length) {
            state.used[category].clear();
            rotation.cycleCount++;
            rotation.items = this.shuffle([...rotation.items]);
            rotation.index = 0;
        }

        let item = rotation.items[rotation.index];
        let safetyCounter = 0;

        while (state.used[category].has(item) && safetyCounter < rotation.items.length) {
            rotation.index = (rotation.index + 1) % rotation.items.length;
            item = rotation.items[rotation.index];
            safetyCounter++;
        }

        state.used[category].add(item);
        rotation.index = (rotation.index + 1) % rotation.items.length;

        return item;
    }

    /**
     * Formate un repas à partir d'une liste d'ingrédients
     * @param {Array<string>} ingredients - Liste d'ingrédients
     * @returns {string} Repas formaté
     */
    static formatMeal(ingredients) {
        if (ingredients.length === 0) return '';
        if (ingredients.length === 1) return ingredients[0];
        if (ingredients.length === 2) return ingredients.join(' avec ');

        const last = ingredients[ingredients.length - 1];
        const others = ingredients.slice(0, -1).join(', ');
        return `${others} et ${last}`;
    }

    /**
     * Mélange un tableau (algorithme Fisher-Yates)
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
     * @returns {Array<Object>} Plages de jours pour chaque semaine
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
     * @returns {Object} Tous les repas générés
     */
    static generateAllWeeks(ingredients) {
        const weeks = {};
        const totalDays = CONFIG.getDaysInCurrentMonth();
        const weekRanges = this.calculateWeekRanges(totalDays, 4);

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

        const hasItems = Object.values(ingredients).some(category =>
            category.items && Array.isArray(category.items) && category.items.length > 0
        );

        return hasItems;
    }

    /**
     * Génère une suggestion pour un seul repas
     * @param {Object} ingredients - Les préférences alimentaires
     * @param {string} mealType - 'midi' ou 'soir'
     * @param {string} [dayOfWeek=null] - Jour de la semaine (optionnel)
     * @param {Set<string>} [usedMeals=new Set()] - Repas déjà utilisés
     * @returns {string} Suggestion de repas
     */
    static generateSingleMeal(ingredients, mealType, dayOfWeek = null, usedMeals = new Set()) {
        const state = this.initializeState(ingredients);
        
        // Si pas de jour spécifié, considérer tous les jours actifs
        const categories = dayOfWeek 
            ? this.getActiveCategories(ingredients, mealType, dayOfWeek)
            : this.getActiveCategoriesAnyDay(ingredients, mealType);

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

    /**
     * Récupère les catégories actives pour un type de repas (tous les jours confondus)
     * @param {Object} ingredients - Les ingrédients
     * @param {string} mealType - 'midi' ou 'soir'
     * @returns {Array<string>} Catégories actives
     */
    static getActiveCategoriesAnyDay(ingredients, mealType) {
        return Object.entries(ingredients)
            .filter(([category, data]) => {
                // Vérifier le type de repas
                const repasActive = data.repas && data.repas[mealType];
                
                // Vérifier que la catégorie a des items
                const hasItems = data.items && Array.isArray(data.items) && data.items.length > 0;
                
                // Vérifier qu'au moins un jour est actif
                const hasDayActive = data.days && Object.values(data.days).some(day => day === true);
                
                return repasActive && hasItems && hasDayActive;
            })
            .map(([category]) => category);
    }
}

module.exports = MealGenerator;