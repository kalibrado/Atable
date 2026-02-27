// ========================================
// Routes API des repas
// ========================================

const express = require('express');
const router = express.Router();
const atableManager = require('../managers/atable-manager');
const preferencesManager = require('../managers/preferences-manager');
const { requireAuth } = require('../middleware/auth-middleware');
const { asyncHandler } = require('../middleware/handler-middleware')
const logger = require('../../logger');
const ServerResponse = require('../../response-handler');

/**
 * GET /api/atable
 */
router.get('/', requireAuth, asyncHandler(async (req, res) => {
    try {
        const preferences = await preferencesManager.readUserPreferences(req.session.userId);
        const numberOfWeeks = preferences.showWeeks || 2;

        const weeksPlans = await atableManager.readUseratable(req.session.userId);

        // Convertir au format attendu par le frontend
        const weeks = {};
        for (let i = 1; i <= numberOfWeeks; i++) {
            const weekKey = `week${i}`;
            weeks[weekKey] = weeksPlans[weekKey]?.days || {};
        }
        return ServerResponse.success(res, 200, {
            weeks,
            numberOfWeeks
        });
    } catch (error) {
        logger.error('Erreur lecture repas:', error);
        return ServerResponse.error(res, 500, 'INTERNAL_ERROR', 'Erreur lors de la lecture des données');
    }
}));


// GET /api/meals/:week - Récupérer UNE semaine spécifique
router.get('/:weeknumber', asyncHandler(async (req, res) => {
    try {
        const { weeknumber } = req.params;
        const weeksPlans = await atableManager.readUseratable(req.session.userId);
        // Retourner la semaine demandée ou un objet vide
        return ServerResponse.success(res, 200, weeksPlans[`week${weeknumber}`]?.days || {});
    } catch (error) {
        logger.error('Erreur lecture semaine:', error);
        return ServerResponse.error(res, 500, 'INTERNAL_ERROR', 'Erreur lecture données');
    }
}));

// PUT /:week - Sauvegarder UNE semaine
router.put('/:weeknumber', asyncHandler(async (req, res) => {
    try {
        const { weeknumber } = req.params;
        const weekData = req.body;

        // Lire toutes les données
        const weeksPlans = await atableManager.readUseratable(req.session.userId);

        // Mettre à jour uniquement cette semaine
        weeksPlans[`week${weeknumber}`] = weekData;

        // Sauvegarder
        await atableManager.writeUseratable(req.session.userId, weeksPlans)

        return ServerResponse.success(res, 200, { success: true }, 'Semaine sauvegardée avec succès');
    } catch (error) {
        logger.error('Erreur sauvegarde semaine:', error);
        return ServerResponse.error(res, 500, 'INTERNAL_ERROR', 'Erreur sauvegarde semaine');
    }
}));

/**
 * PUT /api/atable
 */
router.put('/', requireAuth, asyncHandler(async (req, res) => {
    try {
        const newData = req.body;

        // Récupérer les plans actuels
        const currentPlans = await atableManager.readUseratable(req.session.userId);

        // Fusionner avec les nouvelles données
        for (const weekKey in newData) {
            if (currentPlans[weekKey]) {
                currentPlans[weekKey].days = newData[weekKey];
            }
        }

        await atableManager.writeUseratable(req.session.userId, currentPlans);

        return ServerResponse.success(res, 200, { success: true }, 'Données sauvegardées avec succès');
    } catch (error) {
        logger.error('Erreur sauvegarde repas:', error);
        return ServerResponse.error(res, 500, 'INTERNAL_ERROR', error.message || 'Erreur lors de la sauvegarde');
    }
}));

module.exports = router;