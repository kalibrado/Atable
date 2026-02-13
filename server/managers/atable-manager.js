/**
 * @fileoverview Gestion des plans de repas basés sur les jours du mois
 * @module managers/atable-manager
 */

const usersManager = require('./users-manager');
const CONFIG = require('../../config');
const logger = require('../../logger');

/**
 * Lit les plans de repas d'un utilisateur
 * @async
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} Plans des semaines
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
 * @async
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} weeksPlans - Plans des semaines à sauvegarder
 * @returns {Promise<void>}
 * @throws {Error} Si l'utilisateur n'existe pas ou données invalides
 */
async function writeUseratable(userId, weeksPlans) {
    const userData = await usersManager.readUserData(userId);
    if (!userData) {
        throw new Error('Utilisateur non trouvé');
    }

    for (const weekKey in weeksPlans) {
        if (!weekKey.startsWith('week')) continue;
        
        const week = weeksPlans[weekKey];
        if (!week.days) {
            throw new Error('Format de données invalide');
        }

        for (const dayKey of Object.keys(week.days)) {
            const dayNum = parseInt(dayKey);
            if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
                throw new Error(`Numéro de jour invalide: ${dayKey}`);
            }

            const dayData = week.days[dayKey];
            if (typeof dayData.midi === 'undefined' || typeof dayData.soir === 'undefined') {
                throw new Error(`Données manquantes pour le jour ${dayKey} dans ${weekKey}`);
            }
        }
    }

    userData.weeksPlans = weeksPlans;
    await usersManager.writeUserData(userId, userData);
}

/**
 * Crée la structure de semaines par défaut avec jours du mois
 * @param {number} numberOfWeeks - Nombre de semaines à créer
 * @returns {Object} Structure des semaines
 */
function createDefaultWeeksPlans(numberOfWeeks) {
    const plans = {};
    for (let i = 1; i <= 4; i++) {
        plans[`week${i}`] = {
            enabled: i <= numberOfWeeks,
            days: createEmptyMonth()
        };
    }
    return plans;
}

/**
 * Crée un mois vide (jours 1 à 31)
 * @returns {Object} Objet avec jours 1-31
 */
function createEmptyMonth() {
    const days = {};
    for (let day = 1; day <= 31; day++) {
        days[day] = { midi: '', soir: '' };
    }
    return days;
}

/**
 * Supprime les plans de repas d'un utilisateur (remise à zéro)
 * @async
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<void>}
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
    createEmptyMonth
};