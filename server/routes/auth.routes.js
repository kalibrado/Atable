// ========================================
// Routes d'authentification
// ========================================

const express = require('express');
const router = express.Router();
const usersManager = require('../managers/users-manager');

/**
 * POST /auth/register
 */
router.post('/register', async (req, res) => {
  const { email, password, firstname, lastname, machineId } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  if (!firstname || !lastname) {
    return res.status(400).json({ error: 'Prénom et nom requis' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Format d\'email invalide' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  try {
    const user = await usersManager.createUser(email, password, firstname, lastname);

    // Enregistrer le device si fourni
    if (machineId) {
      const isMobile = /mobile|android|iphone|ipad/i.test(req.headers['user-agent'] || '');
      await usersManager.updateDevice(user.id, machineId, isMobile);
    }

    req.session.userId = user.id;
    req.session.machineId = machineId;
    req.session.userEmail = user.email;

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname
      }
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(400).json({ error: error.message || 'Erreur lors de l\'inscription' });
  }
});

/**
 * POST /auth/login
 */
router.post('/login', async (req, res) => {
  const { email, password, machineId } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  try {
    const user = await usersManager.verifyUser(email, password);

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Enregistrer/mettre à jour le device
    if (machineId) {
      const isMobile = /mobile|android|iphone|ipad/i.test(req.headers['user-agent'] || '');
      await usersManager.updateDevice(user.id, machineId, isMobile);
    }

    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.machineId = machineId;

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname
      }
    });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

/**
 * POST /auth/logout
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

/**
 * GET /auth/me
 */
router.get('/me', async (req, res) => {
  const pushManager = require('../managers/push-manager');

  try {
    const user = await usersManager.findUserById(req.session.userId);

    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const notifications = await pushManager.getUserNotification(
      req.session.userId,
      req.session.machineId
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstname} ${user.lastname}`.trim() || user.email
      },
      notifications: {
        settings: {
          enabled: false,
          hour: 8,
          minute: 30,
          ...notifications?.settings
        }
      }
    });
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;