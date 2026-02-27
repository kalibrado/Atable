// ========================================
// Routes API de génération automatique de repas
// ========================================

const express = require('express');
const router = express.Router();
const MealGenerator = require('../managers/meal-generator');
const preferencesManager = require('../managers/preferences-manager');
const atableManager = require('../managers/atable-manager');
const { requireAuth } = require('../middleware/auth-middleware');
const { asyncHandler } = require('../middleware/handler-middleware')
const logger = require('../../logger');
const ServerResponse = require('../../response-handler');

/**
 * POST /api/generator/generate
 * Génère automatiquement les repas pour toutes les semaines
 */
router.post('/generate', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { replaceAll = false } = req.body;

    // Récupérer les préférences utilisateur
    const preferences = await preferencesManager.readUserPreferences(req.session.userId);
    const ingredients = preferences.ingredients;

    // Valider les ingrédients
    if (!MealGenerator.validateIngredients(ingredients)) {
      return ServerResponse.error(res, 400, 'NO_INGREDIENTS_CONFIGURED', 'Veuillez d\'abord ajouter des ingrédients dans vos préférences alimentaires');
    }

    // Générer les repas
    const generatedWeeks = MealGenerator.generateAllWeeks(ingredients);

    // Récupérer les plans actuels
    const currentPlans = await atableManager.readUseratable(req.session.userId);

    // Fusionner ou remplacer
    for (let i = 1; i <= 4; i++) {
      const weekKey = `week${i}`;

      if (replaceAll || !currentPlans[weekKey]) {
        currentPlans[weekKey] = {
          enabled: true,
          days: generatedWeeks[weekKey]
        };
      } else {
        // Fusionner : ne remplacer que les repas vides
        for (const day of Object.keys(generatedWeeks[weekKey])) {
          // Initialiser le jour s'il n'existe pas
          if (!currentPlans[weekKey].days[day]) {
            currentPlans[weekKey].days[day] = { midi: '', soir: '' };
          }

          // Remplacer midi si vide
          if (!currentPlans[weekKey].days[day].midi || currentPlans[weekKey].days[day].midi.trim() === '') {
            currentPlans[weekKey].days[day].midi = generatedWeeks[weekKey][day].midi;
          }

          // Remplacer soir si vide
          if (!currentPlans[weekKey].days[day].soir || currentPlans[weekKey].days[day].soir.trim() === '') {
            currentPlans[weekKey].days[day].soir = generatedWeeks[weekKey][day].soir;
          }
        }
      }
    }

    // Sauvegarder
    await atableManager.writeUseratable(req.session.userId, currentPlans);

    return ServerResponse.success(res, 200, {
      success: true,
      message: replaceAll
        ? 'Repas générés et remplacés avec succès'
        : 'Repas générés (cases vides remplies)',
      weeks: generatedWeeks
    });

  } catch (error) {
    logger.error('Erreur génération repas:', error);
    return ServerResponse.error(res, 500, 'INTERNAL_ERROR', error.message || 'Erreur lors de la génération');
  }
}));

/**
 * POST /api/generator/generate-single
 * Génère une suggestion pour un seul repas
 */
router.post('/generate-single', requireAuth, asyncHandler(async (req, res) => {
  try {
    const { mealType = 'midi', usedMeals = [] } = req.body;

    if (!['midi', 'soir'].includes(mealType)) {
      return ServerResponse.error(res, 400, 'INVALID_MEAL_TYPE', 'Type de repas invalide. Le type doit être "midi" ou "soir"');
    }

    // Récupérer les préférences
    const preferences = await preferencesManager.readUserPreferences(req.session.userId);
    const ingredients = preferences.ingredients;

    if (!MealGenerator.validateIngredients(ingredients)) {
      return ServerResponse.error(res, 400, 'NO_INGREDIENTS_CONFIGURED', 'Aucun ingrédient configuré');
    }

    // Convertir le tableau de repas utilisés en Set
    const usedMealsSet = new Set(
      usedMeals.map(meal => meal.toLowerCase().trim())
    );

    // Générer une suggestion en évitant les doublons
    let attempts = 0;
    let suggestion = null;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      suggestion = MealGenerator.generateSingleMeal(ingredients, mealType, usedMealsSet);

      // Vérifier que la suggestion n'est pas déjà utilisée
      if (suggestion && !usedMealsSet.has(suggestion.toLowerCase().trim())) {
        break;
      }

      attempts++;
    }

    if (!suggestion || usedMealsSet.has(suggestion.toLowerCase().trim())) {
      return ServerResponse.error(res, 400, 'ALL_MEALS_USED', 'Tous les repas disponibles sont déjà utilisés');
    }

    return ServerResponse.success(res, 200, {
      success: true,
      suggestion
    });

  } catch (error) {
    logger.error('Erreur génération repas unique:', error);
    return ServerResponse.error(res, 500, 'INTERNAL_ERROR', error.message || 'Erreur lors de la génération');
  }
}));

/**
 * GET /api/generator/preview
 * Prévisualise les repas sans les sauvegarder
 */
router.get('/preview', requireAuth, asyncHandler(async (req, res) => {
  try {
    // Récupérer les préférences
    const preferences = await preferencesManager.readUserPreferences(req.session.userId);
    const ingredients = preferences.ingredients;

    if (!MealGenerator.validateIngredients(ingredients)) {
      return ServerResponse.error(res, 400, 'NO_INGREDIENTS_CONFIGURED', 'Aucun ingrédient configuré');
    }

    // Générer un aperçu
    const preview = MealGenerator.generateAllWeeks(ingredients, 4);

    return ServerResponse.success(res, 200, {
      success: true,
      preview
    });

  } catch (error) {
    logger.error('Erreur prévisualisation:', error);
    return ServerResponse.error(res, 500, 'INTERNAL_ERROR', error.message || 'Erreur lors de la prévisualisation');
  }
}));

module.exports = router;