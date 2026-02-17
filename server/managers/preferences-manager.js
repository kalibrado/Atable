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
    deleteCategory
};