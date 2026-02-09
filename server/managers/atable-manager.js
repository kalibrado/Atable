// ========================================
// Gestion des atable plans par utilisateur
// 
// Ce module gère les atable plans des utilisateurs, stockés dans des fichiers JSON individuels.
// Chaque utilisateur a un fichier nommé atable_{userId}.json dans le dossier data.
// Les fonctions permettent de lire, écrire et supprimer ces fichiers.
// Le format des données est validé pour s'assurer qu'il correspond à la structure attendue.
// En cas d'erreur, des exceptions sont levées pour être gérées par les routes ou autres modules.
// 
// ========================================

const fs = require('fs').promises;
const path = require('path');
const CONFIG = require('../../config');

/**
 * Constantes de configuration
 */
const DATA_DIR = CONFIG.dataDir;
const DEFAULT_atable = CONFIG.default_atable;
const validDays = CONFIG.validDays;


/**
 * Obtient le chemin du fichier de repas pour un utilisateur
 * @param {string} userId
 * @returns {string}
 */
function getUseratablePath(userId) {
  return path.join(DATA_DIR, `atable_${userId}.json`);
}

/**
 * Crée une structure de semaine vide
 * @returns {Object}
 */
function createEmptyWeek() {
  return { ...DEFAULT_atable };
}

/**
 * Crée la structure de données pour un nombre de semaines donné
 * @param {number} numberOfWeeks
 * @returns {Object}
 */
function createWeeksStructure(userId) {
  const weeks = {};
  for (let i = 1; i <= numberOfWeeks; i++) {
    weeks[`week${i}`] = createEmptyWeek();
  }
  writeUseratable(userId, weeks)
  return weeks;
}

/**
 * Lit les repas d'un utilisateur (toutes les semaines)
 * @param {string} userId
 * @param {number} numberOfWeeks - Nombre de semaines à charger
 * @returns {Promise<Object>}
 */
async function readUseratable(userId) {
  const filePath = getUseratablePath(userId);

  try {
    const data = await fs.readFile(filePath, 'utf8');
    return data;
  } catch (error) {
    console.error(error)
    // Le fichier n'existe pas encore, retourner les données par défaut
    // return createWeeksStructure(numberOfWeeks);
  }
}

/**
 * Sauvegarde les repas d'un utilisateur (toutes les semaines)
 * @param {string} userId
 * @param {Object} atable - Structure avec week1, week2, etc.
 */
async function writeUseratable(userId, atable) {
  const filePath = getUseratablePath(userId);

  // Validation des données
  const weekKeys = Object.keys(atable);
  const isValid = weekKeys.every(weekKey => {
    const day = atable[weekKey];
    return !!day
  });
  if (!isValid) {
    throw new Error('Format de données invalide');
  }

  await fs.writeFile(filePath, JSON.stringify(atable, null, 2));
}

/**
 * Supprime les repas d'un utilisateur
 * @param {string} userId
 */
async function deleteUseratable(userId) {
  const filePath = getUseratablePath(userId);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Le fichier n'existe pas, ignorer
  }
}

module.exports = {
  readUseratable,
  writeUseratable,
  deleteUseratable,
  createWeeksStructure,
  DEFAULT_atable
};