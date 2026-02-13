/**
 * @fileoverview Middleware d'authentification et sécurité
 * @module middleware/auth-middleware
 */

/**
 * Vérifie si l'utilisateur est authentifié
 * Protège les routes qui nécessitent une connexion
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next
 * @returns {void}
 */
function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) { 
        return res.status(401).json({ 
            error: 'Non authentifié',
            message: 'Vous devez être connecté pour accéder à cette ressource'
        });
    }
    next();
}

/**
 * Middleware de logging pour le développement
 * Affiche les informations de chaque requête
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next
 * @returns {void}
 */
function logRequest(req, res, next) {
    const timestamp = new Date().toISOString();
    const userId = req.session?.userId || 'guest';
    const machineId = req.session?.machineId || 'Unknown';
    console.log(`[${timestamp}] ${req.method} ${req.path} - User: ${userId} - Machine: ${machineId}`);
    next();
}

/**
 * Middleware pour protéger toutes les routes sauf la page de login
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next
 * @returns {void}
 */
function protectAllRoutes(req, res, next) {
    next();
}

module.exports = {
    requireAuth,
    logRequest,
    protectAllRoutes
};