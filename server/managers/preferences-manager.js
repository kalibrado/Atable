// ========================================
// Gestion des préférences utilisateur
// Ce module gère les préférences de l'utilisateur, notamment le nombre de semaines à afficher
// Les préférences sont stockées dans un fichier JSON par utilisateur
// ========================================

const fs = require('fs').promises;
const path = require('path');
const CONFIG = require('../../config');

const DATA_DIR = CONFIG.dataDir;

/**
 * Obtient le chemin du fichier de préférences pour un utilisateur
 * @param {string} userId
 * @returns {string}
 */
function getUserPreferencesPath(userId) {
  return path.join(DATA_DIR, `preferences_${userId}.json`);
}

/**
 * Lit les préférences d'un utilisateur
 * @param {string} userId
 * @returns {Promise<Object>}
 */
async function readUserPreferences(userId) {
  const filePath = getUserPreferencesPath(userId);

  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Le fichier n'existe pas encore, retourner les préférences par défaut
    return {
      numberOfWeeks: CONFIG.defaultWeeks
    };
  }
}

/**
 * Sauvegarde les préférences d'un utilisateur
 * @param {string} userId
 * @param {Object} preferences
 */
async function writeUserPreferences(userId, preferences) {
  const filePath = getUserPreferencesPath(userId);

  // Validation du nombre de semaines
  if (preferences.numberOfWeeks < CONFIG.minWeeks || preferences.numberOfWeeks > CONFIG.maxWeeks) {
    throw new Error(`Le nombre de semaines doit être entre ${CONFIG.minWeeks} et ${CONFIG.maxWeeks}`);
  }

  await fs.writeFile(filePath, JSON.stringify(preferences, null, 2));
}

/**
 * Met à jour le nombre de semaines pour un utilisateur
 * @param {string} userId
 * @param {number} numberOfWeeks
 */
async function updateNumberOfWeeks(userId, numberOfWeeks) {
  const preferences = await readUserPreferences(userId);
  preferences.numberOfWeeks = numberOfWeeks;
  await writeUserPreferences(userId, preferences);
  return preferences;
}

module.exports = {
  readUserPreferences,
  writeUserPreferences,
  updateNumberOfWeeks
};