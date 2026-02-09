// ========================================
// Configuration de l'application
// ========================================
const path = require('path');

const CONFIG = {
  appName: 'Atable!',
  version: '1.0.0',
  dataDir: path.join(__dirname, 'data'),
  usersDir: path.join(__dirname, 'data', 'users'),
  subscribeFile: path.join(__dirname, 'data', 'notifications.json'),
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:',
  sessionSecret: 'atable-secret-key-change-in-production-' + Date.now(),
  default_atable: {
    lundi: { midi: '', soir: '' },
    mardi: { midi: '', soir: '' },
    mercredi: { midi: '', soir: '' },
    jeudi: { midi: '', soir: '' },
    vendredi: { midi: '', soir: '' },
    samedi: { midi: '', soir: '' },
    dimanche: { midi: '', soir: '' }
  },
  validDays: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
  minWeeks: 1,
  maxWeeks: 4,
  defaultWeeks: 2,
  foodCategories: [
    "🥩 Protéines animales",
    "🌱 Protéines végétales",
    "🥕 Légumes",
    "🍎 Fruits",
    "🍞 Féculents / Glucides",
    "🧀 Produits laitiers",
    "🧂 Condiments"
  ]
};

module.exports = CONFIG;