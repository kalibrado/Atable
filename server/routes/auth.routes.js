// ========================================
// Routes d'authentification
// ========================================

const express = require('express');
const router = express.Router();
const usersManager = require('../managers/users-manager');
const { asyncHandler } = require('../middleware/handler-middleware')
const logger = require('../../logger');
const ServerResponse = require('../../response-handler');
const z = require('zod')

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  machineId: z.string().optional()
});

/**
 * POST /auth/register
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, firstname, lastname, machineId } = req.body;

  if (!email || !password) {
    return ServerResponse.error(res, 400, 'MISSING_FIELDS', 'Email et mot de passe requis');
  }

  if (!firstname || !lastname) {
    return ServerResponse.error(res, 400, 'MISSING_FIELDS', 'Prénom et nom requis');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return ServerResponse.error(res, 400, 'INVALID_EMAIL', 'Format d\'email invalide');
  }

  if (password.length < 6) {
    return ServerResponse.error(res, 400, 'INVALID_PASSWORD', 'Le mot de passe doit contenir au moins 6 caractères');
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
    return ServerResponse.success(res, 201, {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname
      }
    }, 'Inscription réussie');

  } catch (error) {
    logger.error('Erreur inscription:', error);
    return ServerResponse.error(res, 500, 'INTERNAL_ERROR', error.message || 'Erreur lors de l\'inscription');
  }
}));

/**
 * POST /auth/login
 */
router.post('/login', asyncHandler(async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const { machineId } = req.body;
    if (!email || !password) {
      return ServerResponse.error(res, 400, 'MISSING_FIELDS', 'Email et mot de passe requis');
    }

    const user = await usersManager.verifyUser(email, password);
    if (!user) {
      return ServerResponse.error(res, 401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect');
    }

    // Enregistrer/mettre à jour le device
    if (machineId) {
      try {
        const isMobile = /mobile|android|iphone|ipad/i.test(req.headers['user-agent'] || '');
        await usersManager.updateDevice(user.id, machineId, isMobile);
      } catch (deviceError) {
        logger.error('Erreur updateDevice:', deviceError.message);
        // Continuer sans bloquer le login
      }
    }

    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.machineId = machineId;

    return ServerResponse.success(res, 200, {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname
      }
    });
  } catch (error) {
    logger.error('Erreur login:', error.message, error.stack);
    return ServerResponse.error(res, 500, 'INTERNAL_ERROR', error.message || 'Erreur lors de la connexion');
  }
}));

/**
 * POST /auth/logout
 */
router.post('/logout', asyncHandler((req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return ServerResponse.error(res, 500, 'INTERNAL_ERROR', 'Erreur lors de la déconnexion');
    }
    res.clearCookie('connect.sid');
    return ServerResponse.success(res, 200, { success: true }, 'Déconnexion réussie');
  });
}));

/**
 * GET /auth/me
 */
router.get('/me', asyncHandler(async (req, res) => {
  const pushManager = require('../managers/push-manager');

  try {
    const user = await usersManager.findUserById(req.session.userId);

    if (!user) {
      return ServerResponse.error(res, 401, 'UNAUTHORIZED', 'Utilisateur non authentifié');
    }

    const notifications = await pushManager.getUserNotification(
      req.session.userId,
      req.session.machineId
    );

    return ServerResponse.success(res, 200, {
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
    logger.error('Erreur récupération utilisateur:', error);
    return ServerResponse.error(res, 500, 'INTERNAL_ERROR', 'Erreur serveur');
  }
}));

module.exports = router;