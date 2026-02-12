// ========================================
// Routes API de génération automatique de repas
// ========================================

const express = require('express');
const router = express.Router();
const MealGenerator = require('../managers/meal-generator');
const preferencesManager = require('../managers/preferences-manager');
const atableManager = require('../managers/atable-manager');
const { requireAuth } = require('../middleware/auth-middleware');

/**
 * POST /api/generator/generate
 * Génère automatiquement les repas pour toutes les semaines
 */
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { replaceAll = false } = req.body;

    // Récupérer les préférences utilisateur
    const preferences = await preferencesManager.readUserPreferences(req.session.userId);
    const ingredients = preferences.ingredients;

    // Valider les ingrédients
    if (!MealGenerator.validateIngredients(ingredients)) {
      return res.status(400).json({
        error: 'Aucun ingrédient configuré',
        message: 'Veuillez d\'abord ajouter des ingrédients dans vos préférences alimentaires'
      });
    }

    // Générer les repas
    const numberOfWeeks = preferences.showWeeks || 2;
    const generatedWeeks = MealGenerator.generateAllWeeks(ingredients, numberOfWeeks);

    // Récupérer les plans actuels
    const currentPlans = await atableManager.readUseratable(req.session.userId);

    // Fusionner ou remplacer
    for (let i = 1; i <= numberOfWeeks; i++) {
      const weekKey = `week${i}`;

      if (replaceAll || !currentPlans[weekKey]) {
        currentPlans[weekKey] = {
          enabled: true,
          days: generatedWeeks[weekKey]
        };
      } else {
        // Fusionner : ne remplacer que les repas vides
        for (const day of Object.keys(generatedWeeks[weekKey])) {
          console.log({ currentPlans :currentPlans[weekKey] })
          if (!currentPlans[weekKey].days[day].midi || currentPlans[weekKey].days[day].midi.trim() === '') {
            currentPlans[weekKey].days[day].midi = generatedWeeks[weekKey][day].midi;
          }
          if (!currentPlans[weekKey].days[day].soir || currentPlans[weekKey].days[day].soir.trim() === '') {
            currentPlans[weekKey].days[day].soir = generatedWeeks[weekKey][day].soir;
          }
        }
      }
    }

    // Sauvegarder
    await atableManager.writeUseratable(req.session.userId, currentPlans);

    res.json({
      success: true,
      message: replaceAll
        ? 'Repas générés et remplacés avec succès'
        : 'Repas générés (cases vides remplies)',
      weeks: generatedWeeks
    });

  } catch (error) {
    console.error('Erreur génération repas:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération',
      message: error.message
    });
  }
});

/**
 * POST /api/generator/generate-single
 * Génère une suggestion pour un seul repas
 */
router.post('/generate-single', requireAuth, async (req, res) => {
  try {
    const { mealType = 'midi', usedMeals = [] } = req.body;

    if (!['midi', 'soir'].includes(mealType)) {
      return res.status(400).json({
        error: 'Type de repas invalide',
        message: 'Le type doit être "midi" ou "soir"'
      });
    }

    // Récupérer les préférences
    const preferences = await preferencesManager.readUserPreferences(req.session.userId);
    const ingredients = preferences.ingredients;

    if (!MealGenerator.validateIngredients(ingredients)) {
      return res.status(400).json({
        error: 'Aucun ingrédient configuré'
      });
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
      return res.json({
        success: false,
        error: 'Tous les repas disponibles sont déjà utilisés',
        suggestion: null
      });
    }

    res.json({
      success: true,
      suggestion
    });

  } catch (error) {
    console.error('Erreur génération repas unique:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération'
    });
  }
});

/**
 * GET /api/generator/preview
 * Prévisualise les repas sans les sauvegarder
 */
router.get('/preview', requireAuth, async (req, res) => {
  try {
    // Récupérer les préférences
    const preferences = await preferencesManager.readUserPreferences(req.session.userId);
    const ingredients = preferences.ingredients;

    if (!MealGenerator.validateIngredients(ingredients)) {
      return res.status(400).json({
        error: 'Aucun ingrédient configuré'
      });
    }

    // Générer un aperçu
    const numberOfWeeks = preferences.showWeeks || 2;
    const preview = MealGenerator.generateAllWeeks(ingredients, numberOfWeeks);

    res.json({
      success: true,
      preview
    });

  } catch (error) {
    console.error('Erreur prévisualisation:', error);
    res.status(500).json({
      error: 'Erreur lors de la prévisualisation'
    });
  }
});

module.exports = router;