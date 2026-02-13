/**
 * @fileoverview Serveur Express principal avec authentification et notifications push
 * @module server
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger');

const usersManager = require('./server/managers/users-manager');
const pushManager = require('./server/managers/push-manager');
const notificationScheduler = require('./server/scheduler/notification-scheduler');
const { requireAuth, logRequest, protectAllRoutes } = require('./server/middleware/auth-middleware');
const setupRoutes = require('./server/routes');
const rateLimit = require('express-rate-limit')
const compression = require('compression');
const app = express();
const PORT = process.env.PORT || 3030;
const CONFIG = require('./config');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives
    message: 'Trop de tentatives, réessayez plus tard'
});
/**
 * Configuration des middlewares
*/
app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());
app.use(compression());

app.use(session({
    secret: CONFIG.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));

app.use(protectAllRoutes);

if (process.env.NODE_ENV !== 'production') {
    app.use(logRequest);
    app.use(express.static('public'));
} else {
    app.use(express.static('public', {
        maxAge: '7d',
        etag: true
    }));
}

/**
 * Configuration des routes
 */
setupRoutes(app);

/**
 * Page de login
 * @route GET /login
 */
app.get('/login', loginLimiter, (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

/**
 * Page principale (protégée)
 * @route GET /
 */
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Gestion des erreurs 404
 */
app.use((req, res) => {
    res.status(404).json({
        error: 'Route non trouvée',
        path: req.path
    });
});

/**
 * Gestion des erreurs serveur
 */
app.use((err, req, res, next) => {
    logger.error('Erreur serveur:', err);
    res.status(500).json({
        error: 'Erreur interne du serveur',
        message: process.env.NODE_ENV === 'production' ? 'Une erreur est survenue' : err.message
    });
});

/**
 * Initialise et démarre le serveur
 * @async
 * @returns {Promise<void>}
 */
async function startServer() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        await usersManager.initializeUsersDir();

        const pushConfigured = pushManager.setupWebPush();
        if (pushConfigured) {
            await pushManager.initializeNotificationsFile();
            notificationScheduler.startNotificationScheduler();
        } else {
            logger.warn('⚠️  Notifications push non configurées');
            logger.warn('   Exécutez: npm run generate-vapid');
        }

        app.listen(PORT, () => {
            logger.info('========================================');
            logger.info('Serveur Atable! démarré');
            logger.info(`URL: http://localhost:${PORT}`);
            logger.info('========================================');
        });
    } catch (error) {
        logger.error('❌ Erreur au démarrage:', error);
        process.exit(1);
    }
}

startServer();