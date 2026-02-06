// ========================================
// Configuration de l'application
// Ce module centralise toutes les configurations de l'application, telles que les chemins de fichiers,
// les clés VAPID pour les notifications push, les secrets de session, et les paramètres par défaut.
// En regroupant ces configurations dans un seul endroit, il facilite la maintenance et la personnalisation de l'application.
// Les valeurs sensibles comme les clés VAPID sont chargées à partir des variables d'environnement pour plus de sécurité.
// ========================================
const path = require('path');

const CONFIG = {
  appName: 'Atable!',
  version: '1.0.0',
  dataDir: path.join(__dirname, 'data'),
  subscribeFile: path.join(__dirname, 'data', 'notifications.json'),
  usersFile: path.join(__dirname, 'data', 'users.json'),
  atableFilePrefix: 'atable_',
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
  validDays: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
};


module.exports = CONFIG;