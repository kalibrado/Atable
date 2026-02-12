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
  
  // Fonction pour créer un mois vide (jours 1 à 31)
  createEmptyMonth: function() {
    const days = {};
    for (let day = 1; day <= 31; day++) {
      days[day] = { midi: '', soir: '' };
    }
    return days;
  },
  
  // Obtient le nombre de jours dans un mois donné
  getDaysInMonth: function(year, month) {
    return new Date(year, month + 1, 0).getDate();
  },
  
  // Obtient le nombre de jours dans le mois actuel
  getDaysInCurrentMonth: function() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  },
  
  // Génère les jours valides pour le mois actuel
  getValidDaysForCurrentMonth: function() {
    const daysCount = this.getDaysInCurrentMonth();
    const days = [];
    for (let i = 1; i <= daysCount; i++) {
      days.push(i);
    }
    return days;
  },
  
  default_atable: (function() {
    const days = {};
    for (let day = 1; day <= 31; day++) {
      days[day] = { midi: '', soir: '' };
    }
    return days;
  })(),
  
  minWeeks: 1,
  maxWeeks: 4,
  defaultWeeks: 2,
  
  foodCategories: [
    "🥩 Protéines animales",
    "🌱 Protéines végétales",
    "🥕 Légumes",
    "🍞 Féculents / Glucides"
  ]
};

module.exports = CONFIG;