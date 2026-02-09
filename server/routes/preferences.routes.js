// ========================================
// Routes API des préférences utilisateur
// ========================================

const express = require('express');
const router = express.Router();
const preferencesManager = require('../managers/preferences-manager');
const { requireAuth } = require('../middleware/auth-middleware');

/**
 * GET /api/preferences
 * Récupère les préférences de l'utilisateur connecté
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const preferences = await preferencesManager.readUserPreferences(req.session.userId);
    res.json(preferences);
  } catch (error) {
    console.error('Erreur lecture préférences:', error);
    res.status(500).json({
      error: 'Erreur lors de la lecture des préférences'
    });
  }
});

/**
 * PUT /api/preferences
 * Met à jour les préférences de l'utilisateur connecté
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    const { numberOfWeeks } = req.body;

    if (!numberOfWeeks || isNaN(numberOfWeeks)) {
      return res.status(400).json({
        error: 'Nombre de semaines invalide'
      });
    }

    const preferences = await preferencesManager.updateNumberOfWeeks(
      req.session.userId,
      parseInt(numberOfWeeks)
    );

    res.json({
      success: true,
      message: 'Préférences mises à jour avec succès',
      preferences
    });
  } catch (error) {
    console.error('Erreur sauvegarde préférences:', error);
    res.status(400).json({
      error: error.message || 'Erreur lors de la sauvegarde'
    });
  }
});

module.exports = router;