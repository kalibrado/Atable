/**
 * @fileoverview Configuration principale de l'application
 * @module config
 */

const path = require('path');
const crypto = require('crypto');

function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Configuration de l'application
 * @constant {Object}
 */
const CONFIG = {
  /** @type {string} Nom de l'application */
  appName: 'Atable!',

  /** @type {string} Version de l'application */
  version: '1.0.0',

  /** @type {string} Répertoire des données */
  dataDir: path.join(process.cwd(), 'data'),

  /** @type {string} Répertoire des utilisateurs */
  usersDir: path.join(process.cwd(), 'data', 'users'),

  /** @type {string} Fichier des notifications */
  subscribeFile: path.join(process.cwd(), 'data', 'notifications.json'),

  /** @type {string} Clé publique VAPID */
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,

  /** @type {string} Clé privée VAPID */
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,

  /** @type {string} Sujet VAPID */
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:',

  /** @type {string} Secret de session */
  sessionSecret: process.env.SESSION_SECRET || generateSecureSecret(),


  /**
   * Crée un mois vide avec jours de 1 à 31
   * @returns {Object} Objet avec jours 1-31 contenant {midi: '', soir: ''}
   */
  createEmptyMonth: function () {
    const days = {};
    for (let day = 1; day <= 31; day++) {
      days[day] = { midi: '', soir: '' };
    }
    return days;
  },

  /**
   * Obtient le nombre de jours dans un mois donné
   * @param {number} year - Année
   * @param {number} month - Mois (0-11)
   * @returns {number} Nombre de jours
   */
  getDaysInMonth: function (year, month) {
    return new Date(year, month + 1, 0).getDate();
  },

  /**
   * Obtient le nombre de jours dans le mois actuel
   * @returns {number} Nombre de jours
   */
  getDaysInCurrentMonth: function () {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  },

  /**
   * Génère les jours valides pour le mois actuel
   * @returns {Array<number>} Tableau des jours (1 à 28/29/30/31)
   */
  getValidDaysForCurrentMonth: function () {
    const daysCount = this.getDaysInCurrentMonth();
    const days = [];
    for (let i = 1; i <= daysCount; i++) {
      days.push(i);
    }
    return days;
  },

  /**
   * Structure par défaut d'un mois
   * @type {Object}
   */
  default_atable: (function () {
    const days = {};
    for (let day = 1; day <= 31; day++) {
      days[day] = { midi: '', soir: '' };
    }
    return days;
  })(),

  /** @type {number} Nombre minimum de semaines */
  minWeeks: 1,

  /** @type {number} Nombre maximum de semaines */
  maxWeeks: 4,

  /** @type {number} Nombre de semaines par défaut */
  defaultWeeks: 2,

  /**
   * Catégories d'aliments disponibles
   * @type {Array<string>}
   */
  foodCategories: [
    "🥩 Protéines animales",
    "🌱 Protéines végétales",
    "🥕 Légumes",
    "🍞 Féculents / Glucides"
  ]
};

module.exports = CONFIG;