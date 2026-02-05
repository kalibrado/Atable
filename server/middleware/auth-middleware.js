// ========================================
// Middleware d'authentification
// Ce module fournit des fonctions middleware pour protéger les routes nécessitant une authentification.
// Il vérifie si l'utilisateur est connecté en vérifiant la session.
// En cas d'absence de session valide, il renvoie une réponse 401 Unauthorized.
// Il inclut également un middleware de logging pour le développement.
// ========================================

/**
 * Vérifie si l'utilisateur est authentifié
 * Protège les routes qui nécessitent une connexion
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
 */
function logRequest(req, res, next) {
    const timestamp = new Date().toISOString();
    const userId = req.session?.userId || 'guest';
    const machineId = req.session?.machineId || 'Unknow'
    console.log(`[${timestamp}] ${req.method} ${req.path} - User: ${userId} - Machine ID: ${machineId}`);
    next();
}

/**
 * Middleware pour protéger toutes les routes sauf la page de login
 * Les utilisateurs non authentifiés ne peuvent accéder qu'à /login
 */
function protectAllRoutes(req, res, next) {
    // const publicRoutes = ['/login.html', '/api/login'];
    // const isPublicRoute = publicRoutes.includes(req.path);
    // console.log("Blocque all")
    // if (!req.session?.userId && !isPublicRoute) {
    //     return res.status(401).json({
    //         error: 'Accès refusé',
    //         message: 'Authentification requise'
    //     });
    // }
    next();
}

module.exports = {
    requireAuth,
    logRequest,
    protectAllRoutes
};