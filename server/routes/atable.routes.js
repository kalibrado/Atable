// ========================================
// Routes API des repas
// ========================================

const express = require('express');
const router = express.Router();
const atableManager = require('../managers/atable-manager');
const preferencesManager = require('../managers/preferences-manager');
const { requireAuth } = require('../middleware/auth-middleware');

/**
 * GET /api/atable
 */
router.get('/', requireAuth, async (req, res) => {
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

        res.json({
            weeks,
            numberOfWeeks
        });
    } catch (error) {
        console.error('Erreur lecture repas:', error);
        res.status(500).json({ error: 'Erreur lors de la lecture des données' });
    }
});

/**
 * PUT /api/atable
 */
router.put('/', requireAuth, async (req, res) => {
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

        res.json({
            success: true,
            message: 'Données sauvegardées avec succès'
        });
    } catch (error) {
        console.error('Erreur sauvegarde repas:', error);
        res.status(400).json({ error: error.message || 'Erreur lors de la sauvegarde' });
    }
});

module.exports = router;