// ========================================
// Routes d'authentification
// ========================================

const express = require('express');
const router = express.Router();
const usersManager = require('../managers/users-manager');

/**
 * POST /auth/register
 * Inscription d'un nouvel utilisateur
 */
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({
      error: 'Email et mot de passe requis'
    });
  }

  // Validation email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Format d\'email invalide'
    });
  }

  // Validation mot de passe (minimum 6 caractères)
  if (password.length < 6) {
    return res.status(400).json({
      error: 'Le mot de passe doit contenir au moins 6 caractères'
    });
  }

  try {
    const user = await usersManager.createUser(email, password, name);

    // Connexion automatique après inscription
    req.session.userId = user.id;
    req.session.userEmail = user.email;

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(400).json({
      error: error.message || 'Erreur lors de l\'inscription'
    });
  }
});

/**
 * POST /auth/login
 * Connexion d'un utilisateur
 */
router.post('/login', async (req, res) => {
  const { email, password, machineId } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email et mot de passe requis'
    });
  }

  try {
    const user = await usersManager.verifyUser(email, password);

    if (!user) {
      return res.status(401).json({
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Créer la session
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.machineId = machineId;

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({
      error: 'Erreur lors de la connexion'
    });
  }
});

/**
 * POST /auth/logout
 * Déconnexion de l'utilisateur
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        error: 'Erreur lors de la déconnexion'
      });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

/**
 * GET /auth/me
 * Obtient les informations de l'utilisateur connecté
 */
router.get('/me', async (req, res) => {
  const pushManager = require('../managers/push-manager');

  try {
    const user = await usersManager.findUserById(req.session.userId);

    if (!user) {
      return res.status(401).json({
        message: 'Utilisateur non authentifié'
      });
    }

    const subscriptions = await pushManager.getUserSubscription(
      req.session.userId,
      req.session.machineId
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      subscriptions
    });
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    res.status(500).json({
      error: 'Erreur serveur'
    });
  }
});

module.exports = router;