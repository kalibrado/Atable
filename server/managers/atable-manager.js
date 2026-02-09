// ========================================
// Gestion des plans de repas - Structure unifiée
// ========================================

const usersManager = require('./users-manager');
const CONFIG = require('../../config');

/**
 * Lit les plans de repas d'un utilisateur
 */
async function readUseratable(userId) {
    const userData = await usersManager.readUserData(userId);
    if (!userData || !userData.weeksPlans) {
        return createDefaultWeeksPlans(CONFIG.defaultWeeks);
    }
    return userData.weeksPlans;
}

/**
 * Sauvegarde les plans de repas d'un utilisateur
 */
async function writeUseratable(userId, weeksPlans) {
    const userData = await usersManager.readUserData(userId);
    if (!userData) {
        throw new Error('Utilisateur non trouvé');
    }

    // Valider les données
    for (const weekKey in weeksPlans) {
        if (!weekKey.startsWith('week')) continue;
        
        const week = weeksPlans[weekKey];
        if (!week.days) {
            throw new Error('Format de données invalide');
        }

        const validDays = CONFIG.validDays;
        for (const day of validDays) {
            if (!week.days[day] || typeof week.days[day].midi === 'undefined' || typeof week.days[day].soir === 'undefined') {
                throw new Error(`Données manquantes pour ${day} dans ${weekKey}`);
            }
        }
    }

    userData.weeksPlans = weeksPlans;
    await usersManager.writeUserData(userId, userData);
}

/**
 * Crée la structure de semaines par défaut
 */
function createDefaultWeeksPlans(numberOfWeeks) {
    const plans = {};
    for (let i = 1; i <= 4; i++) {
        plans[`week${i}`] = {
            enabled: i <= numberOfWeeks,
            days: { ...CONFIG.default_atable }
        };
    }
    return plans;
}

/**
 * Crée une structure de semaine vide
 */
function createEmptyWeek() {
    return {
        enabled: false,
        days: { ...CONFIG.default_atable }
    };
}

/**
 * Supprime les plans de repas d'un utilisateur (remise à zéro)
 */
async function deleteUseratable(userId) {
    const userData = await usersManager.readUserData(userId);
    if (!userData) return;

    const numberOfWeeks = userData.preference?.showWeeks || CONFIG.defaultWeeks;
    userData.weeksPlans = createDefaultWeeksPlans(numberOfWeeks);
    
    await usersManager.writeUserData(userId, userData);
}

module.exports = {
    readUseratable,
    writeUseratable,
    deleteUseratable,
    createDefaultWeeksPlans,
    createEmptyWeek
};