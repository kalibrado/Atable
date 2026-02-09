// ========================================
// Gestion des préférences utilisateur - Structure unifiée
// ========================================

const usersManager = require('./users-manager');
const CONFIG = require('../../config');

/**
 * Lit les préférences d'un utilisateur
 */
async function readUserPreferences(userId) {
    const userData = await usersManager.readUserData(userId);
    if (!userData) {
        return { showWeeks: CONFIG.defaultWeeks, darkMode: false };
    }
    return userData.preference || { showWeeks: CONFIG.defaultWeeks, darkMode: false };
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

module.exports = {
    readUserPreferences,
    writeUserPreferences,
    updateNumberOfWeeks,
    updateDarkMode
};