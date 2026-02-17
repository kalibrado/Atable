/**
 * @fileoverview Routes API des préférences utilisateur
 * @module routes/preferences
 */

const express = require('express');
const router = express.Router();
const logger = require('../../logger');

const preferencesManager = require('../managers/preferences-manager');
const { requireAuth } = require('../middleware/auth-middleware');
const { asyncHandler } = require('../middleware/handler-middleware');

// ─────────────────────────────────────────────────────────────
// PRÉFÉRENCES GÉNÉRALES
// ─────────────────────────────────────────────────────────────

/**
 * Récupère les préférences de l'utilisateur connecté
 * @route GET /api/preferences
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  try {
    const preferences = await preferencesManager.readUserPreferences(req.session.userId);
    res.json(preferences);
  } catch (error) {
    logger.error('Erreur lecture préférences:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des préférences' });
  }
}));

/**
 * Met à jour les préférences de l'utilisateur connecté
 * @route PUT /api/preferences
 */
router.put('/', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { numberOfWeeks } = req.body;

    if (!numberOfWeeks || isNaN(numberOfWeeks)) {
      return res.status(400).json({ error: 'Nombre de semaines invalide' });
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
    res.status(400).json({ error: error.message || 'Erreur lors de la sauvegarde' });
  }
}));

// ─────────────────────────────────────────────────────────────
// INGRÉDIENTS
// ─────────────────────────────────────────────────────────────

/**
 * Récupère les ingrédients de l'utilisateur
 * @route GET /api/preferences/ingredients
 */
router.get('/ingredients', requireAuth, asyncHandler(async (req, res) => {
  try {
    const ingredients = await preferencesManager.readUserIngredients(req.session.userId);
    res.json({ ingredients });
  } catch (error) {
    logger.error('Erreur lecture ingrédients:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des ingrédients' });
  }
}));

/**
 * Ajoute un item à une catégorie d'ingrédients
 * @route POST /api/preferences/ingredients/:category/item
 */
router.post('/ingredients/:category/item', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { category } = req.params;
    const { item } = req.body;
    const decodedCategory = decodeURIComponent(category);

    if (!item) {
      return res.status(400).json({ error: 'Item manquant' });
    }

    const ingredients = await preferencesManager.addIngredientItem(
      req.session.userId,
      decodedCategory,
      item
    );

    res.json({ success: true, message: 'Item ajouté avec succès', ingredients });
  } catch (error) {
    logger.error('Erreur ajout item:', error);
    res.status(400).json({ error: error.message || 'Erreur lors de l\'ajout de l\'item' });
  }
}));

/**
 * Supprime un item d'une catégorie d'ingrédients
 * @route DELETE /api/preferences/ingredients/:category/item
 */
router.delete('/ingredients/:category/item', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { category } = req.params;
    const { item } = req.body;
    const decodedCategory = decodeURIComponent(category);

    if (!item) {
      return res.status(400).json({ error: 'Item manquant' });
    }

    const ingredients = await preferencesManager.removeIngredientItem(
      req.session.userId,
      decodedCategory,
      item
    );

    res.json({ success: true, message: 'Item supprimé avec succès', ingredients });
  } catch (error) {
    logger.error('Erreur suppression item:', error);
    res.status(400).json({ error: error.message || 'Erreur lors de la suppression' });
  }
}));

/**
 * Met à jour les préférences midi/soir d'une catégorie
 * @route PUT /api/preferences/ingredients/:category/repas
 */
router.put('/ingredients/:category/repas', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { category } = req.params;
    const repas = req.body;
    const decodedCategory = decodeURIComponent(category);

    if (!repas || typeof repas.midi !== 'boolean' || typeof repas.soir !== 'boolean') {
      return res.status(400).json({ error: 'Format de repas invalide' });
    }

    const ingredients = await preferencesManager.updateCategoryRepas(
      req.session.userId,
      decodedCategory,
      repas
    );

    res.json({ success: true, message: 'Préférences mises à jour', ingredients });
  } catch (error) {
    logger.error('Erreur mise à jour repas:', error);
    res.status(400).json({ error: error.message || 'Erreur lors de la mise à jour' });
  }
}));

// ─────────────────────────────────────────────────────────────
// GESTION DES CATÉGORIES (NOUVEAU)
// ─────────────────────────────────────────────────────────────

/**
 * Crée une nouvelle catégorie personnalisée
 * @route POST /api/preferences/ingredients/category
 */
router.post('/ingredients/category', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { categoryName } = req.body;

    if (!categoryName) {
      return res.status(400).json({ error: 'Nom de catégorie manquant' });
    }

    const ingredients = await preferencesManager.addCategory(
      req.session.userId,
      categoryName
    );

    res.json({ success: true, message: 'Catégorie créée avec succès', ingredients });
  } catch (error) {
    logger.error('Erreur création catégorie:', error);
    res.status(400).json({ error: error.message || 'Erreur lors de la création' });
  }
}));

/**
 * Renomme une catégorie existante (conserve items et préférences repas)
 * @route PUT /api/preferences/ingredients/:category/rename
 */
router.put('/ingredients/:category/rename', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { category } = req.params;
    const { newName } = req.body;
    const decodedCategory = decodeURIComponent(category);

    if (!newName) {
      return res.status(400).json({ error: 'Nouveau nom manquant' });
    }

    const ingredients = await preferencesManager.renameCategory(
      req.session.userId,
      decodedCategory,
      newName
    );

    res.json({ success: true, message: 'Catégorie renommée avec succès', ingredients });
  } catch (error) {
    logger.error('Erreur renommage catégorie:', error);
    res.status(400).json({ error: error.message || 'Erreur lors du renommage' });
  }
}));

/**
 * Supprime une catégorie et tous ses items
 * Les repas du planning existant ne sont PAS supprimés.
 * @route DELETE /api/preferences/ingredients/:category
 */
router.delete('/ingredients/:category', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { category } = req.params;
    const decodedCategory = decodeURIComponent(category);

    const ingredients = await preferencesManager.deleteCategory(
      req.session.userId,
      decodedCategory
    );

    res.json({ success: true, message: 'Catégorie supprimée avec succès', ingredients });
  } catch (error) {
    logger.error('Erreur suppression catégorie:', error);
    res.status(400).json({ error: error.message || 'Erreur lors de la suppression' });
  }
}));

module.exports = router;