/**
 * @fileoverview Fonction corrigée updateUserPreferences
 * @module managers/preferences-manager
 * 
 * À REMPLACER dans votre preferences-manager.js
 */

const usersManager = require('./users-manager');
const logger = require('../../logger');

/**
 * Met à jour les préférences d'un utilisateur
 * Accepte n'importe quels updates et les fusionne avec les préférences existantes
 * 
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} updates - Objet contenant les propriétés à mettre à jour
 *   Exemple: { darkMode: true, numberOfWeeks: 2, ingredients: {...} }
 * @returns {Promise<Object>} Les préférences mises à jour complètes
 * @throws {Error} Si l'utilisateur n'existe pas ou si la sauvegarde échoue
 * 
 * @example
 * // Mettre à jour le nombre de semaines
 * await updateUserPreferences(userId, { numberOfWeeks: 2 });
 * 
 * // Mettre à jour le mode sombre
 * await updateUserPreferences(userId, { darkMode: true });
 * 
 * // Mettre à jour les ingrédients
 * await updateUserPreferences(userId, { ingredients: {...} });
 * 
 * // Mettre à jour l'heure de notification
 * await updateUserPreferences(userId, { 
 *   notifications: { 
 *     settings: { hour: 8, minute: 30, enabled: true } 
 *   } 
 * });
 */
async function updateUserPreferences(userId, updates) {
    try {
        // Valider les entrées
        if (!userId || typeof userId !== 'string') {
            throw new Error('ID utilisateur invalide');
        }

        if (!updates || typeof updates !== 'object') {
            throw new Error('Les updates doivent être un objet');
        }

        // Lire les données utilisateur actuelles
        const userData = await usersManager.readUserData(userId);
        if (!userData) {
            throw new Error('Utilisateur non trouvé');
        }

        // Initialiser les préférences s'il n'y en a pas
        if (!userData.preference) {
            userData.preference = {};
        }

        // Fusionner les updates avec les préférences existantes
        // On utilise une fusion profonde pour les objets imbriqués
        Object.assign(userData.preference, updates);

        // Sauvegarder les données utilisateur mises à jour
        await usersManager.writeUserData(userId, userData);

        logger.info(`Préférences mises à jour pour l'utilisateur ${userId}:`, {
            updatedFields: Object.keys(updates)
        });

        // Retourner les préférences complètes mises à jour
        return userData.preference;

    } catch (error) {
        logger.error(`Erreur lors de la mise à jour des préférences de ${userId}:`, error);
        throw error;
    }
}

/**
 * Lisez les préférences d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} Objet contenant toutes les préférences
 * @throws {Error} Si l'utilisateur n'existe pas
 */
async function readUserPreferences(userId) {
    try {
        const userData = await usersManager.readUserData(userId);
        if (!userData) {
            throw new Error('Utilisateur non trouvé');
        }
        
        return userData.preference || {};

    } catch (error) {
        logger.error(`Erreur lors de la lecture des préférences de ${userId}:`, error);
        throw error;
    }
}

/**
 * Écrit directement les préférences (remplace complètement)
 * À utiliser avec prudence - préférez updateUserPreferences pour les mises à jour partielles
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} preferences - Objet complet des préférences
 * @returns {Promise<Object>} Les préférences sauvegardées
 * @throws {Error} Si l'utilisateur n'existe pas
 */
async function writeUserPreferences(userId, preferences) {
    try {
        const userData = await usersManager.readUserData(userId);
        if (!userData) {
            throw new Error('Utilisateur non trouvé');
        }

        userData.preference = preferences || {};

        await usersManager.writeUserData(userId, userData);

        logger.info(`Préférences écrites pour l'utilisateur ${userId}`);

        return userData.preference;

    } catch (error) {
        logger.error(`Erreur lors de l'écriture des préférences de ${userId}:`, error);
        throw error;
    }
}

/**
 * Met à jour le nombre de semaines
 * @param {string} userId - ID de l'utilisateur
 * @param {number} numberOfWeeks - Nombre de semaines (1-4)
 * @returns {Promise<Object>} Les préférences mises à jour
 * @throws {Error} Si le nombre est invalide
 */
async function updateNumberOfWeeks(userId, numberOfWeeks) {
    const CONFIG = require('../../config');
    
    if (!Number.isInteger(numberOfWeeks) || numberOfWeeks < CONFIG.minWeeks || numberOfWeeks > CONFIG.maxWeeks) {
        throw new Error(`Nombre de semaines invalide (${CONFIG.minWeeks}-${CONFIG.maxWeeks})`);
    }

    return await updateUserPreferences(userId, { numberOfWeeks });
}

/**
 * Met à jour le mode sombre
 * @param {string} userId - ID de l'utilisateur
 * @param {boolean} darkMode - True pour activer le mode sombre
 * @returns {Promise<Object>} Les préférences mises à jour
 */
async function updateDarkMode(userId, darkMode) {
    if (typeof darkMode !== 'boolean') {
        throw new Error('darkMode doit être un booléen');
    }

    return await updateUserPreferences(userId, { darkMode });
}

/**
 * Lit les ingrédients d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} Objet avec les catégories d'ingrédients
 */
async function readUserIngredients(userId) {
    const preferences = await readUserPreferences(userId);
    return preferences.ingredients || usersManager.createDefaultIngredients();
}

/**
 * Valide la structure d'une catégorie d'ingrédients
 * @private
 * @param {string} name - Nom à valider
 * @throws {Error} Si le nom est invalide
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
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} ingredients - Objet avec les catégories d'ingrédients
 * @returns {Promise<Object>} Les préférences mises à jour
 * @throws {Error} Si le format est invalide
 */
async function updateUserIngredients(userId, ingredients) {
    if (!ingredients || typeof ingredients !== 'object') {
        throw new Error('Format d\'ingrédients invalide');
    }

    // Valider chaque catégorie
    for (const [category, categoryData] of Object.entries(ingredients)) {
        validateCategoryName(category);

        if (!categoryData || typeof categoryData !== 'object') {
            throw new Error(`Données invalides pour la catégorie: ${category}`);
        }

        if (!categoryData.repas ||
            typeof categoryData.repas.midi !== 'boolean' ||
            typeof categoryData.repas.soir !== 'boolean') {
            throw new Error(`Structure repas invalide pour la catégorie: ${category}`);
        }

        if (!Array.isArray(categoryData.items)) {
            throw new Error(`Items doit être un tableau pour: ${category}`);
        }
    }

    return await updateUserPreferences(userId, { ingredients });
}

/**
 * Ajoute un item à une catégorie d'ingrédients
 * @param {string} userId - ID de l'utilisateur
 * @param {string} category - Nom de la catégorie
 * @param {string} item - L'item à ajouter
 * @returns {Promise<Object>} Les ingrédients mis à jour
 * @throws {Error} Si l'item existe déjà ou si le format est invalide
 */
async function addIngredientItem(userId, category, item) {
    validateCategoryName(category);

    if (!item || typeof item !== 'string' || item.trim() === '') {
        throw new Error('Item invalide');
    }

    const ingredients = await readUserIngredients(userId);

    // Créer la catégorie si elle n'existe pas
    if (!ingredients[category]) {
        ingredients[category] = {
            repas: { midi: true, soir: true },
            items: [],
            days: {
                lundi: true,
                mardi: true,
                mercredi: true,
                jeudi: true,
                vendredi: true,
                samedi: true,
                dimanche: true
            }
        };
    }

    const trimmedItem = item.trim();

    // Vérifier que l'item n'existe pas déjà (case-insensitive)
    const itemExists = ingredients[category].items.some(i => i.toLowerCase() === trimmedItem.toLowerCase());
    if (itemExists) {
        const error = new Error(`L'item "${trimmedItem}" existe déjà dans cette catégorie`);
        error.error = 'CONFLICT';
        throw error;
    }

    // Ajouter l'item
    ingredients[category].items.push(trimmedItem);

    await updateUserIngredients(userId, ingredients);
    return ingredients;
}

/**
 * Supprime un item d'une catégorie d'ingrédients
 * @param {string} userId - ID de l'utilisateur
 * @param {string} category - Nom de la catégorie
 * @param {string} item - L'item à supprimer
 * @returns {Promise<Object>} Les ingrédients mis à jour
 * @throws {Error} Si la catégorie n'existe pas
 */
async function removeIngredientItem(userId, category, item) {
    validateCategoryName(category);

    const ingredients = await readUserIngredients(userId);

    if (!ingredients[category]) {
        throw new Error(`Catégorie "${category}" non trouvée`);
    }

    if (ingredients[category].items) {
        ingredients[category].items = ingredients[category].items.filter(i => i !== item);
    }

    await updateUserIngredients(userId, ingredients);
    return ingredients;
}

/**
 * Met à jour les préférences de repas (midi/soir) pour une catégorie
 * @param {string} userId - ID de l'utilisateur
 * @param {string} category - Nom de la catégorie
 * @param {Object} repas - { midi: boolean, soir: boolean }
 * @returns {Promise<Object>} Les ingrédients mis à jour
 * @throws {Error} Si le format est invalide
 */
async function updateCategoryRepas(userId, category, repas) {
    validateCategoryName(category);

    if (!repas || typeof repas.midi !== 'boolean' || typeof repas.soir !== 'boolean') {
        throw new Error('Format de repas invalide (doit contenir midi et soir)');
    }

    const ingredients = await readUserIngredients(userId);

    if (!ingredients[category]) {
        throw new Error(`Catégorie "${category}" non trouvée`);
    }

    ingredients[category].repas = repas;

    await updateUserIngredients(userId, ingredients);
    return ingredients;
}

/**
 * Met à jour les jours de la semaine pour une catégorie d'ingrédients
 * @param {string} userId - ID de l'utilisateur
 * @param {string} category - Nom de la catégorie
 * @param {Object} days - { lundi: boolean, mardi: boolean, ... }
 * @returns {Promise<Object>} Les ingrédients mis à jour
 * @throws {Error} Si la catégorie n'existe pas ou si le format est invalide
 */
async function updateCategoryDays(userId, category, days) {
    validateCategoryName(category);

    if (!days || typeof days !== 'object') {
        throw new Error('Format de jours invalide');
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

    const ingredients = await readUserIngredients(userId);

    if (!ingredients[category]) {
        throw new Error(`Catégorie "${category}" non trouvée`);
    }

    ingredients[category].days = days;

    await updateUserIngredients(userId, ingredients);
    logger.info(`Jours mis à jour pour la catégorie "${category}" de l'utilisateur ${userId}`);

    return ingredients;
}

/**
 * Ajoute une nouvelle catégorie d'ingrédients
 * @param {string} userId - ID de l'utilisateur
 * @param {string} categoryName - Nom de la nouvelle catégorie
 * @returns {Promise<Object>} Les ingrédients mis à jour
 * @throws {Error} Si la catégorie existe déjà
 */
async function addCategory(userId, categoryName) {
    validateCategoryName(categoryName);

    const trimmed = categoryName.trim();
    const ingredients = await readUserIngredients(userId);

    if (ingredients[trimmed]) {
        const error = new Error(`Une catégorie avec le nom "${trimmed}" existe déjà`);
        error.error = 'CONFLICT';
        throw error;
    }

    // Initialiser les jours par défaut (tous activés)
    const defaultDays = {};
    ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].forEach(day => {
        defaultDays[day] = true;
    });

    ingredients[trimmed] = {
        repas: { midi: false, soir: false },
        items: [],
        days: defaultDays
    };

    await updateUserIngredients(userId, ingredients);
    logger.info(`Catégorie créée : "${trimmed}" pour user ${userId}`);

    return ingredients;
}

/**
 * Renomme une catégorie existante
 * @param {string} userId - ID de l'utilisateur
 * @param {string} oldName - Nom actuel
 * @param {string} newName - Nouveau nom
 * @returns {Promise<Object>} Les ingrédients mis à jour
 * @throws {Error} Si l'ancienne catégorie n'existe pas ou si le nouveau nom existe déjà
 */
async function renameCategory(userId, oldName, newName) {
    validateCategoryName(oldName);
    validateCategoryName(newName);

    const trimmedNew = newName.trim();
    const ingredients = await readUserIngredients(userId);

    if (!ingredients[oldName]) {
        const error = new Error(`La catégorie "${oldName}" n'existe pas`);
        error.error = 'NOT_FOUND';
        throw error;
    }

    if (oldName !== trimmedNew && ingredients[trimmedNew]) {
        const error = new Error(`Une catégorie "${trimmedNew}" existe déjà`);
        error.error = 'CONFLICT';
        throw error;
    }

    // Reconstruire l'objet en remplaçant la clé
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
 * Note: Les repas du planning existant ne sont PAS supprimés
 * @param {string} userId - ID de l'utilisateur
 * @param {string} categoryName - Nom de la catégorie à supprimer
 * @returns {Promise<Object>} Les ingrédients mis à jour
 * @throws {Error} Si la catégorie n'existe pas
 */
async function deleteCategory(userId, categoryName) {
    validateCategoryName(categoryName);

    const ingredients = await readUserIngredients(userId);

    if (!ingredients[categoryName]) {
        const error = new Error(`La catégorie "${categoryName}" n'existe pas`);
        error.error = 'NOT_FOUND';
        throw error;
    }

    delete ingredients[categoryName];

    await updateUserIngredients(userId, ingredients);
    logger.info(`Catégorie supprimée : "${categoryName}" pour user ${userId}`);

    return ingredients;
}

module.exports = {
    updateUserPreferences, 
    readUserPreferences,
    writeUserPreferences,
    updateNumberOfWeeks,
    updateDarkMode,
    readUserIngredients,
    updateUserIngredients,
    addIngredientItem,
    removeIngredientItem,
    updateCategoryRepas,
    updateCategoryDays,
    addCategory,
    renameCategory,
    deleteCategory
};