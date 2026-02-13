/**
 * @fileoverview Routes API des préférences utilisateur
 * @module routes/preferences
 */

const express = require('express');
const router = express.Router();
const logger = require('../../logger');

const preferencesManager = require('../managers/preferences-manager');
const { requireAuth } = require('../middleware/auth-middleware');
const { asyncHandler } = require('../middleware/handler-middleware')
/**
 * Récupère les préférences de l'utilisateur connecté
 * @route GET /api/preferences
 * @group Preferences - Gestion des préférences utilisateur
 * @security JWT
 * @returns {Object} 200 - Préférences utilisateur
 * @returns {Error} 401 - Non authentifié
 * @returns {Error} 500 - Erreur serveur
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  try {
    const preferences = await preferencesManager.readUserPreferences(req.session.userId);
    res.json(preferences);
  } catch (error) {
    logger.error('Erreur lecture préférences:', error);
    res.status(500).json({
      error: 'Erreur lors de la lecture des préférences'
    });
  }
}));

/**
 * Met à jour les préférences de l'utilisateur connecté
 * @route PUT /api/preferences
 * @group Preferences - Gestion des préférences utilisateur
 * @param {Object} body.required - Préférences à mettre à jour
 * @param {number} body.numberOfWeeks - Nombre de semaines (1-4)
 * @security JWT
 * @returns {Object} 200 - Préférences mises à jour
 * @returns {Error} 400 - Données invalides
 * @returns {Error} 401 - Non authentifié
 * @returns {Error} 500 - Erreur serveur
 */
router.put('/', requireAuth, asyncHandler(async (req, res) => {
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
    logger.error('Erreur sauvegarde préférences:', error);
    res.status(400).json({
      error: error.message || 'Erreur lors de la sauvegarde'
    });
  }
}));

/**
 * Récupère les ingrédients de l'utilisateur
 * @route GET /api/preferences/ingredients
 * @group Preferences - Gestion des ingrédients
 * @security JWT
 * @returns {Object} 200 - Ingrédients de l'utilisateur
 * @returns {Error} 401 - Non authentifié
 * @returns {Error} 500 - Erreur serveur
 */
router.get('/ingredients', requireAuth, asyncHandler(async (req, res) => {
  try {
    const ingredients = await preferencesManager.readUserIngredients(req.session.userId);
    res.json({ ingredients });
  } catch (error) {
    logger.error('Erreur lecture ingrédients:', error);
    res.status(500).json({
      error: 'Erreur lors de la lecture des ingrédients'
    });
  }
}));

/**
 * Ajoute un item à une catégorie d'ingrédients
 * @route POST /api/preferences/ingredients/:category/item
 * @group Preferences - Gestion des ingrédients
 * @param {string} category.path.required - Catégorie d'ingrédients
 * @param {Object} body.required - Item à ajouter
 * @param {string} body.item.required - Nom de l'item
 * @security JWT
 * @returns {Object} 200 - Item ajouté avec succès
 * @returns {Error} 400 - Données invalides
 * @returns {Error} 401 - Non authentifié
 */
router.post('/ingredients/:category/item', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { category } = req.params;
    const { item } = req.body;

    const decodedCategory = decodeURIComponent(category);

    if (!item) {
      return res.status(400).json({
        error: 'Item manquant'
      });
    }

    const ingredients = await preferencesManager.addIngredientItem(
      req.session.userId,
      decodedCategory,
      item
    );

    res.json({
      success: true,
      message: 'Item ajouté avec succès',
      ingredients
    });
  } catch (error) {
    logger.error('Erreur ajout item:', error);
    res.status(400).json({
      error: error.message || 'Erreur lors de l\'ajout de l\'item'
    });
  }
}));

module.exports = router;