// ========================================
// Routeur principal - Index des routes
// Ce module centralise tous les routeurs de l'application
// ========================================

const authRoutes = require('./auth.routes');
const mealsRoutes = require('./atable.routes');
const notificationsRoutes = require('./notifications.routes');
const preferencesRoutes = require('./preferences.routes')
/**
 * Configure tous les routeurs de l'application
 * @param {Express} app - Instance Express
 */
function setupRoutes(app) {
    // Routes d'authentification
    app.use('/auth', authRoutes);

    // Routes API des repas
    app.use('/api/atable', mealsRoutes);

    // Routes API des notifications
    app.use('/api/notifications', notificationsRoutes);

    app.use('/api/preferences', preferencesRoutes);

}

module.exports = setupRoutes;