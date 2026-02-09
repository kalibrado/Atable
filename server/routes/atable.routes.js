// ========================================
// Routes API des repas
// ========================================

const express = require('express');
const router = express.Router();
const atableManager = require('../managers/atable-manager');
const preferencesManager = require('../managers/preferences-manager');
const { requireAuth } = require('../middleware/auth-middleware');

/**
 * GET /api/meals
 * Récupère les repas de l'utilisateur connecté 
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        // Récupérer le nombre de semaines de l'utilisateur
        const preferences = await preferencesManager.readUserPreferences(req.session.userId);
        const numberOfWeeks = preferences.numberOfWeeks || 1;
        
        const atable = await atableManager.readUseratable(req.session.userId, numberOfWeeks);
        res.json({
            weeks: atable,
            numberOfWeeks
        });
    } catch (error) {
        console.error('Erreur lecture repas:', error);
        res.status(500).json({
            error: 'Erreur lors de la lecture des données'
        });
    }
});

/**
 * PUT /api/meals
 * Met à jour les repas de l'utilisateur connecté
 */
router.put('/', requireAuth, async (req, res) => {
    try {
        const newData = req.body;
        await atableManager.writeUseratable(req.session.userId, newData);

        res.json({
            success: true,
            message: 'Données sauvegardées avec succès'
        });
    } catch (error) {
        console.error('Erreur sauvegarde repas:', error);
        res.status(400).json({
            error: error.message || 'Erreur lors de la sauvegarde'
        });
    }
});

module.exports = router;