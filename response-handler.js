/**
 * @fileoverview Gestionnaire unifié des réponses serveur et messages utilisateur
 * @module response-handler
 * 
 * Ce module centralise la gestion des réponses HTTP et affiche les messages
 * de manière cohérente à l'utilisateur côté client.
 */

// ============================================================
// CÔTÉ SERVEUR - Envoi de réponses structurées
// ============================================================

/**
 * Classe de gestion des réponses serveur
 * À utiliser dans les routes Express pour envoyer des réponses structurées
 */
class ServerResponse {
  /**
   * Réponse de succès
   * @param {Object} res - Objet réponse Express
   * @param {number} statusCode - Code HTTP (200, 201, etc.)
   * @param {Object} data - Données à renvoyer
   * @param {string} message - Message de succès à afficher à l'utilisateur
   * @returns {void}
   */
  static success(res, statusCode = 200, data = {}, message = '✓ Opération réussie') {
    res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Réponse d'erreur
   * @param {Object} res - Objet réponse Express
   * @param {number} statusCode - Code HTTP (400, 401, 404, 500, etc.)
   * @param {string} error - Code d'erreur interne
   * @param {string} message - Message d'erreur à afficher à l'utilisateur
   * @param {Object} [details] - Détails supplémentaires (dev only)
   * @returns {void}
   */
  static error(res, statusCode = 500, error = 'INTERNAL_ERROR', message = '❌ Une erreur est survenue', details = {}) {
    res.status(statusCode).json({
      success: false,
      error,
      message,
      ...(process.env.NODE_ENV !== 'production' && { details }),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Réponse pour validation échouée
   * @param {Object} res - Objet réponse Express
   * @param {string} field - Champ concerné
   * @param {string} message - Message de validation
   * @returns {void}
   */
  static validation(res, field, message) {
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message,
      field,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Réponse non authentifié
   * @param {Object} res - Objet réponse Express
   * @returns {void}
   */
  static unauthorized(res) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: '🔐 Vous devez être connecté pour accéder à cette ressource',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Réponse non autorisé (permission insuffisante)
   * @param {Object} res - Objet réponse Express
   * @returns {void}
   */
  static forbidden(res) {
    res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: '⛔ Vous n\'avez pas les permissions nécessaires',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Réponse ressource non trouvée
   * @param {Object} res - Objet réponse Express
   * @param {string} [resource] - Nom de la ressource
   * @returns {void}
   */
  static notFound(res, resource = 'la ressource') {
    res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: `🔍 ${resource} introuvable`,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Réponse conflit (ressource existe déjà)
   * @param {Object} res - Objet réponse Express
   * @param {string} [message] - Message personnalisé
   * @returns {void}
   */
  static conflict(res, message = '⚠️ Cette ressource existe déjà') {
    res.status(409).json({
      success: false,
      error: 'CONFLICT',
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Réponse trop de requêtes (rate limit)
   * @param {Object} res - Objet réponse Express
   * @returns {void}
   */
  static tooManyRequests(res) {
    res.status(429).json({
      success: false,
      error: 'TOO_MANY_REQUESTS',
      message: '⏱️ Trop de requêtes. Veuillez réessayer dans quelques instants.',
      timestamp: new Date().toISOString()
    });
  }
}


module.exports = ServerResponse;