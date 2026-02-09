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

/**
 * GET /api/preferences/ingredients
 * Récupère les ingrédients de l'utilisateur
 */
router.get('/ingredients', requireAuth, async (req, res) => {
  try {
    const ingredients = await preferencesManager.readUserIngredients(req.session.userId);
    res.json({ ingredients });
  } catch (error) {
    console.error('Erreur lecture ingrédients:', error);
    res.status(500).json({
      error: 'Erreur lors de la lecture des ingrédients'
    });
  }
});

/**
 * PUT /api/preferences/ingredients
 * Met à jour tous les ingrédients de l'utilisateur
 */
router.put('/ingredients', requireAuth, async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients) {
      return res.status(400).json({
        error: 'Données d\'ingrédients manquantes'
      });
    }

    const updatedIngredients = await preferencesManager.updateUserIngredients(
      req.session.userId,
      ingredients
    );

    res.json({
      success: true,
      message: 'Ingrédients mis à jour avec succès',
      ingredients: updatedIngredients
    });
  } catch (error) {
    console.error('Erreur sauvegarde ingrédients:', error);
    res.status(400).json({
      error: error.message || 'Erreur lors de la sauvegarde des ingrédients'
    });
  }
});

/**
 * POST /api/preferences/ingredients/:category/item
 * Ajoute un item à une catégorie
 */
router.post('/ingredients/:category/item', requireAuth, async (req, res) => {
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
    console.error('Erreur ajout item:', error);
    res.status(400).json({
      error: error.message || 'Erreur lors de l\'ajout de l\'item'
    });
  }
});

/**
 * DELETE /api/preferences/ingredients/:category/item
 * Supprime un item d'une catégorie
 */
router.delete('/ingredients/:category/item', requireAuth, async (req, res) => {
  try {
    const { category } = req.params;
    const { item } = req.body;

    const decodedCategory = decodeURIComponent(category);

    if (!item) {
      return res.status(400).json({
        error: 'Item manquant'
      });
    }

    const ingredients = await preferencesManager.removeIngredientItem(
      req.session.userId,
      decodedCategory,
      item
    );

    res.json({
      success: true,
      message: 'Item supprimé avec succès',
      ingredients
    });
  } catch (error) {
    console.error('Erreur suppression item:', error);
    res.status(400).json({
      error: error.message || 'Erreur lors de la suppression de l\'item'
    });
  }
});

/**
 * PUT /api/preferences/ingredients/:category/repas
 * Met à jour les préférences de repas pour une catégorie
 */
router.put('/ingredients/:category/repas', requireAuth, async (req, res) => {
  try {
    const { category } = req.params;
    const { midi, soir } = req.body;

    const decodedCategory = decodeURIComponent(category);

    if (typeof midi !== 'boolean' || typeof soir !== 'boolean') {
      return res.status(400).json({
        error: 'Paramètres midi/soir invalides'
      });
    }

    const ingredients = await preferencesManager.updateCategoryRepas(
      req.session.userId,
      decodedCategory,
      { midi, soir }
    );

    res.json({
      success: true,
      message: 'Préférences de repas mises à jour',
      ingredients
    });
  } catch (error) {
    console.error('Erreur mise à jour repas:', error);
    res.status(400).json({
      error: error.message || 'Erreur lors de la mise à jour'
    });
  }
});

module.exports = router;