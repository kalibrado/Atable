/**
 * @fileoverview Routes API de la liste de courses
 * @module routes/shopping-list
 */

const express = require('express');
const router = express.Router();
const usersManager = require('../managers/users-manager');
const { requireAuth } = require('../middleware/auth-middleware');
const { asyncHandler } = require('../middleware/handler-middleware');
const logger = require('../../logger');

/**
 * GET /api/shopping-list
 * Récupère les items cochés de la liste de courses
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  try {
    const userData = await usersManager.readUserData(req.session.userId);
    if (!userData) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const purchasedItems = userData.shoppingList || [];
    res.json({ purchasedItems });
  } catch (error) {
    logger.error('Erreur lecture liste de courses:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture de la liste de courses' });
  }
}));

/**
 * PUT /api/shopping-list
 * Sauvegarde les items cochés de la liste de courses
 * Body: { purchasedItems: string[] }
 */
router.put('/', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { purchasedItems } = req.body;

    if (!Array.isArray(purchasedItems)) {
      return res.status(400).json({ error: 'Format invalide : purchasedItems doit être un tableau' });
    }

    const userData = await usersManager.readUserData(req.session.userId);
    if (!userData) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    userData.shoppingList = purchasedItems;
    await usersManager.writeUserData(req.session.userId, userData);

    res.json({ success: true, purchasedItems });
  } catch (error) {
    logger.error('Erreur sauvegarde liste de courses:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde de la liste de courses' });
  }
}));

/**
 * DELETE /api/shopping-list
 * Remet à zéro la liste (tous les items décochés)
 */
router.delete('/', requireAuth, asyncHandler(async (req, res) => {
  try {
    const userData = await usersManager.readUserData(req.session.userId);
    if (!userData) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    userData.shoppingList = [];
    await usersManager.writeUserData(req.session.userId, userData);

    res.json({ success: true });
  } catch (error) {
    logger.error('Erreur reset liste de courses:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
}));

module.exports = router;