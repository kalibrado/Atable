// ========================================
// Gestion des préférences utilisateur - Structure unifiée
// ========================================

const usersManager = require('./users-manager');
const CONFIG = require('../../config');
const logger = require('../../logger');

/**
 * Lit les préférences d'un utilisateur
 */
async function readUserPreferences(userId) {
    const userData = await usersManager.readUserData(userId);
    if (!userData) {
        return { 
            showWeeks: CONFIG.defaultWeeks,
            ingredients: usersManager.createDefaultIngredients()
        };
    }
    return userData.preference || { 
        showWeeks: CONFIG.defaultWeeks,
        ingredients: usersManager.createDefaultIngredients()
    };
}

/**
 * Met à jour les préférences d'un utilisateur
 */
async function writeUserPreferences(userId, preferences) {
    const userData = await usersManager.readUserData(userId);
    if (!userData) {
        throw new Error('Utilisateur non trouvé');
    }

    if (preferences.showWeeks && (preferences.showWeeks < CONFIG.minWeeks || preferences.showWeeks > CONFIG.maxWeeks)) {
        throw new Error(`Le nombre de semaines doit être entre ${CONFIG.minWeeks} et ${CONFIG.maxWeeks}`);
    }

    userData.preference = { ...userData.preference, ...preferences };
    
    // Activer/désactiver les semaines selon showWeeks
    if (preferences.showWeeks) {
        for (let i = 1; i <= 4; i++) {
            if (userData.weeksPlans[`week${i}`]) {
                userData.weeksPlans[`week${i}`].enabled = i <= preferences.showWeeks;
            }
        }
    }

    await usersManager.writeUserData(userId, userData);
    return userData.preference;
}

/**
 * Met à jour le nombre de semaines
 */
async function updateNumberOfWeeks(userId, numberOfWeeks) {
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
 * Met à jour les ingrédients d'un utilisateur
 */
async function updateUserIngredients(userId, ingredients) {
    const userData = await usersManager.readUserData(userId);
    if (!userData) {
        throw new Error('Utilisateur non trouvé');
    }

    // Validation des données
    if (!ingredients || typeof ingredients !== 'object') {
        throw new Error('Format d\'ingrédients invalide');
    }

    // Vérifier que toutes les catégories sont valides
    for (const category of Object.keys(ingredients)) {
        if (!CONFIG.foodCategories.includes(category)) {
            throw new Error(`Catégorie invalide: ${category}`);
        }

        const categoryData = ingredients[category];
        if (!categoryData.repas || typeof categoryData.repas.midi !== 'boolean' || typeof categoryData.repas.soir !== 'boolean') {
            throw new Error(`Structure invalide pour la catégorie: ${category}`);
        }

        if (!Array.isArray(categoryData.items)) {
            throw new Error(`Items doit être un tableau pour: ${category}`);
        }
    }

    // Mettre à jour les ingrédients
    if (!userData.preference) {
        userData.preference = {};
    }
    userData.preference.ingredients = ingredients;

    await usersManager.writeUserData(userId, userData);
    return ingredients;
}

/**
 * Ajoute un item à une catégorie d'ingrédients
 */
async function addIngredientItem(userId, category, item) {
    if (!CONFIG.foodCategories.includes(category)) {
        throw new Error('Catégorie invalide');
    }

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

    // Éviter les doublons
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
    if (!CONFIG.foodCategories.includes(category)) {
        throw new Error('Catégorie invalide');
    }

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
    if (!CONFIG.foodCategories.includes(category)) {
        throw new Error('Catégorie invalide');
    }

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

module.exports = {
    readUserPreferences,
    writeUserPreferences,
    updateNumberOfWeeks,
    updateDarkMode,
    readUserIngredients,
    updateUserIngredients,
    addIngredientItem,
    removeIngredientItem,
    updateCategoryRepas
};