// ========================================
// Serveur Express avec authentification et notifications push
// Ce serveur gère l'authentification des utilisateurs, la gestion de leurs repas et l'envoi de notifications push.
// Les données sont stockées dans des fichiers JSON (users.json pour les utilisateurs, subscriptions.json pour les notifications).
// Les notifications push sont gérées avec la bibliothèque web-push et un scheduler qui envoie les notifications à l'heure définie par l'utilisateur.
// ========================================

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs').promises;

// Managers
const usersManager = require('./server/managers/users-manager');
const atableManager = require('./server/managers/atable-manager');
const pushManager = require('./server/managers/push-manager');
const notificationScheduler = require('./server/scheduler/notification-scheduler');
const { requireAuth, logRequest, protectAllRoutes } = require('./server/middleware/auth-middleware');

const app = express();
const PORT = process.env.PORT || 3030;
const CONFIG = require('./config');

// ========================================
// Configuration des middlewares
// ========================================

app.use(express.json());
app.use(cookieParser());

// Configuration des sessions
app.use(session({
    secret: CONFIG.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Mettre à true en HTTPS
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 jours
    }
}));

app.use(protectAllRoutes)
// Logging des requêtes (développement)
if (process.env.NODE_ENV !== 'production') {
    app.use(logRequest);
}

// ========================================
// Routes d'authentification
// ========================================

/**
 * POST /auth/register
 * Inscription d'un nouvel utilisateur
 */
app.post('/auth/register', async (req, res) => {
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

    // Validation mot de passe (minimum 6 caractères pour simplicité)
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
        req.session.machineId = user.machineId;

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
app.post('/auth/login', async (req, res) => {
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
        req.session.machineId = machineId

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
app.post('/auth/logout', (req, res) => {
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
app.get('/auth/me', async (req, res) => {

    return usersManager.findUserById(req.session.userId).then(async user => {
        if (!user) {
            return res.status(401).json({ message: 'Utilisateur non authentifié' });
        }
        const subscriptions = await pushManager.getUserSubscription(req.session.userId, req.session.machineId);
        return res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            },
            subscriptions
        });
    }).catch(() => {
        res.status(500).json({
            error: 'Erreur serveur'
        });
    });
});

// ========================================
// Routes API des repas (PROTÉGÉES)
// ========================================

/**
 * GET /api/atable
 * Récupère les repas de l'utilisateur connecté
 */
app.get('/api/atable', requireAuth, async (req, res) => {
    try {
        const atable = await atableManager.readUseratable(req.session.userId);
        res.json(atable);
    } catch (error) {
        console.error('Erreur lecture repas:', error);
        res.status(500).json({
            error: 'Erreur lors de la lecture des données'
        });
    }
});

/**
 * PUT /api/atable
 * Met à jour les repas de l'utilisateur connecté
 */
app.put('/api/atable', requireAuth, async (req, res) => {
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

// ========================================
// Routes de notifications push (PROTÉGÉES)
// ========================================

/**
 * GET /api/notifications/vapid-public-key
 * Retourne la clé publique VAPID pour les inscriptions
 */
app.get('/api/notifications/vapid-public-key', (req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;

    if (!publicKey) {
        return res.status(500).json({
            error: 'Clés VAPID non configurées'
        });
    }

    res.json({ publicKey });
});

/**
 * POST /api/notifications/subscribe
 * Enregistre une subscription push pour l'utilisateur
 */
app.post('/api/notifications/subscribe', requireAuth, async (req, res) => {
    try {
        const { subscription, settings } = req.body;

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({
                error: 'Subscription invalide'
            });
        }

        await pushManager.saveSubscription(
            req.session.userId,
            req.session.machineId,
            subscription,
            settings
        );

        res.json({
            success: true,
            message: 'Subscription enregistrée'
        });
    } catch (error) {
        console.error('Erreur enregistrement subscription:', error);
        res.status(500).json({
            error: 'Erreur lors de l\'enregistrement'
        });
    }
});

/**
 * PUT /api/notifications/settings
 * Met à jour les paramètres de notification
 */
app.put('/api/notifications/settings', requireAuth, async (req, res) => {
    try {
        const settings = req.body;
        console.log('Mise à jour paramètres notification:', { ...settings });
        await pushManager.updateNotificationSettings(req.session.userId, req.session.machineId, {
            ...settings
        });
        const newSettings = await pushManager.getUserSubscription(req.session.userId, req.session.machineId)
        return res.json({
            success: true,
            message: 'Paramètres mis à jour',
            ...newSettings.settings
        });
    } catch (error) {
        console.error('Erreur mise à jour paramètres:', error);
        return res.status(500).json({
            error: 'Erreur lors de la mise à jour'
        });
    }
});

/**
 * GET /api/notifications/settings
 * Récupère les paramètres de notification de l'utilisateur
 */
app.get('/api/notifications/settings', requireAuth, async (req, res) => {
    try {
        const subscription = await pushManager.getUserSubscription(req.session.userId, req.session.machineId);

        if (!subscription) {
            return res.json({
                subscribed: false,
                settings: {
                    enabled: false,
                    hour: 8,
                    minute: 0
                }
            });
        }

        res.json({
            subscribed: true,
            settings: subscription.settings
        });
    } catch (error) {
        console.error('Erreur récupération paramètres:', error);
        res.status(500).json({
            error: 'Erreur serveur'
        });
    }
});

/**
 * DELETE /api/notifications/unsubscribe
 * Supprime la subscription de l'utilisateur
 */
app.delete('/api/notifications/unsubscribe', requireAuth, async (req, res) => {
    try {
        await pushManager.deleteSubscription(req.session.userId, req.session.machineId);

        return res.json({
            success: true,
            message: 'Désinscription réussie'
        });
    } catch (error) {
        console.error('Erreur désinscription:', error);
        return res.status(500).json({
            error: 'Erreur lors de la désinscription'
        });
    }
});

// ========================================
// Pages statiques
// ========================================

// Servir les fichiers statiques
app.use(express.static('public'));

// Page de login pour les non-authentifiés
app.get('/login', (req, res) => {
    // Si déjà connecté, rediriger vers l'app
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Page principale (nécessite authentification)
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========================================
// Initialisation et démarrage
// ========================================

async function startServer() {
    try {
        // Créer le dossier data s'il n'existe pas
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });

        // Initialiser le fichier users.json
        await usersManager.initializeUsersFile();

        // Initialiser le système de notifications push
        const pushConfigured = pushManager.setupWebPush();
        if (pushConfigured) {
            await pushManager.initializeSubscriptionsFile();

            // Démarrer le scheduler de notifications
            notificationScheduler.startNotificationScheduler();
        } else {
            console.warn('⚠️  Notifications push non configurées');
            console.warn('   Exécutez: npm run generate-vapid');
        }

        // Démarrer le serveur
        app.listen(PORT, () => {
            console.log('========================================');
            console.log('🚀 Serveur Atable! démarré');
            console.log(`📍 URL: http://localhost:${PORT}`);
            console.log(`🔐 Mode: Authentification activée`);
            console.log(`🔔 Notifications: ${pushConfigured ? 'Activées' : 'Désactivées'}`);
            console.log('========================================');
        });
    } catch (error) {
        console.error('❌ Erreur au démarrage:', error);
        process.exit(1);
    }
}

startServer();