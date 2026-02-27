// ========================================
// Routes API des notifications push
// ========================================

const express = require('express');
const router = express.Router();
const pushManager = require('../managers/push-manager');
const { requireAuth } = require('../middleware/auth-middleware');
const { asyncHandler } = require('../middleware/handler-middleware')
const logger = require('../../logger');
const ServerResponse = require('../../response-handler');

/**
 * GET /api/notifications/vapid-public-key
 * Retourne la clé publique VAPID pour les inscriptions
 */
router.get('/vapid-public-key', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return res.status(500).json({
      error: 'Clés VAPID non configurées'
    });
  }

  return ServerResponse.success(res, 200, { publicKey });
});

/**
 * POST /api/notifications/subscribe
 * Enregistre une notification push pour l'utilisateur
 */
router.post('/subscribe', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { permissionNotification, settings } = req.body;

    if (!permissionNotification || !permissionNotification.endpoint) {
      return ServerResponse.error(res, 400, 'INVALID_NOTIFICATION', 'Systeme de notification invalide');
    }

    await pushManager.saveNotification(
      req.session.userId,
      req.session.machineId,
      permissionNotification,
      settings
    );

    return ServerResponse.success(res, 200, {
      success: true,
      message: 'Demande de notification enregistrée'
    });
  } catch (error) {
    logger.error('Erreur enregistrement notification:', error);
    return ServerResponse.error(res, 500, 'INTERNAL_ERROR', 'Erreur lors de l\'enregistrement');
  }
}));

/**
 * PUT /api/notifications/settings
 * Met à jour les paramètres de notification
 */
router.put('/settings', requireAuth, asyncHandler(async (req, res) => {
  try {
    const settings = req.body;

    logger.info('Mise à jour paramètres notification:', { ...settings });

    await pushManager.updateNotificationSettings(
      req.session.userId,
      req.session.machineId,
      { ...settings }
    );

    const newSettings = await pushManager.getUserNotification(
      req.session.userId,
      req.session.machineId
    );

    return ServerResponse.success(res, 200, {
      success: true,
      message: 'Paramètres mis à jour',
      ...newSettings.settings
    });
  } catch (error) {
    logger.error('Erreur mise à jour paramètres:', error);
    return ServerResponse.error(res, 500, 'INTERNAL_ERROR', 'Erreur lors de la mise à jour');
  }
}));

/**
 * GET /api/notifications/settings
 * Récupère les paramètres de notification de l'utilisateur
 */
router.get('/settings', requireAuth, asyncHandler(async (req, res) => {
  try {
    const notification = await pushManager.getUserNotification(
      req.session.userId,
      req.session.machineId
    );

    if (!notification) {
      return ServerResponse.success(res, 200, {
        subscribed: false,
        settings: {
          enabled: false,
          hour: 8,
          minute: 0
        }
      });
    }

    return ServerResponse.success(res, 200, {
      subscribed: true,
      settings: notification.settings
    });
  } catch (error) {
    logger.error('Erreur récupération paramètres:', error);
    return ServerResponse.error(res, 500, 'INTERNAL_ERROR', 'Erreur serveur');
  }
}));

/**
 * DELETE /api/notifications/unsubscribe
 * Supprime la notification de l'utilisateur
 */
router.delete('/unsubscribe', requireAuth, asyncHandler(async (req, res) => {
  try {
    await pushManager.disabledNotification(
      req.session.userId,
      req.session.machineId
    );

    return ServerResponse.success(res, 200, {
      success: true,
      message: 'Désinscription réussie'
    });
  } catch (error) {
    logger.error('Erreur désinscription:', error);
    return ServerResponse.error(res, 500, 'INTERNAL_ERROR', 'Erreur lors de la désinscription');
  }
}));

module.exports = router;