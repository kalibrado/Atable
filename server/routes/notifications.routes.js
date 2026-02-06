// ========================================
// Routes API des notifications push
// ========================================

const express = require('express');
const router = express.Router();
const pushManager = require('../managers/push-manager');
const { requireAuth } = require('../middleware/auth-middleware');

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

  res.json({ publicKey });
});

/**
 * POST /api/notifications/subscribe
 * Enregistre une notification push pour l'utilisateur
 */
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { permissionNotification, settings } = req.body;

    if (!permissionNotification || !permissionNotification.endpoint) {
      return res.status(400).json({
        error: 'Systeme de notification invalide'
      });
    }

    await pushManager.saveNotification(
      req.session.userId,
      req.session.machineId,
      permissionNotification,
      settings
    );

    res.json({
      success: true,
      message: 'Demande de notification enregistrée'
    });
  } catch (error) {
    console.error('Erreur enregistrement notification:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'enregistrement'
    });
  }
});

/**
 * PUT /api/notifications/settings
 * Met à jour les paramètres de notification
 */
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const settings = req.body;

    console.log('Mise à jour paramètres notification:', { ...settings });

    await pushManager.updateNotificationSettings(
      req.session.userId,
      req.session.machineId,
      { ...settings }
    );

    const newSettings = await pushManager.getUserNotification(
      req.session.userId,
      req.session.machineId
    );

    return res.json({
      success: true,
      message: 'Paramètres mis à jour',
      ...newSettings.settings
    });
  } catch (error) {
    console.error('Erreur mise à jour paramètres:', error);
    return res.status(500).json({
      error: 'Erreur lors de la mise à jour'
    });
  }
});

/**
 * GET /api/notifications/settings
 * Récupère les paramètres de notification de l'utilisateur
 */
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const notification = await pushManager.getUserNotification(
      req.session.userId,
      req.session.machineId
    );

    if (!notification) {
      return res.json({
        subscribed: false,
        settings: {
          enabled: false,
          hour: 8,
          minute: 0
        }
      });
    }

    res.json({
      subscribed: true,
      settings: notification.settings
    });
  } catch (error) {
    console.error('Erreur récupération paramètres:', error);
    res.status(500).json({
      error: 'Erreur serveur'
    });
  }
});

/**
 * DELETE /api/notifications/unsubscribe
 * Supprime la notification de l'utilisateur
 */
router.delete('/unsubscribe', requireAuth, async (req, res) => {
  try {
    await pushManager.disabledNotification(
      req.session.userId,
      req.session.machineId
    );

    return res.json({
      success: true,
      message: 'Désinscription réussie'
    });
  } catch (error) {
    console.error('Erreur désinscription:', error);
    return res.status(500).json({
      error: 'Erreur lors de la désinscription'
    });
  }
});

module.exports = router;