/**
 * @fileoverview Gestionnaire des préférences utilisateur
 * @module managers/preferences-manager
 */

const usersManager = require('./users-manager');
const CONFIG = require('../../config');
const logger = require('../../logger');

/**
 * Lit les préférences d'un utilisateur
 */
async function readUserPreferences(userId) {
    const userData = await usersManager.readUserData(userId);
    if (!userData) throw new Error('Utilisateur non trouvé');
    return userData.preference || {};
}

/**
 * Écrit les préférences d'un utilisateur
 */
async function writeUserPreferences(userId, updates) {
    const userData = await usersManager.readUserData(userId);
    if (!userData) throw new Error('Utilisateur non trouvé');

    if (!userData.preference) userData.preference = {};
    Object.assign(userData.preference, updates);

    await usersManager.writeUserData(userId, userData);
    return userData.preference;
}

/**
 * Met à jour le nombre de semaines
 */
async function updateNumberOfWeeks(userId, numberOfWeeks) {
    if (numberOfWeeks < CONFIG.minWeeks || numberOfWeeks > CONFIG.maxWeeks) {
        throw new Error(`Nombre de semaines invalide (${CONFIG.minWeeks}-${CONFIG.maxWeeks})`);
    }
    return await writeUserPreferences(userId, { showWeeks: numberOfWeeks });
}

/**
 * Met à jour le mode sombre
 */
async function updateDarkMode(userId, darkMode) {
    return await writeUserPreferences(userId, { darkMode });
}

/**
 * Lit les ingrédients d'un utilisateur
 */
async function readUserIngredients(userId) {
    const preferences = await readUserPreferences(userId);
    return preferences.ingredients || usersManager.createDefaultIngredients();
}

/**
 * Valide la structure d'une catégorie d'ingrédients
 * @private
 */
function validateCategoryName(name) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
        throw new Error('Nom de catégorie invalide');
    }
    if (name.trim().length > 60) {
        throw new Error('Le nom de catégorie ne peut pas dépasser 60 caractères');
    }
}

/**
 * Met à jour les ingrédients d'un utilisateur
 * NOTE : la validation des catégories est assouplie pour autoriser les catégories
 * personnalisées créées par l'utilisateur (pas seulement CONFIG.foodCategories).
 */
async function updateUserIngredients(userId, ingredients) {
    const userData = await usersManager.readUserData(userId);
    if (!userData) throw new Error('Utilisateur non trouvé');

    if (!ingredients || typeof ingredients !== 'object') {
        throw new Error('Format d\'ingrédients invalide');
    }

    for (const [category, categoryData] of Object.entries(ingredients)) {
        validateCategoryName(category);

        if (!categoryData.repas ||
            typeof categoryData.repas.midi !== 'boolean' ||
            typeof categoryData.repas.soir !== 'boolean') {
            throw new Error(`Structure invalide pour la catégorie: ${category}`);
        }

        if (!Array.isArray(categoryData.items)) {
            throw new Error(`Items doit être un tableau pour: ${category}`);
        }
    }

    if (!userData.preference) userData.preference = {};
    userData.preference.ingredients = ingredients;

    await usersManager.writeUserData(userId, userData);
    return ingredients;
}

/**
 * Ajoute un item à une catégorie d'ingrédients
 */
async function addIngredientItem(userId, category, item) {
    validateCategoryName(category);

    if (!item || typeof item !== 'string' || item.trim() === '') {
        throw new Error('Item invalide');
    }

    const ingredients = await readUserIngredients(userId);

    if (!ingredients[category]) {
        ingredients[category] = {
            repas: { midi: true, soir: true },
            items: []
        };
    }

    const trimmedItem = item.trim();
    if (!ingredients[category].items.includes(trimmedItem)) {
        ingredients[category].items.push(trimmedItem);
    }

    await updateUserIngredients(userId, ingredients);
    return ingredients;
}

/**
 * Supprime un item d'une catégorie d'ingrédients
 */
async function removeIngredientItem(userId, category, item) {
    validateCategoryName(category);

    const ingredients = await readUserIngredients(userId);

    if (ingredients[category] && ingredients[category].items) {
        ingredients[category].items = ingredients[category].items.filter(i => i !== item);
    }

    await updateUserIngredients(userId, ingredients);
    return ingredients;
}

/**
 * Met à jour les préférences de repas pour une catégorie
 */
async function updateCategoryRepas(userId, category, repas) {
    validateCategoryName(category);

    if (!repas || typeof repas.midi !== 'boolean' || typeof repas.soir !== 'boolean') {
        throw new Error('Format de repas invalide');
    }

    const ingredients = await readUserIngredients(userId);

    if (!ingredients[category]) {
        ingredients[category] = {
            repas: { midi: true, soir: true },
            items: []
        };
    }

    ingredients[category].repas = repas;

    await updateUserIngredients(userId, ingredients);
    return ingredients;
}

// ============================================================
// GESTION DES CATÉGORIES (NOUVEAU)
// ============================================================

/**
 * Crée une nouvelle catégorie personnalisée
 * @param {string} userId
 * @param {string} categoryName - Nom de la nouvelle catégorie
 * @returns {Promise<Object>} Ingrédients mis à jour
 */
async function addCategory(userId, categoryName) {
    validateCategoryName(categoryName);

    const trimmed = categoryName.trim();
    const ingredients = await readUserIngredients(userId);

    if (ingredients[trimmed]) {
        throw new Error('Une catégorie avec ce nom existe déjà');
    }

    ingredients[trimmed] = {
        repas: { midi: false, soir: false },
        items: []
    };

    await updateUserIngredients(userId, ingredients);
    logger.info(`Catégorie créée : "${trimmed}" pour user ${userId}`);
    return ingredients;
}

/**
 * Renomme une catégorie existante (conserve les items et repas)
 * @param {string} userId
 * @param {string} oldName - Nom actuel
 * @param {string} newName - Nouveau nom
 * @returns {Promise<Object>} Ingrédients mis à jour
 */
async function renameCategory(userId, oldName, newName) {
    validateCategoryName(oldName);
    validateCategoryName(newName);

    const trimmedNew = newName.trim();
    const ingredients = await readUserIngredients(userId);

    if (!ingredients[oldName]) {
        throw new Error('Catégorie introuvable');
    }

    if (oldName !== trimmedNew && ingredients[trimmedNew]) {
        throw new Error('Une catégorie avec ce nom existe déjà');
    }

    // Reconstruire l'objet en préservant l'ordre mais en remplaçant la clé
    const updated = {};
    for (const [key, value] of Object.entries(ingredients)) {
        if (key === oldName) {
            updated[trimmedNew] = value;
        } else {
            updated[key] = value;
        }
    }

    await updateUserIngredients(userId, updated);
    logger.info(`Catégorie renommée : "${oldName}" → "${trimmedNew}" pour user ${userId}`);
    return updated;
}

/**
 * Supprime une catégorie (et tous ses items)
 * Les repas du planning existants NE sont PAS supprimés — ils restent dans le planning.
 * @param {string} userId
 * @param {string} categoryName - Nom de la catégorie à supprimer
 * @returns {Promise<Object>} Ingrédients mis à jour
 */
async function deleteCategory(userId, categoryName) {
    validateCategoryName(categoryName);

    const ingredients = await readUserIngredients(userId);

    if (!ingredients[categoryName]) {
        throw new Error('Catégorie introuvable');
    }

    delete ingredients[categoryName];

    await updateUserIngredients(userId, ingredients);
    logger.info(`Catégorie supprimée : "${categoryName}" pour user ${userId}`);
    return ingredients;
}

/**
 * @fileoverview Gestion des méthodes du preferences-manager pour les jours
 * @module managers/preferences-manager-days
 * 
 * À ajouter dans votre classe PreferencesManager existante
 */

/**
 * Met à jour les jours de la semaine pour une catégorie d'ingrédients
 * @param {string} userId - ID de l'utilisateur
 * @param {string} category - Nom de la catégorie
 * @param {Object} days - Objet avec les jours {lundi: true, mardi: true, ...}
 * @returns {Promise<Object>} Les ingrédients mis à jour
 * @throws {Error} Si la catégorie n'existe pas ou si la mise à jour échoue
 */
async function updateCategoryDays(userId, category, days) {
    try {
        // Récupérer les préférences actuelles
        const preferencesFile = this._getUserPreferencesPath(userId);
        let preferences = await this._readFile(preferencesFile) || { ingredients: {} };

        // Vérifier que la catégorie existe
        if (!preferences.ingredients[category]) {
            throw new Error(`La catégorie "${category}" n'existe pas`);
        }

        // Valider que tous les jours requis sont présents
        const DAYS_OF_WEEK = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
        for (const day of DAYS_OF_WEEK) {
            if (!(day in days)) {
                throw new Error(`Le jour "${day}" est manquant`);
            }
            if (typeof days[day] !== 'boolean') {
                throw new Error(`Le jour "${day}" doit être un booléen`);
            }
        }

        // Initialiser les jours s'ils n'existent pas
        if (!preferences.ingredients[category].days) {
            preferences.ingredients[category].days = {};
        }

        // Mettre à jour les jours
        preferences.ingredients[category].days = days;

        // Sauvegarder les modifications
        await this._writeFile(preferencesFile, preferences);

        logger.info(`Jours mis à jour pour la catégorie "${category}" de l'utilisateur ${userId}`);

        return preferences.ingredients;

    } catch (error) {
        logger.error(`Erreur lors de la mise à jour des jours pour "${category}":`, error);
        throw error;
    }
}

/**
 * Ajoute une catégorie avec initialisation des jours par défaut
 * @param {string} userId - ID de l'utilisateur
 * @param {string} categoryName - Nom de la nouvelle catégorie
 * @returns {Promise<Object>} Les ingrédients mis à jour
 * @throws {Error} Si la catégorie existe déjà ou si l'ajout échoue
 */
async function addCategory(userId, categoryName) {
    try {
        // Récupérer les préférences actuelles
        const preferencesFile = this._getUserPreferencesPath(userId);
        let preferences = await this._readFile(preferencesFile) || { ingredients: {} };

        // Vérifier que la catégorie n'existe pas déjà
        if (preferences.ingredients[categoryName]) {
            const error = new Error(`La catégorie "${categoryName}" existe déjà`);
            error.error = 'CONFLICT';
            throw error;
        }

        // Initialiser les jours par défaut (tous activés)
        const DAYS_OF_WEEK = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
        const defaultDays = {};
        DAYS_OF_WEEK.forEach(day => {
            defaultDays[day] = true;
        });

        // Créer la nouvelle catégorie
        preferences.ingredients[categoryName] = {
            items: [],
            repas: {
                midi: true,
                soir: true
            },
            days: defaultDays
        };

        // Sauvegarder les modifications
        await this._writeFile(preferencesFile, preferences);

        logger.info(`Catégorie "${categoryName}" créée pour l'utilisateur ${userId}`);

        return preferences.ingredients;

    } catch (error) {
        logger.error(`Erreur lors de la création de la catégorie "${categoryName}":`, error);
        throw error;
    }
}

/**
 * Renomme une catégorie (conserve items, préférences repas et jours)
 * @param {string} userId - ID de l'utilisateur
 * @param {string} oldName - Nom actuel de la catégorie
 * @param {string} newName - Nouveau nom de la catégorie
 * @returns {Promise<Object>} Les ingrédients mis à jour
 * @throws {Error} Si l'ancienne catégorie n'existe pas ou si le nouveau nom existe déjà
 */
async function renameCategory(userId, oldName, newName) {
    try {
        // Récupérer les préférences actuelles
        const preferencesFile = this._getUserPreferencesPath(userId);
        let preferences = await this._readFile(preferencesFile) || { ingredients: {} };

        // Vérifier que l'ancienne catégorie existe
        if (!preferences.ingredients[oldName]) {
            const error = new Error(`La catégorie "${oldName}" n'existe pas`);
            error.error = 'NOT_FOUND';
            throw error;
        }

        // Vérifier que la nouvelle catégorie n'existe pas
        if (preferences.ingredients[newName]) {
            const error = new Error(`Une catégorie "${newName}" existe déjà`);
            error.error = 'CONFLICT';
            throw error;
        }

        // Renommer la catégorie (conserve tous les attributs)
        preferences.ingredients[newName] = preferences.ingredients[oldName];
        delete preferences.ingredients[oldName];

        // Sauvegarder les modifications
        await this._writeFile(preferencesFile, preferences);

        logger.info(`Catégorie renommée de "${oldName}" à "${newName}" pour l'utilisateur ${userId}`);

        return preferences.ingredients;

    } catch (error) {
        logger.error(`Erreur lors du renommage de la catégorie:`, error);
        throw error;
    }
}

/**
 * Supprime une catégorie et tous ses items
 * Note: Les repas du planning existant ne sont PAS supprimés
 * @param {string} userId - ID de l'utilisateur
 * @param {string} categoryName - Nom de la catégorie à supprimer
 * @returns {Promise<Object>} Les ingrédients mis à jour
 * @throws {Error} Si la catégorie n'existe pas
 */
async function deleteCategory(userId, categoryName) {
    try {
        // Récupérer les préférences actuelles
        const preferencesFile = this._getUserPreferencesPath(userId);
        let preferences = await this._readFile(preferencesFile) || { ingredients: {} };

        // Vérifier que la catégorie existe
        if (!preferences.ingredients[categoryName]) {
            const error = new Error(`La catégorie "${categoryName}" n'existe pas`);
            error.error = 'NOT_FOUND';
            throw error;
        }

        // Supprimer la catégorie
        delete preferences.ingredients[categoryName];

        // Sauvegarder les modifications
        await this._writeFile(preferencesFile, preferences);

        logger.info(`Catégorie "${categoryName}" supprimée pour l'utilisateur ${userId}`);

        return preferences.ingredients;

    } catch (error) {
        logger.error(`Erreur lors de la suppression de la catégorie "${categoryName}":`, error);
        throw error;
    }
}

/**
 * Récupère une catégorie spécifique avec tous ses attributs
 * @param {string} userId - ID de l'utilisateur
 * @param {string} categoryName - Nom de la catégorie
 * @returns {Promise<Object|null>} La catégorie avec ses attributs ou null
 */
async function getCategory(userId, categoryName) {
    try {
        const preferencesFile = this._getUserPreferencesPath(userId);
        const preferences = await this._readFile(preferencesFile) || { ingredients: {} };

        return preferences.ingredients[categoryName] || null;

    } catch (error) {
        logger.error(`Erreur lors de la récupération de la catégorie "${categoryName}":`, error);
        throw error;
    }
}

/**
 * Obtient tous les jours activés pour une catégorie
 * @param {string} userId - ID de l'utilisateur
 * @param {string} categoryName - Nom de la catégorie
 * @returns {Promise<Object>} Objet avec les jours {lundi: true, ...}
 */
async function getCategoryDays(userId, categoryName) {
    try {
        const category = await this.getCategory(userId, categoryName);

        if (!category) {
            throw new Error(`La catégorie "${categoryName}" n'existe pas`);
        }

        // Retourner les jours ou les jours par défaut (tous activés)
        if (!category.days) {
            const DAYS_OF_WEEK = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
            const defaultDays = {};
            DAYS_OF_WEEK.forEach(day => {
                defaultDays[day] = true;
            });
            return defaultDays;
        }

        return category.days;

    } catch (error) {
        logger.error(`Erreur lors de la récupération des jours de "${categoryName}":`, error);
        throw error;
    }
}

/**
 * Vérifie si une catégorie est active pour un jour et un type de repas donnés
 * @param {string} userId - ID de l'utilisateur
 * @param {string} categoryName - Nom de la catégorie
 * @param {string} dayOfWeek - Jour de la semaine ('lundi', 'mardi', etc.)
 * @param {string} mealType - Type de repas ('midi' ou 'soir')
 * @returns {Promise<boolean>} True si la catégorie est active
 */
async function isCategoryActive(userId, categoryName, dayOfWeek, mealType) {
    try {
        const category = await this.getCategory(userId, categoryName);

        if (!category) {
            return false;
        }

        // Vérifier le type de repas
        if (!category.repas || !category.repas[mealType]) {
            return false;
        }

        // Vérifier le jour de la semaine
        if (category.days && category.days[dayOfWeek] === false) {
            return false;
        }

        // Vérifier qu'il y a des items
        if (!category.items || category.items.length === 0) {
            return false;
        }

        return true;

    } catch (error) {
        logger.error(`Erreur lors de la vérification de l'activité de la catégorie:`, error);
        return false;
    }
}

/**
 * Récupère toutes les catégories actives pour un jour et type de repas donnés
 * @param {string} userId - ID de l'utilisateur
 * @param {string} dayOfWeek - Jour de la semaine ('lundi', 'mardi', etc.)
 * @param {string} mealType - Type de repas ('midi' ou 'soir')
 * @returns {Promise<Array<string>>} Liste des noms de catégories actives
 */
async function getActiveCategoriesForDay(userId, dayOfWeek, mealType) {
    try {
        const preferencesFile = this._getUserPreferencesPath(userId);
        const preferences = await this._readFile(preferencesFile) || { ingredients: {} };

        const activeCategories = [];

        for (const [categoryName, data] of Object.entries(preferences.ingredients)) {
            // Vérifier le type de repas
            if (!data.repas || !data.repas[mealType]) {
                continue;
            }

            // Vérifier le jour de la semaine
            if (data.days && data.days[dayOfWeek] === false) {
                continue;
            }

            // Vérifier qu'il y a des items
            if (!data.items || data.items.length === 0) {
                continue;
            }

            activeCategories.push(categoryName);
        }

        return activeCategories;

    } catch (error) {
        logger.error(`Erreur lors de la récupération des catégories actives:`, error);
        throw error;
    }
}

module.exports = {
    readUserPreferences,
    writeUserPreferences,
    updateNumberOfWeeks,
    updateDarkMode,
    readUserIngredients,
    updateUserIngredients,
    addIngredientItem,
    removeIngredientItem,
    updateCategoryRepas,
    // Nouvelles fonctions
    addCategory,
    renameCategory,
    deleteCategory,
    getCategory,
    getCategoryDays,
    isCategoryActive,
    getActiveCategoriesForDay

};